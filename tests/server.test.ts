import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { io as connect, type Socket } from "socket.io-client";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server/app.ts";
import type { Invites, View } from "../shared/model.ts";

describe("real workshop server", () => {
  let app: ReturnType<typeof createApp>,
    base: string,
    dir: string,
    now: number,
    invites: Invites,
    host: string,
    captain: string,
    participant: string,
    curator: string;
  const key = "test-only-host-key-12345678901234567890";
  async function access(token: string) {
    const r = await request(base)
      .post("/api/access")
      .send({ token, name: "Тест" })
      .expect(200);
    return r.headers["set-cookie"][0].split(";")[0];
  }
  async function view(cookie: string): Promise<View> {
    return (
      await request(base).get("/api/state").set("Cookie", cookie).expect(200)
    ).body;
  }
  function control(action: string, extra: Record<string, unknown> = {}) {
    return request(base)
      .post(`/api/sessions/${invites.sessionId}/control`)
      .set("Cookie", host)
      .send({ action, ...extra });
  }
  beforeEach(async () => {
    now = Date.now();
    dir = mkdtempSync(join(tmpdir(), "hr-game-"));
    app = createApp({
      dbPath: join(dir, "game.sqlite"),
      hostKey: key,
      now: () => now,
    });
    base = await app.listen(0);
    invites = (
      await request(base)
        .post("/api/sessions")
        .send({
          hostKey: key,
          title: "Наш воркшоп",
          teamCount: 2,
          durationMinutes: 30,
        })
        .expect(201)
    ).body;
    host = await access(invites.hostInvite);
    captain = await access(invites.teams[0].captainInvite);
    participant = await access(invites.teams[0].participantInvite);
    curator = await access(invites.teams[0].curatorInvite);
  });
  afterEach(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });
  it("rejects unauthorised creation and isolates team reads and writes", async () => {
    await request(base)
      .post("/api/sessions")
      .send({ hostKey: "wrong", title: "X", teamCount: 2, durationMinutes: 30 })
      .expect(403);
    expect((await view(participant)).teams.map((t) => t.id)).toEqual([
      invites.teams[0].id,
    ]);
    await request(base)
      .post(`/api/teams/${invites.teams[1].id}/command`)
      .set("Cookie", captain)
      .send({ id: "foreign-team", expectedRevision: 0, type: "step", step: 2 })
      .expect(403);
    await request(base)
      .get(`/api/teams/${invites.teams[1].id}/export.pdf`)
      .set("Cookie", participant)
      .expect(403);
  });
  it("participants propose but only captain or curator confirm answers", async () => {
    await control("start").expect(200);
    const team = (await view(captain)).teams[0];
    const command = {
      id: "confirm-1",
      roundId: team.round.id,
      type: "section",
      expectedRevision: team.round.revision,
      section: "initiative",
      value: {
        purpose: "Понятный переход",
        outcome: "Условия понятны",
        change: "Новый порядок",
      },
    };
    await request(base)
      .post(`/api/teams/${team.id}/command`)
      .set("Cookie", participant)
      .send(command)
      .expect(403);
    await request(base)
      .post(`/api/teams/${team.id}/command`)
      .set("Cookie", participant)
      .send({
        id: "proposal-1",
        roundId: team.round.id,
        type: "proposal",
        section: "initiative",
        text: "Давайте подготовим руководителей",
      })
      .expect(200);
    await request(base)
      .post(`/api/teams/${team.id}/command`)
      .set("Cookie", captain)
      .send(command)
      .expect(200);
    const result = await view(participant);
    expect(result.teams[0].round.plan.initiative.purpose).toBe(
      "Понятный переход",
    );
    expect(result.teams[0].round.proposals[0].text).toBe(
      "Давайте подготовим руководителей",
    );
    await request(base)
      .post(`/api/teams/${team.id}/command`)
      .set("Cookie", participant)
      .send({
        id: "alt",
        roundId: team.round.id,
        type: "alternative",
        reason: "Так решили",
      })
      .expect(403);
  });
  it("rejects stale writes; repeated command does not create a second proposal", async () => {
    await control("start");
    const t = (await view(captain)).teams[0];
    const cmd = {
      id: "same",
      roundId: t.round.id,
      type: "proposal",
      section: "risks",
      text: "Проверить переходные условия",
    };
    await request(base)
      .post(`/api/teams/${t.id}/command`)
      .set("Cookie", participant)
      .send(cmd)
      .expect(200);
    await request(base)
      .post(`/api/teams/${t.id}/command`)
      .set("Cookie", participant)
      .send(cmd)
      .expect(200);
    expect((await view(participant)).teams[0].round.proposals).toHaveLength(1);
    const write = {
      id: "a",
      roundId: t.round.id,
      type: "section",
      expectedRevision: t.round.revision,
      section: "openQuestions",
      value: "Нужны даты",
    };
    await request(base)
      .post(`/api/teams/${t.id}/command`)
      .set("Cookie", captain)
      .send(write)
      .expect(200);
    await request(base)
      .post(`/api/teams/${t.id}/command`)
      .set("Cookie", curator)
      .send({ ...write, id: "b", value: "Другое" })
      .expect(409);
    expect((await view(curator)).teams[0].round.plan.openQuestions).toBe(
      "Нужны даты",
    );
  });
  it("validates malformed sections and blocks edits outside an active round", async () => {
    const t = (await view(captain)).teams[0];
    await request(base)
      .post(`/api/teams/${t.id}/command`)
      .set("Cookie", captain)
      .send({
        id: "wait",
        roundId: t.round.id,
        type: "section",
        expectedRevision: 0,
        section: "openQuestions",
        value: "Текст",
      })
      .expect(409);
    await control("start");
    await request(base)
      .post(`/api/teams/${t.id}/command`)
      .set("Cookie", captain)
      .send({
        id: "bad",
        roundId: t.round.id,
        type: "section",
        expectedRevision: 1,
        section: "metrics",
        value: "not-an-array",
      })
      .expect(400);
  });
  it("pauses and resumes time and restores committed answers after process restart", async () => {
    await control("start");
    now += 60000;
    await control("pause");
    let t = (await view(captain)).teams[0];
    expect(t.round.remainingMs).toBe(29 * 60000);
    now += 60000;
    expect((await view(captain)).teams[0].round.remainingMs).toBe(29 * 60000);
    await control("resume");
    t = (await view(captain)).teams[0];
    await request(base)
      .post(`/api/teams/${t.id}/command`)
      .set("Cookie", captain)
      .send({
        id: "save",
        roundId: t.round.id,
        type: "section",
        expectedRevision: t.round.revision,
        section: "ceiQuestions",
        value: "Проверить применимость",
      })
      .expect(200);
    await app.close();
    app = createApp({
      dbPath: join(dir, "game.sqlite"),
      hostKey: key,
      now: () => now,
    });
    base = await app.listen(0);
    expect((await view(captain)).teams[0].round.plan.ceiQuestions).toBe(
      "Проверить применимость",
    );
    now += 30 * 60000;
    t = (await view(captain)).teams[0];
    expect(t.round.status).toBe("finished");
    expect(t.round.event).not.toBeNull();
  });
  it("retains old rounds and content when a new case is assigned", async () => {
    await control("start");
    const first = (await view(host)).teams[0].round;
    await control("finish");
    await control("newRound", {
      teamId: invites.teams[0].id,
      caseId: "medical",
    }).expect(200);
    const t = (await view(host)).teams[0];
    expect(t.history[0].id).toBe(first.id);
    expect(t.round.caseId).toBe("medical");
    expect(t.round.plan.actions).toEqual([]);
    const content = structuredClone((await view(host)).session.content);
    content.cases.medical.title = "Изменённый кейс";
    await request(base)
      .put("/api/content")
      .set("Cookie", host)
      .send({ content })
      .expect(200);
    expect((await view(host)).teams[0].history[0].caseData.title).toBe(
      "Новая система премирования",
    );
    expect((await view(host)).teams[0].round.caseData.title).toBe(
      "Изменённый кейс",
    );
  });
  it("persists explicit plan links and selects the uncovered event after restart", async () => {
    await control("start").expect(200);
    const team = (await view(captain)).teams[0];
    let commandNumber = 0;
    async function save(section: string, value: unknown) {
      const current = (await view(captain)).teams[0].round;
      return request(base).post(`/api/teams/${team.id}/command`).set("Cookie", captain)
        .send({ id: `linked-${section}-${++commandNumber}`, roundId: current.id, type: "section", section, value, expectedRevision: current.revision });
    }
    expect((await save("actions", [{ id: "a", text: "Проверка исходных условий", stage: "Подготовка", owner: "HR", when: "До запуска", riskIds: ["legal"] }])).status).toBe(200);
    // Inspect the actual server state: links must be accepted, not just retained by the browser.
    expect((await view(participant)).teams[0].round.plan.actions[0]?.riskIds).toEqual(["legal"]);
    expect((await save("communications", [{ id: "c", audience: "Команда", message: "Учебные примеры", channel: "Teams", owner: "HR", when: "До объявления", riskIds: ["income"] }])).status).toBe(200);
    const risk = { ...(await view(captain)).teams[0].round.caseData.risks[2], id: "custom-risk", riskIds: ["trust"] };
    expect((await save("risks", [risk])).status).toBe(200);
    await control("event", { teamId: team.id }).expect(200);
    expect((await view(participant)).teams[0].round.event?.id).toBe("bonus-leaders");
    await app.close();
    app = createApp({ dbPath: join(dir, "game.sqlite"), hostKey: key, now: () => now });
    base = await app.listen(0);
    const restored = (await view(participant)).teams[0].round;
    expect(restored.plan.actions[0].riskIds).toEqual(["legal"]);
    expect(restored.plan.communications[0].riskIds).toEqual(["income"]);
    expect(restored.plan.risks[0].riskIds).toEqual(["trust"]);
    expect(restored.event?.riskIds).toEqual(["leaders"]);
    const revision = restored.revision;
    const invalid = await save("actions", [{ ...restored.plan.actions[0], riskIds: [42] }]);
    expect(invalid.status).toBe(400);
    expect((await view(captain)).teams[0].round.revision).toBe(revision);
  });
  it("accepts editable event links, rejects unknown risk IDs and accepts legacy content", async () => {
    const content = structuredClone((await view(host)).session.content);
    content.cases.bonus.events[0].riskIds = ["legal", "transition"];
    const update = () => request(base).put("/api/content").set("Cookie", host).send({ content });
    await update().expect(200);
    expect((await view(captain)).teams[0].round.caseData.events[0].riskIds).toEqual(["legal", "transition"]);
    content.cases.bonus.events[0].riskIds = ["missing-risk"];
    await update().expect(400);
    expect((await view(captain)).teams[0].round.caseData.events[0].riskIds).toEqual(["legal", "transition"]);
    for (const data of Object.values(content.cases)) data.events.forEach((e) => delete e.riskIds);
    await update().expect(200);
    await control("start").expect(200);
    await control("event", { teamId: invites.teams[0].id }).expect(200);
    expect((await view(captain)).teams[0].round.event?.id).toBe("bonus-legal");
  });
  it("revokes previous captain invitations and active cookies", async () => {
    const r = await control("rotateCaptain", {
      teamId: invites.teams[0].id,
    }).expect(200);
    await request(base).get("/api/state").set("Cookie", captain).expect(401);
    await request(base)
      .post("/api/access")
      .send({ token: invites.teams[0].captainInvite })
      .expect(401);
    const replacement = await access(r.body.invite);
    expect((await view(replacement)).role).toBe("captain");
  });
  it("can reissue curator access after the original invitation is lost", async () => {
    const r = await control("rotateCurator", {
      teamId: invites.teams[0].id,
    }).expect(200);
    await request(base).get("/api/state").set("Cookie", curator).expect(401);
    expect((await view(await access(r.body.invite))).role).toBe("curator");
  });
  it("invalidates the old credential on logout", async () => {
    await request(base)
      .post("/api/logout")
      .set("Cookie", captain)
      .send({})
      .expect(200);
    await request(base).get("/api/state").set("Cookie", captain).expect(401);
  });
  it("does not persist the raw login credential in command deduplication records", async () => {
    await control("start");
    const t = (await view(captain)).teams[0];
    await request(base)
      .post(`/api/teams/${t.id}/command`)
      .set("Cookie", captain)
      .send({
        id: "safe",
        roundId: t.round.id,
        type: "section",
        expectedRevision: t.round.revision,
        section: "openQuestions",
        value: "Вопрос",
      })
      .expect(200);
    const keys = app.store.db.prepare("SELECT key FROM commands").all();
    expect(JSON.stringify(keys)).not.toContain(
      captain.slice("hr_game=".length),
    );
  });
  it("rejects section and proposal commands belonging to a previous round", async () => {
    await control("start");
    const old = (await view(captain)).teams[0].round;
    await control("finish");
    await control("newRound", {
      teamId: invites.teams[0].id,
      caseId: "medical",
    });
    await control("start");
    for (const body of [
      {
        type: "section",
        section: "openQuestions",
        value: "Ответ прежнего кейса",
        expectedRevision: old.revision,
      },
      {
        type: "proposal",
        section: "openQuestions",
        text: "Предложение прежнего кейса",
      },
    ])
      await request(base)
        .post(`/api/teams/${invites.teams[0].id}/command`)
        .set("Cookie", captain)
        .send({ id: `old-${body.type}`, roundId: old.id, ...body })
        .expect(409);
    const current = (await view(captain)).teams[0].round;
    expect(current.plan.openQuestions).toBe("");
    expect(current.proposals).toHaveLength(0);
  });
  it.each(["event", "finish"])(
    "broadcasts an automatic %s transition first discovered by a state read",
    async (kind) => {
      await control("start");
      const socket = connect(base, {
        transports: ["websocket"],
        extraHeaders: { Cookie: participant },
        forceNew: true,
        reconnection: false,
      });
      const states: View[] = [];
      socket.on("state", (v) => states.push(v));
      try {
        await new Promise<void>((resolve, reject) => {
          socket.once("state", () => resolve());
          socket.once("connect_error", reject);
        });
        now += (kind === "event" ? 23 : 30) * 60000;
        await view(host);
        await expect
          .poll(
            () =>
              states.some((v) =>
                kind === "event"
                  ? !!v.teams[0].round.event
                  : v.teams[0].round.status === "finished",
              ),
            { timeout: 1800 },
          )
          .toBe(true);
      } finally {
        socket.disconnect();
      }
    },
  );
  it("does not disclose a team join code in an exported filename", async () => {
    const result = await request(base)
      .get(`/api/teams/${invites.teams[0].id}/export.pdf`)
      .set("Cookie", captain)
      .expect(200);
    expect(result.headers["content-disposition"]).not.toContain(
      invites.teams[0].code,
    );
  });
  it("delivers confirmed updates to 20 authenticated clients and rejects foreign room access", async () => {
    await control("start");
    const sockets: Socket[] = [];
    try {
      const views = await Promise.all(
        Array.from({ length: 20 }, async (_, i) => {
          const cookie = await access(invites.teams[i % 2].participantInvite);
          const socket = connect(base, {
            transports: ["websocket"],
            extraHeaders: { Cookie: cookie },
            forceNew: true,
            reconnection: false,
          });
          sockets.push(socket);
          return new Promise<View>((resolve, reject) => {
            socket.once("state", resolve);
            socket.once("connect_error", reject);
          });
        }),
      );
      expect(views).toHaveLength(20);
      expect(views[1].teams[0].id).toBe(invites.teams[1].id);
      const received = new Promise<View>((resolve) =>
        sockets[0].once("state", resolve),
      );
      const t = (await view(captain)).teams[0];
      await request(base)
        .post(`/api/teams/${t.id}/command`)
        .set("Cookie", captain)
        .send({
          id: "sync",
          roundId: t.round.id,
          type: "section",
          expectedRevision: t.round.revision,
          section: "openQuestions",
          value: "Общий ответ",
        })
        .expect(200);
      expect((await received).teams[0].round.plan.openQuestions).toBe(
        "Общий ответ",
      );
      const forbidden = connect(base, {
        transports: ["websocket"],
        forceNew: true,
        reconnection: false,
      });
      sockets.push(forbidden);
      await new Promise<void>((resolve, reject) => {
        forbidden.once("connect_error", () => resolve());
        forbidden.once("connect", () =>
          reject(new Error("Unauthenticated socket accepted")),
        );
      });
    } finally {
      sockets.forEach((s) => s.disconnect());
    }
  });
});

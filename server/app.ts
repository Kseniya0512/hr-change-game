import express from "express";
import { createServer } from "node:http";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { resolve } from "node:path";
import { Server } from "socket.io";
import { z } from "zod";
import { defaultContent } from "../shared/content.ts";
import { chooseEvent, emptyPlan, remaining } from "../shared/plan.ts";
import type {
  Access,
  CaseId,
  PlanSection,
  Round,
  Session,
  Team,
  View,
} from "../shared/model.ts";
import { Store } from "./store.ts";
import {
  commandBase,
  contentSchema,
  createSchema,
  sectionSchemas,
} from "./validation.ts";

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
const fail = (status: number, message: string): never => {
  throw new HttpError(status, message);
};
const cookieValue = (header?: string) =>
  header
    ?.split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("hr_game="))
    ?.slice(8);
const equal = (a: string, b: string) => {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export function createApp(options: {
  dbPath: string;
  hostKey: string;
  now?: () => number;
}) {
  const now = options.now || Date.now,
    store = new Store(options.dbPath),
    app = express(),
    http = createServer(app);
  if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(express.json({ limit: "256kb" }));
  app.use((req, res, next) => {
    res.set({
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
    });
    if (
      req.method !== "GET" &&
      req.headers.origin &&
      new URL(req.headers.origin).host !== req.headers.host
    )
      return res.status(403).json({ error: "Недопустимый источник запроса" });
    next();
  });
  const io = new Server(http, {
    allowRequest: (req, cb) => {
      const origin = req.headers.origin;
      let valid = true;
      try {
        valid = !origin || new URL(origin).host === req.headers.host;
      } catch {
        valid = false;
      }
      cb(null, valid);
    },
  });
  const attempts = new Map<string, { count: number; until: number }>();
  app.use(["/api/access", "/api/sessions"], (req, res, next) => {
    if (req.method !== "POST") return next();
    const ip = req.ip || "local",
      t = now();
    if (attempts.size > 5000)
      for (const [k, v] of attempts) if (v.until < t) attempts.delete(k);
    let a = attempts.get(ip);
    if (!a || a.until < t) {
      a = { count: 0, until: t + 60000 };
      attempts.set(ip, a);
    }
    if (++a.count > 80)
      return res
        .status(429)
        .json({ error: "Слишком много попыток. Подождите минуту." });
    next();
  });
  function access(req: express.Request): Access {
    return (
      store.authenticate(cookieValue(req.headers.cookie)) ||
      fail(401, "Войдите по ссылке или коду команды")
    );
  }
  function session(a: Access): Session {
    return store.get(a.sessionId) || fail(404, "Сессия не найдена");
  }
  function teamFor(s: Session, a: Access, id: string) {
    if (a.role !== "host" && a.teamId !== id)
      fail(403, "Нет доступа к этой команде");
    return s.teams.find((t) => t.id === id) || fail(404, "Команда не найдена");
  }
  function makeRound(
    s: Pick<Session, "content" | "durationMinutes">,
    caseId: CaseId,
  ): Round {
    return {
      id: randomUUID(),
      createdAt: now(),
      caseId,
      caseData: structuredClone(s.content.cases[caseId]),
      contentVersion: s.content.version,
      criteria: [...s.content.criteria],
      roles: [...s.content.roles],
      hints: structuredClone(s.content.hints),
      revision: 0,
      step: 0,
      status: "waiting",
      remainingMs: s.durationMinutes * 60000,
      deadline: null,
      plan: emptyPlan(),
      proposals: [],
      comments: [],
      event: null,
      alternative: "",
      helpLog: [],
    };
  }
  function settle(s: Session) {
    let changed = false;
    for (const t of s.teams) {
      const r = t.round;
      if (r.status === "running") {
        const left = remaining(r, now());
        if (left <= 7 * 60000 && !r.event) {
          r.event = chooseEvent(r.caseData, r.plan);
          changed = true;
        }
        if (left === 0) {
          r.status = "finished";
          r.finishedAt = r.deadline ?? now();
          r.remainingMs = 0;
          r.deadline = null;
          r.step = 5;
          r.revision++;
          changed = true;
        }
      }
    }
    if (changed) {
      store.commit(s);
      broadcast(s.id);
    }
    return changed;
  }
  function view(a: Access): View {
    const s = session(a);
    return {
      role: a.role,
      teamId: a.teamId,
      name: a.name,
      session: {
        id: s.id,
        title: s.title,
        durationMinutes: s.durationMinutes,
        content: s.content,
      },
      teams:
        a.role === "host" ? s.teams : s.teams.filter((t) => t.id === a.teamId),
      serverNow: now(),
    };
  }
  function broadcast(sessionId: string) {
    for (const socket of io.sockets.sockets.values()) {
      const a = store.authenticate(cookieValue(socket.request.headers.cookie));
      if (!a) {
        socket.disconnect(true);
        continue;
      }
      if (a.sessionId === sessionId) socket.emit("state", view(a));
    }
  }
  io.use((socket, next) => {
    const a = store.authenticate(cookieValue(socket.request.headers.cookie));
    if (!a) return next(new Error("Требуется вход"));
    socket.data.access = a;
    next();
  });
  io.on("connection", (socket) => {
    settle(session(socket.data.access));
    socket.emit("state", view(socket.data.access));
  });

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.post("/api/sessions", (req, res) => {
    const data = createSchema.parse(req.body);
    if (!options.hostKey || !equal(data.hostKey, options.hostKey))
      fail(403, "Неверный ключ ведущего");
    const s: Session = {
      id: randomUUID(),
      title: data.title,
      durationMinutes: data.durationMinutes,
      content: structuredClone(defaultContent),
      teams: [],
      createdAt: now(),
    };
    const result = {
      sessionId: s.id,
      hostInvite: store.invite({
        role: "host",
        sessionId: s.id,
        name: "Ведущий",
      }),
      teams: [] as {
        id: string;
        name: string;
        code: string;
        participantInvite: string;
        captainInvite: string;
        curatorInvite: string;
      }[],
    };
    for (let i = 0; i < data.teamCount; i++) {
      let code: string;
      do {
        code = String(Math.floor(100000 + Math.random() * 900000));
      } while (
        store.all().some((x) => x.teams.some((t) => t.code === code)) ||
        s.teams.some((t) => t.code === code)
      );
      const t: Team = {
        id: randomUUID(),
        name: `Команда ${i + 1}`,
        code,
        round: makeRound(s, i % 2 ? "medical" : "bonus"),
        history: [],
      };
      s.teams.push(t);
      result.teams.push({
        id: t.id,
        name: t.name,
        code,
        participantInvite: store.invite({
          role: "participant",
          sessionId: s.id,
          teamId: t.id,
          name: "Участник",
        }),
        captainInvite: store.invite({
          role: "captain",
          sessionId: s.id,
          teamId: t.id,
          name: "Капитан",
        }),
        curatorInvite: store.invite({
          role: "curator",
          sessionId: s.id,
          teamId: t.id,
          name: "Куратор команды",
        }),
      });
    }
    store.commit(s);
    res.status(201).json(result);
  });
  app.post("/api/access", (req, res) => {
    const data = z
      .object({
        token: z.string().max(100).optional(),
        code: z
          .string()
          .regex(/^\d{6}$/)
          .optional(),
        name: z.string().trim().max(40).default(""),
      })
      .strict()
      .parse(req.body);
    const c =
      (data.token
        ? store.credential(data.token, data.name)
        : data.code
          ? store.codeCredential(data.code, data.name)
          : null) || fail(401, "Ссылка или код недействительны");
    res
      .cookie("hr_game", c.value, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 3600000,
        path: "/",
      })
      .json(c.access);
  });
  app.post("/api/logout", (req, res) => {
    const value = cookieValue(req.headers.cookie),
      a = store.authenticate(value);
    store.logout(value);
    if (a) broadcast(a.sessionId);
    res.clearCookie("hr_game", { path: "/" }).json({ ok: true });
  });
  app.get("/api/state", (req, res) => {
    const a = access(req);
    settle(session(a));
    res.json(view(a));
  });
  app.post("/api/teams/:id/command", (req, res) => {
    const a = access(req),
      s = session(a),
      t = teamFor(s, a, String(req.params.id));
    settle(s);
    const r = t.round,
      cmd = commandBase.parse(req.body);
    if (cmd.roundId !== r.id)
      fail(409, "Этот раунд уже сменился. Откройте актуальный кейс.");
    const commandKey = `${s.id}:${cmd.roundId}:${cookieValue(req.headers.cookie)}:${cmd.id}`;
    if (store.seen(commandKey)) return res.json(view(a));
    const editable = a.role === "captain" || a.role === "curator";
    if (["section", "step", "proposalDecision"].includes(cmd.type) && !editable)
      fail(403, "Ответы фиксирует капитан или куратор");
    if (["comment", "alternative"].includes(cmd.type) && a.role !== "curator")
      fail(403, "Это действие доступно куратору команды");
    if (cmd.type !== "hint" && r.status !== "running")
      fail(409, "Раунд ещё не запущен, приостановлен или завершён");
    if (
      ["section", "step"].includes(cmd.type) &&
      cmd.expectedRevision !== r.revision
    )
      fail(
        409,
        "План изменился. Просмотрите актуальный ответ перед повторной отправкой.",
      );
    switch (cmd.type) {
      case "section": {
        const section = z
          .enum(Object.keys(sectionSchemas) as [PlanSection, ...PlanSection[]])
          .parse(cmd.section);
        const value = sectionSchemas[section].parse(cmd.value);
        (r.plan as unknown as Record<string, unknown>)[section] = value;
        r.revision++;
        break;
      }
      case "step":
        r.step = z.number().int().min(0).max(5).parse(cmd.step);
        r.revision++;
        break;
      case "proposal":
        if (r.proposals.length >= 300)
          fail(429, "В раунде уже много предложений. Обсудите существующие.");
        r.proposals.push({
          id: randomUUID(),
          section: z
            .enum(
              Object.keys(sectionSchemas) as [PlanSection, ...PlanSection[]],
            )
            .parse(cmd.section),
          text: z.string().trim().min(1).max(2000).parse(cmd.text),
          author: a.name || "Участник",
          status: "pending",
          at: now(),
        });
        break;
      case "proposalDecision": {
        const p =
          r.proposals.find((p) => p.id === cmd.proposalId) ||
          fail(404, "Предложение не найдено");
        p.status = z.enum(["accepted", "dismissed"]).parse(cmd.status);
        break;
      }
      case "comment":
        if (r.comments.length >= 300) fail(429, "Достигнут лимит комментариев");
        r.comments.push({
          id: randomUUID(),
          text: z.string().trim().min(1).max(2000).parse(cmd.text),
          author: a.name || "Куратор",
          at: now(),
        });
        break;
      case "hint":
        if (r.helpLog.length < 600)
          r.helpLog.push({
            step: z.number().int().min(0).max(5).parse(cmd.step),
            kind: z.enum(["hint", "cei", "missed"]).parse(cmd.kind),
            at: now(),
          });
        break;
      case "alternative":
        r.alternative = z.string().trim().min(1).max(2000).parse(cmd.reason);
        break;
    }
    store.commit(s, commandKey);
    broadcast(s.id);
    res.json(view(a));
  });
  app.post("/api/sessions/:id/control", (req, res) => {
    const a = access(req);
    if (a.role !== "host" || a.sessionId !== req.params.id)
      fail(403, "Доступно ведущему этой сессии");
    const s = session(a);
    settle(s);
    const d = z
      .object({
        action: z.enum([
          "start",
          "pause",
          "resume",
          "extend",
          "finish",
          "event",
          "newRound",
          "assign",
          "rotateCaptain",
          "rotateCurator",
        ]),
        teamId: z.string().optional(),
        caseId: z.enum(["bonus", "medical"]).optional(),
        eventId: z.string().max(100).optional(),
        minutes: z.number().int().min(1).max(60).optional(),
      })
      .strict()
      .parse(req.body);
    const targets = d.teamId ? [teamFor(s, a, d.teamId)] : s.teams;
    let invite: string | undefined;
    if (
      ["newRound", "assign", "rotateCaptain", "rotateCurator"].includes(
        d.action,
      ) &&
      !d.teamId
    )
      fail(400, "Выберите команду");
    for (const t of targets) {
      const r = t.round;
      switch (d.action) {
        case "start":
          if (r.status === "waiting") {
            r.startedAt = now();
            r.status = "running";
            r.deadline = now() + r.remainingMs;
            r.revision++;
          }
          break;
        case "pause":
          if (r.status === "running") {
            r.remainingMs = remaining(r, now());
            r.deadline = null;
            r.status = "paused";
            r.revision++;
          }
          break;
        case "resume":
          if (r.status === "paused") {
            r.status = "running";
            r.deadline = now() + r.remainingMs;
            r.revision++;
          }
          break;
        case "extend": {
          const extra = (d.minutes || 5) * 60000;
          if (r.status === "running" && r.deadline) r.deadline += extra;
          else {
            r.remainingMs += extra;
            if (r.status === "finished") {
              r.status = "paused";
              r.step = 4;
            }
          }
          r.revision++;
          break;
        }
        case "finish":
          r.finishedAt = now();
          r.remainingMs = remaining(r, now());
          r.deadline = null;
          r.status = "finished";
          r.step = 5;
          r.revision++;
          break;
        case "event":
          if (r.status !== "running")
            fail(409, "Событие доступно в запущенном раунде");
          if (!r.event) {
            r.event = d.eventId
              ? r.caseData.events.find((e) => e.id === d.eventId) ||
                fail(400, "Событие не найдено")
              : chooseEvent(r.caseData, r.plan);
          }
          break;
        case "newRound":
          if (r.status !== "finished")
            fail(409, "Сначала завершите текущий раунд");
          t.history.push(structuredClone(r));
          t.round = makeRound(
            s,
            d.caseId || (r.caseId === "bonus" ? "medical" : "bonus"),
          );
          break;
        case "assign":
          if (r.status !== "waiting")
            fail(409, "Кейс можно сменить до начала раунда");
          t.round = makeRound(s, d.caseId || "bonus");
          break;
        case "rotateCaptain":
        case "rotateCurator": {
          const role = d.action === "rotateCaptain" ? "captain" : "curator";
          store.revoke(s.id, t.id, role);
          invite = store.invite({
            role,
            sessionId: s.id,
            teamId: t.id,
            name: role === "captain" ? "Капитан" : "Куратор команды",
          });
          break;
        }
      }
    }
    store.commit(s);
    broadcast(s.id);
    res.json({ state: view(a), invite });
  });
  app.put("/api/content", (req, res) => {
    const a = access(req);
    if (a.role !== "host") fail(403, "Доступно ведущему");
    const s = session(a);
    settle(s);
    if (s.teams.some((t) => ["running", "paused"].includes(t.round.status)))
      fail(409, "Редактируйте материалы между раундами");
    const content = contentSchema.parse(req.body.content);
    content.version = `custom-${now()}`;
    s.content = content;
    for (const t of s.teams)
      if (t.round.status === "waiting") {
        const old = t.round;
        t.round = {
          ...makeRound(s, old.caseId),
          id: old.id,
          revision: old.revision + 1,
        };
      }
    store.commit(s);
    broadcast(s.id);
    res.json(view(a));
  });
  app.get("/api/teams/:id/export.pdf", async (req, res, next) => {
    try {
      const a = access(req),
        s = session(a),
        t = teamFor(s, a, String(req.params.id));
      if (a.role === "participant")
        fail(403, "Экспорт доступен капитану, куратору и ведущему");
      settle(s);
      const r = req.query.roundId
        ? [t.round, ...t.history].find((r) => r.id === req.query.roundId) ||
          fail(404, "Раунд не найден")
        : t.round;
      const { renderPlanPdf } = await import("./pdf.ts");
      const data = await renderPlanPdf(t, r);
      res
        .set({
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="change-plan-${t.id}-${r.id}.pdf"`,
        })
        .send(data);
    } catch (e) {
      next(e);
    }
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "Маршрут не найден" }),
  );
  app.use(express.static(resolve("dist"), { index: false }));
  app.get("/{*path}", (_req, res) => res.sendFile(resolve("dist/index.html")));
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (err instanceof z.ZodError)
        return res.status(400).json({
          error: "Проверьте заполнение полей",
          details: err.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
        });
      if (err instanceof HttpError)
        return res.status(err.status).json({ error: err.message });
      if (err instanceof SyntaxError)
        return res.status(400).json({ error: "Не удалось прочитать запрос" });
      console.error(
        "Request failed:",
        err instanceof Error ? err.message : "unknown",
      );
      res
        .status(500)
        .json({ error: "Не удалось выполнить действие. Попробуйте ещё раз." });
    },
  );
  const interval = setInterval(() => {
    for (const s of store.all()) settle(s);
  }, 1000);
  interval.unref();
  let closed = false;
  return {
    http,
    store,
    listen: (port = 3000) =>
      new Promise<string>((resolve) =>
        http.listen(port, "0.0.0.0", () => {
          const addr = http.address();
          resolve(
            `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : port}`,
          );
        }),
      ),
    close: async () => {
      if (closed) return;
      closed = true;
      clearInterval(interval);
      await new Promise<void>((resolve) => io.close(() => resolve()));
      store.close();
    },
  };
}

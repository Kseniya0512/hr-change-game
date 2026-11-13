import { z } from "zod";
import type { CaseId, Round } from "../../shared/model.ts";
import { defaultContent } from "../../shared/content.ts";
import { chooseEvent, emptyPlan, remaining } from "../../shared/plan.ts";
// This module contains only pure Zod schemas; no server runtime is imported.
import { sectionSchemas } from "../../server/validation.ts";

const savedSchema = z.object({
  version: z.literal(1),
  caseId: z.enum(["bonus", "medical"]),
  plan: z.object(sectionSchemas).strict(),
  step: z.number().int().min(0).max(5),
  revision: z.number().int().nonnegative(),
  status: z.enum(["paused", "running", "finished"]),
  remainingMs: z.number().finite().nonnegative(),
  deadline: z.number().finite().nullable(),
  createdAt: z.number().finite(),
  startedAt: z.number().finite().optional(),
  eventId: z.string().nullable(),
}).strict();

export function createStandaloneStore(
  storage: Pick<Storage, "getItem" | "setItem">,
  now: () => number = Date.now,
) {
  const key = (caseId: CaseId) => `hr-change.pages.v1.${caseId}`;
  function fresh(caseId: CaseId): Round {
    return {
      id: `pages-${caseId}`, caseId, createdAt: now(),
      caseData: structuredClone(defaultContent.cases[caseId]),
      contentVersion: defaultContent.version,
      criteria: [...defaultContent.criteria], roles: [...defaultContent.roles],
      hints: structuredClone(defaultContent.hints),
      revision: 0, step: 0, status: "paused", remainingMs: 30 * 60000,
      deadline: null, plan: emptyPlan(), proposals: [], comments: [],
      event: null, alternative: "", helpLog: [],
    };
  }
  function save(round: Round): Round {
    let previous: string | null;
    try { previous = storage.getItem(key(round.caseId)); }
    catch { throw new Error("Не удалось сохранить план: хранилище браузера недоступно."); }
    if (previous !== null) {
      let stored: z.infer<typeof savedSchema>;
      try { stored = savedSchema.parse(JSON.parse(previous)); }
      catch { throw new Error("Сохранённый план поврежден. Исходные данные не перезаписаны."); }
      if (stored.revision !== round.revision)
        throw new Error("План изменился в другой вкладке. Скопируйте свой текст и обновите страницу перед повторным сохранением.");
    }
    const next = structuredClone(round);
    next.revision++;
    const value = savedSchema.parse({
      version: 1, caseId: next.caseId, plan: next.plan, step: next.step,
      revision: next.revision, status: next.status, remainingMs: next.remainingMs,
      deadline: next.deadline, createdAt: next.createdAt, startedAt: next.startedAt,
      eventId: next.event?.id ?? null,
    });
    try { storage.setItem(key(round.caseId), JSON.stringify(value)); }
    catch { throw new Error("Не удалось сохранить план в браузере. Текст оставлен на экране; проверьте доступность и свободное место хранилища."); }
    return next;
  }
  function advance(round: Round): Round {
    if (round.status !== "running") return round;
    const left = remaining(round, now());
    if (left > 7 * 60000 && left > 0) return round;
    const next = structuredClone(round);
    let changed = false;
    if (!next.event) { next.event = chooseEvent(next.caseData, next.plan); changed = true; }
    if (left === 0) {
      next.status = "finished"; next.remainingMs = 0; next.deadline = null;
      changed = true;
    }
    return changed ? next : round;
  }
  function settle(round: Round): Round {
    const next = advance(round);
    return next === round ? round : save(next);
  }
  function load(caseId: CaseId): Round {
    let raw: string | null;
    try { raw = storage.getItem(key(caseId)); }
    catch { throw new Error("Хранилище браузера недоступно. Разрешите сохранение данных и повторите попытку."); }
    if (raw === null) return fresh(caseId);
    let saved: z.infer<typeof savedSchema>;
    try {
      saved = savedSchema.parse(JSON.parse(raw));
      if (saved.caseId !== caseId || (saved.status === "running" && saved.deadline === null)) throw new Error();
    } catch { throw new Error("Сохранённый план поврежден или имеет неподдерживаемый формат. Исходные данные не перезаписаны."); }
    const round = { ...fresh(caseId), ...saved };
    round.event = round.caseData.events.find((event) => event.id === saved.eventId) ?? null;
    return advance(round);
  }
  return { load, save, settle };
}

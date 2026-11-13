import type { CaseData, CriterionAnswer, GameEvent, Plan, Round } from "./model.ts";
export function emptyPlan(): Plan {
  return {
    initiative: { purpose: "", outcome: "", change: "" },
    assessment: {
      ceiTiming: "",
      criteria: Array(8).fill("unknown"),
      scale: "",
      route: "",
      reason: "",
    },
    stakeholders: [],
    sponsor: { candidate: "", reason: "" },
    actions: [],
    communications: [],
    risks: [],
    support: { channels: [], owner: "", escalation: "", update: "" },
    metrics: [],
    eventResponse: "",
    openQuestions: "",
    ceiQuestions: "",
  };
}
export function frameworkResult(answers: CriterionAnswer[]) {
  if (answers.filter((a) => a === "yes").length >= 2) return "applies";
  return answers.includes("unknown") ? "clarify" : "inform";
}
export function completion(p: Plan) {
  const checks: [string, boolean][] = [
    ["Цель", !!p.initiative.purpose.trim()],
    ["Ожидаемый результат", !!p.initiative.outcome.trim()],
    [
      "Применимость",
      !!p.assessment.ceiTiming && !p.assessment.criteria.includes("unknown"),
    ],
    [
      "Масштаб и маршрут",
      !!p.assessment.scale &&
        !!p.assessment.route &&
        !!p.assessment.reason.trim(),
    ],
    ["Участники", p.stakeholders.some((r) => !!r.action.trim())],
    ["Спонсор", !!p.sponsor.candidate && !!p.sponsor.reason.trim()],
    [
      "Действия по этапам",
      ["Подготовка", "Старт", "Основная часть", "Завершение"].every((s) =>
        p.actions.some(
          (a) =>
            a.stage === s && a.text.trim() && a.owner.trim() && a.when.trim(),
        ),
      ),
    ],
    [
      "Коммуникации",
      p.communications.some(
        (c) =>
          c.audience.trim() &&
          c.message.trim() &&
          c.owner.trim() &&
          c.when.trim(),
      ),
    ],
    ["Риски", p.risks.some((r) => r.prevention.trim() && r.response.trim())],
    [
      "Поддержка",
      !!p.support.owner.trim() &&
        p.support.channels.length > 0 &&
        !!p.support.escalation.trim() &&
        !!p.support.update.trim(),
    ],
    [
      "Метрики",
      p.metrics.length >= 3 &&
        p.metrics.length <= 5 &&
        p.metrics.every((m) => m.measure.trim() && m.source.trim()),
    ],
    ["Реакция на событие", !!p.eventResponse.trim()],
    [
      "Вопросы для уточнения",
      !!p.openQuestions.trim() || !!p.ceiQuestions.trim(),
    ],
  ];
  return {
    done: checks.filter((c) => c[1]).length,
    total: checks.length,
    missing: checks.filter((c) => !c[1]).map((c) => c[0]),
  };
}
export function preparedResponses(plan: Plan, event: GameEvent): string[] {
  const links = new Set(event.riskIds ?? []);
  const linked = (ids: string[] = []) => ids.some((id) => links.has(id));
  const filled = (...values: string[]) => values.every((value) => !!value.trim());
  return [...new Set([
    ...plan.actions
      .filter((a) => linked(a.riskIds) && filled(a.text, a.owner, a.when))
      .map((a) => a.text),
    ...plan.communications
      .filter((c) => linked(c.riskIds) && filled(c.audience, c.message, c.channel, c.owner, c.when))
      .map((c) => c.message),
    ...plan.risks
      .filter((r) => linked([r.id, ...(r.riskIds ?? [])]) && filled(r.title, r.cause, r.consequence, r.prevention, r.response))
      .map((r) => r.title),
  ])];
}
export function chooseEvent(data: CaseData, plan: Plan): GameEvent {
  const linkedEvents = data.events.filter((e) => e.riskIds?.length);
  return linkedEvents.find((e) => preparedResponses(plan, e).length === 0)
    ?? linkedEvents.find((e) => plan.risks.some((r) => e.riskIds!.some((id) => r.id === id || r.riskIds?.includes(id))))
    ?? data.events[0];
}
export function remaining(round: Round, now = Date.now()) {
  return round.status === "running" && round.deadline !== null
    ? Math.max(0, round.deadline - now)
    : round.remainingMs;
}
export function timerText(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

import type { CaseData, CriterionAnswer, Plan, Round } from "./model.ts";
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
export function chooseEvent(data: CaseData, plan: Plan) {
  if (!plan.actions.some((a) => /юрид|ограничен|полис|переход/i.test(a.text)))
    return data.events[0];
  if (!plan.communications.some((c) => /руковод/i.test(c.audience)))
    return data.events.find((e) => e.id.endsWith("leaders")) || data.events[0];
  if (!plan.support.owner)
    return data.events.find((e) => e.focus === "support") || data.events[0];
  return (
    data.events.find((e) => e.focus === "risks") ||
    data.events[1] ||
    data.events[0]
  );
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

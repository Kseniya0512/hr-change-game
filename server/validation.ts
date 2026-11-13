import { z } from "zod";
const text = z.string().max(4000),
  short = z.string().max(240),
  id = z.string().min(1).max(100);
const stage = z.enum(["Подготовка", "Старт", "Основная часть", "Завершение"]);
const riskIds = z.array(id).max(15).optional();
const action = z
  .object({ id, text, stage, owner: short, when: short, riskIds })
  .strict();
const risk = z
  .object({
    id,
    riskIds,
    title: short,
    cause: text,
    consequence: text,
    prevention: text,
    response: text,
  })
  .strict();
const metric = z
  .object({
    id,
    title: short,
    measure: text,
    source: text,
    owner: short,
    when: short,
  })
  .strict();
export const sectionSchemas = {
  initiative: z.object({ purpose: text, outcome: text, change: text }).strict(),
  assessment: z
    .object({
      ceiTiming: short,
      criteria: z.array(z.enum(["yes", "no", "unknown"])).length(8),
      scale: short,
      route: short,
      reason: text,
    })
    .strict(),
  stakeholders: z
    .array(
      z.object({ id, role: short, why: text, stage, action: text }).strict(),
    )
    .max(40),
  sponsor: z.object({ candidate: short, reason: text }).strict(),
  actions: z.array(action).max(40),
  communications: z
    .array(
      z
        .object({
          id,
          riskIds,
          audience: short,
          message: text,
          channel: short,
          owner: short,
          when: short,
        })
        .strict(),
    )
    .max(30),
  risks: z.array(risk).max(30),
  support: z
    .object({
      channels: z.array(short).max(10),
      owner: short,
      escalation: text,
      update: text,
    })
    .strict(),
  metrics: z.array(metric).max(5),
  eventResponse: text,
  openQuestions: text,
  ceiQuestions: text,
};
const event = z
  .object({
    id,
    riskIds,
    title: short,
    text,
    focus: z.enum([
      "initiative",
      "assessment",
      "stakeholders",
      "sponsor",
      "actions",
      "communications",
      "risks",
      "support",
      "metrics",
      "eventResponse",
      "openQuestions",
      "ceiQuestions",
    ]),
    prompt: text,
  })
  .strict();
const caseSchema = z
  .object({
    id: z.enum(["bonus", "medical"]),
    label: short,
    title: short,
    before: text,
    after: text,
    why: text,
    groups: z.array(short).max(20),
    notice: text,
    goals: z.array(short).max(12),
    actions: z.array(short).max(30),
    risks: z.array(risk).min(1).max(15),
    metrics: z
      .array(metric.omit({ id: true }))
      .min(1)
      .max(15),
    events: z.array(event).min(1).max(10),
  })
  .strict()
  .refine(
    (c) => c.events.every((e) => (e.riskIds ?? []).every((id) => c.risks.some((r) => r.id === id))),
    "Связывайте события с рисками из этого кейса",
  );
export const contentSchema = z
  .object({
    version: short.min(1),
    roles: z.array(short.min(1)).min(1).max(40),
    criteria: z.array(short.min(1)).length(8),
    cases: z.object({ bonus: caseSchema, medical: caseSchema }).strict(),
    hints: z
      .array(
        z
          .object({ hint: text, cei: text, missed: text, source: text })
          .strict(),
      )
      .length(6),
  })
  .strict()
  .refine(
    (c) => c.cases.bonus.id === "bonus" && c.cases.medical.id === "medical",
    "Нельзя менять идентификаторы кейсов",
  );
export const commandBase = z
  .object({
    id: id,
    roundId: id,
    type: z.enum([
      "section",
      "step",
      "proposal",
      "proposalDecision",
      "comment",
      "hint",
      "alternative",
    ]),
    expectedRevision: z.number().int().nonnegative().optional(),
  })
  .passthrough();
export const createSchema = z
  .object({
    hostKey: z.string().max(300),
    title: z.string().trim().min(1).max(100),
    teamCount: z.number().int().min(2).max(3),
    durationMinutes: z.number().int().min(5).max(120),
  })
  .strict();

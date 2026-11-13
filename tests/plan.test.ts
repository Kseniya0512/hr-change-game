import { describe, it, expect } from "vitest";
import {
  emptyPlan,
  frameworkResult,
  completion,
  chooseEvent,
  preparedResponses,
} from "../shared/plan.ts";
import { defaultContent } from "../shared/content.ts";
describe("methodology and training behavior", () => {
  it("applies at two yes answers; unknown criteria are not counted as no", () => {
    expect(frameworkResult(["yes", "yes", "no"])).toBe("applies");
    expect(frameworkResult(["yes", "no", "unknown"])).toBe("clarify");
    expect(frameworkResult(["no", "no", "no"])).toBe("inform");
  });
  it("reports empty plan as incomplete without grading decisions", () => {
    const result = completion(emptyPlan());
    expect(result.done).toBe(0);
    expect(result.total).toBe(13);
    expect(result.missing).toContain("Метрики");
  });
  it("selects a legal event for a bonus plan missing preparation", () => {
    const plan = emptyPlan();
    expect(chooseEvent(defaultContent.cases.bonus, plan).id).toBe(
      "bonus-legal",
    );
  });
  it("uses explicit links rather than interpreting the wording of actions", () => {
    const data = structuredClone(defaultContent.cases.bonus);
    const plan = emptyPlan();
    plan.actions.push({
      id: "own-action", text: "Согласовать исходные условия", stage: "Подготовка",
      owner: "Ответственная функция", when: "До объявления", riskIds: ["legal"],
    });
    expect(chooseEvent(data, plan).id).toBe("bonus-income");
    plan.actions[0].text = "Проверить ограничения и переход";
    expect(chooseEvent(data, plan).id).toBe("bonus-income");
    delete plan.actions[0].riskIds;
    expect(chooseEvent(data, plan).id).toBe("bonus-legal");
  });
  it("requires a prepared response, not just a selected risk card", () => {
    const data = defaultContent.cases.bonus;
    const event = data.events[0];
    const plan = emptyPlan();
    plan.risks.push({ ...data.risks[0], prevention: "", response: "" });
    expect(preparedResponses(plan, event)).toEqual([]);
    expect(chooseEvent(data, plan).id).toBe("bonus-legal");
    plan.risks[0].prevention = "Уточнить обязательства";
    plan.risks[0].response = "Урегулировать вопрос до запуска";
    expect(preparedResponses(plan, event)).toContain(data.risks[0].title);
    expect(chooseEvent(data, plan).id).toBe("bonus-income");
  });
  it("recognizes linked custom risks and communications without reading their prose", () => {
    const data = defaultContent.cases.medical;
    const plan = emptyPlan();
    const event = data.events.find((e) => e.id === "medical-leaders")!;
    plan.communications.push({
      id: "own-message", audience: "Участники встречи", message: "Разбор условий",
      channel: "Teams", owner: "HR", when: "До анонса", riskIds: ["leaders"],
    });
    expect(preparedResponses(plan, event)).toEqual(["Разбор условий"]);
    plan.communications[0].channel = "";
    expect(preparedResponses(plan, event)).toEqual([]);
    plan.risks.push({
      ...data.risks[0], id: "custom", title: "Своя формулировка",
      riskIds: ["leaders"], prevention: "Предварительная встреча", response: "Дополнительный разбор",
    });
    expect(preparedResponses(plan, event)).toEqual(["Своя формулировка"]);
  });
  it("keeps legacy content without links usable and makes no inference from text", () => {
    const data = structuredClone(defaultContent.cases.bonus);
    data.events.forEach((e) => delete e.riskIds);
    const plan = emptyPlan();
    plan.actions.push({ id: "legacy", text: "Юридические ограничения", stage: "Подготовка", owner: "HR", when: "До запуска" });
    expect(chooseEvent(data, plan).id).toBe(data.events[0].id);
    expect(preparedResponses(plan, data.events[0])).toEqual([]);
  });
});

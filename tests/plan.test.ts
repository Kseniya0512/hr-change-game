import { describe, it, expect } from "vitest";
import {
  emptyPlan,
  frameworkResult,
  completion,
  chooseEvent,
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
});

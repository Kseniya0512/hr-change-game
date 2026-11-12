import { expect, it } from "vitest";
import { renderPlanPdf } from "../server/pdf.ts";
import { defaultContent } from "../shared/content.ts";
import { emptyPlan } from "../shared/plan.ts";
import type { Round, Team } from "../shared/model.ts";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
it("exports an actual Cyrillic PDF with all sections and unfinished questions", async () => {
  const round: Round = {
    id: "round",
    caseId: "medical",
    caseData: defaultContent.cases.medical,
    criteria: defaultContent.criteria,
    roles: defaultContent.roles,
    hints: defaultContent.hints,
    contentVersion: "v1",
    revision: 0,
    step: 5,
    status: "finished",
    remainingMs: 0,
    deadline: null,
    plan: { ...emptyPlan(), openQuestions: "Уточнить переходный период" },
    proposals: [],
    comments: [],
    event: null,
    alternative: "",
    helpLog: [],
  };
  const team: Team = {
    id: "team",
    name: "Команда Альфа",
    code: "123456",
    round,
    history: [],
  };
  const bytes = await renderPlanPdf(team, round);
  expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  const dir = mkdtempSync(join(tmpdir(), "hr-pdf-"));
  try {
    writeFileSync(join(dir, "plan.pdf"), bytes);
    const text = execFileSync("pdftotext", [join(dir, "plan.pdf"), "-"], {
      encoding: "utf8",
    });
    expect(text).toContain("Команда Альфа");
    expect(text).toContain("13. Что уточнить совместно с ЦЭИ");
    expect(text).toContain("Уточнить переходный период");
    expect(text).toContain("42 000");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

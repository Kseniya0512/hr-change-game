# Workshop Follow-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Continue the existing workshop on its approved branch and connect events to explicit plan choices rather than interpreting free text.

**Architecture:** Retain React, Node, Socket.IO and SQLite. Optional risk-ID links on actions, communications, risks and events preserve compatibility with saved rounds. Reuse one shared function for event selection and the visible prepared response.

**Tech Stack:** Node.js 24+, TypeScript, React, Express, SQLite, Socket.IO, Zod, Vitest, Playwright, PDFKit.

**Spec:** ../specs/2026-11-12-change-game-design.md; approved 13 November follow-up in the current conversation: use only `hr-change-game`, branch `feat/change-workshop`; the rest of the proposal is accepted.

## Global Constraints

- Work only in `hr-change-game`, branch `feat/change-workshop`; do not integrate another repository or create another development branch.
- Preserve two cases, six screens, 2–3 teams, 20 participants, default 30 minutes and eight criteria with a 2+ threshold.
- No rankings, invented methodology, legal conclusions or automatic interpretation of free text.
- Confirmed plans remain server-owned; participants propose, captain/curator confirm.
- Preserve source PDF/PPTX/HTML and saved historical rounds.

## Review Focus

- Changing wording must not change event selection or evidence detection.
- An unfilled selected risk must not count as a prepared response.
- Custom actions/risks must be linkable without losing their original wording.
- Legacy rounds with no links must remain readable, exportable and playable.
- Linked content and confirmed plan fields must survive synchronization and restart.

## Task 1: Shared event contract

**Files:** shared/model.ts, shared/content.ts, shared/plan.ts, tests/plan.test.ts.
**Interfaces:** Optional `riskIds?: string[]` on ActionRow, Communication, Risk and GameEvent; `preparedResponses(plan: Plan, event: GameEvent): string[]`; retain `chooseEvent(data: CaseData, plan: Plan): GameEvent`.

- [x] Add failing tests: linked preparation survives wording changes; incomplete risks are not prepared; complete custom actions and communications are prepared; legacy events remain usable; uncovered event takes priority.
- [x] Run `npm test -- tests/plan.test.ts`, observe relevant failures.
- [x] Implement bounded explicit risk associations and source-neutral event selection. Default events link to their existing risk IDs.
- [x] Run shared tests and typecheck.

## Task 2: Server and browser workflow

**Files:** server/validation.ts, src/components/RiskLinks.tsx, src/components/GameScreens.tsx, src/components/Host.tsx, src/styles.css, tests/server.test.ts, tests/e2e/workshop.spec.ts.
**Interfaces:** `RiskLinks({risks, value, onChange, disabled?, label?})`; optional links use the current round's case risk catalogue.

- [x] Add failing integration tests for link validation, synchronization/restart and edited event links; add browser test for linking a custom action and displaying it on the event screen after refresh.
- [x] Run relevant tests to confirm missing schema/UI behavior.
- [x] Permit bounded optional risk-ID arrays in strict schemas. Add collapsed optional link controls to action, communication and custom risk rows; organizers edit event links with the same control.
- [x] Show prepared response labels on the event screen; otherwise invite the team to show an alternative or update the plan. Do not label free-text content as wrong.
- [x] Run unit/integration tests, typecheck and all browser scenarios.

## Task 3: Documentation, review and delivery

**Files:** README.md, docs/host-guide.md, docs/verification.md, docs/implementation-progress.md, existing design document.

- [x] Record approved scope and correct outdated statements about the survey source without modifying/integrating that repository.
- [x] Document optional risk links, compatibility limits and exact fresh verification results.
- [x] Run production build and inspect browser screenshots, perform a fresh-context review of this change and fix material findings.
- [x] Commit and synchronize only `feat/change-workshop`; verify remote head and unchanged original materials. Do not create a service or incur hosting charges.

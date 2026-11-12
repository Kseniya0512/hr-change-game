# Change Workshop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Build the approved multiplayer HR change workshop with two cases, six screens, facilitator controls and PDF export.

**Architecture:** React client and one Node.js server, SQLite persistence and Socket.IO room updates. The server authenticates role invitations, validates commands, and commits revision-checked changes before broadcasting.

**Tech Stack:** Node 24, TypeScript, React, Vite, Express, Socket.IO, node:sqlite, Zod, PDFKit, Vitest, Playwright.

**Spec:** ../specs/2026-11-12-change-game-design.md (approved by user: «да все ок»).

## Global Constraints

- 20 participants; 2–3 teams; default round 30 minutes; six screens; two cases.
- Eight presentation criteria; framework applies at 2+ yes answers.
- No scores, competition, fabricated legal rules, real-person candidates or manipulative messages.
- Participants propose; captain/curator confirm. Curator and sponsor are separate roles.
- SQLite is authoritative; reconnect and process restart preserve committed progress.
- Keep original workshop materials and survey repository unchanged. This cloud checkout is already isolated; do not create a worktree.

## Review Focus

- Stale captain/curator writes must report a conflict rather than overwrite.
- Invitations, cookies and sockets must not leak access across teams or roles.
- Timer pause, server restart and repeated events must preserve a consistent round.
- Editable content must validate and remain snapshotted in previous rounds.
- PDF must contain Cyrillic, all 13 plan sections, and no invitation secrets.

---

### Task 1: Content and common contracts

**Files:** package.json, configs, shared/model.ts, shared/content.ts, shared/plan.ts, tests/plan.test.ts.
**Interfaces:** `Plan`, `Round`, `Team`, `WorkshopContent`, `View`; `emptyPlan()`, `completion(plan)`, `frameworkResult(criteria)`, `chooseEvent(round)`.
- [x] Write failing behavioral tests for threshold 2, unknown answers, completeness and event selection.
- [x] Implement typed case content, default plan and derived results. Preserve source references.
- [x] Run `npm test -- tests/plan.test.ts`; expected passing tests.

### Task 2: Server sessions, roles and persistence

**Files:** server/store.ts, server/app.ts, server/index.ts, tests/server.test.ts.
**Interfaces:** `createApp({dbPath,hostKey})` returns `{listen(port),close(),store}`. HTTP endpoints: POST /api/sessions, POST /api/access, GET /api/state, POST /api/teams/:id/command, POST /api/sessions/:id/control, PUT /api/content.
- [x] Write failing integration tests for role restrictions, team isolation, revision conflict, idempotency, SQLite reopen, timer transitions and separate rounds.
- [x] Implement transactional storage, hashed invitations/cookies, validated commands and authenticated Socket.IO rooms.
- [x] Run `npm test`; expected all tests pass, including 20 live connections and reconnect.

### Task 3: Playable browser workflow

**Files:** src/App.tsx, src/api.ts, src/components/*, src/styles.css, tests/e2e/workshop.spec.ts.
**Interfaces:** consumes `View` and common types; sends explicit section commands with expected revision and command id.
- [x] Write browser tests for host creation, independent participant/captain access, proposal, confirmed answer synchronisation and refresh recovery.
- [x] Implement landing, entry, team workspace, six screens, scoped role controls, help, comments and conflict review.
- [x] Run browser tests on system Chromium; expected visible shared state and forbidden role editing absent.

### Task 4: Host operations, content and PDF

**Files:** src/components/Host.tsx, server/pdf.ts, assets/fonts/*, tests/pdf.test.ts.
**Interfaces:** `renderPlanPdf(team,round):Promise<Buffer>`; authorised GET /api/teams/:id/export.pdf?roundId=.
- [x] Write tests for valid PDF bytes and Cyrillic extraction, old-round preservation, edited content snapshots, pause/resume/extend and invitation revocation.
- [x] Implement controls, case assignment, content editor, history and 13-section export.
- [x] Run full tests, type check and production build; expect all pass.

### Task 5: Readiness, review and reusable setup

**Files:** README.md, .env.example, docs/host-guide.md, docs/implementation-progress.md.
- [x] Exercise built application, 20 connections and both cases; inspect desktop/mobile screenshots.
- [x] Request an independent whole-branch review and fix material findings with regression tests.
- [x] Save tested install/start steps in cloud environment draft; describe external hosting needs without claiming deployment.
- [x] Run `npm test`, `npm run typecheck`, `npm run build`, `npm run test:e2e`; record actual results and limitations.

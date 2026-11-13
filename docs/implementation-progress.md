# Implementation progress

Plan: docs/superpowers/plans/2026-11-12-change-game.md

User approved design on 2026-11-12. Working branch: feat/change-workshop.

Execution: native implementation in this session, fresh final reviewer. No extra design approval required.
Pre-flight: shared model is the contract between content, server, browser and PDF. Command revision belongs to a round; role checks run on the server. Content and previous round snapshots are independent.

Task 1: complete — criteria, two cases, four stages, source-based help; 3 plan tests pass.
Task 2: complete — real SQLite, scoped role access, conflicts, idempotency, timers, logout/revocation and 20 live clients; 11 integration tests pass.
Task 3: complete — all six screens, proposals, comments, draft navigation and confirmed answers; browser role/refresh tests pass.
Task 4: complete — host controls, editable content snapshots, events, historical rounds and Cyrillic PDF; PDF extraction test and full medical browser flow pass.
Task 5: complete — 19 Vitest tests, 7 Playwright scenarios, typecheck and production build pass. Independent whole-branch review completed; five Important findings reproduced RED and fixed GREEN. Repeated npm ci, ordinary npm start, production home and health validated. install_script and start_skill saved in environment draft; publication not performed.

Validation fixes: countdown now uses a stable server offset (browser regression RED→GREEN); local unconfirmed drafts survive screen navigation (browser regression RED→GREEN); revoked role invitations and logout invalidate existing credentials; command deduplication stores hashes, not login tokens.

Limits: 30-minute usability with actual participants remains a human rehearsal. Public HTTPS hosting has not been selected or deployed. The initial survey inspection checked only main; the app was subsequently found on hr-feedback-app. The organizer's 13 November instruction limits this work to the game branch, without survey integration.

Final review fixes: cross-round write guards; central timer transition publishing; non-credential PDF filenames; draft ownership independent of pause/connection; acknowledged curator submission clearing. Regression evidence and remaining limitations: docs/verification.md. The minor missing round date was also brought into alignment with the approved export design.

Reviewed exclusions: public hosting and human rehearsal remain external validation; SSO/Teams integration and general-purpose game authoring are outside this MVP; independent screen navigation and manual incorporation of proposals follow the approved workshop workflow. No Critical/Important review finding remains open. No deferred minor remains.

## Follow-up: explicit event links

Plan: docs/superpowers/plans/2026-11-13-workshop-follow-up.md. Approved scope: only hr-change-game, feat/change-workshop.

Task 1: optional riskIds connect events to completed actions, communications and risks. Event selection no longer interprets wording. Four regression tests failed before implementation and pass afterwards.
Task 2: strict server validation, persistent optional links, reusable browser controls, organizer event-link editing and visible prepared responses. New server and browser regressions failed before implementation and pass afterwards. Original content and historical rounds retain their own snapshots.
Fresh checks: 25 Vitest tests, typecheck and 8 Playwright scenarios (including production build) pass. Independent review of 8b23371…b2dbb31 found no actionable defects and independently repeated unit/integration tests and typecheck. Production startup and mobile controls at 390 px pass. Detailed evidence and interpretation limits are in docs/verification.md. No extra application, survey integration, hosting service or branch was created.

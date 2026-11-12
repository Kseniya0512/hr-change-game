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

Limits: 30-minute usability with actual participants remains a human rehearsal. Public HTTPS hosting has not been selected or deployed. The existing survey repository contains no app to integrate.

Final review fixes: cross-round write guards; central timer transition publishing; non-credential PDF filenames; draft ownership independent of pause/connection; acknowledged curator submission clearing. Regression evidence and remaining limitations: docs/verification.md. The minor missing round date was also brought into alignment with the approved export design.

Reviewed exclusions: public hosting and human rehearsal remain external validation; SSO/Teams integration and general-purpose game authoring are outside this MVP; independent screen navigation and manual incorporation of proposals follow the approved workshop workflow. No Critical/Important review finding remains open. No deferred minor remains.

# Implementation progress

Plan: docs/superpowers/plans/2026-11-12-change-game.md

User approved design on 2026-11-12. Working branch: feat/change-workshop.

Execution: native implementation in this session, fresh final reviewer. No extra design approval required.
Pre-flight: shared model is the contract between content, server, browser and PDF. Command revision belongs to a round; role checks run on the server. Content and previous round snapshots are independent.

Task 1: complete — criteria, two cases, four stages, source-based help; 3 plan tests pass.
Task 2: complete — real SQLite, scoped role access, conflicts, idempotency, timers, logout/revocation and 20 live clients; 11 integration tests pass.
Task 3: complete — all six screens, proposals, comments, draft navigation and confirmed answers; browser role/refresh tests pass.
Task 4: complete — host controls, editable content snapshots, events, historical rounds and Cyrillic PDF; PDF extraction test and full medical browser flow pass.
Task 5: in progress — all 15 Vitest tests and 5 Playwright scenarios passed before formatting; final review and reusable setup pending.

Validation fixes: countdown now uses a stable server offset (browser regression RED→GREEN); local unconfirmed drafts survive screen navigation (browser regression RED→GREEN); revoked role invitations and logout invalidate existing credentials; command deduplication stores hashes, not login tokens.

Limits: 30-minute usability with actual participants remains a human rehearsal. Public HTTPS hosting has not been selected or deployed. The existing survey repository contains no app to integrate.

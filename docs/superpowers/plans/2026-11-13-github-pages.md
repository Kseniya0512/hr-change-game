# GitHub Pages Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement the approved scope inline.

**Goal:** A free standalone GitHub Pages game, explicitly chosen by the user as option 2: each user keeps an individual plan in their browser.
**Spec:** Current conversation: use only hr-change-game, feat/change-workshop; two existing cases, six existing learning screens, local persistence and PDF via browser print. No shared-server claim in the Pages version.
**Architecture:** Reuse GameScreens and methodology. A separate standalone entry owns two persistent browser rounds. The existing Node application remains the default build. Build Pages into docs/ with relative assets and .nojekyll; preserve existing documentation.
**Stack:** Existing React/TypeScript/Vite; localStorage, browser print; no new runtime dependencies.

## Tasks
- [x] Add meaningful tests for independent case persistence, malformed/unavailable storage, failed writes and timer/event recovery; observe RED, implement local store, verify GREEN.
- [x] Add standalone entry, case controls, local save messages, three help buttons, event trigger and print layout; verify browser refresh, case switching, no API requests, subpath assets, print contents and mobile layout.
- [x] Build deployable docs/ assets, verify existing server tests/build, review changes, synchronize only feat/change-workshop. Verify public URL if Pages is enabled; otherwise give the exact one-time repository setting required, without claiming publication.

## Review Focus
Corrupt storage must not be silently overwritten. A failed save must retain the draft. Switching cases must preserve both plans. Static pages must make no server/API calls. Only the selected feature branch may be changed.

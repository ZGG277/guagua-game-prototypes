# Browser validation status

2026-11-12: **Blocked before page load. No real-browser checks passed.**

Installed cloud Chromium `/usr/bin/chromium` failed to launch with `socket() failed: Operation not permitted (1)`. A standard approved sandbox escalation produced the same runtime failure. No external site or user computer was used. No alternate flags, clients, or routes were attempted to bypass this restriction.

`tests/browser-check.cjs` is a prepared, syntax-checked optional browser regression script for 320×568, 390×844, 430×932 and 768×1024 viewports. It covers start, horizontal overflow, rock touch, help pause/resume, ranking close/resume, hand practice, CDP touch cancellation and restart. The script has not successfully executed in a browser. Run with Playwright and installed Chromium; use CHROMIUM_BIN to select the authorized runtime.

Full-run settlement/replay, audio listening, Chrome 61, official simulator, Android/iOS host compatibility, real ranking/share/follow and host gesture conflicts remain unverified. Ordinary browser results cannot replace those gates.

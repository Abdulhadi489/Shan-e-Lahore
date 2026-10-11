# Decisions

One line each: date, decision, why.

- 2026-10-11: React 19 instead of 18. react-leaflet 5 requires it and React 18 gets no new features.
- 2026-10-11: Self-host fonts (@fontsource) instead of Google Fonts. Faster, no visitor IPs sent to Google, smaller CSP.
- 2026-10-11: CSV export instead of SheetJS. The npm `xlsx` package has unpatched high-severity advisories that fail `npm audit`.
- 2026-10-11: Node 24 LTS, pinned via `.nvmrc` and `engines`.
- 2026-10-11: `.npmrc` sets `min-release-age=14` and `save-exact` so npm itself enforces the dependency rule.
- 2026-10-11: fsevents install script denied (`allowScripts`). It ships a prebuilt binary; the script only rebuilds it.
- 2026-10-11: Local Supabase uses `auto_expose_new_tables = false` to match new cloud projects; every table needs explicit GRANTs.
- 2026-10-11: gitleaks runs as a pre-commit hook via `core.hooksPath=.githooks`, set by `npm install` (`prepare` script).

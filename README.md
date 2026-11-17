# SpotCheck

How busy is it right now? SpotCheck shows crowd level, noise and free outlets for UW-Madison study spots (libraries, unions, cafés) on a map, updated by students who check in.

**Try it:** https://arvindm84.github.io/Spotcheck/ (works in any phone or desktop browser).

## What's in this repo

| Folder | What it is |
| --- | --- |
| `src/` | The web app (Vite + React + TypeScript, Tailwind v4, Mapbox). This is what the link above serves. |
| `mobile/` | An Expo / React Native version of the app for Android and iOS. See [`mobile/AGENTS.md`](mobile/AGENTS.md). |
| `supabase/` | Database schema (`migrations/`) and starter data (`seed.sql`) for the Supabase backend. |
| `docs/design/` | The SpotCheck App Design mockups the web app is built from. |

## Run the web app locally

```bash
npm install
cp .env.example .env   # fill in the Mapbox token, and Supabase values for live data
npm run dev
```

Without Supabase values the app runs on built-in sample data. `npm run dev:mock` forces sample data even when `.env` has them.

Other scripts: `npm run build` (typecheck + production build into `dist/`), `npm run lint`, `npm run preview`.

## Backend setup (Supabase)

1. In the Supabase SQL editor, run `supabase/migrations/0001_init_schema.sql`, then `supabase/run_once_0002_to_seed.sql` (migrations 0002–0004 plus the seed data).
2. Authentication → Sign In / Providers: turn on **Allow anonymous sign-ins** (check-ins use an anonymous session).
3. Crowd readings fade to grey after 2 hours. Re-run `supabase/seed.sql` to refresh the demo data before showing the app.

If the backend can't be reached, the app falls back to sample data and keeps check-ins on the device.

## Publish to GitHub Pages

The site is the contents of `dist/` on the `gh-pages` branch. The build uses relative paths and hash routing, so it works from any static host.

```bash
npm run build
```

Then copy `dist/` (plus an empty `.nojekyll` file) to the root of the `gh-pages` branch and push it.

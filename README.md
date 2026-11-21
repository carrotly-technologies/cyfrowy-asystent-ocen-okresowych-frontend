# Cyfrowy Asystent Ocen Okresowych — frontend

React + TypeScript + Vite frontend of **Cyfrowy Asystent Ocen Okresowych**. It talks to the NestJS API in
[cyfrowy-asystent-ocen-okresowych-backend](https://github.com/carrotly-technologies/cyfrowy-asystent-ocen-okresowych-backend).

## Setup

```bash
npm install
cp .env.example .env   # optional
```

| Variable             | Default | Description                                                                                       |
| -------------------- | ------- | ------------------------------------------------------------------------------------------------- |
| `VITE_API_URL`       | empty   | Backend base URL. Empty = same origin, via the dev proxy `/api` -> `:3000`                        |
| `VITE_DEMO_ACCOUNTS` | empty   | `false` hides the demo accounts (one-click sign-in) on `/logowanie`; anything else shows them     |

Both are read at build time (`npm run build`, Docker build args).

## Run

Start the backend first (`npm run start:dev` in the backend repo, port 3000), then:

```bash
npm run dev       # http://localhost:5173
```

The app is **Cyfrowy Asystent Ocen Okresowych** (UI in Polish): the periodic assessment of civil servants
(rozp. PRM z 4.04.2016) on sheets A, B and C, for supervisors, the assessed person, HR and an admin:

- `/logowanie` — sign-in with login and password; the role (supervisor, employee, HR, admin) comes from the account
  (demo accounts: backend README; below the form one card per demo account signs in with one click,
  list in `src/lib/demoAccounts.ts`, hidden with `VITE_DEMO_ACCOUNTS=false`). The token sits in `sessionStorage`
  (`ocena.token`) and goes with every API call; a 401 sends you back to sign-in. Routes and the menu depend on
  the role (`src/lib/useAuth.ts`, `src/shell/RequireAuth.tsx`);
- `/zespol` — supervisor: deadline-driven to-do list and team table;
- `/teczka/:id/:stage` — supervisor: the case file with the 7 stages (`src/case/stages`):
  `arkusz-i-kryteria` (sheet with the system's suggestion, up to 3 additional criteria with their descriptions
  from the catalogue, due date), `rozmowa-rozpoczynajaca` (part I), `potwierdzenie-czesci-i` (waits for the
  assessed person), `obserwacje`, `ocena` (parts II and III, `?czesc=2|3`, then „Rozmowa oceniająca
  przeprowadzona”), `podpis` (formal check, signature, hand-over), `zapoznanie`; docked assistant panel;
- `/teczka/:id/arkusz` — official sheet preview (parts I/II/III); print it to get the PDF;
- `/moje-oceny`, `/moje-oceny/:id` — the assessed person (EMPLOYEE): own assessments, read only, with the two
  confirmations (part I and the assessment) that only they can make;
- `/hr` — HR monitoring with counters, filters and (simulated) reminders; `/baza-wiedzy` — assistant;
- `/admin/uzytkownicy` — admin only: accounts and their roles;
- `/ustawienia` — appearance settings (theme, text size, high contrast), kept in `localStorage` `ocena.prefs`.

Reference data (criteria catalogue `GET /api/criteria`, sheets, grades) and every legal rule come from the API;
communication only through `src/api/*`. Data fetching uses TanStack Query, routing react-router; design tokens live
in `src/styles/tokens.css`, components in `src/components/ui/`; see `docs/DESIGN.md`.

## Quality

```bash
npm run lint      # oxlint
npm run build     # type-check + production build to dist/
npm run preview   # serve the production build
```

## Deploy

`main` is auto-deployed to Coolify from this repo's `Dockerfile` (Vite build, then nginx serving `dist/` with an
SPA fallback). Set the build-time variable `VITE_API_URL` to the backend origin (baked into the bundle, so a change
needs a redeploy); optional `VITE_DEMO_ACCOUNTS=false`.

Build and run the image locally:

```bash
docker build --build-arg VITE_API_URL=http://localhost:3000 -t cyfrowy-asystent-frontend .
# add --build-arg VITE_DEMO_ACCOUNTS=false to build without the demo accounts
docker run --rm -p 8080:80 cyfrowy-asystent-frontend   # http://localhost:8080
```

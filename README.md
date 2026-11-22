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
| `VITE_DEMO_TOOLS`    | empty   | `false` hides "Reset" and the API status in the top bar; never shown to the EMPLOYEE role               |

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
- `/zespol` — supervisor: deadline-driven to-do list and team table (a row opens the person, „Teczka” opens the case);
- `/zespol/:id` — supervisor: one person of the team (current assessment with „Otwórz teczkę”, history of
  assessments, absences, register data); the supervisor has no separate register menu item;
- `/teczka/:id/:stage` — supervisor: the case file with the 7 stages (`src/case/stages`):
  `arkusz-i-kryteria` (sheet with the system's suggestion, up to 3 additional criteria with their descriptions
  from the catalogue, due date), `rozmowa-rozpoczynajaca` (part I), `potwierdzenie-czesci-i` (waits for the
  assessed person), `obserwacje`, `ocena` (parts II and III, `?czesc=2|3`, then „Rozmowa oceniająca
  przeprowadzona”), `podpis` (formal check, signature, hand-over), `zapoznanie`; docked assistant panel;
- `/teczka/:id/arkusz` — official sheet preview (parts I/II/III); print it to get the PDF;
- `/moje-oceny`, `/moje-oceny/:id` — the assessed person (EMPLOYEE): own assessments, read only, with the two
  confirmations (part I and the assessment) that only they can make, status and deadlines, the Pouczenie and the
  sprzeciw form (7 days), the request to change the assessment date (art. 81 ust. 8 pkt 4), earlier versions and history;
  current and past assessments are listed separately;
- `/sprzeciwy`, `/sprzeciwy/:id` — dyrektor generalny (DIRECTOR): objections and the decision (oddalenie, zmiana oceny
  with new scores, ponowne sporządzenie); the evaluator's case file shows pending termin requests and „fikcja zapoznania”;
- `/hr` — HR monitoring with counters, filters, (simulated) reminders and „Fikcja zapoznania” for cases awaiting
  acknowledgement; `/baza-wiedzy` — assistant;
- `/kartoteka`, `/kartoteka/:id` — HR register (HR edits, ADMIN reads; a SUPERVISOR is redirected to `/zespol`, `/zespol/:id`): search/sort/filter,
  add/edit/delete employee, evaluator (podległość), substitutions, absences (with the art. 81 ust. 7 extension shown),
  history of assessments, start of a new cycle, CSV import of past assessments and CSV export;
- `/statystyki` — HR, ADMIN, DIRECTOR: results, levels, timeliness, stages, promotions, per unit, CSV export;
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

## End-to-end tests (Playwright)

`npm run test:e2e` runs the whole periodic assessment in a real browser (Chromium), against a local backend with its
demo seed (specs in `e2e/`):

1. the supervisor picks the sheet and additional criteria, confirms part I, the assessed person confirms it, the
   supervisor scores part II, signs and hands the assessment over, the assessed person acknowledges it
   (case c-004, accounts `j.kaminska` and `j.mazur`); the confirmation dialogs (accepting the sheet, signing,
   handing over) are confirmed explicitly (`confirmDialog` in `e2e/helpers.ts`);
2. a negative assessment cannot be signed without a justification (case c-007).

```bash
# once: the browser for Playwright
npx playwright install chromium

# terminal 1, backend repo: in-memory storage (no DATABASE_URL), demo seed
npm run start:dev                 # http://localhost:3000

# terminal 2, this repo
npm run test:e2e                  # starts Vite on :5174 by itself; npm run test:e2e:ui for the interactive runner
npx playwright show-report        # HTML report, with a trace of every failed test
```

Every test restores the demo seed first (`POST /api/demo/reset`), so it changes the data of the backend it runs
against: never point it at a shared or production backend. The tests run one at a time.

| Variable      | Default                 | Description                                                         |
| ------------- | ----------------------- | ------------------------------------------------------------------- |
| `E2E_API_URL` | `http://localhost:3000` | Backend the tests run against (the Vite proxy target and the reset) |
| `E2E_PORT`    | `5174`                  | Port of the Vite dev server Playwright starts for the tests         |

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

## Wdrożenie w urzędzie

Cały system (PostgreSQL + backend + ten frontend, opcjonalnie lokalny model językowy) uruchamia jedno polecenie
`docker compose up -d --build` z repozytorium backendu; instrukcja (wymagania, 3 kroki instalacji, konfiguracja urzędu,
aktualizacja, kopie zapasowe, RODO, architektura) jest w README backendu, sekcja „Wdrożenie w urzędzie”.
Compose buduje ten obraz z katalogu obok repozytorium backendu; adres API (`PUBLIC_API_URL`) trafia do budowy jako
`VITE_API_URL`.

## Licencja

EUPL-1.2 (European Union Public Licence), plik [`LICENSE`](LICENSE).

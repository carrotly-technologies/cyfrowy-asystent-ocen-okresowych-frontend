# Design system

Public-service look: the gov.pl web palette and the token scale of the public e-service app, plus the
patterns of the GOV.UK Design System. We borrow only the style and the patterns: **no official logos,
emblems or product names**.

- Tokens: `src/styles/tokens.css` (CSS variables). Components never use hex values.
- Components: `src/components/ui/` (CSS Modules, native elements, no UI kit), imported from `components/ui`.
- Live catalogue: **`/ui`** (every component in every variant and state, light and dark side by side).
- Form pattern: **`/wniosek-demo`** (step by step, check answers, confirmation).

## gov.pl / civil-service look (22.11)

Source and measurements: `review/design-mobywatel.md` (workspace). WDS (gov.pl / mObywatel) typography, spacing,
focus and 48px controls; civil-service partner colours and "angular" shapes. No emblem, no official marks or names;
the footer says the tool is not a gov.pl / KPRM / mObywatel service.

- Colours: text `#0B1F35`, primary `#0052A5` (hover navy `#052D64`), SC blue `--sc-blue` `#35659A` (list titles,
  table-head line, section rules), `--sc-navy` service bar, `--sc-band` footer link bar; page white, `--bg-subtle`
  `#EFF3F7` for navigation, filters and table heads. Dark and high contrast redefine the `--sc-*` set.
- Shapes: 4px for controls, cards, badges, dialogs (`--radius-pill` also resolves to 4px); 0 for bars, menus, tables.
  Cards are flat (`--shadow-card: none`); shadows only on menus and dialogs. Important card: `<Card important>`.
- Type: Open Sans 400/700, body 16/24, page title 28/36; dense tables 14px; UPPERCASE only for the service bar,
  list labels, table heads and badges. Focus: `0 0 0 2px #fff, 0 0 0 4px #0B1F35`.
- Shell (`src/shell/AppShell.tsx`): header 64px with our wordmark · navy service bar (role, office) · side navigation
  ≥ 1024px (active = full accent fill) · "Menu" drawer below · bottom tab bar on phones for EMPLOYEE and SUPERVISOR ·
  breadcrumbs (`src/shell/Breadcrumbs.tsx`) from 768px, `BackLink` only below · footer link bar + note.
- Lists: `ResultList` / `ResultRow` ("job-offer list": status block, SC-blue title, `LABEL: value` pairs, whole row
  is the link) on /moje-oceny, /kartoteka (with the "SORTUJ:" bar) and /sprzeciwy. `ResultTable` / `ResultTableRow`
  is the same list with column headers (ARIA table, one CSS grid, status in the last column, headers hidden and
  `LABEL: value` per cell at ≤ 640px) on /zespol and /dobrostan; instead of the status the last column can hold one
  `action` (a `ButtonLink` such as „Zobacz kartę”, header `hidden: true` → read only by screen readers).

The table below predates this section; where they differ, this section and `tokens.css` win.

## Tokens

| group | tokens | notes |
|---|---|---|
| surfaces | `--bg-app`, `--bg-surface`, `--bg-subtle`, `--bg-muted`, `--bg-hover`, `--bg-overlay` | grey canvas, white cards |
| text | `--text` (#1B1F26), `--text-secondary`, `--text-muted`, `--text-faint` (decorative only) | all except faint ≥ 4.5:1 |
| borders | `--border`, `--border-strong`, `--border-input` (≥ 3:1 for fields) | |
| accent | `--accent` (#0052A5), `--accent-hover`, `--accent-subtle`, `--accent-faint`, `--on-accent`, `--link`, `--link-hover` (#006CD7) | the only brand colour |
| status | `--ok*`, `--warn*`, `--danger*` (+ `--danger-strong` #900E1D), `--info*`, each with `-bg`, `-border`, `--on-*` | success bg #EEFAE1 |
| focus | `--focus` (#0452A8), `--focus-shadow` = `0 0 0 2px focus, 0 0 0 4px inner, 0 0 0 6px focus` | gov.pl triple ring |
| type | Open Sans 400/600/700; `--text-xs` 12 … `--text-body` 16 … `--text-3xl` 32 (px at 100%, defined in `rem`) | forms use 16px |
| spacing | `--s-0` 2, `--s-1` 4, `--s-2` 8, `--s-3` 12, `--s-4` 16, `--s-5` 20, `--s-6` 24, `--s-8` 32, `--s-10` 40, `--s-12` 48, `--s-14` 56, `--s-16` 64; roles `--gap-*`, `--pad-*` | see "Spacing" below |
| radius | `--radius-xs` 4 (fields, alerts), `--radius` 8, `--radius-lg` 12 (cards), `--radius-xl` 16 (dialogs), `--radius-pill` (buttons, badges) | |
| sizes | `--control-h` 48, `--control-h-sm` 36, `--tap` 44 (these three and `--topbar-h` in `rem`), `--content-max` 1200, `--form-max` 640 | |
| layers | `--z-sticky` 10, `--z-dropdown` 20, `--z-bottom-nav` 30, `--z-panel` 40, `--z-header` 50, `--z-overlay` 100, `--z-toast` 200 | see "Layers" below |

**Dark mode** follows the system (`prefers-color-scheme`) by default; in `/ustawienia` the user can force
"Jasny" or "Ciemny", which puts `data-theme="light" | "dark"` on `<html>` (`src/lib/preferences.ts`, stored in
`localStorage` as `ocena.prefs`; an inline script in `index.html` applies it before the first paint). The
primitives (`--gray-*`, `--blue-*`) and status colours are redefined, so anything built on tokens follows.
`.theme-light` / `.theme-dark` force a theme on a subtree (used by `/ui`). Text contrast is ≥ 4.5:1 in both modes.

**High contrast** (`data-contrast="high"` on `<html>`, a switch in `/ustawienia`) overrides only the semantic
roles, for both themes: text and links ≥ 7:1 on every background role, control borders and the focus ring
≥ 3:1, status and score colours ≥ 7:1, links fully underlined.

**Text size** (`/ustawienia`: 100 / 125 / 150%) is `font-size` on `<html>`. Text, control heights and
anything holding text are in `rem`, so they grow with it; spacing, borders, radii and icons stay in `px`.
New text sizes and heights of elements with text go in `rem` (px ÷ 16). At 150% and 375px wide nothing
may scroll sideways (WCAG 1.4.4, 1.4.10); on phones buttons wrap their label.

## Spacing

8px grid (`--s-N` = N × 4px, `--s-0` 2px), checked against GOV.UK / gov.pl spacing and WCAG 2.2 (2.5.8 Target Size,
1.4.12 Text Spacing). Our main users are civil servants, often 45+: more white space and clear grouping (related
things closer, groups further apart).

- **Only tokens.** `gap`, `margin*` and `padding*` in `src/**/*.css` use `--s-*` or a role token, never raw px.
  Exceptions, each with a comment: 1–2px borders and rules (e.g. `margin-bottom: -1px` under tabs), the optical
  alignment of a decoration (icon size inside a `calc`), and the print sheet (`sheet.css`), which keeps the
  template's measurements written as token sums (`calc(var(--s-2) + var(--s-0))` = 10px).
- **Role tokens** (`tokens.css`) carry the minimums; use them when the role fits:

  | token | value | use |
  |---|---|---|
  | `--gap-icon` | `--s-2` 8 | icon ↔ its text, status dot ↔ label (`.btn`, `.tag`, `StatusBadge`, `BackLink`, field error) |
  | `--gap-chips` | `--s-2` 8 | chips, tags, badges, pills side by side |
  | `--gap-actions` | `--s-3` 12 | buttons and link buttons in a row (`.btn-row`, stage header actions, `ResultTable` actions, case actions) |
  | `--gap-grid` | `--s-5` 20 | columns and cards in a grid (16–24px allowed) |
  | `--gap-field` | `--s-4` 16 | between form fields |
  | `--gap-section` | `--s-8` 32 | between page sections (`.section`) |
  | `--pad-card` | `--s-5` 20 | inside a card (`Card`) |
  | `--pad-cell-x` | `--s-4` 16 | left and right inside table cells (≥ 12px) |

- **Vertical:** label → control `--s-1` (they belong together), section head → content ≥ `--s-3`, paragraphs
  `p + p` 0.75em, running text `max-width: var(--measure)` (75ch; `:where(p)` so a component can widen it).
- **Targets:** controls stay at `--tap` (44px) where they can; anything smaller (inline links, chips) needs 24 × 24px
  or enough space around it (2.5.8). Stacked buttons in a table cell are `--s-2` apart.
- **Checks:** `e2e/spacing-a11y.spec.ts` opens „Oceny zespołu”, a person, the case (observations, assessment talk,
  signature) and „Dobrostan” (list and a person) at 375, 768 and 1440px: no sideways scroll, axe `target-size`
  without violations, and with the WCAG 1.4.12 text-spacing override no sideways scroll and no text cut off by
  `overflow: hidden`.

## Components

| component | use |
|---|---|
| `Button` / `ButtonLink` | `variant` primary / secondary / tertiary / text, `destructive`, `size` large / small, `loading`, `disabled`, `icon`. One primary per screen. |
| `Field` | label + hint + error for one control, wired with `aria-describedby`; `asHeading` makes the label the page h1. |
| `Fieldset` | the same for groups (radios, checkboxes). |
| `TextInput`, `TextArea`, `Select` | native controls; `width={5 \| 10 \| 20}` for short answers. |
| `Checkbox`, `RadioGroup`, `Switch` | 24px native inputs (1.5rem, grow with the text size); `RadioGroup` options take `conditional` (shown under the chosen option). Switch only for settings that apply at once. |
| `RadioMatrix` | several questions on one scale (e.g. partial scores): from 768px a table (rows × columns, the whole cell clickable), below one row per question with the values as segments in one line and the chosen one spelled out; `groups` with headers, `readOnly`, `error` per row (linked from `ErrorSummary` via `${id}-${row.id}`), arrows move within a row. Columns come from the data, never hard-coded scales. |
| `ErrorSummary` | errors at the top of the form, links to fields, takes focus after a failed submit. |
| `InlineAlert` | info / success / warning / error, icon + text. |
| `InfoTip` | 44px "i" button that opens a short explanation under it (click / Enter / Space; Esc and a click outside close it, focus back on the button). Never put it inside a `<summary>`: place it next to the `Disclosure` (see `CaseHintsPanel`). |
| `StatusBadge` | short status with a dot and text. |
| `Card` | content card; with `to` the whole card is a link (service tile). |
| `InfoList` + `InfoRow` | label/value rows, optional action ("Zmień"). |
| `Accordion` | native `<details>`; for content pages, never inside forms. |
| `Dialog` | native `<dialog>` (focus trap, Esc); bottom sheet on phones. |
| `Snackbar` | short confirmation with optional action, in a polite live region. |
| `EmptyState`, `Spinner`, `Stepper`, `SearchBar` | empty lists, loading, "Krok X z Y" + progress bar (`unit`, `name`: "Część 2 z 3: Ocena okresowa"), search form. |
| `StageStepper` | process stepper, horizontal (stage bar) or `orientation="vertical"` (signing and acknowledgement axis), sized from one set of variables on `.root`: 40px circles with a 16px number / ✓, names in body size (`--text-md`), dates `--text-sm`, 8px circle ↔ name, step padding 8px 12px, vertical steps 24px apart with the expanded body 16px under the name; horizontal: circles on a line, stage names under them (max 2 lines, 14px below 75rem and 12px below 58rem of stepper width); done = green circle (`--ok`) + white ✓ and a green line into it, current = `--accent` outline + number + bold name, future = grey outline + number; the step on screen has `aria-current="step"` and a ring around its circle; every step is a link. Hover and keyboard focus look the same (plus the focus ring): the circle darkens (done `--ok-hover`, current `--accent-hover` outline + number, future `--text-secondary` outline + `--text` number) and the name is underlined; no background behind the step, a 120 ms colour transition (none with `prefers-reduced-motion`). Layout follows the stepper's own width (container query): below 53rem (phone, or the case page next to the assistant panel) only the circles + "Krok X z Y: name". |
| `FormProgress` | progress of a multi-part form ("Formularz oceny", "Formularz oceny kompetencji"): full-width `Stepper` bar with the "{unit} X z N: name" counter for screen readers only, then the parts always in one row (`repeat(var(--n), minmax(0, 1fr))`, `--n` = number of parts) with numbered circles, ✓ for done, the current one marked (`aria-current="step"`); a step with `to` is a link; names on one line with "…" and `title`; a column < 6rem (container query) shows only the circle, the name stays in `title` and for screen readers. |
| `BackLink` | "‹ Powrót" above the page content (`--link`, 44px target). |
| `UserMenu` | top-bar avatar + name + role + chevron; disclosure menu (Esc / click outside close it). |

```tsx
import { Button, ErrorSummary, Field, TextInput } from '../components/ui'

<form noValidate onSubmit={onSubmit}>
  <ErrorSummary errors={errors} />
  <Field id="pesel" asHeading label="Jaki jest Twój numer PESEL?" hint="Ma 11 cyfr." error={errorFor('pesel')}>
    {(p) => <TextInput {...p} width={20} inputMode="numeric" value={pesel} onChange={(e) => setPesel(e.target.value)} />}
  </Field>
  <Button type="submit">Dalej</Button>
</form>
```

## Layout

`AppShell`: skip link "Przejdź do treści"; top bar with the product name, the main links, the settings gear
(`/ustawienia`) and `UserMenu`; below 1024px the links go under a "Menu" button, and below 768px the gear moves
into that menu as "Ustawienia". No horizontal scrolling. Content max width ~1200px.

## Layers

One z-index scale for the whole app (`src/styles/tokens.css`), lowest first:

| token | value | what |
|---|---|---|
| (none) | auto | page content |
| `--z-sticky` | 10 | sticky bars in the content (the case stage bar in `CasePage.module.css`) |
| `--z-dropdown` | 20 | popovers and tooltips (`InfoTip`): above sticky bars, so a tooltip never hides under one; also the dropdown panels of the top bar (`UserMenu`, `NotificationBell`), relative to the top bar |
| `--z-bottom-nav` | 30 | fixed bottom tab bar on phones |
| `--z-panel` | 40 | the assistant slide-over in the case file (`.assistant--dock`): above the bottom tab bar, below the top bar |
| `--z-header` | 50 | the top bar (`.topbar`) with its dropdowns |
| `--z-overlay` | 100 | modal layers that are not in the browser top layer |
| `--z-toast` | 200 | snackbars (`Feedback`) and the skip link |

Native modal `<dialog>`s (`Dialog`, `ConfirmDialog`, the navigation drawer) open in the browser top layer, above
all of these. Rules:

- Use a token for anything that has to sit above other parts of the page; a bare `z-index: 1` or `2` is only for
  order inside one component.
- A dropdown takes the layer of the element that holds it: `position` + `z-index`, `transform`, `filter`,
  `opacity < 1` or `isolation` on an ancestor make a stacking context, and nothing inside can rise above that
  ancestor's layer. That is why the top bar, not its menus, carries `--z-header`: otherwise the sticky stage bar,
  later in the DOM, covers the open user menu. Do not add such properties to ancestors of a dropdown without
  checking its layer.

## UX rules

1. **One question per page** in multi-step forms, the question is the h1, "Krok X z Y" above it.
2. **Check answers** page before sending, each answer with a "Zmień" link back to its step; then a **confirmation** page.
3. **Errors**: summary at the top (focused after submit, links to fields) and a message at the field; prefix the page title with "Błąd:".
4. **Progressive disclosure**: conditional fields under the chosen radio option; no accordions in forms.
5. **Plain language**; label above the field, hint under the label, never a placeholder as the label.
6. **"Wstecz"** always keeps what was typed.
7. **Accessibility** (WCAG 2.1 AA): contrast ≥ 4.5:1, visible focus ring on every interactive element, 44px touch targets, everything works with the keyboard, colour is never the only cue; targets ≥ 24 × 24px with space around smaller ones (WCAG 2.2, 2.5.8), spacing as in "Spacing".

## Case screen (design "Kompas kompetencji", frames 1–2)

`src/case/CasePage.tsx`: `BackLink`, the assessed person as h1 with the position under it, then the `StageStepper`
with the six steps of the periodic assessment (`caseSteps` in `src/lib/stages.ts` groups backend stages into them:
"Formularz oceny" = part I + the assessment period; the first-assessment path shows its own stages). Below: a side
column (criteria while rating, "Oceniany", "Historia") and the stage. Redrawn stages use `StageLayout`
(`src/case/stages/StageLayout.tsx`): heading, deadline and legal basis, content, actions bottom right
(text link first, the one primary last).

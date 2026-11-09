# Design system

How the TaskAtHandFE UI is put together, so new views look like they belong. The look is calm and content-first (Things / Linear-style): neutral surfaces, one indigo accent, semantic status colours, quiet controls that appear when needed.

## Layers

| Layer | File | What lives there |
| --- | --- | --- |
| Tokens | `src/index.css` | Every colour, shadow, radius, type size, motion value. Light/dark pairs via `light-dark()`. |
| Primitives | `src/styles/ui.css` | `.btn`, `.icon-btn`, `.input`/`.textarea`/`.field`, `.chip`, `.segmented`, `.card`, `.alert`, `.empty-message`, the shared section card (`.readme-section`…), modal (`.ui-modal*`), page header (`.page-header*`). |
| Components | `src/components/*` | `Modal` (dialog behaviour), `Icon` (stroke icon set), `AddButton` (the view's "+"), `TaskCard`. |
| Feature CSS | `src/components/<X>/<X>.css` | Only layout specific to that component. **No hex colours, no `@media (prefers-color-scheme)` blocks** — use tokens. |

## Tokens (use these names, never raw values)

- Surfaces: `--bg` (canvas), `--bg-sidebar`, `--surface` (cards), `--surface-raised` (modals), `--surface-hover`, `--surface-sunken` (tracks, chips), `--overlay`.
- Lines: `--border`, `--border-strong` (inputs, outlines).
- Text: `--text`, `--text-muted` (secondary), `--text-subtle` (meta, placeholders), `--text-on-accent`.
- Accent: `--accent`, `--accent-hover`, `--accent-soft` (tinted bg), `--accent-text` (accent-coloured text), `--focus-ring`.
- Status, each as solid / `-soft` bg / `-text`: `--success*`, `--danger*` (+ `--danger-hover`), `--warning*`, `--info*`.
- View hues (icon tiles, small identity accents only): `--hue-tasks`, `--hue-bydate`, `--hue-insights`, `--hue-projects`, `--hue-goals`, `--hue-events`, `--hue-lifeevents`, `--hue-calls`, `--hue-affirmations`, `--hue-vacation`, `--hue-oncall`.
- Elevation: `--shadow-xs|sm|md|lg`. Radius: `--radius-xs(4) sm(6) md(8) lg(12) xl(16) full`.
- Type: `--text-xs(12) sm(13) base(14) md(15) lg(17) xl(20) 2xl(26)`; weights 400/500/600/650/700.
- Motion: `--duration-fast` (120ms), `--duration` (180ms), `--ease`.

Theme: `:root` follows the OS (`color-scheme: light dark`); the sidebar theme button pins `html[data-theme="light|dark"]` (`src/hooks/useTheme.ts`, persisted in `localStorage["tah-theme"]`, applied pre-paint by the inline script in `index.html`). Because every token is a `light-dark()` pair, components never need their own dark-mode rules.

## Layout

- **Shell** (`App.tsx` / `App.css`): sidebar (brand `h1`, theme button, grouped nav) + main column (max 880px). Below 900px the sidebar becomes a sticky top bar with a horizontally scrolling pill nav.
- **Page header**: every view starts with `.page-header` (title `h2` + one-line description) rendered by `App.tsx`. A panel's toolbar (its `AddButton`, plus any compact controls) carries the class `page-actions` and is lifted into the header row, top right (`.app-view--panel .page-actions`). Panels must not render their own view title.
- **Section card**: `.readme-section` > `.readme-heading` (`.readme-heading__title` holding the `h2.readme-heading__text` and an optional `.readme-heading__count`, then actions) > `.readme-tasks` rows. Used by the todo, By Date, Goals, Projects, Insights. Keep the count *outside* the `h2` — e2e reads heading text exactly.
- **Rows**: `.task-card` markup (checkbox / body with `__name` over a `__meta` line / `__actions`). Secondary actions are hidden until hover/focus on pointer devices (`@media (hover: hover)`), always visible on touch.

## Components & patterns

- **Buttons**: one primary action per surface (`.btn--primary`); Cancel is `.btn--secondary`; destructive confirm is `.btn--danger`; low-emphasis is `.btn--ghost`; tinted call-to-action is `.btn--soft`. Sizes: default 34px, `.btn--sm` 28px.
- **Icon buttons**: `.icon-btn` (30px, ghost). Add `.icon-btn--danger` for delete. Use `<Icon name="…" />`, never pasted SVG paths.
- **The view "+"**: always `<AddButton ariaLabel="Add …" />` (solid accent square); the aria-label is the e2e contract.
- **Modals**: wrap content in `<Modal onClose className="<block>" overlayClassName="<block>__overlay" labelledBy="<title id>">`. It provides `role="dialog"`, Escape-to-close from anywhere, drag-safe overlay close, focus in/restore and scroll lock. Inside: `h3.ui-modal__title` (+ optional `.ui-modal__subtitle` / `.ui-modal__description`), fields, then `.ui-modal__actions` with Cancel (secondary) then the primary/danger button. Keep each modal's BEM classes alongside the shared ones (e2e targets them).
- **Fields**: `.field` > `.field__label` + `.input` / `.textarea` (+ `.field__hint`).
- **Chips**: `.chip` + `--accent|success|danger|warning|info|outline` for status/meta. Dates: today = success, overdue = danger (with the word, not colour alone), recurring = info.
- **Segmented choices** (modes, frequencies, weekday pickers): `.segmented` + `.segmented__btn(--active)`, or pill buttons styled with the same tokens.
- **Empty / loading / note text**: `.empty-message`. Errors: `.alert.alert--danger` (the todo's `Action failed: …` alert is sticky and dismissible).

## Accessibility checklist

- Every icon-only button has an `aria-label` (and `title` tooltip).
- Status is never colour-only (Today/Overdue words, dashed vs solid, icons).
- Text contrast ≥ 4.5:1 on its surface for both themes (the token pairs are chosen for this).
- Visible keyboard focus (`:focus-visible` ring); hover-revealed actions also reveal on `:focus-within`.
- `prefers-reduced-motion` disables animations globally.

# CSS Style Guide & File Map

All styling is plain CSS (no Tailwind — removed in favour of hand-written files).
There are **13 stylesheet files** arranged as:

- **Global** — `src/styles/` are imported once by `src/index.css`.
- **Colocated** — one `.css` per screen/component, imported at the top of the matching `.tsx` file.

## Where to find things

```text
src/
├─ index.css                    ← entry: imports the 3 global files (nothing else)
├─ styles/
│  ├─ tokens.css                ← all CSS custom properties (colors, radii, shadows)
│  ├─ base.css                  ← reset, body defaults, .clamp-2/.clamp-3, scrollbars
│  └─ components.css            ← shared UI building blocks (buttons, inputs, modals, clue card)
├─ components/
│  ├─ TopBar.css                ← Home + Edit top bars
│  ├─ GameCard.css              ← Home game card
│  ├─ ConfirmModal.css          ← confirmation dialog
│  ├─ ClueEditorModal.css       ← clue edit form + media upload
│  ├─ BoardGridEditor.css       ← Edit-page board grid (`.bge-*`)
│  └─ PreviewOverlay.css        ← Preview mode shell + grids (`.prev-*`, `.pvg-*`, `.pvf-*`)
└─ pages/
   ├─ Home.css                  ← Home page layout
   ├─ Edit.css                  ← Edit page layout + side panel
   └─ Play.css                  ← Play page (largest file, sectioned)
```

**Rule of thumb:** if a style is used by more than one screen, it belongs in
`components.css` (or `tokens.css`/`base.css`). Colocated files should only contain
markup unique to that screen/component.

---

## Global files

### `src/styles/tokens.css`
Single `:root { }` block of design tokens. Change colours/spacing here and the
whole app follows — **never hard-code colours in another file**.

| Token | Purpose |
|---|---|
| `--navy-900 / -800 / -700` | dark navy backgrounds (`#0f1d45`, `#1a2d5c`, `#1e3a6e`) |
| `--board-blue`, `--board-dark` | original Jeopardy blue tones |
| `--gold`, `--gold-light` | primary accent + hover |
| `--silver`, `--silver-text`, `--bronze`, `--bronze-text` | podium 2nd/3rd colours |
| `--danger`, `--danger-hover`, `--danger-soft`, `--flash-red` | errors, DD badge, time-up flash |
| `--green`, `--green-hover` | correct answer buttons |
| `--slate-50 … --slate-900` | grey scale (light → dark) |
| `--r-sm … --r-pill` | border radii |
| `--shadow-sm … --shadow-xl` | shadows |
| `--t-fast` | default transition timing `0.15s ease` |
| `--editor-gap`, `--board-gap`, `--row-label-w` | board grid layout tokens |

### `src/styles/base.css`
- Element reset (`box-sizing`, margins, `font: inherit` for form controls).
- `body`/`#root` defaults (dark background, system font, full-height flex column).
- `.clamp-2` / `.clamp-3` — multi-line text truncation helpers (used by board cell
  previews). Both `-webkit-line-clamp` **and** standard `line-clamp` are declared.
- Dark `::-webkit-scrollbar` styling.

### `src/styles/components.css`
Shared primitives, grouped by commented sections:

- **Buttons** — `.btn` base + variants: `--gold` (+`--big`, `--noshadow`),
  `--navy`, `--danger`, `--glass`, `--outline`, `--slate`, `--white`,
  `--solid-dark`, `--link` (+`--white`), `--danger-text`. `.btn-xs` = compact size.
- **Pills / tabs** — `.pill-tab`, `--active` (gold), `--idle` (translucent).
- **Badges** — `.badge-dd` (+`--xl`) Daily Double badge.
- **Labels / hints** — `.field-label`, `.hint`.
- **Text inputs** — `.text-input` (+ `--round`, `--lg`, `--center`, `--right`),
  `.input-ghost` (borderless label input, used for category titles).
- **Toggle switch** — `.toggle` + `.toggle-track` (hidden `input` + knob).
- **Modals / overlays** — `.modal-backdrop` (+`--top`, `--dark`), `.modal-scrim`
  (+`--strong`), `.modal-card` (+`--md`, `--lg`, `--xl`), `.modal-header`,
  `.modal-body`, `.modal-footer`, `.page-overlay`.
- **Icon buttons** — `.icon-btn` sizes `--sm`, `--md`, `--lg`; styles `--glass`,
  `--glass-lg`, `--red`, `--slate`, `--softred`.
- **Clue big card** — `.cluecard` (white card used by Preview + Play), with
  `--flash` (red time-up), `__top`, `__label`, `__cat`, `__body`, `__q`, `__media`
  (+ `__media-item/-frame/-audio/-empty`), `__answer-zone`, `__answer-box`,
  `__answer-label`, `__answer-text`, plus `.countdown-pill` (+`--low`) and
  `.pickswipe-hint`.
- **Answer frame** — `.answer-frame` (+`__name`, `__actions`, `__hov`,
  `__btn` `--ok`/`--no`): the per-player ✓/✗ award pill on clue cards.

---

## Component files (colocated)

### `src/components/TopBar.css`
- `.home-bar` (+ `__inner`, `__title`, `__create`) — Home header.
- `.edit-bar` (+ `__inner`, `__back`, `__title`, `__spacer`, `__actions`,
  `__preview`, `__play`) — Edit screen header.

### `src/components/GameCard.css`
Cover card on Home: `.game-card` (+ `__bg-img`, `__bg-overlay`, `__bg-gradient`,
`__badge`, `__delete`, `__body`, `__title`, `__meta`, `__actions`, `__btn`
`--edit`/`--play`, `__restart`).

### `src/components/ConfirmModal.css`
Single dialog: `.confirm-content`, `__title`, `__msg`, `__actions`, `.confirm-btn`
`--cancel`/`--confirm` (+ `--danger` combo). Rendered inside `modal-backdrop`/`modal-card`.

### `src/components/ClueEditorModal.css`
`.clue-editor__*`: `__title`, `__subtitle`, `__close`, `__body`, `__grid2`,
`__value-row`, `__dd` (Daily Double toggle), `__pills`/`__pill` (`--active`),
`__media-grid`, `__media-card`, `__media-label`, `__media-type`, `__media-preview`,
`__media-empty`, `__media-remove`, `__footer-left`, `__footer-right`.

### `src/components/BoardGridEditor.css`
Edit-page board grid — prefix **`.bge-`**:
- `.bge-root` (+`--tight`), `.bge-empty`
- `.bge-cat` (white category header)
- `.bge-final-btn` (+`--has`/`--empty`), `.bge-final-content`, `__label-row`,
  `__q`, `__divider`, `__a`, `__meta`
- Grid scaffold: `.bge-grid` (+`--dense`/`--vdense`), `__cats-row`, `__spacer`,
  `__cats`, `__row`, `__row-label`, `__cells`
- Cells: `.bge-cell` (+`--has`/`--empty`), `__plus`, `__value`,
  **cell preview text** `.bge-cell-q` / `.bge-cell-a` (scale to the cell with
  container queries — see [Scaling text to a cell](#scaling-text-to-a-cell)),
  `.bge-cell-divider`, `.bge-dd-marker` (Daily Double, top-right),
  `.bge-time-marker` (time limit pill, bottom-left; hidden when unlimited).

### `src/components/PreviewOverlay.css`
Preview mode — three prefixes:
- `.prev-*` shell: `__root`, `__top-left`, `__header`, `__header__title`,
  `__header__sub`, `__top-right`, `__main`, `__main__sub`, `__main__inner`,
  `__board-wrap`, `__clue`, `__clue__center`.
- `.pvg-*` preview board grid: `__cats`, `__spacer`, `__cats-grid`, `__cat`,
  `__body`, `__row`, `__row-label`, `__cells`, `__cell`, `__cell__value`.
- `.pvf-*` final-Jeopardy preview: `__root`, `__cat`, `__clue-box`, `__clue-btn`.

Clue card markup is NOT here — it reuses `.cluecard` from `components.css`.

---

## Page files

### `src/pages/Home.css`
`.home-page`, `.home-main`, `.home-heading`, `.home-empty` (+`__create`) and the
`.home-grid` of game cards.

### `src/pages/Edit.css`
`.edit-loading`, `.edit-page`, `.edit-main`, `.edit-content` (holds the grid),
`.edit-pills` / `.edit-tab` (+`--active`/`--idle`) / `.edit-tab-add` /
`.edit-chip-wrap` / `.edit-remove-chip`, `.edit-grid-wrap`, `.edit-disabled`
(+`__card`, `__title`, `__sub`, `__btn`), and the right side panel `.edit-side` /
`.edit-side-card` / `.edit-divider` / `.edit-side-head` / `.edit-stepper`
(+`__row`, `__val`) / `.edit-upload` (+`__img`, `__txt`, `__txt--sub`,
`.edit-remove-bg`) / `.edit-showcats`.

### `src/pages/Play.css`
Largest file, sectioned with comment banners, prefix **`.play-*` + `.podium-*`
+ `.bpg-*`**:

1. **Shell** — `.play-shell` (+`--loading`), `.play-top-left`, `.play-top-right`,
   `.play-header` (+`__title`, `__sub`), `.play-main` (+`__sub`, `__inner`,
   `__board-wrap`).
2. **Podium (game over)** — `.podium-screen`, `.podium-scroll`, `.podium-head`,
   `.podium-event`, `.podium-title`, `.podium-complete`. Two-player:
   `.podium-duo` (+`__1`/`__1-inner`/`__rank`/`__name`/`__score`,
   `__2`/`__2-inner`/`__2rank`/`__2name`/`__2score`). 3+: `.podium-top3`,
   `.podium-col` (+`--1`/`--2`/`--3`, `__rank1`/`__rank`/`__rank3`,
   `__name1`/`__name`, `__score1`/`__score`/`__score3`). Others:
   `.podium-rest` (+`__row`, `__place`, `__name`, `__score`, `__score--neg`),
   `.podium-empty`.
3. **Banner (board complete)** — `.play-banner` (+`__title`, `__sub`, `__actions`),
   `.btn-banner-dark`/`-white`/`-ghost`, `.play-final-cta` (+`__title`, `__cat`,
   `__start`, `__reveal`), `.play-final-progress`.
4. **Sidebar** — `.play-sidebar` (+`__none`, `__row` `--active`/`--idle`,
   `__name`, `__score` (+`--neg`), `__picks`).
5. **Setup modal** — `.setup-modal` (+`__card`, `__header`, `__body`),
   `.setup-add-row`, `.setup-list`, `.setup-empty`, `.setup-list__rows`,
   `.setup-player-row`, `.setup-avatar`, `.setup-player-name`, `.setup-player-score`,
   `.setup-picks` (+`__label`, `__buttons`), `.setup-pick-btn` (+`--active`/`--idle`),
   `.setup-start`, `.setup-continue`.
6. **Score edit modal** — `.score-modal__body`, `__name`, `__row`, `__label`,
   `__input`, `__turn`, `__turn-gold`, `__footer`.
7. **Wager** — `.wager-backdrop`, `.wager-card` (+`--dd`, `--fj`), `__title`,
   `__sub`, `.wager-list`, `.wager-row` (+`__name`, `__score`, `__input`,
   `__toggle-wrap`), `.wager-field`, `.wager-actions`, `.wager-btn` (+`--ghost`, `--gold`).
8. **Clue card** — `.play-clue` (+`__center`, `__bottom-right`, `__noplayers`,
   `__final-btn`, `__void`) — content reuses `.cluecard` from `components.css`.
9. **Board playgrid** — `.bpg` (+`__cats`, `__spacer`, `__cats-grid`, `__cat`,
   `__body`, `__row`, `__row-label`, `__cells`, `__cell`, `__cell--answered`).

---

## Conventions

- **Naming prefixes** avoid collisions between files:
  `.bge-*`, `.bpg-*`, `.pvg-*`/`.pvf-*`/`.prev-*`, `.clue-editor-*`,
  `.game-card__*`, `.play-*`, `.podium-*`, `.setup-*`, `.wager-*`, `.score-modal-*`.
- **Dynamic values via CSS variables**, injected inline in TSX:
  `style={{ "--cols": cols } as CSSProperties}` consumed as
  `grid-template-columns: repeat(var(--cols, 1), 1fr)`.
- **Scaling text to a cell:** a board cell sets `container-type: size`; its text
  uses container-relative units, e.g.
  `font-size: clamp(9px, min(13.5cqw, 15cqh), 60px);`. The floors are kept low so
  it tracks the cell (no hard 18–21px floor). Short cells (many rows) trigger
  `@container bge-cell (max-height: 140px/90px)` rules that drop the floor and
  tighten line-height/divider/padding so the question + answer preview still fits
  and stays centered. See `.bge-cell-q` / `.bge-cell-a`.

## Quick edits

| I want to change… | Edit this file |
|---|---|
| Primary gold / navy colours | `src/styles/tokens.css` |
| Board cell preview text size | `src/components/BoardGridEditor.css` (`.bge-cell-q`/`.bge-cell-a`) |
| Big clue card question text | `src/styles/components.css` (`.cluecard__q`) |
| Podium winner appearance | `src/pages/Play.css` → *Podium* section |
| Play board cell size/`--cols` | `src/pages/Play.css` → *Board playgrid* (`.bpg-*`) |
| Buttons / inputs / modals app-wide | `src/styles/components.css` |
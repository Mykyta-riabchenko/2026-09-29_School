# Frontend Style Documentation
## Volleyball Tournament UI — Design System & CSS Specification

**Version:** 1.0  
**Status:** Frontend styling specification  
**Reference:** supplied Figma design screenshot  
**Scope:** all frontend pages and reusable UI components

> **Important:** The screenshot is the visual source available for this document. The colour values, dimensions and breakpoints below are implementation tokens derived from the visual design and should be compared against the original Figma variables before production. The purpose of this document is to ensure one consistent implementation across the whole application.

---

# 1. Styling goals

The frontend MUST use one shared design system.

The same visual rules apply to:

- Dashboard / overview
- Teams
- Team details
- Game schedule
- Game details
- Fields / live courts
- Group and round views
- Scoreboard / large-screen views
- Modals, filters and forms
- Loading, empty and error states

Components MUST NOT invent their own colours, spacing, border radius or typography.

Use shared CSS variables and reusable component classes.

Recommended styling stack:

```text
global tokens
    ↓
base/reset
    ↓
layout utilities
    ↓
component styles
    ↓
page-specific layout
```

Page-specific CSS may control layout, but visual tokens MUST come from the shared design system.

---

# 2. Design language

The Figma design uses:

- dark navy as the primary brand/action colour
- white cards on a very light cool background
- warm orange/gold as the tournament accent
- compact rounded cards
- thin light borders
- soft shadows
- small uppercase metadata labels
- strong numeric score typography
- blue-tinted information surfaces
- green for completed/success states
- red for live/attention states
- restrained use of colour
- dense but readable tournament information

The UI should feel like a professional sports control panel rather than a generic web dashboard.

---

# 3. Global design tokens

Create one source of truth:

```css
/* styles/tokens.css */

:root {
  /* Brand */
  --color-brand-900: #08284A;
  --color-brand-800: #0B3159;
  --color-brand-700: #123F70;
  --color-brand-600: #1D4F86;

  /* Accent */
  --color-accent-600: #D98A16;
  --color-accent-500: #F0A52B;
  --color-accent-400: #F6B84A;
  --color-accent-100: #FFF4DE;

  /* Text */
  --color-text-900: #102A43;
  --color-text-800: #183B56;
  --color-text-700: #334E68;
  --color-text-600: #486581;
  --color-text-500: #627D98;
  --color-text-400: #829AB1;
  --color-text-inverse: #FFFFFF;

  /* Surfaces */
  --color-background: #F5F7FB;
  --color-surface: #FFFFFF;
  --color-surface-subtle: #F8FAFD;
  --color-surface-blue: #EEF4FF;
  --color-surface-navy: #0B3159;

  /* Borders */
  --color-border: #D9E2EC;
  --color-border-strong: #BCCCDC;
  --color-border-focus: #2F6DB2;

  /* Semantic */
  --color-success-700: #287A62;
  --color-success-100: #E6F5EF;

  --color-danger-700: #B4232C;
  --color-danger-100: #FCEBEC;

  --color-warning-700: #A76500;
  --color-warning-100: #FFF3D8;

  --color-info-700: #315D96;
  --color-info-100: #EAF2FF;

  /* Shadows */
  --shadow-xs: 0 1px 2px rgba(16, 42, 67, 0.05);
  --shadow-sm: 0 2px 8px rgba(16, 42, 67, 0.07);
  --shadow-md: 0 6px 18px rgba(16, 42, 67, 0.09);
  --shadow-focus: 0 0 0 3px rgba(47, 109, 178, 0.22);

  /* Radius */
  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 10px;
  --radius-xl: 12px;
  --radius-pill: 999px;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* Control heights */
  --control-sm: 32px;
  --control-md: 38px;
  --control-lg: 44px;

  /* Layout */
  --content-max-width: 1440px;
  --sidebar-width: 240px;
  --page-gutter: 16px;
}
```

### Token rules

Do not write:

```css
color: #0B3159;
border-radius: 8px;
padding: 16px;
```

inside individual components unless the value is genuinely unique.

Prefer:

```css
color: var(--color-brand-800);
border-radius: var(--radius-md);
padding: var(--space-4);
```

This guarantees consistency.

---

# 4. Typography

The screenshot uses a compact sans-serif UI font.

Preferred implementation:

```css
:root {
  --font-family-sans:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}
```

If the Figma project specifies a particular font, that font MUST replace the fallback stack.

## Type scale

```css
:root {
  --font-size-xs: 10px;
  --font-size-sm: 12px;
  --font-size-md: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 20px;
  --font-size-2xl: 24px;
  --font-size-score: 28px;

  --line-xs: 1.2;
  --line-sm: 1.3;
  --line-md: 1.4;
  --line-lg: 1.5;
}
```

## Typography classes

```css
.text-page-title {
  font-size: var(--font-size-xl);
  line-height: var(--line-lg);
  font-weight: 700;
  color: var(--color-text-900);
}

.text-section-title {
  font-size: var(--font-size-lg);
  line-height: var(--line-md);
  font-weight: 700;
  color: var(--color-text-900);
}

.text-body {
  font-size: var(--font-size-md);
  line-height: var(--line-md);
  color: var(--color-text-700);
}

.text-meta {
  font-size: var(--font-size-xs);
  line-height: var(--line-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-500);
}

.text-score {
  font-size: var(--font-size-score);
  line-height: 1;
  font-weight: 800;
  color: var(--color-text-900);
  font-variant-numeric: tabular-nums;
}
```

---

# 5. Global reset

Use one global reset.

```css
/* styles/globals.css */

*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  min-width: 320px;
  background: var(--color-background);
}

body {
  margin: 0;
  min-width: 320px;
  background: var(--color-background);
  color: var(--color-text-900);
  font-family: var(--font-family-sans);
  font-size: var(--font-size-md);
  line-height: var(--line-md);
  -webkit-font-smoothing: antialiased;
}

button,
input,
select,
textarea {
  font: inherit;
}

button {
  border: 0;
}

img,
svg {
  display: block;
  max-width: 100%;
}

a {
  color: inherit;
  text-decoration: none;
}
```

---

# 6. Page background and shell

The complete application uses the light cool-grey background visible around the white content surfaces.

```css
.app {
  min-height: 100vh;
  background: var(--color-background);
}

.page {
  width: 100%;
  max-width: var(--content-max-width);
  margin-inline: auto;
  padding: var(--space-4);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.page-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
```

On narrow screens:

```css
@media (max-width: 639px) {
  .page {
    padding: var(--space-3);
  }

  .page-header {
    align-items: flex-start;
  }
}
```

---

# 7. Cards

Cards are the primary visual container in the Figma design.

Characteristics:

- white background
- thin light border
- small/medium radius
- subtle shadow
- compact padding

```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
  padding: var(--space-4);
}

.card--compact {
  padding: var(--space-3);
}

.card--interactive {
  cursor: pointer;
  transition:
    border-color 120ms ease,
    box-shadow 120ms ease,
    transform 120ms ease;
}

.card--interactive:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-sm);
}

.card--interactive:active {
  transform: translateY(1px);
}
```

Do not create arbitrary card styles per page. Add a modifier only when the visual role is genuinely different.

---

# 8. Tournament status banner

The dark navy tournament banner in the overview is a primary information surface.

```css
.status-banner {
  background: var(--color-brand-900);
  color: var(--color-text-inverse);
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
  box-shadow: var(--shadow-sm);
}

.status-banner__title {
  font-size: var(--font-size-sm);
  font-weight: 700;
}

.status-banner__progress {
  height: 4px;
  margin-top: var(--space-3);
  overflow: hidden;
  background: rgba(255, 255, 255, 0.14);
  border-radius: var(--radius-pill);
}

.status-banner__progress-value {
  height: 100%;
  background: var(--color-accent-500);
  border-radius: inherit;
}
```

---

# 9. Buttons

All buttons use a shared component.

## Base

```css
.button {
  min-height: var(--control-md);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);

  padding: 0 var(--space-4);
  border: 1px solid transparent;
  border-radius: var(--radius-md);

  font-size: var(--font-size-sm);
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;

  cursor: pointer;
  transition:
    background-color 120ms ease,
    border-color 120ms ease,
    color 120ms ease,
    box-shadow 120ms ease;
}

.button:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}

.button:disabled,
.button[aria-disabled="true"] {
  opacity: 0.5;
  cursor: not-allowed;
}
```

## Primary

```css
.button--primary {
  color: var(--color-text-inverse);
  background: var(--color-brand-800);
}

.button--primary:hover {
  background: var(--color-brand-700);
}

.button--primary:active {
  background: var(--color-brand-900);
}
```

## Secondary

```css
.button--secondary {
  color: var(--color-brand-800);
  background: var(--color-surface);
  border-color: var(--color-border);
}

.button--secondary:hover {
  background: var(--color-surface-subtle);
  border-color: var(--color-border-strong);
}
```

## Ghost

```css
.button--ghost {
  color: var(--color-text-700);
  background: transparent;
}

.button--ghost:hover {
  background: var(--color-surface-blue);
  color: var(--color-brand-800);
}
```

## Danger

```css
.button--danger {
  color: var(--color-danger-700);
  background: var(--color-danger-100);
}

.button--danger:hover {
  background: #F8DADD;
}
```

## Small action button

```css
.button--sm {
  min-height: var(--control-sm);
  padding-inline: var(--space-3);
  font-size: var(--font-size-xs);
}
```

---

# 10. Filter chips / segmented controls

The Figma design uses small pill-like filters.

```css
.filter-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.filter-chip {
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 6px;

  padding: 0 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);

  background: var(--color-surface);
  color: var(--color-text-600);

  font-size: var(--font-size-xs);
  font-weight: 600;
  cursor: pointer;
}

.filter-chip:hover {
  border-color: var(--color-border-strong);
}

.filter-chip[aria-selected="true"] {
  color: var(--color-text-inverse);
  background: var(--color-brand-800);
  border-color: var(--color-brand-800);
}
```

---

# 11. Inputs and selects

```css
.input,
.select {
  width: 100%;
  min-height: var(--control-md);

  padding: 0 var(--space-3);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);

  background: var(--color-surface);
  color: var(--color-text-900);

  font-size: var(--font-size-sm);
}

.input::placeholder {
  color: var(--color-text-400);
}

.input:hover,
.select:hover {
  border-color: var(--color-text-400);
}

.input:focus,
.select:focus {
  outline: none;
  border-color: var(--color-border-focus);
  box-shadow: var(--shadow-focus);
}
```

Search input:

```css
.search-control {
  position: relative;
}

.search-control__icon {
  position: absolute;
  left: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-400);
  pointer-events: none;
}

.search-control .input {
  padding-left: 36px;
}
```

---

# 12. Badges and metadata labels

The design uses small labels such as `GRUPPE A`, `FELD 1`, `LIVE`, `ABGESCHLOSSEN`.

```css
.badge {
  min-height: 20px;
  display: inline-flex;
  align-items: center;
  gap: 4px;

  padding: 0 7px;
  border-radius: var(--radius-sm);

  font-size: 9px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.badge--neutral {
  color: var(--color-text-600);
  background: var(--color-surface-blue);
}

.badge--live {
  color: var(--color-danger-700);
  background: var(--color-danger-100);
}

.badge--success {
  color: var(--color-success-700);
  background: var(--color-success-100);
}

.badge--warning {
  color: var(--color-warning-700);
  background: var(--color-warning-100);
}

.badge--brand {
  color: var(--color-text-inverse);
  background: var(--color-brand-800);
}
```

---

# 13. Live indicator

The red live dot used beside live-game headings should be reusable.

```css
.live-indicator {
  width: 6px;
  height: 6px;
  flex: 0 0 6px;
  border-radius: 50%;
  background: var(--color-danger-700);
}

.live-indicator--pulse {
  animation: live-pulse 1.8s ease-in-out infinite;
}

@keyframes live-pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.35;
  }
}
```

Do not use aggressive flashing for accessibility.

---

# 14. Team cards

The Teams screen uses stacked white cards.

```css
.team-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);

  padding: var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
}

.team-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.team-card__name {
  margin: 0;
  color: var(--color-text-900);
  font-size: var(--font-size-md);
  font-weight: 700;
}

.team-card__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
}

.team-card__stat {
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-surface-blue);
  text-align: center;
}

.team-card__stat-label {
  display: block;
  color: var(--color-text-500);
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-transform: uppercase;
}

.team-card__stat-value {
  display: block;
  margin-top: 2px;
  color: var(--color-text-900);
  font-size: var(--font-size-md);
  font-weight: 800;
}
```

---

# 15. Game card

A game is one of the most important reusable components.

```css
.game-card {
  position: relative;
  overflow: hidden;

  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
}

.game-card--live {
  border-color: #E9B5B8;
}

.game-card--completed {
  border-color: #D3E8DF;
}

.game-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-3) var(--space-2);
}

.game-card__teams {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3);
}

.game-card__team {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);

  min-height: 36px;
  padding: 0 var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--color-surface-blue);
}

.game-card__score {
  min-width: 32px;
  text-align: center;
  font-size: var(--font-size-xl);
  line-height: 1;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.game-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);

  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--color-border);
  color: var(--color-text-500);
  font-size: var(--font-size-xs);
}
```

---

# 16. Scoreboard numbers

Scores must remain visually stable when live updates arrive.

```css
.score {
  color: var(--color-text-900);
  font-size: var(--font-size-score);
  line-height: 1;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.score--winner {
  color: var(--color-brand-900);
}

.score--loser {
  color: var(--color-text-400);
}
```

Do not animate the entire game card on every score update.

A small number transition MAY be used if approved by the final design.

---

# 17. Field / live-court cards

The live-court screen uses a stronger orange court surface.

```css
.court-card {
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-accent-500);
  border-radius: var(--radius-lg);
}

.court-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
}

.court-card__court {
  margin: 0 var(--space-3) var(--space-3);
  padding: var(--space-5);

  border-radius: var(--radius-md);
  background: var(--color-accent-600);
  color: var(--color-text-inverse);

  text-align: center;
  font-weight: 700;
}

.court-card--free {
  border-color: var(--color-border);
}

.court-card--free .court-card__court {
  background: var(--color-surface-blue);
  color: var(--color-text-700);
  border: 1px dashed var(--color-border-strong);
}
```

---

# 18. Round navigation

Round tabs are compact segmented controls.

```css
.round-tabs {
  display: flex;
  gap: var(--space-1);
  overflow-x: auto;
  scrollbar-width: thin;
}

.round-tab {
  flex: 0 0 auto;
  min-height: 32px;

  padding: 0 var(--space-3);
  border-radius: var(--radius-md);

  background: var(--color-surface);
  color: var(--color-text-600);

  font-size: var(--font-size-xs);
  font-weight: 600;
  cursor: pointer;
}

.round-tab[aria-selected="true"] {
  color: var(--color-text-inverse);
  background: var(--color-brand-800);
}
```

---

# 19. Navigation / bottom navigation

The supplied mobile designs use a fixed bottom navigation bar.

```css
.bottom-nav {
  position: fixed;
  z-index: 20;
  right: 0;
  bottom: 0;
  left: 0;

  display: grid;
  grid-template-columns: repeat(4, 1fr);

  min-height: 64px;
  padding: var(--space-2);

  background: rgba(255, 255, 255, 0.98);
  border-top: 1px solid var(--color-border);
  box-shadow: 0 -4px 16px rgba(16, 42, 67, 0.06);
}

.bottom-nav__item {
  min-height: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;

  border-radius: var(--radius-md);
  color: var(--color-text-600);

  font-size: 9px;
  font-weight: 600;
}

.bottom-nav__item[aria-current="page"] {
  color: var(--color-text-inverse);
  background: var(--color-brand-800);
}
```

Reserve space for the fixed navigation:

```css
.page--with-bottom-nav {
  padding-bottom: 88px;
}
```

On desktop, the navigation can become a normal sidebar or top-level navigation according to the final application shell.

---

# 20. Desktop application shell

```css
.app-shell {
  min-height: 100vh;
}

.app-shell__content {
  width: 100%;
  max-width: var(--content-max-width);
  margin-inline: auto;
}
```

For wider screens:

```css
@media (min-width: 1024px) {
  .app-shell {
    display: grid;
    grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
  }

  .app-shell__main {
    min-width: 0;
  }
}
```

---

# 21. Responsive breakpoints

Use only a small number of shared breakpoints.

```css
/* Small phones */
@media (max-width: 479px) {}

/* Phones / small tablets */
@media (min-width: 480px) and (max-width: 767px) {}

/* Tablet */
@media (min-width: 768px) and (max-width: 1023px) {}

/* Desktop */
@media (min-width: 1024px) and (max-width: 1439px) {}

/* Large screens */
@media (min-width: 1440px) {}
```

Do not create a new breakpoint for an individual component.

## Responsive rules

### Phone

```css
@media (max-width: 767px) {
  .page-content {
    gap: var(--space-3);
  }

  .team-card__stats {
    gap: var(--space-1);
  }

  .page-header {
    flex-direction: column;
  }
}
```

### Tablet / desktop

```css
@media (min-width: 768px) {
  .page {
    padding: var(--space-6);
  }
}
```

### Large display

```css
@media (min-width: 1440px) {
  .page {
    padding: var(--space-8);
  }

  .text-page-title {
    font-size: var(--font-size-2xl);
  }
}
```

The large-screen layout MUST prioritise readability and information density. It should not simply stretch mobile cards to fill the entire monitor.

---

# 22. Grids

Use CSS Grid for repeated dashboard content.

```css
.card-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

@media (min-width: 768px) {
  .card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1200px) {
  .card-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
```

For field/court displays:

```css
.court-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-3);
}

@media (min-width: 768px) {
  .court-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1200px) {
  .court-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
```

---

# 23. Spacing rules

Use the spacing scale rather than arbitrary values.

Preferred:

```css
padding: var(--space-4);
gap: var(--space-3);
margin-bottom: var(--space-6);
```

Avoid:

```css
padding: 13px;
gap: 17px;
margin-bottom: 23px;
```

Unless the value is required by an exact Figma measurement and is documented as an exception.

## Typical spacing

| Usage | Token |
|---|---|
| icon gap | `--space-1` |
| chip gap | `--space-2` |
| card internal small gap | `--space-2` |
| normal component gap | `--space-3` |
| card padding | `--space-4` |
| section gap | `--space-6` |
| large page spacing | `--space-8` |

---

# 24. Borders and shadows

Most UI elements use borders rather than strong shadows.

Default:

```css
border: 1px solid var(--color-border);
box-shadow: var(--shadow-xs);
```

Interactive elevated item:

```css
box-shadow: var(--shadow-sm);
```

Large overlay/modal:

```css
box-shadow: var(--shadow-md);
```

Avoid strong dark shadows.

---

# 25. State colours

Use semantic tokens consistently.

| State | Background | Text |
|---|---|---|
| Live | `--color-danger-100` | `--color-danger-700` |
| Completed | `--color-success-100` | `--color-success-700` |
| Warning | `--color-warning-100` | `--color-warning-700` |
| Information | `--color-info-100` | `--color-info-700` |
| Selected | brand surface | white |
| Neutral | surface blue | text 600 |

Never use red/green/yellow ad hoc.

Example:

```css
.status--live {
  color: var(--color-danger-700);
  background: var(--color-danger-100);
}

.status--completed {
  color: var(--color-success-700);
  background: var(--color-success-100);
}
```

---

# 26. Accessibility states

Every interactive element needs a visible focus state.

```css
:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}
```

Do not remove focus without providing another visible focus indication.

Disabled state:

```css
.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}
```

Prefer native `disabled` where possible.

---

# 27. Skeleton loading

Loading should use the same geometry as the final component.

```css
.skeleton {
  overflow: hidden;
  background:
    linear-gradient(
      90deg,
      var(--color-surface-blue) 25%,
      #F7F9FC 37%,
      var(--color-surface-blue) 63%
    );
  background-size: 400% 100%;
  animation: skeleton-loading 1.4s ease infinite;
  border-radius: var(--radius-sm);
}

@keyframes skeleton-loading {
  0% {
    background-position: 100% 0;
  }

  100% {
    background-position: -100% 0;
  }
}
```

Respect reduced-motion preferences:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

# 28. Tables

If a desktop view uses a table:

```css
.data-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--color-surface);
}

.data-table th {
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-500);
  font-size: var(--font-size-xs);
  font-weight: 700;
  text-align: left;
  text-transform: uppercase;
}

.data-table td {
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-700);
}

.data-table tbody tr:hover {
  background: var(--color-surface-subtle);
}
```

On phone, prefer cards instead of forcing a wide table.

---

# 29. Icons

Icons should come from one icon library or one custom SVG system.

Do not mix unrelated icon styles.

Recommended icon sizes:

```css
.icon--xs { width: 12px; height: 12px; }
.icon--sm { width: 16px; height: 16px; }
.icon--md { width: 20px; height: 20px; }
.icon--lg { width: 24px; height: 24px; }
```

```css
.icon {
  flex: 0 0 auto;
  stroke-width: 1.8;
}
```

Icons should normally inherit text colour:

```css
.icon {
  color: currentColor;
}
```

---

# 30. Game schedule visual hierarchy

A schedule row/card should follow this hierarchy:

```text
STATUS
Round / Field metadata
Team A              score
Team B              score
Referee / supporting information
```

Example:

```css
.game-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-3);
  padding: var(--space-3);
}

.game-row__teams {
  display: grid;
  gap: var(--space-2);
}

.game-row__score {
  display: grid;
  align-content: center;
  gap: var(--space-2);
}
```

The score is visually stronger than metadata.

---

# 31. Leaderboard styling

The leaderboard uses a light card with compact rows.

```css
.leaderboard {
  padding: var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.leaderboard__row {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-2);

  min-height: 44px;
  padding: 0 var(--space-2);
  border-bottom: 1px solid var(--color-border);
}

.leaderboard__row:last-child {
  border-bottom: 0;
}

.leaderboard__rank {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--color-surface-blue);
  color: var(--color-text-600);
  font-size: var(--font-size-xs);
  font-weight: 800;
}

.leaderboard__points {
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
```

The first-ranked row may use the accent background:

```css
.leaderboard__row--first {
  background: var(--color-accent-100);
}
```

---

# 32. Scroll behaviour

Horizontal filters/tabs may scroll horizontally.

```css
.horizontal-scroll {
  display: flex;
  overflow-x: auto;
  gap: var(--space-2);
  scrollbar-width: none;
  overscroll-behavior-x: contain;
}

.horizontal-scroll::-webkit-scrollbar {
  display: none;
}
```

Do not use horizontal page scrolling.

---

# 33. Z-index scale

Use a shared z-index scale.

```css
:root {
  --z-base: 0;
  --z-sticky: 10;
  --z-navigation: 20;
  --z-dropdown: 30;
  --z-modal: 40;
  --z-toast: 50;
}
```

Never use random values such as `z-index: 99999`.

---

# 34. Animation rules

Animations are intentionally subtle.

Default transition:

```css
transition:
  background-color 120ms ease,
  border-color 120ms ease,
  color 120ms ease,
  box-shadow 120ms ease;
```

Use animation for:

- live indicators
- loading skeletons
- small state transitions

Do not animate:

- entire lists whenever a WebSocket event arrives
- large scoreboards unnecessarily
- page layout on every data refresh

---

# 35. CSS architecture

Recommended files:

```text
src/styles/
├── tokens.css
├── reset.css
├── globals.css
├── typography.css
├── utilities.css
└── components/
    ├── button.css
    ├── card.css
    ├── badge.css
    ├── input.css
    ├── game-card.css
    ├── team-card.css
    ├── court-card.css
    ├── navigation.css
    └── leaderboard.css
```

Import order:

```css
@import "./tokens.css";
@import "./reset.css";
@import "./globals.css";
@import "./typography.css";
@import "./utilities.css";
```

Component CSS should be imported after the global foundation.

---

# 36. Naming convention

Use BEM-like names for plain CSS.

```text
block
block__element
block--modifier
```

Examples:

```text
game-card
game-card__header
game-card__score
game-card--live

team-card
team-card__name
team-card__stats

button
button--primary
button--secondary
button--sm
```

Avoid vague names:

```text
.blue-box
.big-card
.left-section
.red-button
```

Prefer semantic names:

```text
.game-card--live
.status-banner
.button--danger
```

---

# 37. Component styling contract

React components should map visual roles to reusable classes.

Example:

```tsx
<article className="game-card game-card--live">
  <header className="game-card__header">
    <StatusBadge status="live" />
    <Badge>Field 1</Badge>
  </header>

  <div className="game-card__teams">
    <GameTeam name="Blockbusters 12a" score={13} />
    <GameTeam name="Netz-Giganten 11b" score={11} />
  </div>

  <footer className="game-card__footer">
    <span>Referee: Team Alpha</span>
  </footer>
</article>
```

The component should contain semantic data and classes, not arbitrary visual values.

---

# 38. Design consistency rules

These rules are mandatory for all pages:

1. Use the shared colour tokens.
2. Use the shared spacing scale.
3. Use the shared typography scale.
4. Use shared button styles.
5. Use shared card styles.
6. Use shared badge/status styles.
7. Use the same border and radius system.
8. Use the same focus behaviour.
9. Use the same responsive breakpoints.
10. Use one icon system.
11. Do not create page-specific copies of global components.
12. Do not hard-code colours in JSX/TSX.
13. Do not use inline styles for standard design-system properties.
14. Do not invent a new spacing value when an existing token is appropriate.
15. Live WebSocket updates must not change the visual language of the affected component.

---

# 39. Visual QA checklist

Every implemented screen should be checked against the Figma design at:

- phone width
- tablet width
- desktop width
- large-screen width

Check:

### Layout
- [ ] same card alignment
- [ ] same section spacing
- [ ] no unexpected horizontal scrolling
- [ ] correct content density

### Typography
- [ ] page title hierarchy
- [ ] metadata size
- [ ] score emphasis
- [ ] line heights

### Colour
- [ ] navy brand colour
- [ ] orange/gold accent
- [ ] surface/background contrast
- [ ] status colours

### Components
- [ ] buttons
- [ ] filters
- [ ] badges
- [ ] cards
- [ ] inputs
- [ ] navigation

### States
- [ ] hover
- [ ] focus
- [ ] active
- [ ] disabled
- [ ] loading
- [ ] empty
- [ ] error
- [ ] live
- [ ] completed

### Responsive
- [ ] phone
- [ ] desktop
- [ ] big screen

---

# 40. Recommended CSS entry point

```css
/* src/styles/index.css */

@import "./tokens.css";
@import "./reset.css";
@import "./globals.css";
@import "./typography.css";
@import "./utilities.css";

@import "./components/button.css";
@import "./components/card.css";
@import "./components/badge.css";
@import "./components/input.css";
@import "./components/game-card.css";
@import "./components/team-card.css";
@import "./components/court-card.css";
@import "./components/navigation.css";
@import "./components/leaderboard.css";
```

The application should import only the entry point:

```ts
import "./styles/index.css";
```

This makes the design system predictable and prevents page-specific CSS from becoming disconnected from the shared styling system.

---

# 41. Final implementation rule

**If a new component looks different from an existing component, first determine whether it is actually a new visual role or simply another use of an existing design token/component.**

The goal is that a user can move from:

- Overview
- Teams
- Team details
- Schedule
- Game details
- Fields / Live Courts

and immediately recognise that all screens belong to the same application.

The Figma design should therefore be implemented as a **shared design system**, not as five individually styled pages.

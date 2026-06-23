# Light Theme — Design

## Goal

Add a Light Theme to Claude Terminal with a three-state selector (System / Light / Dark).
"System" follows the OS `prefers-color-scheme` and reacts to OS changes at runtime. Default is
`system`. Scope for this iteration is full coverage of the core UI; peripheral panels are deferred.

## Architecture

CSS-variable overrides resolved by JS. The dark palette stays as the `:root` default. A
`:root[data-theme="light"]` block overrides it. JS always resolves the user setting to a concrete
`light` / `dark` value and writes it to `document.documentElement[data-theme]`; CSS never uses
`@media` for theming, so theme resolution lives in exactly one place.

## Components

### 1. Theme state — `src/renderer/state/settings.state.js`

- Add `theme: 'system'` to defaults. Allowed values: `'system' | 'light' | 'dark'`.

### 2. Theme application — `src/renderer/utils/color.js`

- New `applyTheme(theme)`:
  - Resolve `system` via `window.matchMedia('(prefers-color-scheme: light)')`.
  - Set `document.documentElement.dataset.theme` to `'light'` or `'dark'` (never `'system'`).
  - Update the xterm theme on all open terminals (delegated to a TerminalService helper).
- New `watchSystemTheme(getThemeSetting, onResolved)`:
  - Register a single `change` listener on the `prefers-color-scheme` media query.
  - Re-apply only while the current setting is `system`.
  - Idempotent: calling again replaces the previous listener.

`applyAccentColor` is unchanged — accent variables are set on `root.style` and are theme-independent.

### 3. CSS palette — `styles/base.css`

- Keep existing `:root` dark variables as the default.
- Add `:root[data-theme="light"]` overriding the color variables only:
  - `--bg-primary:#ffffff` `--bg-secondary:#f7f7f8` `--bg-tertiary:#efeff1`
    `--bg-hover:#e8e8ea` `--bg-active:#e0e0e3`
  - `--border-color:#d8d8dc` `--border-primary:var(--border-color)`
  - `--text-primary:#1a1a1a` `--text-secondary:#666` `--text-muted:#999` `--text-tertiary:#888`
  - `--shadow:0 4px 20px rgba(0,0,0,0.12)`
  - Semantic colors (success/warning/danger/info/purple) and accent stay unchanged.

### 4. Terminal theme — `src/renderer/services/TerminalService.js`

- Split current static `TERMINAL_THEME` into `TERMINAL_THEME_DARK` (existing values) and
  `TERMINAL_THEME_LIGHT` (light background, dark foreground, VS Code Light+ ANSI palette).
- Select the correct theme at terminal creation based on the resolved theme.
- Export `applyTerminalTheme(resolvedTheme)` that iterates open terminals and sets
  `terminal.options.theme`, called from `applyTheme`.

### 5. Hardcoded color cleanup (core UI)

Audit core panels for hardcoded background/text colors and replace with the matching variable.
Targets: `layout.css`, `terminal.css`, `chat.css`, `git.css`, `settings.css`, `projects.css`,
`modals.css`, and the titlebar/sidebar in `index.html`.

- Replace background/surface hex (`#0d0d0d` `#0a0a0a` `#151515` `#1a1a1a` `#252525` `#2a2a2a`)
  with `--bg-*`.
- Replace neutral text hex (`#e0e0e0` `#d4d4d4` `#888` `#555` `#666`) with `--text-*`.
- Replace neutral border hex (`#2d2d2d`) with `--border-color`.
- Leave semantic hex (`#ef4444` `#22c55e` `#f59e0b` `#3b82f6` `#a855f7` etc.) untouched — they read
  acceptably on both themes for this iteration.

Peripheral panels (workflow editor, database, fivem, discord, session-replay, kanban, workspace,
cloud, control-tower, parallel, dashboard, time-tracking) are out of scope this iteration.

### 6. Settings UI — `src/renderer/ui/panels/SettingsPanel.js`

- In the `appearance` group, above the accent-color row, add a Theme selector with three options
  (System / Light / Dark), reusing the existing segmented/select control styling.
- On save, persist `theme` and call `applyTheme` + `watchSystemTheme`.
- i18n keys added to `en.json`, `fr.json`, `es.json`: `settings.theme`, `settings.themeDesc`,
  `settings.themeSystem`, `settings.themeLight`, `settings.themeDark`.

### 7. Initialization — `src/renderer/services/SettingsService.js`

- In `initializeSettings`, after `applyAccentColor`, call `applyTheme(getSetting('theme'))` and
  register `watchSystemTheme`.
- Add `setTheme(theme)` / `getTheme()` to the service and its legacy exports.

## Data Flow

`settings.json.theme` → `initializeSettings` → `applyTheme` writes `data-theme` on `<html>` and
updates open terminals → CSS variable cascade restyles the app. In `system` mode the
`prefers-color-scheme` listener re-runs `applyTheme` on OS change. Changing the setting in
SettingsPanel persists and re-applies immediately.

## Error Handling

- `applyTheme` tolerates an unknown/missing value by falling back to `system` resolution.
- `matchMedia` is guarded (assume available in Chromium 120; no polyfill needed).
- No persistence-format change beyond the new key; existing `settings.json` files without `theme`
  default to `system` via the state default.

## Testing

- Unit: `applyTheme` resolves `system`/`light`/`dark` to the correct `data-theme` value and falls
  back on bad input (jsdom + mocked `matchMedia`).
- Unit: `settings.state` exposes the `theme` default.
- Manual: toggle all three modes; flip OS appearance while on `system`; confirm terminal,
  titlebar, sidebar, settings, git and chat panels all restyle with no leftover dark patches in
  core UI.
- `npm run build:renderer` after renderer changes; `npm test` green.

## Out of Scope

- Peripheral/specialized panels (see §5).
- Per-theme accent palettes.
- Semantic color retuning for light backgrounds.

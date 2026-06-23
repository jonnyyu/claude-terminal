# Light Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a three-state app theme selector (System / Light / Dark) that restyles the core UI via CSS-variable overrides.

**Architecture:** The dark palette remains the `:root` default. A `:root[data-theme="light"]` block overrides the color variables. JS resolves the user's setting to a concrete `light`/`dark` value, writes it to `document.documentElement[data-theme]`, and (for `system`) listens to `prefers-color-scheme`. The xterm terminal keeps its own independent theme picker and is intentionally NOT switched by this feature.

**Tech Stack:** Vanilla JS renderer, CSS custom properties, esbuild bundle, Jest + jsdom.

## Global Constraints

- After any change under `src/renderer/`, run `npm run build:renderer`.
- i18n keys must be added to `en.json`, `fr.json`, and `es.json`.
- Main-process error messages stay in English (no main-process changes here).
- No comments unless "why" is non-obvious. No multi-line docstrings.
- Theme default is `'system'`.
- Allowed `theme` values: `'system' | 'light' | 'dark'`.
- The terminal (xterm) is out of scope — it has its own theme picker.

## Scope note (refinement during planning)

The spec §4 proposed switching the terminal theme with the app theme. During planning we found the terminal already has an independent user-facing theme picker (`terminalTheme` setting, `themes` tab, `TERMINAL_THEMES` registry, `TerminalManager.updateAllTerminalsTheme`). To avoid fighting that system, the app Light Theme covers UI chrome only; users choose terminal colors separately. This supersedes spec §4 and the terminal parts of §2.

## File Structure

- `src/renderer/state/settings.state.js` — add `theme` default.
- `src/renderer/utils/color.js` — add `applyTheme()` + `watchSystemTheme()` (exported; flows through `utils/index.js` → `src/renderer/index.js` → `renderer.js`).
- `styles/base.css` — add `:root[data-theme="light"]` palette.
- `renderer.js` — import the new fns, apply theme at startup, pass `applyTheme` into `SettingsPanel.init` ctx.
- `src/renderer/ui/panels/SettingsPanel.js` — theme dropdown markup + read/apply on save.
- `src/renderer/i18n/locales/{en,fr,es}.json` — theme strings.
- `styles/{layout,terminal,chat,git,settings,projects,modals}.css` + `index.html` — replace core hardcoded neutral colors with variables.
- Tests: `tests/utils/color.test.js` (extend or create), `tests/state/settings.test.js` (extend).

---

### Task 1: Theme state default + `applyTheme`/`watchSystemTheme`

**Files:**
- Modify: `src/renderer/state/settings.state.js` (defaults object, near `accentColor: '#d97706'`)
- Modify: `src/renderer/utils/color.js` (add functions + exports)
- Test: `tests/utils/color.test.js`

**Interfaces:**
- Produces:
  - `resolveTheme(theme: 'system'|'light'|'dark') => 'light'|'dark'` — resolves `system` via `matchMedia`, falls back to `'dark'` for unknown input when not light.
  - `applyTheme(theme) => 'light'|'dark'` — sets `document.documentElement.dataset.theme` to the resolved value and returns it.
  - `watchSystemTheme(getThemeSetting: () => string) => void` — registers one `change` listener on `(prefers-color-scheme: light)`; on change re-applies only when `getThemeSetting()==='system'`. Replaces any prior listener.
- Consumes: nothing from other tasks.

- [ ] **Step 1: Write the failing test**

Add to `tests/utils/color.test.js` (create the file if absent; mirror existing util test style):

```javascript
const { applyTheme, resolveTheme } = require('../../src/renderer/utils/color');

describe('theme', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    window.matchMedia = jest.fn().mockImplementation(q => ({
      matches: false, media: q, addEventListener: jest.fn(), removeEventListener: jest.fn(),
    }));
  });

  test('resolveTheme returns explicit values unchanged', () => {
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('dark')).toBe('dark');
  });

  test('resolveTheme maps system to dark when OS is not light', () => {
    expect(resolveTheme('system')).toBe('dark');
  });

  test('resolveTheme maps system to light when OS prefers light', () => {
    window.matchMedia = jest.fn().mockImplementation(q => ({ matches: true, addEventListener: jest.fn() }));
    expect(resolveTheme('system')).toBe('light');
  });

  test('resolveTheme falls back to dark on bad input', () => {
    expect(resolveTheme('bogus')).toBe('dark');
  });

  test('applyTheme sets data-theme on documentElement and returns resolved', () => {
    expect(applyTheme('light')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/utils/color.test.js -t theme`
Expected: FAIL — `applyTheme`/`resolveTheme` is not a function (not yet exported).

- [ ] **Step 3: Implement in `src/renderer/utils/color.js`**

Add before the `module.exports` block:

```javascript
function resolveTheme(theme) {
  if (theme === 'light' || theme === 'dark') return theme;
  if (theme === 'system' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return 'dark';
}

function applyTheme(theme) {
  const resolved = resolveTheme(theme);
  document.documentElement.dataset.theme = resolved;
  return resolved;
}

let _systemThemeMql = null;
let _systemThemeHandler = null;
function watchSystemTheme(getThemeSetting) {
  if (typeof window.matchMedia !== 'function') return;
  if (_systemThemeMql && _systemThemeHandler) {
    _systemThemeMql.removeEventListener('change', _systemThemeHandler);
  }
  _systemThemeMql = window.matchMedia('(prefers-color-scheme: light)');
  _systemThemeHandler = () => { if (getThemeSetting() === 'system') applyTheme('system'); };
  _systemThemeMql.addEventListener('change', _systemThemeHandler);
}
```

Add `resolveTheme`, `applyTheme`, `watchSystemTheme` to `module.exports`.

- [ ] **Step 4: Add the `theme` default in `src/renderer/state/settings.state.js`**

Find the defaults object containing `accentColor: '#d97706',` and add on the next line:

```javascript
  theme: 'system',
```

- [ ] **Step 5: Write the settings-default test**

Add to `tests/state/settings.test.js` (extend existing defaults test or add one):

```javascript
test('theme defaults to system', () => {
  const { getSettings } = require('../../src/renderer/state/settings.state');
  expect(getSettings().theme).toBe('system');
});
```

> If the existing test file resets state differently, follow its established setup pattern instead of requiring fresh.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx jest tests/utils/color.test.js tests/state/settings.test.js`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/renderer/utils/color.js src/renderer/state/settings.state.js tests/utils/color.test.js tests/state/settings.test.js
git commit -m "feat(theme): add theme state and applyTheme/watchSystemTheme helpers"
```

---

### Task 2: Light palette CSS + startup wiring

**Files:**
- Modify: `styles/base.css` (add `:root[data-theme="light"]` after the `:root {…}` block)
- Modify: `renderer.js` (import `applyTheme`, `watchSystemTheme`; apply at startup)

**Interfaces:**
- Consumes: `applyTheme`, `watchSystemTheme` from Task 1.
- Produces: app renders with `data-theme` on `<html>` at startup; light palette active when resolved to light.

- [ ] **Step 1: Add the light palette to `styles/base.css`**

Immediately after the closing `}` of the `:root { … }` block, add:

```css
:root[data-theme="light"] {
  --bg-primary: #ffffff;
  --bg-secondary: #f7f7f8;
  --bg-tertiary: #efeff1;
  --bg-hover: #e8e8ea;
  --bg-active: #e0e0e3;
  --border-color: #d8d8dc;
  --border-primary: var(--border-color);
  --text-primary: #1a1a1a;
  --text-secondary: #666;
  --text-muted: #999;
  --text-tertiary: #888;
  --shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
}
```

- [ ] **Step 2: Import the helpers in `renderer.js`**

In the big destructure starting at line ~20 (where `applyAccentColor,` is), add `applyTheme,` and `watchSystemTheme,` alongside it.

- [ ] **Step 3: Apply theme at startup in `renderer.js`**

Find `applyAccentColor(settingsState.get().accentColor || '#d97706');` (~line 297) and add right after:

```javascript
  applyTheme(settingsState.get().theme || 'system');
  watchSystemTheme(() => settingsState.get().theme || 'system');
```

- [ ] **Step 4: Pass `applyTheme` into SettingsPanel ctx**

In `renderer.js`, in the `SettingsPanel.init({ … })` call, add `applyTheme, watchSystemTheme,` to the object (next to `applyAccentColor`).

- [ ] **Step 5: Build and smoke-test**

Run: `npm run build:renderer`
Expected: build succeeds, `dist/renderer.bundle.js` written.

Manual: launch `npm start`. With default settings the app looks unchanged (system→dark on a dark OS, or light on a light OS). No errors in console.

- [ ] **Step 6: Commit**

```bash
git add styles/base.css renderer.js
git commit -m "feat(theme): light palette and apply theme at startup"
```

---

### Task 3: Theme selector in Settings

**Files:**
- Modify: `src/renderer/ui/panels/SettingsPanel.js` (markup in appearance group + save handler)
- Modify: `src/renderer/i18n/locales/en.json`, `fr.json`, `es.json`

**Interfaces:**
- Consumes: `self._ctx.applyTheme`, `self._ctx.watchSystemTheme` (provided via Task 2 ctx); `self._ctx.settingsState`.
- Produces: persisted `theme` setting; live re-apply on change.

- [ ] **Step 1: Add i18n keys**

In each of `en.json`, `fr.json`, `es.json`, inside the `settings` object (near `"accentColor"`), add:

`en.json`:
```json
    "theme": "Theme",
    "themeDesc": "App color theme",
    "themeSystem": "System",
    "themeLight": "Light",
    "themeDark": "Dark",
```

`fr.json`:
```json
    "theme": "Thème",
    "themeDesc": "Thème de couleur de l'application",
    "themeSystem": "Système",
    "themeLight": "Clair",
    "themeDark": "Sombre",
```

`es.json`:
```json
    "theme": "Tema",
    "themeDesc": "Tema de color de la aplicación",
    "themeSystem": "Sistema",
    "themeLight": "Claro",
    "themeDark": "Oscuro",
```

- [ ] **Step 2: Add the theme dropdown markup**

In `SettingsPanel.js`, in the appearance `settings-card`, insert a new `settings-row` immediately before the `${t('settings.accentColor')}` row (~line 642). Use the language-dropdown structure so the generic `.settings-dropdown` handler auto-wires it:

```javascript
                <div class="settings-row">
                  <div class="settings-label">
                    <div>${t('settings.theme')}</div>
                    <div class="settings-desc">${t('settings.themeDesc')}</div>
                  </div>
                  ${(() => {
                    const themeOpts = [
                      { v: 'system', label: t('settings.themeSystem') },
                      { v: 'light', label: t('settings.themeLight') },
                      { v: 'dark', label: t('settings.themeDark') },
                    ];
                    const cur = settings.theme || 'system';
                    const curLabel = themeOpts.find(o => o.v === cur)?.label || cur;
                    return `<div class="settings-dropdown" id="theme-dropdown" data-value="${cur}">
                      <div class="settings-dropdown-trigger">
                        <span>${curLabel}</span>
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
                      </div>
                      <div class="settings-dropdown-menu">
                        ${themeOpts.map(o => `<div class="settings-dropdown-option ${cur === o.v ? 'selected' : ''}" data-value="${o.v}">
                          <span class="dropdown-check"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></span>
                          ${o.label}
                        </div>`).join('')}
                      </div>
                    </div>`;
                  })()}
                </div>
```

- [ ] **Step 3: Read + persist `theme` in the save handler**

In `saveSettingsHandler` (~line 1740), after the `languageDropdown` line add:

```javascript
      const themeDropdown = document.getElementById('theme-dropdown');
      const newTheme = themeDropdown?.dataset.value || settings.theme || 'system';
```

In the `newSettings = { … }` object, add the property (near `accentColor,`):

```javascript
        theme: newTheme,
```

- [ ] **Step 4: Apply theme live after save**

Find `self._ctx.applyAccentColor(newSettings.accentColor);` (~line 1894) and add after it:

```javascript
      if (self._ctx.applyTheme) self._ctx.applyTheme(newSettings.theme);
```

(The `watchSystemTheme` closure already reads `settingsState.get().theme`, so switching to/from `system` is picked up without re-registering.)

- [ ] **Step 5: Build and manual-verify**

Run: `npm run build:renderer && npm start`
Expected: Settings → General → Appearance shows a Theme dropdown. Selecting Light restyles the app immediately; Dark restores; System follows OS. Choice persists across restart (check `~/.claude-terminal/settings.json` has `"theme"`).

- [ ] **Step 6: Commit**

```bash
git add src/renderer/ui/panels/SettingsPanel.js src/renderer/i18n/locales/en.json src/renderer/i18n/locales/fr.json src/renderer/i18n/locales/es.json
git commit -m "feat(theme): add System/Light/Dark selector in settings"
```

---

### Task 4: Core UI hardcoded-color cleanup

**Files:**
- Modify: `styles/layout.css`, `styles/terminal.css`, `styles/chat.css`, `styles/git.css`, `styles/settings.css`, `styles/projects.css`, `styles/modals.css`
- Modify: `index.html` (titlebar/sidebar inline styles, if any hardcoded neutrals)

**Interfaces:**
- Consumes: light palette variables from Task 2.
- Produces: core UI surfaces have no leftover dark patches in light mode.

- [ ] **Step 1: Find hardcoded neutral backgrounds in core files**

Run:
```bash
grep -nE "#(0d0d0d|0a0a0a|111111|151515|1a1a1a|202020|252525|2a2a2a|2d2d2d)" styles/layout.css styles/terminal.css styles/chat.css styles/git.css styles/settings.css styles/projects.css styles/modals.css
```
Expected: a list of background/border declarations using literal dark hex.

- [ ] **Step 2: Replace neutral backgrounds/borders with variables**

For each hit, map and replace (keep exact selector/property, swap only the value):
- `#0d0d0d`, `#0a0a0a`, `#111111` → `var(--bg-primary)`
- `#151515` → `var(--bg-secondary)`
- `#1a1a1a`, `#202020` → `var(--bg-tertiary)`
- `#252525` → `var(--bg-hover)`
- `#2a2a2a` → `var(--bg-active)`
- `#2d2d2d` → `var(--border-color)`

Leave any hex inside `data-theme="light"` blocks, gradients tuned to a specific look, or terminal-theme contexts untouched. When a value is in an `rgba(...)` overlay (e.g. `rgba(0,0,0,0.x)` scrims), leave it — overlays read fine on both themes.

- [ ] **Step 3: Find hardcoded neutral text colors**

Run:
```bash
grep -nE "color:\s*#(e0e0e0|d4d4d4|cccccc|aaaaaa|888888|666666|555555)\b" styles/layout.css styles/terminal.css styles/chat.css styles/git.css styles/settings.css styles/projects.css styles/modals.css
```

- [ ] **Step 4: Replace neutral text colors with variables**

- `#e0e0e0`, `#d4d4d4`, `#cccccc` → `var(--text-primary)`
- `#aaaaaa`, `#888888`, `#888` → `var(--text-secondary)`
- `#666666`, `#666` → `var(--text-tertiary)`
- `#555555`, `#555` → `var(--text-muted)`

Leave semantic-colored text (red/green/amber/blue/purple hex) untouched.

- [ ] **Step 5: Build and manual-verify in light mode**

Run: `npm run build:renderer && npm start`
Switch to Light theme. Walk through: titlebar, sidebar, project list, settings, git changes panel, chat view, terminal tabs/chrome, modals. Confirm no dark rectangles remain in these surfaces. (xterm content stays per its own terminal theme — expected.)

- [ ] **Step 6: Run full test suite**

Run: `npm test`
Expected: all green (CSS changes don't affect tests; this guards against accidental JS breakage).

- [ ] **Step 7: Commit**

```bash
git add styles/layout.css styles/terminal.css styles/chat.css styles/git.css styles/settings.css styles/projects.css styles/modals.css index.html
git commit -m "feat(theme): replace core hardcoded neutral colors with variables"
```

---

## Self-Review

- **Spec coverage:** state default (T1), applyTheme/watchSystemTheme + system listener (T1), light CSS palette (T2), startup wiring (T2), settings selector + i18n (T3), core hardcoded cleanup (T4). Spec §4 terminal switching intentionally superseded (see Scope note) — terminal keeps its own picker.
- **Placeholder scan:** none — every code step has concrete code/commands.
- **Type consistency:** `applyTheme`/`resolveTheme`/`watchSystemTheme` signatures match between T1 (definition), T2 (startup), T3 (ctx usage). `theme` key name consistent across state, save handler, and apply calls.

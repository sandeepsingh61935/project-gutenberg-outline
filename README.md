# Project Gutenberg Outline

Browser extension: hierarchical outline + timeline scrubber + built-in book dark mode for [Project Gutenberg](https://www.gutenberg.org/) texts.

## Develop

```bash
npm ci
npm run dev          # Vite + CRX HMR (Chromium)
npm run typecheck
npm run build        # → dist/ (Chromium)
npm run build:firefox # → dist-firefox/ (AMO-ready)
```

Load **Chromium**: `chrome://extensions` → Load unpacked → `dist/`.  
Load **Firefox** (temporary): `about:debugging` → This Firefox → Load Temporary Add-on → `dist-firefox/manifest.json`.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run ci` | typecheck + Firefox lint + unsigned pack |
| `npm run pack:firefox` | unsigned `.zip` under `artifacts/` |
| `npm run submit:amo` | sign/upload to AMO (`AMO_JWT_*` required) |

## Firefox AMO deploy

### 1. One-time AMO setup

1. Sign in at [addons.mozilla.org/developers](https://addons.mozilla.org/developers/).
2. Create API credentials: [API Keys](https://addons.mozilla.org/developers/addon/api/key/) → **JWT issuer** + **JWT secret**.
3. Decide a permanent gecko id (default in repo: `project-gutenberg-outline@sandeepsingh61935.github.io`).  
   **Do not change this after the first listed release.**

### 2. GitHub secrets & variables

Repo → **Settings → Secrets and variables → Actions**:

| Name | Type | Value |
| --- | --- | --- |
| `AMO_JWT_ISSUER` | secret | JWT issuer (API key) |
| `AMO_JWT_SECRET` | secret | JWT secret |
| `AMO_CHANNEL` | variable (optional) | `listed` (default) or `unlisted` |
| `FIREFOX_EXTENSION_ID` | variable (optional) | override gecko id |

### 3. Release

```bash
# bump is taken from the tag
git tag v1.0.1
git push origin v1.0.1
```

That triggers **Release · Firefox AMO**:

1. Sets `package.json` / `manifest.json` version from the tag  
2. Builds `dist-firefox/`  
3. Runs `web-ext lint`  
4. Uploads extension + source zip to AMO via `web-ext sign`  
5. Attaches artifacts to the GitHub Release  

Manual run: Actions → **Release · Firefox AMO** → Run workflow (pick channel).

### 4. Local submit (optional)

```bash
export AMO_JWT_ISSUER=...
export AMO_JWT_SECRET=...
export AMO_CHANNEL=listed   # or unlisted
npm run submit:amo
```

## CI

Every push/PR to `main` runs typecheck, Firefox package build, and `web-ext lint`, and uploads an unsigned artifact.

## Notes for AMO review

- Built with Vite + TypeScript; source archive is attached automatically (`artifacts/source-v*.zip`).
- Permissions: `storage` only (reading dark-mode preference).
- Content scripts limited to `*.gutenberg.org` book HTML paths.
- No remote code, no telemetry.

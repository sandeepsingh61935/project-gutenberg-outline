# Project Gutenberg Outline

Browser extension: hierarchical outline + timeline scrubber + built-in book dark mode for [Project Gutenberg](https://www.gutenberg.org/) texts.

| | |
| --- | --- |
| **Gecko id** | `project-gutenberg-outline@sandeepsingh61935.github.io` |
| **AMO status** | Not listed yet — push a `v*` tag (or run **Release · Firefox AMO**) to submit |
| **Runs on** | `*.gutenberg.org` book HTML (`/cache/epub/…`, `/files/…`) |

> **Note:** the normal **CI** workflow only typechecks and packs an *unsigned* zip. It does **not** upload to AMO. Listing appears under [Developer Hub → My Add-ons](https://addons.mozilla.org/developers/addons/) only after a successful `web-ext sign` (release workflow or `npm run submit:amo`).

## Develop

```bash
npm ci
npm run dev           # Vite + CRX HMR (Chromium)
npm run typecheck
npm run build         # → dist/ (Chromium)
npm run build:firefox # → dist-firefox/ (AMO-ready)
```

Load **Chromium**: `chrome://extensions` → Load unpacked → `dist/`.  
Load **Firefox** (temporary): `about:debugging` → This Firefox → Load Temporary Add-on → `dist-firefox/manifest.json`.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run ci` | typecheck + Firefox lint + unsigned pack (**not** AMO) |
| `npm run pack:firefox` | unsigned `.zip` under `artifacts/` |
| `npm run submit:amo` | **sign/upload to AMO** (`AMO_JWT_*` required) |

## First publish / new version → AMO

### Prerequisites

1. [AMO Developer Hub](https://addons.mozilla.org/developers/) — same Mozilla account that owns the API keys  
2. API credentials: [API Keys](https://addons.mozilla.org/developers/addon/api/key/)  
3. GitHub secrets on this repo:

| Name | Type |
| --- | --- |
| `AMO_JWT_ISSUER` | secret (JWT issuer) |
| `AMO_JWT_SECRET` | secret (JWT secret) |
| `AMO_CHANNEL` | variable optional — `listed` (public) or `unlisted` |
| `FIREFOX_EXTENSION_ID` | variable optional — must match gecko id above |

### Option A — tag (recommended)

```bash
git tag v1.0.0
git push origin v1.0.0
```

That runs **Release · Firefox AMO**: build → lint → `web-ext sign` → artifacts on the GitHub Release.

### Option B — manual workflow

GitHub → **Actions** → **Release · Firefox AMO** → **Run workflow** → channel `listed` or `unlisted`.

### Option C — local

```bash
export AMO_JWT_ISSUER=...   # from AMO API keys page
export AMO_JWT_SECRET=...
export AMO_CHANNEL=listed   # or unlisted
npm run submit:amo
```

### After a successful submit

- Open [My Add-ons](https://addons.mozilla.org/developers/addons/) — the add-on should appear (sometimes under “Awaiting Review”).  
- Complete listing: summary, description, icon, screenshots from `store/`.  
- **Never change** `browser_specific_settings.gecko.id` after the first successful upload.

### If it still doesn’t show up

| Check | |
| --- | --- |
| Wrong Mozilla account | API keys and hub login must be the same account |
| Only CI ran | Green CI ≠ AMO upload; look for **Release · Firefox AMO** |
| Sign failed | Open the release workflow logs for `web-ext sign` errors |
| Channel `unlisted` | Won’t be public-searchable; still visible in *your* hub |
| Keys revoked/wrong | Regenerate at AMO API keys; update GitHub secrets |

## CI

Every push/PR to `main` runs typecheck, Firefox package build, and `web-ext lint`, and uploads an unsigned artifact. **No AMO credentials are used in CI.**

## AMO listing assets

| Path | Use |
| --- | --- |
| `icons/icon-*.png` + `icon.svg` | Extension + store icon |
| `icons/icon-512.png` | AMO icon (preferred) |
| `store/screenshots/*.png` | AMO screenshots (1280×800) |
| `store/amo-listing.md` | Summary / description / captions |

## Privacy

- Permission: `storage` only (dark-mode preference).  
- Content scripts limited to Project Gutenberg book HTML paths.  
- No accounts, analytics, remote code, or extra network calls.

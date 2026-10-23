#!/usr/bin/env node
/**
 * Patch AMO listing copy + upload store screenshots (authenticated).
 *
 * Env (required): AMO_JWT_ISSUER, AMO_JWT_SECRET
 * Optional: AMO_ADDON_ID  (slug or guid; default tries both)
 */
import { createHmac } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

const root = process.cwd();
const issuer = process.env.AMO_JWT_ISSUER;
const secret = process.env.AMO_JWT_SECRET;
const api = 'https://addons.mozilla.org/api/v5';
const candidates = [
  process.env.AMO_ADDON_ID,
  'project-gutenberg-outline',
  'project-gutenberg-outline@sandeepsingh61935.github.io',
].filter(Boolean);

if (!issuer || !secret) {
  console.error('Need AMO_JWT_ISSUER and AMO_JWT_SECRET');
  process.exit(1);
}

function b64url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function makeJwt() {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(
    JSON.stringify({
      iss: issuer,
      jti: `${now}-${Math.random().toString(36).slice(2)}`,
      iat: now,
      exp: now + 4 * 60,
    })
  );
  const data = `${header}.${payload}`;
  const sig = createHmac('sha256', secret).update(data).digest();
  return `${data}.${b64url(sig)}`;
}

async function apiFetch(path, { method = 'GET', body, headers = {} } = {}) {
  const token = makeJwt();
  const res = await fetch(`${api}${path}`, {
    method,
    headers: {
      Authorization: `JWT ${token}`,
      ...headers,
    },
    body,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}

async function resolveAddon() {
  for (const id of candidates) {
    const enc = encodeURIComponent(id);
    const r = await apiFetch(`/addons/addon/${enc}/`);
    if (r.ok) {
      console.log(`Resolved addon via ${id} → id=${r.json.id} slug=${r.json.slug}`);
      return r.json;
    }
    console.log(`lookup ${id}: ${r.status}`, r.json?.detail || '');
  }
  throw new Error('Could not resolve addon with JWT — check account owns the listing');
}

const meta = JSON.parse(readFileSync(join(root, 'amo-metadata.json'), 'utf8'));
const listing = existsSync(join(root, 'store/amo-listing.json'))
  ? JSON.parse(readFileSync(join(root, 'store/amo-listing.json'), 'utf8'))
  : {};

const summary = meta.summary || listing.summary;
const description = meta.description || listing.description;
const homepage = listing.homepage || {
  'en-US': 'https://github.com/sandeepsingh61935/project-gutenberg-outline',
};

const captions = {
  '01-timeline-scrubber.png':
    'Timeline scrubber on a live Gutenberg book — hover ticks for section previews',
  '02-outline-drawer.png':
    'Outline drawer with hierarchical chapters and subsections',
  '03-reading-dark-mode.png': 'Built-in book dark mode while reading',
  '04-feature-overview.png': 'Search/filter the outline on a real book',
};

const addon = await resolveAddon();
const addonPath = `/addons/addon/${encodeURIComponent(addon.slug || addon.id)}/`;

// --- Patch listing fields ---
const patchBody = {
  summary,
  description,
  homepage,
};
console.log('Patching listing description/summary/homepage…');
const patched = await apiFetch(addonPath, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(patchBody),
});
console.log('PATCH', patched.status, JSON.stringify(patched.json)?.slice(0, 400));
if (!patched.ok) {
  console.error('Listing patch failed');
  process.exit(1);
}

// --- Replace screenshots ---
const shotDir = join(root, 'store/screenshots');
const files = readdirSync(shotDir)
  .filter((f) => /^0[1-4]-.*\.png$/.test(f))
  .sort();

// Delete existing previews first (optional best-effort)
if (Array.isArray(addon.previews) && addon.previews.length) {
  for (const p of addon.previews) {
    const del = await apiFetch(`/addons/addon/${encodeURIComponent(addon.slug)}/previews/${p.id}/`, {
      method: 'DELETE',
    });
    console.log('delete preview', p.id, del.status);
  }
}

for (const file of files) {
  const buf = readFileSync(join(shotDir, file));
  const form = new FormData();
  form.append('image', new Blob([buf], { type: 'image/png' }), file);
  form.append(
    'caption',
    JSON.stringify({ 'en-US': captions[file] || basename(file) })
  );
  form.append('position', String(Number(file.slice(0, 2))));

  const token = makeJwt();
  const res = await fetch(
    `${api}/addons/addon/${encodeURIComponent(addon.slug)}/previews/`,
    {
      method: 'POST',
      headers: { Authorization: `JWT ${token}` },
      body: form,
    }
  );
  const text = await res.text();
  console.log('upload', file, res.status, text.slice(0, 300));
  if (!res.ok) {
    console.error('Screenshot upload failed for', file);
    process.exit(1);
  }
}

console.log('AMO listing updated.');

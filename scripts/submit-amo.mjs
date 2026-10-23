#!/usr/bin/env node
/**
 * Sign / upload the Firefox build to addons.mozilla.org via web-ext.
 *
 * Required env:
 *   AMO_JWT_ISSUER   — JWT issuer from https://addons.mozilla.org/developers/addon/api/key/
 *   AMO_JWT_SECRET   — JWT secret from the same page
 *
 * Optional:
 *   AMO_CHANNEL              — "listed" (default) or "unlisted"
 *   FIREFOX_EXTENSION_ID     — gecko id (must match prepare-firefox / AMO listing)
 *   AMO_APPROVAL_TIMEOUT_MS  — ms to wait for automatic approval (default 900000 = 15m)
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const sourceDir = join(root, 'dist-firefox');
const artifactsDir = join(root, 'artifacts');
const channel = process.env.AMO_CHANNEL || 'listed';
const apiKey = process.env.AMO_JWT_ISSUER;
const apiSecret = process.env.AMO_JWT_SECRET;

if (!apiKey || !apiSecret) {
  console.error('Missing AMO_JWT_ISSUER and/or AMO_JWT_SECRET.');
  console.error('Create them at: https://addons.mozilla.org/developers/addon/api/key/');
  process.exit(1);
}

if (!existsSync(sourceDir)) {
  console.error('dist-firefox/ missing — run npm run build:firefox first');
  process.exit(1);
}

mkdirSync(artifactsDir, { recursive: true });

const manifest = JSON.parse(readFileSync(join(sourceDir, 'manifest.json'), 'utf8'));
console.log(`Submitting ${manifest.name} v${manifest.version} (${channel})…`);

// Source zip for AMO reviewers (required when shipping a build toolchain).
const sourceZip = join(artifactsDir, `source-v${manifest.version}.zip`);
await zipSources(sourceZip);

const webExtBin = join(root, 'node_modules', 'web-ext', 'bin', 'web-ext.js');
const args = [
  webExtBin,
  'sign',
  `--source-dir=${sourceDir}`,
  `--artifacts-dir=${artifactsDir}`,
  `--api-key=${apiKey}`,
  `--api-secret=${apiSecret}`,
  `--channel=${channel}`,
  `--upload-source-code=${sourceZip}`,
  `--amo-metadata=${join(root, 'amo-metadata.json')}`,
];

const approvalMs = process.env.AMO_APPROVAL_TIMEOUT_MS || '900000';
args.push(`--approval-timeout=${approvalMs}`);

try {
  execFileSync(process.execPath, args, {
    stdio: 'inherit',
    env: process.env,
  });
  console.log('AMO submission finished. Signed XPI (if any) is under artifacts/.');
} catch (err) {
  console.error('web-ext sign failed');
  process.exit(err.status || 1);
}

async function zipSources(outPath) {
  rmSync(outPath, { force: true });

  // Prefer system `zip` so we do not need an archiver dependency.
  const include = [
    'manifest.json',
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'vite.config.ts',
    'src',
    'icons',
    'scripts',
    'store',
    'amo-metadata.json',
    'LICENSE',
    'README.md',
  ].filter((p) => existsSync(join(root, p)));

  try {
    execFileSync(
      'zip',
      ['-r', outPath, ...include, '-x', '**/node_modules/**', '**/dist/**', '**/dist-firefox/**', '**/artifacts/**'],
      { cwd: root, stdio: 'inherit' }
    );
    console.log(`Source archive: ${outPath}`);
    return;
  } catch {
    // fallback without zip binary
  }

  // Minimal fallback using only Node (store uncompressed entries via manual zip is hard);
  // require zip on CI images (ubuntu has it).
  console.error('`zip` CLI not found — install zip to build the AMO source archive.');
  process.exit(1);
}

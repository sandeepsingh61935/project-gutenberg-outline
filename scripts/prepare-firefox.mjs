#!/usr/bin/env node
/**
 * Copy the Vite/CRX build into dist-firefox and ensure Firefox/AMO fields.
 * AMO requires a stable gecko id and prefers explicit icons in the package.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const srcDist = join(root, 'dist');
const outDir = join(root, 'dist-firefox');
const iconsDir = join(root, 'icons');

if (!existsSync(srcDist)) {
  console.error('dist/ missing — run npm run build first');
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync(srcDist, outDir, { recursive: true });

if (existsSync(iconsDir)) {
  cpSync(iconsDir, join(outDir, 'icons'), { recursive: true });
}

const manifestPath = join(outDir, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

// Stable public ID — must match AMO listing once published. Change only before first list.
manifest.browser_specific_settings = {
  gecko: {
    id: process.env.FIREFOX_EXTENSION_ID || 'project-gutenberg-outline@sandeepsingh61935.github.io',
    strict_min_version: '140.0',
    data_collection_permissions: {
      required: ['none'],
    },
  },
  gecko_android: {
    strict_min_version: '142.0',
  },
};

manifest.icons = {
  16: 'icons/icon-16.png',
  32: 'icons/icon-32.png',
  48: 'icons/icon-48.png',
  96: 'icons/icon-96.png',
  128: 'icons/icon-128.png',
};

manifest.action = {
  default_icon: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
  },
  default_title: 'Project Gutenberg Outline',
};

// Firefox ignores Chrome-only quirks; keep MV3 content_scripts as-is.
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Firefox package ready: ${outDir}`);
console.log(`  id: ${manifest.browser_specific_settings.gecko.id}`);
console.log(`  version: ${manifest.version}`);

#!/usr/bin/env node
/**
 * inject-auth.js — Phase 5: inject URL-token auth snippet into every HTML file.
 *
 * Usage:
 *   node scripts/inject-auth.js [--dry-run] [--key <secret>] [--revert]
 *
 * What it does:
 *   - Finds all .html files under the repo root (excluding .git)
 *   - Injects a <script> snippet into <head> that:
 *       1. Reads ?key=<SECRET> from the URL and stores it in localStorage
 *       2. On subsequent visits, reads from localStorage (no prompt)
 *       3. If neither matches, prompts for the code; wrong code = blank page
 *   - Idempotent: won't double-inject (checks for marker comment)
 *   - --dry-run: prints the list of files that WOULD be modified
 *   - --revert: removes previously injected snippets
 *
 * Share the access URL as: https://linuxbirdlin.github.io/chess-analysis/austin-prep.html?key=chess2026
 * On subsequent visits to any other page, localStorage keeps the key active.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DEFAULT_KEY = 'chess2026';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const REVERT  = args.includes('--revert');
const keyIdx  = args.indexOf('--key');
const SECRET  = keyIdx >= 0 ? args[keyIdx + 1] : DEFAULT_KEY;

const MARKER = '<!-- chess-auth-v1 -->';

const SNIPPET = `  ${MARKER}
  <script>
  (function() {
    var KEY = '${SECRET}';
    var p = new URLSearchParams(location.search);
    if (p.get('key') === KEY) { localStorage.setItem('chess-key', KEY); }
    if (localStorage.getItem('chess-key') !== KEY) {
      var input = prompt('Access code:');
      if (input !== KEY) {
        document.body.innerHTML = '<p style="font-family:sans-serif;padding:40px;color:#666">Access denied.</p>';
        return;
      }
      localStorage.setItem('chess-key', KEY);
    }
  })();
  </script>`;

function findHtmlFiles() {
  const out = execSync(
    `find "${ROOT}" -name "*.html" -not -path "${ROOT}/.git/*"`,
    { encoding: 'utf8' }
  );
  return out.trim().split('\n').filter(Boolean);
}

function inject(file) {
  let src = fs.readFileSync(file, 'utf8');
  if (src.includes(MARKER)) return false; // already injected
  if (!src.includes('<head>') && !src.includes('<HEAD>')) return false; // no head tag
  src = src.replace(/<head>/i, `<head>\n${SNIPPET}`);
  if (!DRY_RUN) fs.writeFileSync(file, src, 'utf8');
  return true;
}

function revert(file) {
  let src = fs.readFileSync(file, 'utf8');
  if (!src.includes(MARKER)) return false;
  // Remove from the marker comment through the closing </script>
  src = src.replace(/\s*<!-- chess-auth-v1 -->\n\s*<script>[\s\S]*?<\/script>/m, '');
  if (!DRY_RUN) fs.writeFileSync(file, src, 'utf8');
  return true;
}

const files = findHtmlFiles();
let changed = 0;
let skipped = 0;

for (const f of files) {
  const rel = path.relative(ROOT, f);
  const modified = REVERT ? revert(f) : inject(f);
  if (modified) {
    console.log(`${DRY_RUN ? '[dry-run] ' : ''}${REVERT ? 'reverted' : 'injected'}: ${rel}`);
    changed++;
  } else {
    skipped++;
  }
}

console.log(`\nDone. ${changed} ${REVERT ? 'reverted' : 'injected'}, ${skipped} skipped (already done or no <head>).`);
if (DRY_RUN) console.log('(dry run — no files written)');

#!/usr/bin/env node
/**
 * Print a .env file grouped by its comment headers.
 *
 * Usage:
 *   node scripts/show-env.js [envPath]
 *
 * Each `# comment` line starts a new section, and the KEY=VALUE lines
 * below it are listed under that heading. Values are masked by default.
 * Variables that appear before any comment go under "(no section)".
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const envPath = process.argv[2] || path.join(process.cwd(), '.env');

/**
 * Parse .env text into sections: [{ title, vars: [{ key, value }] }].
 */
function parseSections(text) {
  const sections = [];
  let current = { title: '(no section)', vars: [] };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('#')) {
      // A comment starts a new section, unless the current one is still empty
      const title = line.replace(/^#+\s*/, '');
      if (current.vars.length > 0 || current.title !== '(no section)') sections.push(current);
      current = { title, vars: [] };
      continue;
    }

    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim().replace(/^export\s+/, '');
    const value = line.slice(eq + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
    current.vars.push({ key, value });
  }

  if (current.vars.length > 0) sections.push(current);
  return sections;
}

async function main() {
  const text = await readFile(envPath, 'utf8');
  const sections = parseSections(text);

  for (const section of sections) {
    console.log(`# ${section.title}`);
    const width = Math.max(0, ...section.vars.map((v) => v.key.length));
    for (const { key, value } of section.vars) {
      const masked = '*'.repeat(Math.min(value.length, 12));
      console.log(`  ${key.padEnd(width)}  ${masked}`);
    }
    console.log('');
  }
}

main().catch((err) => {
  console.error(`Failed to read env file: ${err.message}`);
  process.exit(1);
});

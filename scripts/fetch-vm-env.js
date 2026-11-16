#!/usr/bin/env node
/**
 * Fetch the remote .env file over SSH and save it locally.
 *
 * Usage:
 *   node scripts/fetch-vm-env.js [outputPath]
 *
 * Environment overrides:
 *   VM_HOST      default 134.185.111.151
 *   VM_USER      default ubuntu
 *   VM_KEY       default ~/.ssh/id_rsa
 *   VM_ENV_PATH  default /home/ubuntu/.env
 *
 * The default output is outside the repo so the secrets are never committed.
 * The file is also printed to stdout grouped by its comment headers.
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile, chmod } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const host = process.env.VM_HOST || '134.185.111.151';
const user = process.env.VM_USER || 'ubuntu';
const keyFile = process.env.VM_KEY || path.join(homedir(), '.ssh', 'id_rsa');
const remotePath = process.env.VM_ENV_PATH || '/home/ubuntu/.env';
const outFile = process.argv[2] || path.join(homedir(), '.config', 'envman', 'vm.env');

/**
 * Run ssh with an argument array (no shell), resolving with stdout.
 */
function sshCat(remote) {
  return new Promise((resolve, reject) => {
    const args = [
      '-i', keyFile,
      '-o', 'BatchMode=yes',
      '-o', 'ConnectTimeout=15',
      `${user}@${host}`,
      'cat', remote,
    ];
    const child = spawn('ssh', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks = [];
    let stderr = '';
    child.stdout.on('data', (chunk) => chunks.push(chunk));
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(chunks).toString('utf8'));
      else reject(new Error(`ssh exited with code ${code}: ${stderr.trim()}`));
    });
  });
}

async function main() {
  const content = await sshCat(remotePath);

  await mkdir(path.dirname(outFile), { recursive: true, mode: 0o700 });
  await writeFile(outFile, content, { mode: 0o600 });
  await chmod(outFile, 0o600);

  console.log(`Saved ${user}@${host}:${remotePath} to ${outFile}`);
  await showSections(outFile);
}

/**
 * Print the saved file grouped by its comments, the same way `pnpm run show` does.
 */
function showSections(file) {
  const showScript = path.join(path.dirname(fileURLToPath(import.meta.url)), 'show-env.js');
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [showScript, file], { stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`show-env exited with code ${code}`));
    });
  });
}

main().catch((err) => {
  console.error(`Failed to fetch env file: ${err.message}`);
  process.exit(1);
});

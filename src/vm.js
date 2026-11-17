import { spawn } from 'node:child_process';
import { mkdir, writeFile, chmod } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { resolveVmSettings } from './config.js';

/**
 * Run ssh with an argument array (no shell), resolving with stdout.
 */
function sshCat(settings, remote) {
  return new Promise((resolve, reject) => {
    const args = [
      '-i', settings.keyPath,
      '-o', 'BatchMode=yes',
      '-o', 'ConnectTimeout=15',
      `${settings.user}@${settings.host}`,
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

/**
 * Download the remote env file over SSH and save it locally (mode 0600).
 * Returns the settings used and the path written.
 */
export async function fetchVmEnv(outFile) {
  const settings = resolveVmSettings();
  const target = outFile
    ? path.resolve(outFile)
    : path.join(homedir(), '.config', 'envman', 'vm.env');

  const content = await sshCat(settings, settings.envPath);

  await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  await writeFile(target, content, { mode: 0o600 });
  await chmod(target, 0o600);

  return { settings, file: target };
}

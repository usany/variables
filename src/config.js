import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { homedir, userInfo } from 'node:os';
import path from 'node:path';

/**
 * User settings for the VM / SSH features, stored outside the repo.
 * Location: $ENVMAN_CONFIG, or ~/.config/envman/config.json.
 */
export const CONFIG_PATH = process.env.ENVMAN_CONFIG
  || path.join(homedir(), '.config', 'envman', 'config.json');

// Setting name shown to the user -> field stored under `vm` in the config file
const VM_KEYS = {
  'vm.host': 'host',
  'vm.user': 'user',
  'vm.key': 'keyPath',
  'vm.env-path': 'envPath',
};

export function loadConfig() {
  if (!existsSync(CONFIG_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  } catch (err) {
    throw new Error(`Cannot read config file ${CONFIG_PATH}: ${err.message}`);
  }
}

export function saveConfig(config) {
  mkdirSync(path.dirname(CONFIG_PATH), { recursive: true, mode: 0o700 });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
  chmodSync(CONFIG_PATH, 0o600);
}

function fieldFor(name) {
  const field = VM_KEYS[name];
  if (!field) {
    throw new Error(`Unknown setting "${name}". Valid settings: ${Object.keys(VM_KEYS).join(', ')}`);
  }
  return field;
}

export function getSetting(name) {
  return loadConfig().vm?.[fieldFor(name)];
}

export function setSetting(name, value) {
  const field = fieldFor(name);
  const config = loadConfig();
  config.vm = { ...config.vm, [field]: value };
  saveConfig(config);
}

export function unsetSetting(name) {
  const field = fieldFor(name);
  const config = loadConfig();
  if (config.vm) delete config.vm[field];
  saveConfig(config);
}

export function listSettings() {
  const vm = loadConfig().vm || {};
  return Object.entries(VM_KEYS).map(([name, field]) => ({ name, value: vm[field] }));
}

function expandHome(p) {
  if (p === '~') return homedir();
  if (p.startsWith('~/')) return path.join(homedir(), p.slice(2));
  return p;
}

/**
 * Resolve VM/SSH settings. Priority: explicit overrides > environment variables > config file > defaults.
 */
export function resolveVmSettings(overrides = {}) {
  const saved = loadConfig().vm || {};
  const pick = (override, envName, field) => override || process.env[envName] || saved[field];

  const host = pick(overrides.host, 'VM_HOST', 'host');
  if (!host) {
    throw new Error('No server configured. Set one with: envman config set vm.host <host>');
  }

  return {
    host,
    user: pick(overrides.user, 'VM_USER', 'user') || userInfo().username,
    keyPath: expandHome(pick(overrides.keyPath, 'VM_KEY', 'keyPath') || '~/.ssh/id_rsa'),
    envPath: pick(overrides.envPath, 'VM_ENV_PATH', 'envPath') || '~/.env',
  };
}

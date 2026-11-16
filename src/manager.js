import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname } from 'path';
import { mkdirSync } from 'fs';

export class EnvManager {
  constructor(file = '.env', globalMode = false) {
    this.file = file;
    this.globalMode = globalMode;
  }

  // Parse .env file format
  static parse(content) {
    const vars = {};
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) continue;

      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;

      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();

      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      vars[key] = value;
    }

    return vars;
  }

  // Parse .env file format, grouping variables under the comment that precedes them
  static parseSections(content) {
    const sections = [];
    let current = { title: null, vars: [] };

    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('#')) {
        // A comment starts a new section, unless the current one has no variables yet
        if (current.vars.length > 0 || current.title !== null) sections.push(current);
        current = { title: trimmed.replace(/^#+\s*/, ''), vars: [] };
        continue;
      }

      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;

      const key = trimmed.slice(0, eqIndex).trim().replace(/^export\s+/, '');
      let value = trimmed.slice(eqIndex + 1).trim();

      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      current.vars.push({ key, value });
    }

    if (current.vars.length > 0) sections.push(current);
    return sections;
  }

  // Format variables to .env file format
  static format(vars) {
    return Object.entries(vars)
      .map(([k, v]) => {
        // Quote values with spaces or special characters
        const needsQuotes = v.includes(' ') || v.includes('\n') || v.includes('=');
        const quotedValue = needsQuotes ? `"${v.replace(/"/g, '\\"')}"` : v;
        return `${k}=${quotedValue}`;
      })
      .join('\n') + '\n';
  }

  async set(key, value) {
    if (this.globalMode) {
      process.env[key] = value;
      return;
    }

    const vars = await this.list();
    vars[key] = value;
    this._write(vars);
  }

  async get(key) {
    if (this.globalMode) {
      return process.env[key] || null;
    }

    const vars = await this.list();
    return vars[key] || null;
  }

  async list() {
    if (this.globalMode) {
      return { ...process.env };
    }

    if (!existsSync(this.file)) {
      return {};
    }

    const content = readFileSync(this.file, 'utf-8');
    return EnvManager.parse(content);
  }

  // Same as list(), but keeps each variable's comment section
  async listSections() {
    if (!existsSync(this.file)) {
      return [];
    }

    const content = readFileSync(this.file, 'utf-8');
    return EnvManager.parseSections(content);
  }

  async delete(key) {
    if (this.globalMode) {
      delete process.env[key];
      return;
    }

    const vars = await this.list();
    delete vars[key];
    this._write(vars);
  }

  async loadFromFile(sourceFile) {
    if (!existsSync(sourceFile)) {
      throw new Error(`File not found: ${sourceFile}`);
    }

    const content = readFileSync(sourceFile, 'utf-8');
    const newVars = EnvManager.parse(content);
    const currentVars = await this.list();
    const merged = { ...currentVars, ...newVars };
    this._write(merged);

    return Object.keys(newVars).length;
  }

  async saveToFile(destFile) {
    const vars = await this.list();
    const dir = dirname(destFile);
    
    if (dir && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(destFile, EnvManager.format(vars), 'utf-8');
  }

  async copyFile(sourceFile, destFile) {
    if (!existsSync(sourceFile)) {
      throw new Error(`File not found: ${sourceFile}`);
    }

    const content = readFileSync(sourceFile, 'utf-8');
    const dir = dirname(destFile);
    
    if (dir && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(destFile, content, 'utf-8');
  }

  async validate(file) {
    if (!existsSync(file)) {
      return { valid: false, errors: [`File not found: ${file}`] };
    }

    const errors = [];
    try {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('#')) continue;

        const eqIndex = line.indexOf('=');
        if (eqIndex === -1) {
          errors.push(`Line ${i + 1}: No '=' found in: ${line}`);
          continue;
        }

        const key = line.slice(0, eqIndex).trim();
        if (!key.match(/^[A-Z_][A-Z0-9_]*$/i)) {
          errors.push(`Line ${i + 1}: Invalid key name: ${key}`);
        }
      }

      return { valid: errors.length === 0, errors };
    } catch (err) {
      return { valid: false, errors: [err.message] };
    }
  }

  async merge(file1, file2) {
    if (!existsSync(file1)) throw new Error(`File not found: ${file1}`);
    if (!existsSync(file2)) throw new Error(`File not found: ${file2}`);

    const content1 = readFileSync(file1, 'utf-8');
    const content2 = readFileSync(file2, 'utf-8');

    const vars1 = EnvManager.parse(content1);
    const vars2 = EnvManager.parse(content2);

    return { ...vars1, ...vars2 };
  }

  async diff(file1, file2) {
    if (!existsSync(file1)) throw new Error(`File not found: ${file1}`);
    if (!existsSync(file2)) throw new Error(`File not found: ${file2}`);

    const content1 = readFileSync(file1, 'utf-8');
    const content2 = readFileSync(file2, 'utf-8');

    const vars1 = EnvManager.parse(content1);
    const vars2 = EnvManager.parse(content2);

    const allKeys = new Set([...Object.keys(vars1), ...Object.keys(vars2)]);
    const diffs = [];

    for (const key of allKeys) {
      const val1 = vars1[key];
      const val2 = vars2[key];

      if (val1 === undefined) {
        diffs.push(`+ ${key}="${val2}" (only in ${file2})`);
      } else if (val2 === undefined) {
        diffs.push(`- ${key}="${val1}" (only in ${file1})`);
      } else if (val1 !== val2) {
        diffs.push(`~ ${key}: "${val1}" → "${val2}"`);
      }
    }

    return diffs.length > 0 ? diffs.join('\n') : 'Files are identical';
  }

  _write(vars) {
    const dir = dirname(this.file);
    if (dir && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(this.file, EnvManager.format(vars), 'utf-8');
  }
}

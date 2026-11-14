#!/usr/bin/env node

import { parseArgs } from './utils/parser.js';
import { EnvManager } from './manager.js';
import { logError, logSuccess, logInfo, table } from './utils/logger.js';

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const file = args.options.file || args.options.f || '.env';
    const format = args.options.format || 'table';
    const globalMode = args.options.global || args.options.g;

    if (!args.command || args.options.help || args.options.h) {
      showHelp();
      return;
    }

    if (args.options.version || args.options.v) {
      console.log('envman 1.0.0');
      return;
    }

    const manager = new EnvManager(file, globalMode);

    switch (args.command) {
      case 'set':
        if (args.params.length < 2) throw new Error('Usage: envman set <key> <value>');
        await manager.set(args.params[0], args.params[1]);
        logSuccess(`Set ${args.params[0]} = ${args.params[1]}`);
        break;

      case 'get':
        if (args.params.length < 1) throw new Error('Usage: envman get <key>');
        const value = await manager.get(args.params[0]);
        console.log(value || '');
        break;

      case 'list':
      case 'ls':
        const vars = await manager.list();
        const prefix = args.options.prefix;
        const filtered = prefix ? Object.fromEntries(
          Object.entries(vars).filter(([k]) => k.startsWith(prefix))
        ) : vars;
        
        if (format === 'json') {
          console.log(JSON.stringify(filtered, null, 2));
        } else if (format === 'shell') {
          Object.entries(filtered).forEach(([k, v]) => {
            console.log(`export ${k}="${v}"`);
          });
        } else {
          table(filtered);
        }
        break;

      case 'delete':
      case 'del':
      case 'rm':
        if (args.params.length < 1) throw new Error('Usage: envman delete <key>');
        await manager.delete(args.params[0]);
        logSuccess(`Deleted ${args.params[0]}`);
        break;

      case 'load':
        if (args.params.length < 1) throw new Error('Usage: envman load <file>');
        const loaded = await manager.loadFromFile(args.params[0]);
        logSuccess(`Loaded ${loaded} variables from ${args.params[0]}`);
        break;

      case 'save':
        if (args.params.length < 1) throw new Error('Usage: envman save <file>');
        await manager.saveToFile(args.params[0]);
        logSuccess(`Saved variables to ${args.params[0]}`);
        break;

      case 'copy':
        if (args.params.length < 2) throw new Error('Usage: envman copy <source> <dest>');
        await manager.copyFile(args.params[0], args.params[1]);
        logSuccess(`Copied ${args.params[0]} to ${args.params[1]}`);
        break;

      case 'validate':
        if (args.params.length < 1) throw new Error('Usage: envman validate <file>');
        const result = await manager.validate(args.params[0]);
        if (result.valid) {
          logSuccess('File is valid');
        } else {
          console.log('Validation errors:');
          result.errors.forEach(e => logError(e));
        }
        break;

      case 'merge':
        if (args.params.length < 2) throw new Error('Usage: envman merge <file1> <file2>');
        const merged = await manager.merge(args.params[0], args.params[1]);
        if (format === 'json') {
          console.log(JSON.stringify(merged, null, 2));
        } else {
          table(merged);
        }
        break;

      case 'diff':
        if (args.params.length < 2) throw new Error('Usage: envman diff <file1> <file2>');
        const diff = await manager.diff(args.params[0], args.params[1]);
        console.log(diff);
        break;

      case 'export':
        const exported = await manager.list();
        Object.entries(exported).forEach(([k, v]) => {
          console.log(`export ${k}="${v}"`);
        });
        break;

      case 'help':
        showHelp();
        break;

      default:
        throw new Error(`Unknown command: ${args.command}`);
    }
  } catch (error) {
    logError(error.message);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
envman - Environment Variables Management CLI

Usage:
  envman <command> [options]

Commands:
  set <key> <value>          Set an environment variable
  get <key>                  Get an environment variable
  list (ls)                  List all environment variables
  delete <key> (del, rm)     Delete an environment variable
  load <file>                Load variables from a file
  save <file>                Save variables to a file
  copy <source> <dest>       Copy variables from one file to another
  validate <file>            Validate a file
  merge <file1> <file2>      Merge two files
  diff <file1> <file2>       Compare two files
  export                     Export variables in shell format
  help                       Show this help message

Options:
  --file, -f <path>          Target file (default: .env)
  --format <format>          Output format: json, table, shell (default: table)
  --prefix <prefix>          Filter by prefix
  --global, -g               Use environment variables instead of file
  --help, -h                 Show help
  --version, -v              Show version

Examples:
  envman set API_KEY "secret123" --file .env.production
  envman get API_KEY
  envman list --format json
  envman load .env.example
  envman validate .env
  envman diff .env .env.example
  envman export | bash
`);
}

main().catch(err => {
  logError(err.message);
  process.exit(1);
});

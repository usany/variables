// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

export function logError(message) {
  console.error(`${colors.red}✖ ${message}${colors.reset}`);
}

export function logSuccess(message) {
  console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

export function logInfo(message) {
  console.log(`${colors.blue}ℹ ${message}${colors.reset}`);
}

export function logWarning(message) {
  console.log(`${colors.yellow}⚠ ${message}${colors.reset}`);
}

export function table(vars) {
  if (Object.keys(vars).length === 0) {
    console.log('No variables found');
    return;
  }

  // Calculate column widths
  const keys = Object.keys(vars);
  const maxKeyLength = Math.max(...keys.map(k => k.length), 'KEY'.length);
  const maxValueLength = Math.max(...Object.values(vars).map(v => String(v).length), 'VALUE'.length);

  // Print header
  const keyHeader = 'KEY'.padEnd(maxKeyLength);
  const valueHeader = 'VALUE'.padEnd(maxValueLength);
  console.log(`${colors.cyan}${keyHeader}  ${valueHeader}${colors.reset}`);
  console.log(`${'-'.repeat(maxKeyLength)}  ${'-'.repeat(maxValueLength)}`);

  // Print rows
  for (const [key, value] of Object.entries(vars)) {
    const paddedKey = key.padEnd(maxKeyLength);
    const paddedValue = String(value).padEnd(maxValueLength);
    console.log(`${paddedKey}  ${paddedValue}`);
  }
}

// Table like table(), but each section is printed under its comment heading
export function sectionTable(sections) {
  const all = sections.flatMap((section) => section.vars);
  if (all.length === 0) {
    console.log('No variables found');
    return;
  }

  // Use one width for every section so the columns line up
  const maxKeyLength = Math.max(...all.map(v => v.key.length), 'KEY'.length);
  const maxValueLength = Math.max(...all.map(v => v.value.length), 'VALUE'.length);

  const keyHeader = 'KEY'.padEnd(maxKeyLength);
  const valueHeader = 'VALUE'.padEnd(maxValueLength);
  console.log(`${colors.cyan}${keyHeader}  ${valueHeader}${colors.reset}`);
  console.log(`${'-'.repeat(maxKeyLength)}  ${'-'.repeat(maxValueLength)}`);

  for (const section of sections) {
    if (section.vars.length === 0) continue;
    console.log('');
    if (section.title) console.log(`${colors.gray}# ${section.title}${colors.reset}`);
    for (const { key, value } of section.vars) {
      console.log(`${key.padEnd(maxKeyLength)}  ${value.padEnd(maxValueLength)}`);
    }
  }
}

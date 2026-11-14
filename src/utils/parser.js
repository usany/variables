// Parse command-line arguments
export function parseArgs(argv) {
  const args = {
    command: null,
    params: [],
    options: {}
  };

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];

    if (arg.startsWith('--')) {
      // Long flag
      const key = arg.slice(2);
      if (argv[i + 1] && !argv[i + 1].startsWith('-')) {
        args.options[key] = argv[i + 1];
        i += 2;
      } else {
        args.options[key] = true;
        i += 1;
      }
    } else if (arg.startsWith('-') && arg !== '-') {
      // Short flag
      const key = arg.slice(1);
      if (argv[i + 1] && !argv[i + 1].startsWith('-')) {
        args.options[key] = argv[i + 1];
        i += 2;
      } else {
        args.options[key] = true;
        i += 1;
      }
    } else {
      // Positional argument
      if (!args.command) {
        args.command = arg;
      } else {
        args.params.push(arg);
      }
      i += 1;
    }
  }

  return args;
}

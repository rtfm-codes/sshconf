#!/usr/bin/env node

// rtfm.codes/sshconf - SSH config manager CLI

const config = require('../src/config');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const command = args[0];

const green = '\x1b[32m';
const red = '\x1b[31m';
const cyan = '\x1b[36m';
const dim = '\x1b[2m';
const reset = '\x1b[0m';

function parseArgs(args) {
  const options = {};
  const positional = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--host' || arg === '-h') {
      options.host = args[++i];
    } else if (arg === '--user' || arg === '-u') {
      options.user = args[++i];
    } else if (arg === '--port' || arg === '-p') {
      options.port = args[++i];
    } else if (arg === '--identity' || arg === '-i') {
      options.identity = args[++i];
    } else if (arg === '--json') {
      options.format = 'json';
    } else if (arg === '--yaml') {
      options.format = 'yaml';
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }

  return { options, positional };
}

function showHelp() {
  console.log(`
  ${green}sshconf${reset} - SSH config manager. ${dim}rtfm.codes${reset}

  ${dim}Usage:${reset}
    sshconf <command> [options]

  ${dim}Commands:${reset}
    list, ls                  List all hosts
    add <name> [options]      Add new host
    show <name>               Show host config
    edit <name> [options]     Edit host config
    remove, rm <name>         Remove host
    copy <from> <to>          Copy host entry
    test <name>               Test SSH connection
    export [--json|--yaml]    Export config
    import <file>             Import from JSON
    backup                    Backup config file

  ${dim}Options:${reset}
    -h, --host <hostname>     Hostname or IP
    -u, --user <username>     SSH username
    -p, --port <port>         SSH port
    -i, --identity <file>     Identity file path

  ${dim}Examples:${reset}
    sshconf add prod -h example.com -u deploy -p 2222
    sshconf list
    sshconf edit prod --port 22
    sshconf remove oldserver
    sshconf test prod

  ${dim}Docs:${reset}    https://rtfm.codes/sshconf
  ${dim}Issues:${reset}  https://github.com/rtfm-codes/sshconf/issues

  ${green}rtfm.codes${reset} ${dim}- read the fine manual${reset}
`);
}

function printTable(hosts) {
  console.log('');
  console.log('  ' + dim + 'HOST'.padEnd(14) + 'HOSTNAME'.padEnd(20) + 'USER'.padEnd(12) + 'PORT' + reset);
  console.log('  ' + dim + '-'.repeat(50) + reset);

  for (const h of hosts) {
    const name = cyan + h.name.padEnd(14) + reset;
    const hostname = (h.HostName || '-').padEnd(20);
    const user = (h.User || '-').padEnd(12);
    const port = h.Port || '22';
    console.log('  ' + name + hostname + user + port);
  }
  console.log('');
}

function main() {
  if (!command || command === 'help' || command === '--help') {
    showHelp();
    process.exit(0);
  }

  const { options, positional } = parseArgs(args.slice(1));

  switch (command) {
    case 'list':
    case 'ls': {
      const hosts = config.read();
      if (hosts.length === 0) {
        console.log(dim + '\n  No hosts configured\n' + reset);
      } else {
        printTable(hosts);
      }
      break;
    }

    case 'add': {
      const name = positional[0];
      if (!name) {
        console.error(red + '  Error: host name required' + reset);
        process.exit(1);
      }

      const result = config.addHost(name, options);
      if (result.success) {
        console.log(green + "  ✓ Added host '" + name + "'" + reset);
      } else {
        console.error(red + '  Error: ' + result.message + reset);
        process.exit(1);
      }
      break;
    }

    case 'show': {
      const name = positional[0];
      if (!name) {
        console.error(red + '  Error: host name required' + reset);
        process.exit(1);
      }

      const host = config.getHost(name);
      if (!host) {
        console.error(red + '  Error: host not found: ' + name + reset);
        process.exit(1);
      }

      console.log('');
      console.log('  Host: ' + cyan + host.name + reset);
      console.log('  ' + dim + '──────────────' + reset);
      if (host.HostName) console.log('  HostName:     ' + host.HostName);
      if (host.User) console.log('  User:         ' + host.User);
      if (host.Port) console.log('  Port:         ' + host.Port);
      if (host.IdentityFile) console.log('  IdentityFile: ' + host.IdentityFile);
      console.log('');
      break;
    }

    case 'edit': {
      const name = positional[0];
      if (!name) {
        console.error(red + '  Error: host name required' + reset);
        process.exit(1);
      }

      const result = config.editHost(name, options);
      if (result.success) {
        console.log(green + "  ✓ Updated host '" + name + "'" + reset);
      } else {
        console.error(red + '  Error: ' + result.message + reset);
        process.exit(1);
      }
      break;
    }

    case 'remove':
    case 'rm': {
      const name = positional[0];
      if (!name) {
        console.error(red + '  Error: host name required' + reset);
        process.exit(1);
      }

      const result = config.removeHost(name);
      if (result.success) {
        console.log(green + "  ✓ Removed host '" + name + "'" + reset);
      } else {
        console.error(red + '  Error: ' + result.message + reset);
        process.exit(1);
      }
      break;
    }

    case 'copy': {
      const from = positional[0];
      const to = positional[1];
      if (!from || !to) {
        console.error(red + '  Error: source and destination required' + reset);
        process.exit(1);
      }

      const result = config.copyHost(from, to);
      if (result.success) {
        console.log(green + "  ✓ Copied '" + from + "' to '" + to + "'" + reset);
      } else {
        console.error(red + '  Error: ' + result.message + reset);
        process.exit(1);
      }
      break;
    }

    case 'test': {
      const name = positional[0];
      if (!name) {
        console.error(red + '  Error: host name required' + reset);
        process.exit(1);
      }

      const host = config.getHost(name);
      if (!host) {
        console.error(red + '  Error: host not found: ' + name + reset);
        process.exit(1);
      }

      console.log('\n  Testing connection to ' + cyan + name + reset + '...');

      try {
        execSync('ssh -o ConnectTimeout=5 -o BatchMode=yes ' + name + ' exit 2>/dev/null', { stdio: 'ignore' });
        const addr = (host.HostName || name) + ':' + (host.Port || '22');
        console.log(green + '  ✓ Connection successful (' + addr + ')' + reset + '\n');
      } catch (e) {
        console.log(red + '  ✗ Connection failed' + reset + '\n');
        process.exit(1);
      }
      break;
    }

    case 'export': {
      const format = options.format || 'text';
      const output = config.exportConfig(format);
      console.log(output);
      break;
    }

    case 'import': {
      const file = positional[0];
      if (!file) {
        console.error(red + '  Error: file path required' + reset);
        process.exit(1);
      }

      const fs = require('fs');
      if (!fs.existsSync(file)) {
        console.error(red + '  Error: file not found: ' + file + reset);
        process.exit(1);
      }

      const data = fs.readFileSync(file, 'utf-8');
      const result = config.importConfig(data);

      if (result.success) {
        console.log(green + '  ✓ Imported ' + result.count + ' hosts' + reset);
      } else {
        console.error(red + '  Error: ' + result.message + reset);
        process.exit(1);
      }
      break;
    }

    case 'backup': {
      const result = config.backup();
      if (result.success) {
        console.log(green + '  ✓ Backup created: ' + result.path + reset);
      } else {
        console.error(red + '  Error: ' + result.message + reset);
        process.exit(1);
      }
      break;
    }

    default:
      console.error(red + '  Unknown command: ' + command + reset);
      console.error('  Run: sshconf --help');
      process.exit(1);
  }
}

main();

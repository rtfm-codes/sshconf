// rtfm.codes/sshconf - SSH config manager

const fs = require('fs');
const path = require('path');
const os = require('os');

function getConfigPath() {
  return path.join(os.homedir(), '.ssh', 'config');
}

function ensureSSHDir() {
  const sshDir = path.join(os.homedir(), '.ssh');
  if (!fs.existsSync(sshDir)) {
    fs.mkdirSync(sshDir, { mode: 0o700 });
  }
}

function parse(content) {
  if (!content || !content.trim()) {
    return [];
  }

  const hosts = [];
  let current = null;

  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const hostMatch = trimmed.match(/^Host\s+(.+)$/i);
    if (hostMatch) {
      if (current) {
        hosts.push(current);
      }
      current = { name: hostMatch[1] };
      continue;
    }

    if (current) {
      const optMatch = trimmed.match(/^(\w+)\s+(.+)$/);
      if (optMatch) {
        current[optMatch[1]] = optMatch[2];
      }
    }
  }

  if (current) {
    hosts.push(current);
  }

  return hosts;
}

function stringify(hosts) {
  const lines = [];

  for (const host of hosts) {
    lines.push('Host ' + host.name);

    for (const [key, value] of Object.entries(host)) {
      if (key !== 'name') {
        lines.push('    ' + key + ' ' + value);
      }
    }

    lines.push('');
  }

  return lines.join('\n');
}

function read(configPath) {
  const filePath = configPath || getConfigPath();

  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  return parse(content);
}

function write(hosts, configPath) {
  const filePath = configPath || getConfigPath();
  ensureSSHDir();

  const content = stringify(hosts);
  fs.writeFileSync(filePath, content, { mode: 0o600 });
}

function addHost(name, options, configPath) {
  const hosts = read(configPath);

  const existing = hosts.find(h => h.name === name);
  if (existing) {
    return { success: false, message: 'Host already exists: ' + name };
  }

  const host = { name };

  if (options.host || options.HostName) {
    host.HostName = options.host || options.HostName;
  }
  if (options.user || options.User) {
    host.User = options.user || options.User;
  }
  if (options.port || options.Port) {
    host.Port = String(options.port || options.Port);
  }
  if (options.identity || options.IdentityFile) {
    host.IdentityFile = options.identity || options.IdentityFile;
  }

  hosts.push(host);
  write(hosts, configPath);

  return { success: true, host: host };
}

function editHost(name, options, configPath) {
  const hosts = read(configPath);

  const host = hosts.find(h => h.name === name);
  if (!host) {
    return { success: false, message: 'Host not found: ' + name };
  }

  if (options.host || options.HostName) {
    host.HostName = options.host || options.HostName;
  }
  if (options.user || options.User) {
    host.User = options.user || options.User;
  }
  if (options.port || options.Port) {
    host.Port = String(options.port || options.Port);
  }
  if (options.identity || options.IdentityFile) {
    host.IdentityFile = options.identity || options.IdentityFile;
  }

  write(hosts, configPath);

  return { success: true, host: host };
}

function removeHost(name, configPath) {
  const hosts = read(configPath);

  const index = hosts.findIndex(h => h.name === name);
  if (index === -1) {
    return { success: false, message: 'Host not found: ' + name };
  }

  hosts.splice(index, 1);
  write(hosts, configPath);

  return { success: true };
}

function getHost(name, configPath) {
  const hosts = read(configPath);
  return hosts.find(h => h.name === name) || null;
}

function listHosts(configPath) {
  const hosts = read(configPath);
  return hosts.map(h => h.name);
}

function copyHost(from, to, configPath) {
  const hosts = read(configPath);

  const source = hosts.find(h => h.name === from);
  if (!source) {
    return { success: false, message: 'Host not found: ' + from };
  }

  const existing = hosts.find(h => h.name === to);
  if (existing) {
    return { success: false, message: 'Host already exists: ' + to };
  }

  const newHost = { ...source, name: to };
  hosts.push(newHost);
  write(hosts, configPath);

  return { success: true, host: newHost };
}

function backup(configPath) {
  const filePath = configPath || getConfigPath();

  if (!fs.existsSync(filePath)) {
    return { success: false, message: 'Config file not found' };
  }

  const backupPath = filePath + '.backup.' + Date.now();
  fs.copyFileSync(filePath, backupPath);

  return { success: true, path: backupPath };
}

function exportConfig(format, configPath) {
  const hosts = read(configPath);

  if (format === 'json') {
    return JSON.stringify(hosts, null, 2);
  }

  if (format === 'yaml') {
    let yaml = '';
    for (const host of hosts) {
      yaml += host.name + ':\n';
      for (const [key, value] of Object.entries(host)) {
        if (key !== 'name') {
          yaml += '  ' + key + ': ' + value + '\n';
        }
      }
    }
    return yaml;
  }

  return stringify(hosts);
}

function importConfig(data, configPath) {
  let hosts;

  try {
    hosts = JSON.parse(data);
  } catch (e) {
    return { success: false, message: 'Invalid JSON' };
  }

  if (!Array.isArray(hosts)) {
    return { success: false, message: 'Expected array of hosts' };
  }

  write(hosts, configPath);
  return { success: true, count: hosts.length };
}

module.exports = {
  getConfigPath,
  parse,
  stringify,
  read,
  write,
  addHost,
  editHost,
  removeHost,
  getHost,
  listHosts,
  copyHost,
  backup,
  exportConfig,
  importConfig
};

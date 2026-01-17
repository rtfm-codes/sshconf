// rtfm.codes/sshconf - tests

const config = require('./src/config');
const fs = require('fs');
const path = require('path');

const TEST_CONFIG = '/tmp/sshconf-test-' + Date.now();

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('\x1b[32m✓ ' + name + '\x1b[0m');
    passed++;
  } catch (e) {
    console.log('\x1b[31m✗ ' + name + '\x1b[0m');
    console.log('  ' + e.message);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function cleanup() {
  if (fs.existsSync(TEST_CONFIG)) {
    fs.unlinkSync(TEST_CONFIG);
  }
}

// Test parse
test('parse extracts hosts correctly', () => {
  const content = `Host myserver
    HostName 192.168.1.100
    User root
    Port 22`;

  const hosts = config.parse(content);
  assert(hosts.length === 1, 'Should have 1 host');
  assert(hosts[0].name === 'myserver', 'Name should match');
  assert(hosts[0].HostName === '192.168.1.100', 'HostName should match');
  assert(hosts[0].User === 'root', 'User should match');
});

test('parse handles multiple hosts', () => {
  const content = `Host server1
    HostName 10.0.0.1
    User admin

Host server2
    HostName 10.0.0.2
    User deploy`;

  const hosts = config.parse(content);
  assert(hosts.length === 2, 'Should have 2 hosts');
  assert(hosts[0].name === 'server1', 'First host name');
  assert(hosts[1].name === 'server2', 'Second host name');
});

test('parse handles empty config', () => {
  const hosts = config.parse('');
  assert(hosts.length === 0, 'Should return empty array');
});

// Test stringify
test('stringify creates valid config format', () => {
  const hosts = [
    { name: 'test', HostName: '1.2.3.4', User: 'user' }
  ];

  const output = config.stringify(hosts);
  assert(output.includes('Host test'), 'Should have Host line');
  assert(output.includes('HostName 1.2.3.4'), 'Should have HostName');
  assert(output.includes('User user'), 'Should have User');
});

// Test addHost
test('addHost adds new entry', () => {
  cleanup();

  const result = config.addHost('newhost', {
    host: '10.0.0.1',
    user: 'admin',
    port: '2222'
  }, TEST_CONFIG);

  assert(result.success, 'Should succeed');
  assert(result.host.name === 'newhost', 'Name should match');

  const hosts = config.read(TEST_CONFIG);
  assert(hosts.length === 1, 'Should have 1 host');
});

// Test editHost
test('editHost modifies existing entry', () => {
  const result = config.editHost('newhost', { port: '3333' }, TEST_CONFIG);
  assert(result.success, 'Should succeed');

  const host = config.getHost('newhost', TEST_CONFIG);
  assert(host.Port === '3333', 'Port should be updated');
});

// Test getHost
test('getHost returns single host', () => {
  const host = config.getHost('newhost', TEST_CONFIG);
  assert(host !== null, 'Should find host');
  assert(host.name === 'newhost', 'Name should match');
});

test('getHost returns null for missing', () => {
  const host = config.getHost('nonexistent', TEST_CONFIG);
  assert(host === null, 'Should return null');
});

// Test listHosts
test('listHosts returns array of names', () => {
  config.addHost('second', { host: '2.2.2.2' }, TEST_CONFIG);

  const names = config.listHosts(TEST_CONFIG);
  assert(Array.isArray(names), 'Should return array');
  assert(names.includes('newhost'), 'Should include newhost');
  assert(names.includes('second'), 'Should include second');
});

// Test removeHost
test('removeHost deletes entry', () => {
  const result = config.removeHost('second', TEST_CONFIG);
  assert(result.success, 'Should succeed');

  const host = config.getHost('second', TEST_CONFIG);
  assert(host === null, 'Should be removed');
});

// Test handles missing IdentityFile
test('handles missing IdentityFile gracefully', () => {
  const host = config.getHost('newhost', TEST_CONFIG);
  assert(host.IdentityFile === undefined, 'Should not have IdentityFile');
});

cleanup();

console.log('\n' + passed + '/' + (passed + failed) + ' tests passed\n');

if (failed > 0) process.exit(1);

# sshconf

SSH config manager. Add, edit, list hosts. No more manual editing.

## Install

```bash
npm install -g sshconf
```

## Usage

```bash
# List all hosts
sshconf list
sshconf ls

# Add a host
sshconf add myserver --host 192.168.1.100 --user root
sshconf add prod -h example.com -u deploy -p 2222 -i ~/.ssh/prod_key

# Show host config
sshconf show myserver

# Edit host
sshconf edit myserver --port 2222
sshconf edit myserver -u newuser

# Remove host
sshconf remove myserver
sshconf rm myserver

# Copy host
sshconf copy myserver myserver-backup

# Test connection
sshconf test myserver

# Export config
sshconf export --json
sshconf export --yaml

# Import from JSON
sshconf import hosts.json

# Backup config
sshconf backup

# Help
sshconf --help
```

## Output

```
$ sshconf list
  HOST          HOSTNAME            USER        PORT
  --------------------------------------------------
  myserver      192.168.1.100       root        22
  prod          example.com         deploy      2222

$ sshconf show prod
  Host: prod
  ──────────────
  HostName:     example.com
  User:         deploy
  Port:         2222
  IdentityFile: ~/.ssh/prod_key

$ sshconf add newserver -h 10.0.0.50 -u admin
  ✓ Added host 'newserver'

$ sshconf test myserver
  Testing connection to myserver...
  ✓ Connection successful (192.168.1.100:22)
```

## Config file

Manages `~/.ssh/config` in standard OpenSSH format.

## License

MIT

---

rtfm.codes - read the fine manual

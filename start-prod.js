const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const envPath = path.join(__dirname, '.env.production');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  lines.forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const equalIndex = line.indexOf('=');
      if (equalIndex > 0) {
        const key = line.substring(0, equalIndex).trim();
        let value = line.substring(equalIndex + 1).trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        value = value.replace(/\\n/g, '\n');
        process.env[key] = value;
      }
    }
  });
}

const envPath2 = path.join(__dirname, '.env');
if (fs.existsSync(envPath2)) {
  const envContent = fs.readFileSync(envPath2, 'utf8');
  const lines = envContent.split('\n');
  lines.forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const equalIndex = line.indexOf('=');
      if (equalIndex > 0) {
        const key = line.substring(0, equalIndex).trim();
        let value = line.substring(equalIndex + 1).trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        value = value.replace(/\\n/g, '\n');
        process.env[key] = value;
      }
    }
  });
}

const serverPath = path.join(__dirname, '.next', 'standalone', 'server.js');
if (fs.existsSync(serverPath)) {
  const server = spawn('node', [serverPath], { stdio: 'inherit', env: process.env });
  server.on('error', (err) => { console.error('Server error:', err); });
  server.on('close', (code) => { console.log('Server closed with code:', code); });
} else {
  console.error(`Server file not found: ${serverPath}`);
  process.exit(1);
}
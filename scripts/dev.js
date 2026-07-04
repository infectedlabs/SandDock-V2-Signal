const { spawn, execSync } = require('child_process');
const net = require('net');
const path = require('path');
const fs = require('fs');

const processes = [];

// Load environment variables from .env.local
const envFile = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envFile)) {
  const content = fs.readFileSync(envFile, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const parts = trimmed.split('=');
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      if (key) {
        process.env[key] = value;
      }
    }
  });
}

// Helper to check if a port is open
function checkPort(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

// Prefix stdout helper
function prefixOutput(child, name, colorCode) {
  const prefix = `\x1b[${colorCode}m[${name}]\x1b[0m`;
  
  child.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach((line) => {
      if (line) console.log(`${prefix} ${line}`);
    });
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach((line) => {
      if (line) console.error(`${prefix} \x1b[31m${line}\x1b[0m`);
    });
  });
}

async function start() {
  console.log('\x1b[36m=== Starting Sanddock Local Development Environment ===\x1b[0m');

  // 1. Check Redis
  const isRedisRunning = await checkPort(6379);
  if (!isRedisRunning) {
    console.log('\x1b[33m[Redis] Redis is not running on port 6379. Attempting to start via Docker...\x1b[0m');
    try {
      execSync('docker run -d --name sanddock-redis -p 6379:6379 redis:7-alpine', { stdio: 'ignore' });
      console.log('\x1b[32m[Redis] Successfully started Redis container.\x1b[0m');
    } catch (e) {
      // If docker fails, check if container already exists but is stopped
      try {
        execSync('docker start sanddock-redis', { stdio: 'ignore' });
        console.log('\x1b[32m[Redis] Successfully started existing stopped Redis container.\x1b[0m');
      } catch (err) {
        console.warn('\x1b[31m[Redis] Warning: Failed to start Redis via Docker. Please make sure Redis is running on port 6379 locally.\x1b[0m');
      }
    }
  } else {
    console.log('\x1b[32m[Redis] Redis is already running on port 6379.\x1b[0m');
  }

  const isWindows = process.platform === 'win32';
  const pythonCmd = isWindows ? 'python' : 'python3';
  const npmCmd = isWindows ? 'npm.cmd' : 'npm';

  // Verify and install Python packages
  console.log('\x1b[33m[Setup] Checking and installing Python dependencies...\x1b[0m');
  try {
    execSync(`${pythonCmd} -m pip install -r backend/requirements.txt`, { stdio: 'inherit' });
    console.log('\x1b[32m[Setup] Python dependencies verified.\x1b[0m');
  } catch (err) {
    console.warn('\x1b[31m[Setup] Warning: Failed to install Python dependencies. Please run "pip install -r backend/requirements.txt" manually.\x1b[0m');
  }

  // 2. Start Stream Subscriber
  console.log('\x1b[35m[Subscriber] Starting Stream Subscriber...\x1b[0m');
  const subscriber = spawn(pythonCmd, ['stream_subscriber.py'], {
    cwd: path.join(__dirname, '..', 'backend'),
    shell: true,
  });
  prefixOutput(subscriber, 'Subscriber', '35');
  processes.push(subscriber);

  // 3. Start Signal Engine
  console.log('\x1b[34m[Engine] Starting Signal Engine...\x1b[0m');
  const engine = spawn(pythonCmd, ['signal_engine.py'], {
    cwd: path.join(__dirname, '..', 'backend'),
    shell: true,
  });
  prefixOutput(engine, 'Engine', '34');
  processes.push(engine);

  // 4. Start FastAPI WebSocket Server
  console.log('\x1b[32m[FastAPI] Starting FastAPI WebSocket Server on port 8000...\x1b[0m');
  const fastapi = spawn(pythonCmd, ['-m', 'uvicorn', 'api.main:app', '--host', '0.0.0.0', '--port', '8000'], {
    cwd: path.join(__dirname, '..', 'backend'),
    shell: true,
  });
  prefixOutput(fastapi, 'FastAPI', '32');
  processes.push(fastapi);

  // 5. Start Next.js App
  console.log('\x1b[36m[Next.js] Starting Next.js Dev Server...\x1b[0m');
  const nextDev = spawn(npmCmd, ['run', 'next-dev'], {
    shell: true,
  });
  prefixOutput(nextDev, 'Next.js', '36');
  processes.push(nextDev);

  // Cleanup on exit
  const cleanup = () => {
    console.log('\n\x1b[33mShutting down all processes...\x1b[0m');
    processes.forEach((p) => {
      try {
        if (isWindows) {
          spawn('taskkill', ['/pid', p.pid, '/f', '/t'], { shell: true });
        } else {
          p.kill('SIGINT');
        }
      } catch (e) {}
    });
    process.exit();
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  // Do not exit on process.on('exit') to allow normal cleanup completion
}

start().catch(console.error);

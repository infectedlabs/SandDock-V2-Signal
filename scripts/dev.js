#!/usr/bin/env node

const { spawn } = require('child_process');

const nextDev = spawn('next', ['dev'], {
  stdio: 'inherit',
  shell: true,
});

nextDev.on('exit', (code) => {
  process.exit(code);
});

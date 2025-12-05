#!/usr/bin/env node

/**
 * Start Agent Server with Auto-Setup
 * 
 * Automatically checks setup and starts the agent server
 */

const { spawn } = require('child_process');
const { checkCursorCLI, checkCursorAuth } = require('./setup-check');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function main() {
  log('\n🚀 Starting Mindone Agent Server...\n', 'cyan');
  
  // Quick setup check
  const cursorCheck = checkCursorCLI();
  if (!cursorCheck.available) {
    log('❌ Cursor CLI not found. Please install Cursor first.', 'red');
    log('   Run: npm run setup-check for detailed instructions\n', 'yellow');
    process.exit(1);
  }
  
  const authCheck = checkCursorAuth();
  if (!authCheck.authenticated) {
    log('⚠️  Warning: Cursor authentication not detected', 'yellow');
    log('   The server will start, but agent execution may fail.', 'yellow');
    log('   Set CURSOR_API_KEY or run: cursor agent login\n', 'yellow');
  } else {
    log('✓ Setup verified\n', 'green');
  }
  
  // Start the agent server
  log('Starting server on port 5567...\n', 'cyan');
  const path = require('path');
  const serverPath = path.join(__dirname, 'agent-server.js');
  const server = spawn('node', [serverPath], {
    stdio: 'inherit',
    shell: false,
  });
  
  server.on('error', (error) => {
    log(`\n❌ Failed to start server: ${error.message}`, 'red');
    process.exit(1);
  });
  
  server.on('exit', (code) => {
    process.exit(code || 0);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    log('\n\nShutting down...', 'yellow');
    server.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    server.kill('SIGTERM');
  });
}

if (require.main === module) {
  main();
}


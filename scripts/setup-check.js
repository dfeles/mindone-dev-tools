#!/usr/bin/env node

/**
 * Mindone Setup Check
 * 
 * Checks if everything is set up correctly for agent mode
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function checkCursorCLI() {
  try {
    execSync('which cursor', { stdio: 'ignore' });
    try {
      execSync('cursor agent --help', { stdio: 'ignore', timeout: 3000 });
      return { available: true, error: null };
    } catch (e) {
      return { available: false, error: 'Cursor CLI found but agent command not available' };
    }
  } catch (e) {
    return { available: false, error: 'Cursor CLI not found in PATH' };
  }
}

function checkCursorAuth() {
  // Check for CURSOR_API_KEY environment variable
  if (process.env.CURSOR_API_KEY) {
    return { authenticated: true, method: 'CURSOR_API_KEY env var' };
  }
  
  // Check if user is logged in (cursor-agent login creates a config file)
  // Cursor stores auth in different places, let's check common locations
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  const possibleConfigPaths = [
    path.join(homeDir, '.cursor', 'config.json'),
    path.join(homeDir, '.cursor-agent', 'config.json'),
    path.join(homeDir, '.config', 'cursor', 'config.json'),
  ];
  
  for (const configPath of possibleConfigPaths) {
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.apiKey || config.token) {
          return { authenticated: true, method: 'config file' };
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }
  
  return { authenticated: false, method: null };
}

function main() {
  log('\n🔍 Mindone Setup Check\n', 'cyan');
  
  // Check Cursor CLI
  log('Checking Cursor CLI...', 'blue');
  const cursorCheck = checkCursorCLI();
  if (cursorCheck.available) {
    log('  ✓ Cursor CLI is available', 'green');
  } else {
    log('  ✗ Cursor CLI not found', 'red');
    log(`  ${cursorCheck.error}`, 'yellow');
    log('\n  To fix:', 'yellow');
    log('  1. Make sure Cursor app is installed', 'yellow');
    log('  2. Add Cursor to your PATH (usually done automatically on macOS)', 'yellow');
    log('  3. Or run: cursor --help to verify installation\n', 'yellow');
    return false;
  }
  
  // Check authentication
  log('\nChecking Cursor authentication...', 'blue');
  const authCheck = checkCursorAuth();
  if (authCheck.authenticated) {
    log(`  ✓ Authenticated (${authCheck.method})`, 'green');
  } else {
    log('  ✗ Not authenticated', 'red');
    log('\n  To fix:', 'yellow');
    log('  1. Set CURSOR_API_KEY environment variable:', 'yellow');
    log('     export CURSOR_API_KEY=your_api_key', 'yellow');
    log('  2. Or run: cursor agent login', 'yellow');
    log('  3. Or authenticate through Cursor app settings\n', 'yellow');
    return false;
  }
  
  log('\n✅ All checks passed! Agent mode is ready to use.\n', 'green');
  return true;
}

if (require.main === module) {
  const success = main();
  process.exit(success ? 0 : 1);
}

module.exports = { checkCursorCLI, checkCursorAuth };


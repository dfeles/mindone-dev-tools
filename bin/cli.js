#!/usr/bin/env node

/**
 * Mindone CLI
 * 
 * Auto-starts the agent server and then runs the user's dev command
 * Usage: npx mindone-agent-server && npm run dev
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const SERVER_SCRIPT = path.join(__dirname, '../scripts/agent-server.js');
const PORT = process.env.MINDONE_AGENT_PORT || 5567;

// Check if port is already in use
function isPortInUse(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    server.once('error', () => resolve(true));
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    server.listen(port);
  });
}

// Start the agent server in the background
async function startServer() {
  // Check if server is already running
  if (await isPortInUse(PORT)) {
    console.log(`[mindone] Agent server already running on port ${PORT}`);
    return null;
  }

  console.log(`[mindone] Starting agent server on port ${PORT}...`);
  
  const server = spawn('node', [SERVER_SCRIPT], {
    detached: true,
    stdio: 'ignore',
  });

  server.unref(); // Allow parent process to exit independently

  // Give server a moment to start
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Check if server started successfully
  if (await isPortInUse(PORT)) {
    console.log(`[mindone] ✓ Agent server started on port ${PORT}`);
    return server;
  } else {
    console.warn(`[mindone] ⚠ Server may not have started correctly`);
    return server;
  }
}

// Get the command to run after server starts
function getCommand() {
  // Get all arguments after the script name
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // No command provided, just start server and exit
    return null;
  }

  // Find where the user's command starts (after any flags)
  // Support: npx mindone-agent-server --port 5567 && npm run dev
  let commandStart = 0;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '&&' || args[i] === ';') {
      commandStart = i + 1;
      break;
    }
  }

  if (commandStart === 0 && args[0] !== '&&' && args[0] !== ';') {
    // No separator found, assume all args are the command
    return args;
  }

  return args.slice(commandStart);
}

async function main() {
  try {
    // Start the server
    await startServer();

    // Get command to run
    const command = getCommand();
    
    if (!command || command.length === 0) {
      // Just start server, don't run anything else
      console.log(`[mindone] Server running. Press Ctrl+C to stop.`);
      // Keep process alive
      process.on('SIGINT', () => {
        console.log(`\n[mindone] Shutting down...`);
        process.exit(0);
      });
      return;
    }

    // Run the user's command
    const [cmd, ...cmdArgs] = command;
    console.log(`[mindone] Running: ${cmd} ${cmdArgs.join(' ')}`);
    
    const child = spawn(cmd, cmdArgs, {
      stdio: 'inherit',
      shell: true,
    });

    child.on('exit', (code) => {
      process.exit(code || 0);
    });

    child.on('error', (error) => {
      console.error(`[mindone] Error running command:`, error);
      process.exit(1);
    });

  } catch (error) {
    console.error(`[mindone] Error:`, error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}


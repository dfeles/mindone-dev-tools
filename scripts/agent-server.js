#!/usr/bin/env node

/**
 * Mindone Agent Server
 * 
 * This server listens for HTTP requests from the DevOverlay and executes
 * agent commands (like cursor agent CLI) to automatically run agents.
 * 
 * This enables automatic agent execution instead of just opening prompts via deeplinks.
 */

const http = require('http');
const { spawn } = require('child_process');
const { execSync } = require('child_process');

const PORT = process.env.MINDONE_AGENT_PORT || 5567;
const AGENT_TYPE = process.env.MINDONE_AGENT_TYPE || 'cursor'; // 'cursor', 'claude', etc.

// Find cursor agent command
// Cursor has a built-in 'agent' command: cursor agent
function findCursorAgent() {
  // Method 1: Check if Cursor CLI is available (cursor agent command)
  try {
    execSync('which cursor', { stdio: 'ignore' });
    // Verify cursor agent command works
    try {
      execSync('cursor agent --help', { stdio: 'ignore', timeout: 3000 });
      return 'cursor-agent';
    } catch (e) {
      // Cursor exists but agent command might not be available
      return 'cursor-agent'; // Try anyway
    }
  } catch (e) {
    // Cursor CLI not found
    return null;
  }
}

// Check if agent is available
// We're lenient here - even if detection fails, we'll try npx on execution
function checkAgentAvailable() {
  if (AGENT_TYPE === 'cursor') {
    const found = findCursorAgent();
    // Always return true if we have a method (even npx fallback)
    // npx will handle finding or downloading cursor-agent
    return found !== null;
  }
  return false;
}

// Execute agent command with streaming updates
function executeAgentWithStream(prompt, options = {}, onUpdate) {
  return new Promise((resolve, reject) => {
    if (AGENT_TYPE === 'cursor') {
      // Find the cursor agent command
      const agentCommand = findCursorAgent();
      
      if (!agentCommand) {
        reject(new Error('Cursor CLI not found. Make sure Cursor is installed and the cursor command is in your PATH'));
        return;
      }

      // Build cursor agent command arguments
      const cursorAgentArgs = [
        '--print',
        '--output-format',
        'stream-json',
        '--force',
      ];

      // Add optional model
      if (options.model) {
        cursorAgentArgs.push('--model', options.model);
      }

      // Add workspace (defaults to current working directory)
      if (options.workspacePath) {
        cursorAgentArgs.push('--workspace', options.workspacePath);
      } else {
        cursorAgentArgs.push('--workspace', process.cwd());
      }

      // Determine command and args based on how we found cursor-agent
      let command;
      let args;
      
      if (agentCommand === 'npx') {
        // Use npx to run cursor-agent (works with local or global install)
        command = 'npx';
        args = ['--yes', 'cursor-agent', ...cursorAgentArgs];
        console.log(`[mindone-agent] Using npx to run cursor-agent (works with local or global install)`);
      } else {
        // Direct command (global install in PATH - faster)
        command = 'cursor';
        args = ['agent', ...cursorAgentArgs];
        console.log(`[mindone-agent] Using cursor agent from PATH (global install)`);
      }

      console.log(`[mindone-agent] Executing: ${command} ${args.join(' ')}`);
      console.log(`[mindone-agent] Prompt length: ${prompt.length} characters`);

      // Spawn cursor-agent process
      // KEY: Pass prompt via stdin, not command-line arguments (avoids shell escaping issues)
      const cursorProcess = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'], // stdin, stdout, stderr
        env: { ...process.env },
      });

      let stdoutBuffer = '';
      let stderrBuffer = '';

      // Handle stdout (stream-json output)
      cursorProcess.stdout.on('data', (chunk) => {
        const data = chunk.toString();
        stdoutBuffer += data;
        // Parse and emit stream events
        const lines = data.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            try {
              const event = JSON.parse(trimmed);
              
              // Emit update based on event type
              if (event.type === 'system' && event.subtype === 'init') {
                onUpdate({ type: 'status', message: 'Initializing agent...' });
              } else if (event.type === 'thinking') {
                // Capture thinking text if available
                const thinkingText = event.content || event.text || event.message || '';
                if (event.subtype === 'completed' || thinkingText) {
                  onUpdate({ 
                    type: 'status', 
                    message: 'Thinking...',
                    detail: thinkingText ? thinkingText.substring(0, 150) : undefined
                  });
                }
              } else if (event.type === 'assistant' && event.message) {
                const text = event.message.content
                  ?.filter(block => block.type === 'text')
                  .map(block => block.text)
                  .join(' ') || '';
                if (text) {
                  onUpdate({ type: 'status', message: 'Agent working...', detail: text.substring(0, 150) });
                }
              } else if (event.type === 'result') {
                if (event.subtype === 'success') {
                  onUpdate({ type: 'status', message: 'Completed successfully!', detail: event.result });
                } else if (event.subtype === 'error' || event.is_error) {
                  onUpdate({ type: 'error', message: event.result || 'Unknown error' });
                } else {
                  onUpdate({ type: 'status', message: 'Task finished' });
                }
              }
            } catch (e) {
              // Not JSON, ignore
            }
          }
        }
      });

      // Handle stderr
      cursorProcess.stderr.on('data', (chunk) => {
        const data = chunk.toString();
        stderrBuffer += data;
        onUpdate({ type: 'status', message: 'Processing...', detail: data.substring(0, 200) });
      });

      // Write prompt to stdin (this is the key - no shell escaping needed!)
      cursorProcess.stdin.write(prompt);
      cursorProcess.stdin.end();

      // Handle process completion
      cursorProcess.on('close', (code) => {
        if (code === 0 || cursorProcess.killed) {
          console.log(`[mindone-agent] Agent execution completed successfully`);
          resolve({ success: true, code, stdout: stdoutBuffer, stderr: stderrBuffer });
        } else {
          console.error(`[mindone-agent] Agent execution failed with code ${code}`);
          const errorMsg = stderrBuffer.substring(0, 500);
          
          // Provide helpful error messages for common issues
          if (errorMsg.includes('Authentication required') || errorMsg.includes('CURSOR_API_KEY')) {
            reject(new Error(`Authentication required. Set CURSOR_API_KEY env var or run: cursor agent login. Run: npm run setup-check for help.`));
          } else {
            reject(new Error(`cursor agent exited with code ${code}. ${errorMsg}`));
          }
        }
      });

      cursorProcess.on('error', (error) => {
        console.error(`[mindone-agent] Error spawning cursor agent:`, error);
        // If cursor command is not found, provide helpful error
        if (error.code === 'ENOENT') {
          reject(new Error(`Cursor CLI not found. Make sure Cursor is installed and 'cursor' command is in your PATH. Run: npm run setup-check`));
        } else {
          reject(error);
        }
      });
    } else {
      reject(new Error(`Unsupported agent type: ${AGENT_TYPE}`));
      return;
    }
  });
}

// Execute agent command (legacy, non-streaming)
function executeAgent(prompt, options = {}) {
  return new Promise((resolve, reject) => {
    if (AGENT_TYPE === 'cursor') {
      // Find the cursor agent command
      const agentCommand = findCursorAgent();
      
      if (!agentCommand) {
        reject(new Error('Cursor CLI not found. Make sure Cursor is installed and the cursor command is in your PATH'));
        return;
      }

      // Build cursor agent command arguments
      const cursorAgentArgs = [
        '--print',
        '--output-format',
        'stream-json',
        '--force',
      ];

      // Add optional model
      if (options.model) {
        cursorAgentArgs.push('--model', options.model);
      }

      // Add workspace (defaults to current working directory)
      if (options.workspacePath) {
        cursorAgentArgs.push('--workspace', options.workspacePath);
      } else {
        cursorAgentArgs.push('--workspace', process.cwd());
      }

      // Use Cursor's built-in agent command
      const command = 'cursor';
      const args = ['agent', ...cursorAgentArgs];
      console.log(`[mindone-agent] Using Cursor's built-in agent command`);

      console.log(`[mindone-agent] Executing: ${command} ${args.join(' ')}`);
      console.log(`[mindone-agent] Prompt length: ${prompt.length} chars`);

      // Spawn cursor-agent process
      // KEY: Pass prompt via stdin, not command-line arguments (avoids shell escaping issues)
      const cursorProcess = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'], // stdin, stdout, stderr
        env: { ...process.env },
      });

      let stdoutBuffer = '';
      let stderrBuffer = '';

      // Handle stdout (stream-json output)
      cursorProcess.stdout.on('data', (chunk) => {
        const data = chunk.toString();
        stdoutBuffer += data;
        // Parse and log stream events
        const lines = data.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            try {
              const event = JSON.parse(trimmed);
              if (event.type === 'result') {
                if (event.subtype === 'success') {
                  console.log(`[mindone-agent] ✓ Success: ${event.result || 'Task completed'}`);
                } else if (event.subtype === 'error' || event.is_error) {
                  console.error(`[mindone-agent] ✗ Error: ${event.result || 'Unknown error'}`);
                }
              } else if (event.type === 'assistant' && event.message) {
                // Log assistant messages
                const text = event.message.content
                  ?.filter(block => block.type === 'text')
                  .map(block => block.text)
                  .join(' ') || '';
                if (text) {
                  console.log(`[mindone-agent] Assistant: ${text.substring(0, 100)}...`);
                }
              }
            } catch (e) {
              // Not JSON, ignore
            }
          }
        }
      });

      // Handle stderr
      cursorProcess.stderr.on('data', (chunk) => {
        const data = chunk.toString();
        stderrBuffer += data;
        console.error(`[mindone-agent] stderr:`, data);
      });

      // Write prompt to stdin (this is the key - no shell escaping needed!)
      cursorProcess.stdin.write(prompt);
      cursorProcess.stdin.end();

      // Handle process completion
      cursorProcess.on('close', (code) => {
        if (code === 0 || cursorProcess.killed) {
          console.log(`[mindone-agent] Agent execution completed successfully`);
          resolve({ success: true, code, stdout: stdoutBuffer, stderr: stderrBuffer });
        } else {
          console.error(`[mindone-agent] Agent execution failed with code ${code}`);
          const errorMsg = stderrBuffer.substring(0, 500);
          
          // Provide helpful error messages for common issues
          if (errorMsg.includes('Authentication required') || errorMsg.includes('CURSOR_API_KEY')) {
            reject(new Error(`Authentication required. Set CURSOR_API_KEY env var or run: cursor agent login. Run: npm run setup-check for help.`));
          } else {
            reject(new Error(`cursor agent exited with code ${code}. ${errorMsg}`));
          }
        }
      });

      cursorProcess.on('error', (error) => {
        console.error(`[mindone-agent] Error spawning cursor agent:`, error);
        // If cursor command is not found, provide helpful error
        if (error.code === 'ENOENT') {
          reject(new Error(`Cursor CLI not found. Make sure Cursor is installed and 'cursor' command is in your PATH. Run: npm run setup-check`));
        } else {
          reject(error);
        }
      });
    } else {
      reject(new Error(`Unsupported agent type: ${AGENT_TYPE}`));
      return;
    }
  });
}

// Create HTTP server
const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Parse URL to handle query strings
  // Extract pathname and query params manually if URL parsing fails
  let pathname = req.url;
  let searchParams = new URLSearchParams();
  try {
    const host = req.headers.host || 'localhost';
    const url = new URL(req.url, `http://${host}`);
    pathname = url.pathname;
    searchParams = url.searchParams;
  } catch (e) {
    // Fallback: extract pathname and query params manually
    const questionMark = req.url.indexOf('?');
    if (questionMark >= 0) {
      pathname = req.url.substring(0, questionMark);
      const queryString = req.url.substring(questionMark + 1);
      searchParams = new URLSearchParams(queryString);
    } else {
      pathname = req.url;
    }
  }

  if (req.method === 'POST' && pathname === '/execute') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { prompt, workspacePath } = data;

        if (!prompt) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing prompt parameter' }));
          return;
        }

        // Check if client wants SSE streaming (via query param or header)
        const acceptHeader = req.headers.accept || '';
        const wantsStreaming = searchParams.get('stream') === 'true' || acceptHeader.includes('text/event-stream');

        if (wantsStreaming) {
          // Stream updates via Server-Sent Events
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Accept',
          });

          // Send initial status
          res.write(`data: ${JSON.stringify({ type: 'status', message: 'Starting agent...' })}\n\n`);

          // Execute agent and stream updates
          executeAgentWithStream(prompt, { workspacePath }, (update) => {
            try {
              res.write(`data: ${JSON.stringify(update)}\n\n`);
            } catch (e) {
              // Client disconnected, stop sending
            }
          })
            .then((result) => {
              res.write(`data: ${JSON.stringify({ type: 'done', success: true, ...result })}\n\n`);
              res.end();
            })
            .catch((error) => {
              res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
              res.end();
            });
        } else {
          // Legacy: Execute agent asynchronously (don't wait for completion)
          console.log(`[mindone-agent] Received prompt request`);
          
          executeAgent(prompt, { workspacePath })
            .then(() => {
              console.log(`[mindone-agent] Agent execution completed`);
            })
            .catch((error) => {
              console.error(`[mindone-agent] Agent execution error:`, error.message);
            });

          // Return immediately (don't wait for agent to finish)
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            message: 'Agent execution started',
            agentType: AGENT_TYPE
          }));
        }

      } catch (error) {
        console.error(`[mindone-agent] Error processing request:`, error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  } else if (req.method === 'GET' && pathname === '/health') {
    const agentAvailable = checkAgentAvailable();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok',
      agentType: AGENT_TYPE,
      agentAvailable,
      port: PORT
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found', path: pathname }));
  }
});

server.listen(PORT, () => {
  console.log(`[mindone-agent] ========================================`);
  console.log(`[mindone-agent] Server running on port ${PORT}`);
  console.log(`[mindone-agent] Agent type: ${AGENT_TYPE}`);
  
  if (AGENT_TYPE === 'cursor') {
    const agentCommand = findCursorAgent();
    if (agentCommand) {
      console.log(`[mindone-agent] Agent method: cursor agent (Cursor's built-in CLI)`);
      console.log(`[mindone-agent] Status: Ready (will execute agents automatically)`);
      console.log(`[mindone-agent] Note: Prompts are sent via stdin to cursor agent`);
    } else {
      console.warn(`[mindone-agent] Warning: Cursor CLI not found`);
      console.warn(`[mindone-agent] Make sure Cursor is installed and 'cursor' command is in your PATH`);
      console.warn(`[mindone-agent] On macOS, Cursor CLI should be available after installing Cursor app`);
    }
  }
  console.log(`[mindone-agent] ========================================`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log(`[mindone-agent] Shutting down server...`);
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log(`[mindone-agent] Shutting down server...`);
  server.close(() => {
    process.exit(0);
  });
});


/**
 * Mindone Agent Client
 * 
 * Browser-side script that connects to the agent server
 * Load this in your HTML to enable agent mode
 */

(function(window) {
  'use strict';

  const AGENT_SERVER_URL = window.MINDONE_AGENT_SERVER_URL || 'http://localhost:5567';
  const WORKSPACE_PATH = window.MINDONE_WORKSPACE_PATH || null;

  // Check if agent server is available
  async function checkAgentServer() {
    try {
      const response = await fetch(`${AGENT_SERVER_URL}/health`);
      if (response.ok) {
        const data = await response.json();
        return data.agentAvailable !== false;
      }
    } catch (error) {
      // Server not available
      return false;
    }
    return false;
  }

  // Send prompt to agent server
  async function sendToAgentServer(prompt, workspacePath = null) {
    try {
      const response = await fetch(`${AGENT_SERVER_URL}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          workspacePath: workspacePath || WORKSPACE_PATH,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[mindone] Agent server error:', error);
        return false;
      }

      const result = await response.json();
      console.log('[mindone] Agent execution started:', result);
      return true;
    } catch (error) {
      console.error('[mindone] Failed to send to agent server:', error);
      return false;
    }
  }

  // Expose API to window for DevOverlay to use
  window.mindoneAgent = {
    checkServer: checkAgentServer,
    sendPrompt: sendToAgentServer,
    serverUrl: AGENT_SERVER_URL,
  };

  // Auto-check server on load
  if (typeof window !== 'undefined') {
    checkAgentServer().then(available => {
      if (available) {
        console.log('[mindone] Agent server is available');
      } else {
        console.warn('[mindone] Agent server not available. Start it with: npm run agent-server');
      }
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);


# Mindone Test App

Simple test application for testing the mindone DevOverlay component locally.

## Setup

```bash
cd test-app
pnpm install
# or
npm install
```

## Run

### Standard Mode (Deeplink)

```bash
pnpm dev
# or
npm run dev
```

Then open http://localhost:5173 in your browser.

### Agent Mode (Automatic Agent Execution)

To test agent mode, you need to run both the agent server and the dev server:

**Option 1: Run both together**
```bash
npm run dev:agent
```

**Option 2: Run separately (in two terminals)**
```bash
# Terminal 1: Start agent server
npm run agent-server

# Terminal 2: Start dev server
npm run dev
```

**Prerequisites for Agent Mode:**
- Install cursor-agent CLI: `npm install -g cursor-agent`
- The agent server will run on port 5567 (configurable via `MINDONE_AGENT_PORT`)

## Testing

1. **Hold Alt** - The dev overlay should appear
2. **Hover over elements** - You should see component info (name, tag, classes, file path)
3. **Click on elements** - Opens compose mode to create prompts
4. **Agent Mode Toggle** - Use the checkbox in the "Agent Mode Settings" card to enable/disable agent mode
5. **Release Alt** - Overlay should disappear

### Agent Mode Features

- **Toggle Agent Mode**: Check the "Enable Agent Mode" checkbox in the test app
- **Server Status**: The UI shows whether the agent server is running and available
- **Automatic Execution**: When agent mode is enabled, prompts are sent to the agent server which automatically executes them
- **Fallback**: If the agent server is unavailable, it automatically falls back to deeplink mode

The test app includes various components and nested elements to test the overlay functionality.


# mindone

A React development overlay that shows component information and allows you to create prompts for Cursor AI or open files directly in your editor (Cursor/VS Code). Hold **Alt** to show, release to hide.

## Quick Start

```bash
# 1. Install
npm install mindone

# 2. Check setup (optional - runs automatically after install)
npm run setup-check

# 3. Authenticate with Cursor (one-time)
export CURSOR_API_KEY=your_api_key
# Or: cursor agent login

# 4. Start agent server (in a separate terminal)
npm run agent-server

# 5. Use in your app
import { DevOverlay } from 'mindone'
<DevOverlay agentMode={true} />
```

<img src="https://github.com/dfeles/mindone-dev-tools/raw/main/makeItPop.gif" alt="mindone demo" width="520" />

## Features

- **Component Inspection** - Hover over elements to see component names, tags, classes, file paths, text content, and child counts
- **Cursor Compose Mode** - Click on elements to create structured prompts and send them directly to Cursor chat via deeplinks
- **Element Scope Selection** - Choose to apply changes to "only this element" or "all similar elements"
- **Open in Editor** - Click file paths to open source files in Cursor or VS Code at specific lines
- **Keyboard Shortcuts** - Hold `Alt` to show overlay, release to hide. Press `Escape` to close

## Future Plans

This is the first tool in a suite of development utilities. Additional tools and integrations will be added over time to enhance the development workflow.

## Installation

```bash
npm install mindone
# or
pnpm add mindone
# or
yarn add mindone
```

## Usage

### Basic Usage

```jsx
import { DevOverlay } from 'mindone'

function App() {
  return (
    <>
      <DevOverlay />
      {/* Your app content */}
    </>
  )
}
```

### With Options

```jsx
import { DevOverlay } from 'mindone'

function App() {
  return (
    <>
      <DevOverlay 
        editorProtocol="cursor" // or "vscode"
        workspacePath="/path/to/your/project"
        position="bottom-left" // or "top-right", "top-left", "bottom-right"
        showOnAlt={true}
      />
      {/* Your app content */}
    </>
  )
}
```

### Agent Mode (Automatic Agent Execution)

Mindone can automatically execute agents instead of just opening prompts. This enables a workflow where you select a UI element and the agent automatically runs to make changes.

**Setup:**

### Automatic Server Setup (Recommended)

The server can start automatically with your dev command:

**Add to your `package.json`:**
```json
{
  "scripts": {
    "dev": "npx mindone-agent-server@latest && npm run dev"
  }
}
```

Or with other commands:
```json
{
  "scripts": {
    "dev": "npx mindone-agent-server@latest && next dev",
    "start": "npx mindone-agent-server@latest && vite"
  }
}
```

The `&&` runs your dev command after the server starts.

### Client Setup

**Option A: Using Script tags** (any framework):
```html
<script src="//unpkg.com/mindone/dist/client-agent.global.js"></script>
```

**Option B: Using Next.js Script component:**
```jsx
import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/mindone/dist/client-agent.global.js"
            strategy="lazyOnload"
          />
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### Manual Setup (Alternative)

1. **Authenticate with Cursor** (one-time):
   ```bash
   export CURSOR_API_KEY=your_api_key
   # Or: cursor agent login
   ```

2. **Start server manually**:
   ```bash
   npm run agent-server
   ```

3. **Enable agent mode** in your component:
   ```jsx
   import { DevOverlay } from 'mindone'

   function App() {
     return (
       <>
         <DevOverlay 
           agentMode={true}
           agentServerUrl="http://localhost:5567"
           workspacePath="/path/to/your/project"
         />
         {/* Your app content */}
       </>
     )
   }
   ```

**How it works:**
- When `agentMode={true}`, mindone sends prompts to a local HTTP server instead of using deeplinks
- The server executes the agent CLI (e.g., `cursor-agent`) with your prompt
- The agent runs automatically - no need to manually copy/paste or open Cursor chat
- If the agent server is unavailable, it automatically falls back to deeplink mode

**Environment variables:**
- `MINDONE_AGENT_PORT` - Port for the agent server (default: 5567)
- `MINDONE_AGENT_TYPE` - Agent type: 'cursor', 'claude', etc. (default: 'cursor')

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `editorProtocol` | `'cursor' \| 'vscode'` | `'cursor'` | Which editor protocol to use |
| `workspacePath` | `string` | `null` | Workspace path for fallback file opening |
| `showOnAlt` | `boolean` | `true` | Whether to show overlay on Alt key press |
| `position` | `'top-right' \| 'top-left' \| 'bottom-right' \| 'bottom-left'` | `'bottom-left'` | Position of the overlay |
| `agentMode` | `boolean` | `false` | If true, sends prompts to agent server instead of deeplink |
| `agentServerUrl` | `string` | `'http://localhost:5567'` | URL of the agent server |

## Requirements

- React 16.8+ (uses hooks)

## How It Works

1. **Hold Alt** - Shows the dev overlay while held down
2. **Release Alt** - Hides the overlay (unless locked in compose mode)
3. **Hover over elements** - See component name, tag, classes, file path, text content, and child count
4. **Click on an element** - Enters compose mode to create a prompt for Cursor AI
5. **Compose Mode** - Add an optional message, choose scope (only this element or all elements), then send to Cursor chat
6. **Click file path** - Opens the file in your editor at the specific line
7. **Press Escape** - Closes the overlay or exits compose mode

The overlay automatically detects if you're in production and won't render. When in compose mode, the selection is locked so you don't need to keep holding Alt.

## Prompt Generation

When you click on an element and compose a prompt, mindone generates a structured JSON prompt that includes:
- Component name
- File path and line number
- CSS classes (if any)
- Text content or element count

You can add a custom message at the beginning of the prompt, and choose whether to apply changes to only the selected element or all similar elements. 

**By default**, the prompt is sent directly to Cursor chat via deeplink. With **agent mode** enabled, the prompt is sent to a local server that automatically executes the agent CLI, enabling fully automated agent workflows.

## License

MIT


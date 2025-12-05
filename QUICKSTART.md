# Mindone Quick Start Guide

## For Users (Using the Package)

### 1. Install
```bash
npm install mindone
```

### 2. Authenticate with Cursor (One-time)
```bash
# Option A: Set API key (recommended)
export CURSOR_API_KEY=your_api_key
# Add to ~/.zshrc or ~/.bashrc to make permanent

# Option B: Login via CLI
cursor agent login
```

### 3. Start Agent Server
```bash
# In your project root
npm run agent-server
# Or if mindone is installed locally:
npx mindone-agent-server
```

### 4. Use in Your App
```jsx
import { DevOverlay } from 'mindone'

function App() {
  return (
    <>
      <DevOverlay 
        agentMode={true}
        agentServerUrl="http://localhost:5567"
      />
      {/* Your app */}
    </>
  )
}
```

### 5. Verify Setup (Optional)
```bash
npm run setup-check
```

## Troubleshooting

**"Cursor CLI not found"**
- Make sure Cursor app is installed
- Verify: `cursor --help` works
- On macOS, Cursor CLI should be available automatically

**"Authentication required"**
- Set `CURSOR_API_KEY` environment variable
- Or run: `cursor agent login`
- Check: `npm run setup-check`

**"Agent server not responding"**
- Make sure server is running: `npm run agent-server`
- Check port 5567 is not in use
- Verify in browser console for connection errors

## What Gets Checked Automatically

- ✅ Cursor CLI availability
- ✅ Authentication status
- ✅ Server startup
- ✅ Port availability

No manual configuration needed - just authenticate once and you're ready!


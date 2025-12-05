import { useState } from 'react'
import { DevOverlay } from 'mindone'
import './App.css'

function Button({ children, onClick }) {
  return (
    <button className="test-button" onClick={onClick}>
      {children}
    </button>
  )
}

function Card({ title, children }) {
  return (
    <div className="test-card">
      <h3>{title}</h3>
      {children}
    </div>
  )
}

function App() {
  const [count, setCount] = useState(0)
  const [message, setMessage] = useState('Hello from Mindone!')
  
  // Agent mode is always enabled in test app
  const agentMode = true

  return (
    <>
      <DevOverlay 
        agentMode={agentMode}
        agentServerUrl="http://localhost:5567"
        workspacePath={import.meta.env.VITE_WORKSPACE_PATH || null}
      />
      <div className="app">
        <header>
          <h1>Mindone Test App</h1>
          <p>
            Hold <strong className="alt-key">Alt ⌥</strong> to show the dev overlay, then hover over elements!
          </p>
        </header>

        <main>
          <Card title="Agent Mode">
            <p style={{ fontSize: '12px', marginTop: '8px', opacity: 0.7 }}>
              Cursor Agent mode is enabled. Prompts will be sent to the agent server for automatic execution.
            </p>
            <p style={{ fontSize: '11px', marginTop: '4px', opacity: 0.6 }}>
              Make sure the agent server is running: <code>npm run agent-server</code>
            </p>
          </Card>

          <Card title="Counter Example">
            <p style={count === 0 ? { fontSize: '0.875rem' } : {}}>Count: {count}</p>
            <br />
            <Button onClick={() => setCount(count + 1)}>Increment</Button>
            <Button onClick={() => setCount(0)}>Reset</Button>
          </Card>

          <Card title="Input Example">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type something..."
            />
            <p>You typed: {message}</p>
          </Card>

          <Card title="List Example">
            <ul>
              <li>First item</li>
              <li>bananas</li>
              <li>Third item</li>
            </ul>
          </Card>

          <Card title="Nested Component">
            <div className="nested">
              <div className="deeply-nested">
                <p>This is a deeply nested element</p>
                <Button>Nested Button</Button>
              </div>
            </div>
          </Card>
        </main>

        <footer>
          <p>Click on any element while holding Alt to create a prompt!</p>
          <p style={{ fontSize: '12px', marginTop: '8px', opacity: 0.7 }}>
            With Cursor Agent mode enabled, prompts will automatically execute via the agent server.
          </p>
        </footer>
      </div>
    </>
  )
}

export default App


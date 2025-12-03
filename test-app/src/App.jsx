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

  return (
    <>
      <DevOverlay />
      <div className="app">
        <header>
          <h1>Mindone Test App</h1>
          <p>
            Hold <strong className="holographic">Alt ⌥</strong> to show the dev overlay, then hover over elements!
          </p>
        </header>

        <main>
          <Card title="Counter Example">
            <p>Count: {count}</p>
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
          <p>Click on any element while holding Alt to open it in your editor!</p>
        </footer>
      </div>
    </>
  )
}

export default App


# mindone

A React development overlay that shows component information and allows you to create prompts for Cursor AI or open files directly in your editor (Cursor/VS Code). Hold **Alt** to show, release to hide.

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

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `editorProtocol` | `'cursor' \| 'vscode'` | `'cursor'` | Which editor protocol to use |
| `workspacePath` | `string` | `null` | Workspace path for fallback file opening |
| `showOnAlt` | `boolean` | `true` | Whether to show overlay on Alt key press |
| `position` | `'top-right' \| 'top-left' \| 'bottom-right' \| 'bottom-left'` | `'bottom-left'` | Position of the overlay |

## Requirements

- React 16.8+ (uses hooks)
- No additional dependencies required - includes all CSS

## Bundler Compatibility

- **Vite, Next.js, Parcel, etc.** - Works out of the box, no configuration needed
- **Create React App** - Requires adding mindone to your webpack transpilation includes. If using `craco`, add this to your `craco.config.js`:

```js
// In craco.config.js webpack.configure function:
const babelLoaderRule = webpackConfig.module.rules
  .find(rule => rule.oneOf)?.oneOf
  .find(rule => rule.test?.toString().includes('jsx'));

if (babelLoaderRule) {
  const mindonePath = path.resolve(__dirname, 'node_modules/mindone/src');
  if (Array.isArray(babelLoaderRule.include)) {
    babelLoaderRule.include.push(mindonePath);
  } else {
    babelLoaderRule.include = [babelLoaderRule.include, mindonePath];
  }
}
```

## How It Works

1. **Hold Alt** - Shows the dev overlay while held down
2. **Release Alt** - Hides the overlay (unless locked in compose mode)
3. **Hover over elements** - See component name, tag, classes, file path, text content, and child count
4. **Click on an element** - Enters compose mode to create a prompt for Cursor AI
5. **Compose Mode** - Add an optional message, choose scope (only this element or all elements), then send to Cursor chat
6. **Click file path** - Opens the file in your editor at the specific line
7. **Press Escape** - Closes the overlay or exits compose mode

The overlay automatically detects if you're in production and won't render. When in compose mode, the selection is locked so you don't need to keep holding Alt.

## Editor Protocol

The component uses URL schemes to interact with editors:
- **File Opening**: `cursor://file/path/to/file.jsx:10` for Cursor, `vscode://file/path/to/file.jsx:10` for VS Code
- **Cursor AI Prompts**: `cursor://anysphere.cursor-deeplink/prompt?text=...` for sending structured prompts to Cursor chat

If you set `editorProtocol="cursor"`, it will try `cursor://` first, then fall back to `vscode://` if that doesn't work (since Cursor is VS Code-based and supports both).

## Prompt Generation

When you click on an element and compose a prompt, mindone generates a structured JSON prompt that includes:
- Component name
- File path and line number
- CSS classes (if any)
- Text content or element count

You can add a custom message at the beginning of the prompt, and choose whether to apply changes to only the selected element or all similar elements. The prompt is sent directly to Cursor chat via deeplink.

## License

MIT


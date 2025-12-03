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

```bash
pnpm dev
# or
npm run dev
```

Then open http://localhost:5173 in your browser.

## Testing

1. **Hold Alt** - The dev overlay should appear
2. **Hover over elements** - You should see component info (name, tag, classes, file path)
3. **Click on elements** - Should open the file in your editor (Cursor/VS Code)
4. **Release Alt** - Overlay should disappear

The test app includes various components and nested elements to test the overlay functionality.


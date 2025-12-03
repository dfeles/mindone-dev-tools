# Setup Instructions

## For Local Development (Using the package locally)

### Option 1: Using pnpm/npm link

```bash
cd mindone
pnpm link  # or npm link
cd ../feels
pnpm link mindone  # or npm link mindone
```

Then in your project:
```jsx
import { DevOverlay } from 'mindone'
```

### Option 2: Using file path (current setup)

In your project's `package.json`, add:
```json
{
  "dependencies": {
    "mindone": "file:../mindone"
  }
}
```

Then run:
```bash
pnpm install  # or npm install
```

### Option 3: Direct import (for quick testing)

```jsx
import { DevOverlay } from '../../mindone/src'
```

## Publishing to npm

1. Update version in `package.json`
2. Make sure you're logged in: `npm login`
3. Publish: `npm publish`

## After Publishing

Users can install with:
```bash
npm install mindone
# or
pnpm add mindone
# or
yarn add mindone
```

Then use:
```jsx
import { DevOverlay } from 'mindone'
```


# Publishing mindone to npm

## Step 1: Create npm account (if you don't have one)
Go to https://www.npmjs.com/signup and create an account.

## Step 2: Login to npm
```bash
cd mindone
npm login
```
Enter your username, password, and email when prompted.

## Step 3: Check package name availability
```bash
npm view mindone
```
If it says "404 Not Found", the name is available. If it shows package info, the name is taken and you'll need to:
- Use a scoped name: `@yourusername/mindone`
- Or choose a different name

## Step 4: Update package.json (optional but recommended)
Add your author info and repository URL:
```json
{
  "author": "Your Name <your.email@example.com>",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/mindone.git"
  }
}
```

## Step 5: Test the package locally (optional)
```bash
npm pack
```
This creates a `.tgz` file you can test installing locally.

## Step 6: Publish!
```bash
npm publish
```

## Step 7: Verify
Check your package on npm:
https://www.npmjs.com/package/mindone

## Updating the package

After making changes:

1. Update version in `package.json`:
   - Patch: `1.0.0` → `1.0.1` (bug fixes)
   - Minor: `1.0.0` → `1.1.0` (new features)
   - Major: `1.0.0` → `2.0.0` (breaking changes)

2. Or use npm version commands:
   ```bash
   npm version patch  # 1.0.0 → 1.0.1
   npm version minor  # 1.0.0 → 1.1.0
   npm version major  # 1.0.0 → 2.0.0
   ```

3. Publish again:
   ```bash
   npm publish
   ```

## Troubleshooting

### "Package name already exists"
- The name `mindone` might be taken
- Use a scoped name: `@yourusername/mindone`
- Update package.json: `"name": "@yourusername/mindone"`
- Publish with: `npm publish --access public` (for scoped packages)

### "You must verify your email"
- Check your email and verify your npm account

### "Incorrect password"
- Make sure you're using the correct npm account
- Try `npm logout` then `npm login` again


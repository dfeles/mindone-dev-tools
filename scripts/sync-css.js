import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Read the CSS file
const cssPath = resolve(__dirname, '../src/DevOverlay.css')
const cssContent = readFileSync(cssPath, 'utf-8')

// Generate the styles.js file
const stylesJsContent = `// Auto-inject CSS styles when this module is loaded
// This file is auto-generated from DevOverlay.css - do not edit manually
const CSS_CONTENT = ${JSON.stringify(cssContent)}

// Inject styles when module loads
if (typeof document !== 'undefined') {
  const styleId = 'mindone-styles'
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = CSS_CONTENT
    document.head.appendChild(style)
  }
}
`

// Write the styles.js file
const stylesJsPath = resolve(__dirname, '../src/styles.js')
writeFileSync(stylesJsPath, stylesJsContent, 'utf-8')

console.log('✓ Synced DevOverlay.css to styles.js')



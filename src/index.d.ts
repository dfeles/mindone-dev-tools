import { FC } from 'react'

export interface DevOverlayProps {
  /**
   * Editor protocol to use ('cursor' or 'vscode')
   * @default 'cursor'
   */
  editorProtocol?: 'cursor' | 'vscode'
  
  /**
   * Workspace path for fallback file opening
   */
  workspacePath?: string
  
  /**
   * Whether to show overlay on Alt key press
   * @default true
   */
  showOnAlt?: boolean
  
  /**
   * Position of the overlay
   * @default 'top-right'
   */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}

declare const DevOverlay: FC<DevOverlayProps>

export default DevOverlay


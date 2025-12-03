import { useState, useEffect, useRef } from 'react'

// Simple icon components
const XIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
)

const MessageSquareIcon = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
)

const SendIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
)

const ChevronDownIcon = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
)

function DevOverlay({ 
  editorProtocol = 'cursor', // 'cursor' or 'vscode'
  workspacePath = null,
  showOnAlt = true,
  position = 'bottom-left' // 'top-right', 'top-left', 'bottom-right', 'bottom-left'
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredElement, setHoveredElement] = useState(null)
  const [selectedElement, setSelectedElement] = useState(null) // The DOM element shown in dev overlay
  const [labelPosition, setLabelPosition] = useState(null)
  const [deeplinkCopied, setDeeplinkCopied] = useState(false)
  const [isComposing, setIsComposing] = useState(false) // Whether the label is in input mode
  const [composeText, setComposeText] = useState('') // User's input text
  const [elementScope, setElementScope] = useState('only-this-element') // 'only-this-element' or 'all-elements'
  const [isDropdownOpen, setIsDropdownOpen] = useState(false) // Whether the dropdown is open
  const [isLocked, setIsLocked] = useState(false) // Whether selection is locked (no need to hold Alt)
  const [isMessageHovered, setIsMessageHovered] = useState(false) // Whether the message icon is hovered
  const isOpenRef = useRef(isOpen)
  const highlightedElementRef = useRef(null)
  const mousePositionRef = useRef({ x: 0, y: 0 })
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)
  
  // Helper function to filter out 'mindone-highlighted' from className
  const filterClassName = (className) => {
    if (!className) return ''
    return className.split(' ').filter(cls => cls !== 'mindone-highlighted').join(' ').trim() || ''
  }
  
  // Keep ref in sync with state
  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])
  
  // Remove highlight when overlay closes
  useEffect(() => {
    if (!isOpen && !isLocked && highlightedElementRef.current) {
      highlightedElementRef.current.classList.remove('mindone-highlighted')
      highlightedElementRef.current = null
      setLabelPosition(null)
      setIsComposing(false)
      setComposeText('')
      setIsMessageHovered(false)
    }
  }, [isOpen, isLocked])

  // Focus input when entering compose mode
  useEffect(() => {
    if (isComposing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isComposing])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isDropdownOpen])

  // Ensure the selected element always has the blue outline
  // The outline is tied to the element shown in the dev overlay, not the mouse position
  useEffect(() => {
    if (!isOpen && !isLocked) return
    
    // Remove highlight from previous element
    if (highlightedElementRef.current && highlightedElementRef.current !== selectedElement) {
      highlightedElementRef.current.classList.remove('mindone-highlighted')
    }
    
    // Add highlight to selected element
    if (selectedElement) {
      selectedElement.classList.add('mindone-highlighted')
      highlightedElementRef.current = selectedElement
      
      // Update label position
      const rect = selectedElement.getBoundingClientRect()
      setLabelPosition({
        top: rect.bottom + 4,
        left: rect.left + 2,
        componentName: hoveredElement?.componentName || selectedElement.tagName.toLowerCase(),
        className: filterClassName(selectedElement.className || '')
      })
    } else {
      highlightedElementRef.current = null
      setLabelPosition(null)
    }
    
    // Set up periodic check to ensure highlight is maintained
    const interval = setInterval(() => {
      if (selectedElement && !selectedElement.classList.contains('mindone-highlighted')) {
        selectedElement.classList.add('mindone-highlighted')
      }
      // Update label position for scroll/resize
      if (selectedElement) {
        const rect = selectedElement.getBoundingClientRect()
        setLabelPosition(prev => {
          if (!prev) return null
          return {
            ...prev,
            top: rect.bottom + 4,
            left: rect.left + 2
          }
        })
      }
    }, 100)
    
    return () => clearInterval(interval)
  }, [isOpen, isLocked, selectedElement, hoveredElement])

  // Change cursor to pointer when Alt is down and something is selected
  useEffect(() => {
    if (isOpen && selectedElement) {
      document.body.classList.add('mindone-cursor-pointer')
    } else {
      document.body.classList.remove('mindone-cursor-pointer')
    }
    
    return () => {
      document.body.classList.remove('mindone-cursor-pointer')
    }
  }, [isOpen, selectedElement])

  useEffect(() => {
    // Only show in development
    if (typeof window !== 'undefined' && window.location?.hostname !== 'localhost' && window.location?.hostname !== '127.0.0.1') {
      // Check if we're in production build
      if (import.meta?.env?.PROD || process.env.NODE_ENV === 'production') {
        return
      }
    }

    let throttleTimeout = null
    let lastMouseMoveTime = 0
    const THROTTLE_MS = 100 // Throttle mousemove to every 100ms

    let isOpeningEditor = false // Flag to prevent infinite loop
    let hasOpenedEditor = false // Flag to ensure we only open once per click
    
    const handleKeyDown = (e) => {
      // Show overlay when Alt is pressed (and no other modifiers)
      if (showOnAlt && e.key === 'Alt' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault()
        setIsOpen(true)
        return
      }
      
      // Escape to close (if not composing, handle in handleInputKeyDown if composing)
      if (e.key === 'Escape' && isOpen && !isComposing) {
        if (isLocked) {
          // Deselect when locked
          setIsLocked(false)
          setIsComposing(false)
          setComposeText('')
          setIsMessageHovered(false)
          if (highlightedElementRef.current) {
            highlightedElementRef.current.classList.remove('mindone-highlighted')
            highlightedElementRef.current = null
          }
          setLabelPosition(null)
          setSelectedElement(null)
        }
        setIsOpen(false)
      }
    }
    
    const handleKeyUp = (e) => {
      // Hide overlay when Alt is released (unless locked in compose mode)
      if (showOnAlt && e.key === 'Alt' && isOpen && !isLocked) {
        e.preventDefault()
        setIsOpen(false)
      }
    }

    const handleMouseMove = (e) => {
      // Don't update selection when locked in compose mode
      if ((!isOpen && !isLocked) || isLocked) return
      
      // Store mouse position
      mousePositionRef.current = { x: e.clientX, y: e.clientY }
      
      // Get element at mouse position
      const elementAtPoint = document.elementFromPoint(e.clientX, e.clientY)
      
      // If hovering over label, keep current selectedElement
      if (elementAtPoint && elementAtPoint.closest('.mindone-selection-label')) {
        return
      }
      
      // If hovering over overlay panel, clear selection
      if (elementAtPoint && elementAtPoint.closest('.mindone-overlay')) {
        setSelectedElement(null)
        return
      }
      
      // Update selected element immediately for instant highlight feedback
      if (elementAtPoint && elementAtPoint !== selectedElement) {
        setSelectedElement(elementAtPoint)
      }
      
      // Throttle the info update (but not the selection)
      const now = Date.now()
      if (now - lastMouseMoveTime < THROTTLE_MS) {
        return
      }
      lastMouseMoveTime = now

      // Clear any pending timeout
      if (throttleTimeout) {
        clearTimeout(throttleTimeout)
      }

      throttleTimeout = setTimeout(() => {
        // Re-get element for info (in case mouse moved during delay)
        const currentElement = document.elementFromPoint(e.clientX, e.clientY)
        
        // If hovering over label, preserve current selection
        if (currentElement && currentElement.closest('.mindone-selection-label')) {
          return
        }
        
        if (!currentElement || currentElement.closest('.mindone-overlay')) {
          return
        }
        
        if (currentElement) {
          // Try to find React fiber node
          const reactKey = Object.keys(currentElement).find(key => 
            key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance')
          )
          
          if (reactKey) {
            const fiber = currentElement[reactKey]
            if (fiber) {
              let current = fiber
              let componentName = 'Unknown'
              let filePath = null
              
              // Walk up the fiber tree to find component info
              while (current) {
                if (current.type) {
                  if (typeof current.type === 'function') {
                    componentName = current.type.name || current.type.displayName || 'Anonymous'
                  } else if (typeof current.type === 'string') {
                    componentName = current.type
                  }
                }
                
                if (current._debugSource) {
                  filePath = `${current._debugSource.fileName}:${current._debugSource.lineNumber}`
                  break
                }
                
                current = current.return
              }
              
              // Extract and truncate text content (first 3 words)
              const textContent = currentElement.textContent?.trim() || ''
              const words = textContent.split(/\s+/).filter(w => w.length > 0)
              const truncatedText = words.slice(0, 3).join(' ') + (words.length > 3 ? '...' : '')
              
              // Count child elements
              const childCount = currentElement.children?.length || 0
              
              setHoveredElement({
                componentName,
                filePath,
                tagName: currentElement.tagName.toLowerCase(),
                className: filterClassName(currentElement.className || ''),
                id: currentElement.id || '',
                textContent: truncatedText,
                childCount,
                element: currentElement,
              })
              
              // Update label with component name if element is highlighted
              if (highlightedElementRef.current === currentElement) {
                const rect = currentElement.getBoundingClientRect()
                setLabelPosition({
                  top: rect.bottom + 4,
                  left: rect.left + 2,
                  componentName,
                  className: filterClassName(currentElement.className || '')
                })
              }
            }
          } else {
            // Extract and truncate text content (first 3 words)
            const textContent = currentElement.textContent?.trim() || ''
            const words = textContent.split(/\s+/).filter(w => w.length > 0)
            const truncatedText = words.slice(0, 3).join(' ') + (words.length > 3 ? '...' : '')
            
            // Count child elements
            const childCount = currentElement.children?.length || 0
            
            setHoveredElement({
              componentName: currentElement.tagName.toLowerCase(),
              tagName: currentElement.tagName.toLowerCase(),
              className: filterClassName(currentElement.className || ''),
              id: currentElement.id || '',
              textContent: truncatedText,
              childCount,
              element: currentElement,
            })
            
            // Update label if element is highlighted
            if (highlightedElementRef.current === currentElement) {
              const rect = currentElement.getBoundingClientRect()
              setLabelPosition({
                top: rect.bottom + 4,
                left: rect.left,
                componentName: currentElement.tagName.toLowerCase(),
                className: filterClassName(currentElement.className || '')
              })
            }
          }
        }
      }, 50) // Small delay to batch updates
    }

    const handleClick = (e) => {
      // Handle outside clicks when locked - deselect and unlock
      if (isLocked) {
        const clickedLabel = e.target.closest('.mindone-selection-label')
        const clickedOverlay = e.target.closest('.mindone-overlay')
        
        if (!clickedLabel && !clickedOverlay) {
          // Clicked outside - deselect
          setIsLocked(false)
          setIsComposing(false)
          setComposeText('')
          setIsMessageHovered(false)
          setIsOpen(false)
          if (highlightedElementRef.current) {
            highlightedElementRef.current.classList.remove('mindone-highlighted')
            highlightedElementRef.current = null
          }
          setLabelPosition(null)
          setSelectedElement(null)
          return
        }
      }
      
      // Don't handle clicks when in compose mode (only send button should work)
      if (isComposing) return
      
      // Always check current isOpen state using ref - don't rely on stale closure
      if (!isOpenRef.current || isOpeningEditor || hasOpenedEditor) return
      
      // Don't intercept clicks on the overlay itself
      if (e.target.closest('.mindone-overlay')) {
        return
      }
      
      // Don't intercept clicks on buttons (but allow links to be intercepted)
      if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
        return
      }
      
      // Don't intercept clicks on the label text that opens in editor
      if (e.target.closest('.mindone-open-in-editor')) {
        return
      }
      
      // For elements with file path, enter compose mode (default action)
      if (!hoveredElement?.filePath) {
        return
      }
      
      e.preventDefault()
      e.stopPropagation()
      
      // Enter compose mode (same as clicking the message bubble)
      setIsComposing(true)
      setIsLocked(true) // Lock the selection
      setIsMessageHovered(false) // Reset hover state
      setElementScope('only-this-element') // Reset to default
      setIsDropdownOpen(false) // Close dropdown
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    // Only add click and mousemove listeners when overlay is open
    if (isOpen) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true })
      window.addEventListener('click', handleClick, true)
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('click', handleClick, true)
      if (throttleTimeout) {
        clearTimeout(throttleTimeout)
      }
    }
  }, [isOpen, hoveredElement, editorProtocol, workspacePath, showOnAlt, isLocked, isComposing])

  // Don't render in production
  if (typeof window !== 'undefined') {
    if (window.location?.hostname !== 'localhost' && window.location?.hostname !== '127.0.0.1') {
      if (import.meta?.env?.PROD || process.env.NODE_ENV === 'production') {
        return null
      }
    }
  }

  if (!isOpen && !isLocked) return null

  // Generate a Cursor deeplink with the selected element's file tagged
  const generateDeeplink = (userText = '') => {
    if (!hoveredElement?.filePath) return null
    
    const filePath = hoveredElement.filePath.split(':')[0]
    const line = hoveredElement.filePath.split(':')[1] || '1'
    const componentName = hoveredElement.componentName
    
    // Extract path starting from folder before "src/" or use filename if no "src/" found
    let relativeFilePath = filePath
    const srcIndex = filePath.indexOf('/src/')
    if (srcIndex !== -1) {
      // Find the last slash before /src/ to include the folder before src
      const beforeSrc = filePath.substring(0, srcIndex)
      const lastSlashBeforeSrc = beforeSrc.lastIndexOf('/')
      if (lastSlashBeforeSrc !== -1) {
        // Include folder before src (e.g., "folder/src/components/App.jsx")
        relativeFilePath = filePath.substring(lastSlashBeforeSrc + 1) // +1 to remove leading slash
      } else {
        // No folder before src, start from src/
        relativeFilePath = filePath.substring(srcIndex + 1) // +1 to remove leading slash
      }
    } else {
      // If no /src/, just get the filename
      relativeFilePath = filePath.split('/').pop()
    }
    
    // Create a prompt with optional user text at the beginning
    let promptText = ''
    if (userText.trim()) {
      promptText = userText.trim() + '\n\n'
    }
    
    // Determine content to display
    let contentValue
    if (hoveredElement.childCount > 0) {
      // If element has children, show element count
      contentValue = `${hoveredElement.childCount} ${hoveredElement.childCount === 1 ? 'element' : 'elements'}`
    } else if (hoveredElement.textContent && hoveredElement.textContent.trim()) {
      // Only show text content if there are no child elements
      contentValue = hoveredElement.textContent
    }
    
    const filteredClassName = filterClassName(hoveredElement.className)
    
    // Add scope instruction based on selection
    if (elementScope === 'all-elements') {
      if (filteredClassName) {
        promptText += `Apply this to all similar elements using the class.\n\n`
      } else {
        promptText += `Apply this to all similar elements.\n\n`
      }
    } else {
      promptText += `Apply this only to following element (has the same content).\n\n`
    }
    
    const promptData = {
      component: componentName,
      file: `${relativeFilePath}:${line}`,
      ...(filteredClassName && { classes: filteredClassName }),
      ...(contentValue && { content: contentValue })
    }
    promptText += JSON.stringify(promptData, null, 2)
    
    // Generate direct Cursor protocol link with proper encoding
    // Use encodeURIComponent to preserve spaces as %20 instead of +
    const encodedText = encodeURIComponent(promptText)
    return `cursor://anysphere.cursor-deeplink/prompt?text=${encodedText}`
  }

  const startCompose = (e) => {
    e.stopPropagation()
    setIsComposing(true)
    setIsLocked(true) // Lock the selection
    setIsMessageHovered(false) // Reset hover state
    setElementScope('only-this-element') // Reset to default
    setIsDropdownOpen(false) // Close dropdown
  }

  const createPrompt = (e) => {
    e?.stopPropagation()
    const deeplink = generateDeeplink('')
    if (deeplink) {
      // Open the Cursor protocol link directly
      window.location.href = deeplink
      
      // Reset state
      setIsComposing(false)
      setComposeText('')
      setIsMessageHovered(false)
      setIsLocked(false)
      setIsOpen(false)
      setElementScope('only-this-element')
      setIsDropdownOpen(false)
      if (highlightedElementRef.current) {
        highlightedElementRef.current.classList.remove('mindone-highlighted')
        highlightedElementRef.current = null
      }
      setLabelPosition(null)
      setSelectedElement(null)
    }
  }

  const openInEditor = (e) => {
    e?.stopPropagation()
    if (!hoveredElement?.filePath) return
    
    const filePath = hoveredElement.filePath.split(':')[0]
    const line = hoveredElement.filePath.split(':')[1] || '1'
    
    const protocol = editorProtocol === 'cursor' ? 'cursor' : 'vscode'
    const editorUrl = `${protocol}://file${filePath}:${line}`
    
    try {
      window.location.href = editorUrl
    } catch (err) {
      console.warn('Could not open editor URL:', err)
    }
  }

  const sendMessage = (e) => {
    e?.stopPropagation()
    const deeplink = generateDeeplink(composeText)
    if (deeplink) {
      // Open the Cursor protocol link directly
      window.location.href = deeplink
      
      // Reset state
      setIsComposing(false)
      setComposeText('')
      setIsMessageHovered(false)
      setIsLocked(false)
      setIsOpen(false)
      setElementScope('only-this-element')
      setIsDropdownOpen(false)
      if (highlightedElementRef.current) {
        highlightedElementRef.current.classList.remove('mindone-highlighted')
        highlightedElementRef.current = null
      }
      setLabelPosition(null)
      setSelectedElement(null)
    }
  }

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    } else if (e.key === 'Escape') {
      e.stopPropagation()
      // Exit compose mode but stay locked
      setIsComposing(false)
      setComposeText('')
      setIsMessageHovered(false)
      setIsDropdownOpen(false)
    }
  }

  return (
    <>
      {labelPosition && (
        <div 
          className="mindone-selection-label"
          style={{
            top: `${labelPosition.top}px`,
            left: `${labelPosition.left}px`,
            backgroundColor: isComposing || isMessageHovered ? 'rgba(51, 65, 85, 1)' : 'rgba(96, 165, 250, 1)'
          }}
        >
          {isComposing ? (
            <>
              <input
                ref={inputRef}
                type="text"
                value={composeText}
                onChange={(e) => setComposeText(e.target.value)}
                onKeyDown={handleInputKeyDown}
                onClick={(e) => e.stopPropagation()}
                placeholder="Add a message (optional)..."
                style={{
                  all: 'unset',
                  flex: 1,
                  minWidth: '200px',
                  fontSize: '11px',
                  color: 'white'
                }}
              />
              <div 
                ref={dropdownRef}
                style={{ position: 'relative', display: 'inline-flex' }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="mindone-scope-dropdown-button"
                  title="Select scope"
                >
                  <span style={{ fontSize: '11px', marginRight: '4px' }}>
                    {elementScope === 'only-this-element' ? 'Only this' : 'All'}
                  </span>
                  <ChevronDownIcon size={12} />
                </button>
                {isDropdownOpen && (
                  <div className="mindone-scope-dropdown-menu">
                    <button
                      className={`mindone-scope-dropdown-item ${elementScope === 'only-this-element' ? 'active' : ''}`}
                      onClick={() => {
                        setElementScope('only-this-element')
                        setIsDropdownOpen(false)
                      }}
                    >
                      Only this element
                    </button>
                    <button
                      className={`mindone-scope-dropdown-item ${elementScope === 'all-elements' ? 'active' : ''}`}
                      onClick={() => {
                        setElementScope('all-elements')
                        setIsDropdownOpen(false)
                      }}
                    >
                      All elements
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={sendMessage}
                style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', marginLeft: '8px' }}
                title="Send to Cursor chat"
              >
                <SendIcon size={14} />
              </button>
            </>
          ) : (
            <>
              {hoveredElement?.filePath && (
                <button
                  onClick={startCompose}
                  onMouseEnter={() => setIsMessageHovered(true)}
                  onMouseLeave={() => setIsMessageHovered(false)}
                  style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', marginRight: isMessageHovered ? '0' : '12px' }}
                  title="Create prompt"
                >
                  <MessageSquareIcon size={12} />
                  {isMessageHovered && (
                    <span style={{ marginLeft: '8px', fontSize: '11px', whiteSpace: 'nowrap' }}>
                      create prompt
                    </span>
                  )}
                </button>
              )}
              {!isMessageHovered && (
                <>
                  <span className="mindone-label-text">
                    {labelPosition.componentName}
                    {filterClassName(labelPosition.className) && (
                      <span className="mindone-label-classes">{filterClassName(labelPosition.className)}</span>
                    )}
                  </span>
                  {hoveredElement?.filePath && (
                    <span 
                      className="mindone-open-in-editor"
                      onClick={openInEditor}
                      style={{ 
                        fontSize: '9px', 
                        opacity: 0.7, 
                        marginLeft: '12px',
                        fontStyle: 'italic',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                      title={`Open ${hoveredElement.filePath.split('/').pop()} in ${editorProtocol === 'cursor' ? 'Cursor' : 'VS Code'}`}
                    >
                      Open <p style={{ display: 'inline', fontWeight: 'bold' }}>{hoveredElement.filePath.split('/').pop()}</p> in {editorProtocol === 'cursor' ? 'Cursor' : 'VS Code'}
                    </span>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
      <div className={`mindone-overlay ${position}`}>
        <div className="mindone-header">
          {hoveredElement ? (
            <div className="mindone-title-compact">
              {(hoveredElement.textContent || hoveredElement.childCount > 0) && (
                <span className="mindone-title-content">
                  {hoveredElement.childCount > 0 
                    ? `${hoveredElement.childCount} ${hoveredElement.childCount === 1 ? 'element' : 'elements'}`
                    : hoveredElement.textContent
                  }
                </span>
              )}
              <span className="mindone-title-component">{hoveredElement.componentName}</span>
              {filterClassName(hoveredElement.className) && (
                <span className="mindone-title-classes">{filterClassName(hoveredElement.className)}</span>
              )}
            </div>
          ) : (
            <h3 className="mindone-title">Dev Overlay</h3>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="mindone-close"
          >
            <XIcon size={14} />
          </button>
        </div>
        
        {hoveredElement?.filePath && (
          <div className="mindone-file-section-compact">
            <span 
              className="mindone-file-link"
              onClick={openInEditor}
              title={`Open ${hoveredElement.filePath.split('/').pop()} in ${editorProtocol === 'cursor' ? 'Cursor' : 'VS Code'}`}
            >
              {hoveredElement.filePath}
            </span>
          </div>
        )}
      </div>
    </>
  )
}

export default DevOverlay


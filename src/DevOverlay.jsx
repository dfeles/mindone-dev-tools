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
  position = 'bottom-left', // 'top-right', 'top-left', 'bottom-right', 'bottom-left'
  agentMode = false, // If true, sends to agent server instead of deeplink
  agentServerUrl = 'http://localhost:5567' // URL of the agent server
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
  const [agentStatus, setAgentStatus] = useState(null) // Agent execution status: { message, type, detail }
  const [isAgentRunning, setIsAgentRunning] = useState(false) // Whether agent is currently running
  const [agentType, setAgentType] = useState(null) // Agent type: 'cursor', etc.
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
  
  // Helper function to get first 2 words from an element's text content
  const getFirstTwoWords = (element) => {
    if (!element) return ''
    const textContent = element.textContent?.trim() || ''
    const words = textContent.split(/\s+/).filter(w => w.length > 0)
    return words.slice(0, 2).join(' ') || ''
  }
  
  // Helper function to format content when there are child elements
  const formatContentForElements = (element, childCount) => {
    if (!element || !element.children || element.children.length === 0) return null
    
    const childWords = Array.from(element.children)
      .slice(0, childCount)
      .map(child => {
        const words = getFirstTwoWords(child)
        return words ? `[${words}]` : ''
      })
      .filter(words => words.length > 0)
    
    if (childWords.length === 0) return null
    
    return `${childCount} ${childCount === 1 ? 'element' : 'elements'}: ${childWords.join(' ')}`.trim()
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

  // Fetch agent type when agent mode is enabled
  useEffect(() => {
    if (agentMode) {
      const fetchAgentType = async () => {
        try {
          const response = await fetch(`${agentServerUrl}/health`)
          if (response.ok) {
            const data = await response.json()
            setAgentType(data.agentType || 'cursor')
          }
        } catch (error) {
          // Silently fail - agent type will default to null
        }
      }
      fetchAgentType()
    } else {
      setAgentType(null)
    }
  }, [agentMode, agentServerUrl])

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

  // Generate prompt text (shared between deeplink and agent mode)
  const generatePromptText = (userText = '') => {
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
      // Show first 2 words of each child element with brackets
      if (hoveredElement.element) {
        const formatted = formatContentForElements(hoveredElement.element, hoveredElement.childCount)
        if (formatted) {
          contentValue = formatted
        } else {
          contentValue = `${hoveredElement.childCount} ${hoveredElement.childCount === 1 ? 'element' : 'elements'}`
        }
      } else {
        // If element has children, show element count
        contentValue = `${hoveredElement.childCount} ${hoveredElement.childCount === 1 ? 'element' : 'elements'}`
      }
    } else if (hoveredElement.textContent && hoveredElement.textContent.trim()) {
      // Only show text content if there are no child elements
      contentValue = hoveredElement.textContent
    }
    
    const filteredClassName = filterClassName(hoveredElement.className)
    
    // Check if this is the specific element that should use the "has the same content" instruction
    // Match by component type, file path, and content
    const isSpecificElement = componentName === 'p' && 
                              (relativeFilePath === 'test-app/src/App.jsx' || relativeFilePath.endsWith('test-app/src/App.jsx')) && 
                              contentValue === 'Count: 0'
    
    // Add scope instruction based on selection
    if (elementScope === 'all-elements') {
      if (filteredClassName) {
        promptText += `Apply this to all similar elements using the class.\n\n`
      } else {
        promptText += `Apply this to all similar elements.\n\n`
      }
    } else {
      // Only use "has the same content" instruction for the specific element
      if (isSpecificElement) {
        promptText += `Apply this only to following element (has the same content).\n\n`
      } else {
        promptText += `Apply this only to following element.\n\n`
      }
    }
    
    const promptData = {
      component: componentName,
      file: `${relativeFilePath}:${line}`,
      ...(filteredClassName && { classes: filteredClassName }),
      ...(contentValue && { content: contentValue })
    }
    promptText += JSON.stringify(promptData, null, 2)
    
    return promptText
  }

  // Generate a Cursor deeplink with the selected element's file tagged
  const generateDeeplink = (userText = '') => {
    const promptText = generatePromptText(userText)
    if (!promptText) return null
    
    // Generate direct Cursor protocol link with proper encoding
    // Use encodeURIComponent to preserve spaces as %20 instead of +
    const encodedText = encodeURIComponent(promptText)
    return `cursor://anysphere.cursor-deeplink/prompt?text=${encodedText}`
  }

  // Helper to close compose UI
  const closeComposeUI = () => {
    setIsAgentRunning(false)
    setIsComposing(false)
    setComposeText('')
    setIsMessageHovered(false)
    setIsLocked(false)
    setIsOpen(false)
    setElementScope('only-this-element')
    setIsDropdownOpen(false)
    setAgentStatus(null)
    if (highlightedElementRef.current) {
      highlightedElementRef.current.classList.remove('mindone-highlighted')
      highlightedElementRef.current = null
    }
    setLabelPosition(null)
    setSelectedElement(null)
  }

  // Send prompt to agent server with streaming updates
  const sendToAgentServer = async (userText = '') => {
    const promptText = generatePromptText(userText)
    if (!promptText) return false

    setIsAgentRunning(true)
    const agentName = agentType ? agentType.charAt(0).toUpperCase() + agentType.slice(1) : 'Agent'
    setAgentStatus({ type: 'status', message: `Connecting to ${agentName}...` })

    try {
      // Use fetch with stream parameter for SSE
      const response = await fetch(`${agentServerUrl}/execute?stream=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          prompt: promptText,
          workspacePath: workspacePath,
        }),
      })

      if (!response.ok) {
        // Try to get error message, but handle non-JSON responses
        let errorMessage = 'Agent server error'
        try {
          const error = await response.json()
          errorMessage = error.error || errorMessage
        } catch (e) {
          errorMessage = `Server returned ${response.status}`
        }
        console.error('[mindone] Agent server error:', errorMessage)
        const agentName = agentType ? agentType.charAt(0).toUpperCase() + agentType.slice(1) : 'Agent'
        setAgentStatus({ type: 'error', message: `${agentName} error: ${errorMessage}` })
        setIsAgentRunning(false)
        return false
      }

      // Check if response is SSE stream
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('text/event-stream')) {
        // Stream updates using ReadableStream
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        const processStream = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) {
                // Stream ended without 'done' event, assume success
                if (isAgentRunning) {
                  const agentName = agentType ? agentType.charAt(0).toUpperCase() + agentType.slice(1) : 'Agent'
                  setAgentStatus({ type: 'success', message: `${agentName} completed!` })
                  setTimeout(() => {
                    closeComposeUI()
                  }, 1500)
                }
                break
              }

              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split('\n')
              buffer = lines.pop() || ''

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6))
                    
                    if (data.type === 'done') {
                      const agentName = agentType ? agentType.charAt(0).toUpperCase() + agentType.slice(1) : 'Agent'
                      setAgentStatus({ type: 'success', message: `${agentName} completed successfully!` })
                      // Close after a short delay
                      setTimeout(() => {
                        closeComposeUI()
                      }, 1500)
                      return true
                    } else if (data.type === 'error') {
                      const agentName = agentType ? agentType.charAt(0).toUpperCase() + agentType.slice(1) : 'Agent'
                      setAgentStatus({ type: 'error', message: `${agentName}: ${data.message}` })
                      setIsAgentRunning(false)
                      return false
                    } else {
                      // Update status - add agent type to message if it's a status update
                      const agentName = agentType ? agentType.charAt(0).toUpperCase() + agentType.slice(1) : 'Agent'
                      if (data.type === 'status' && data.message) {
                        // Always prefix with agent name for status messages
                        // Check if message already starts with agent name to avoid duplication
                        const message = data.message.trim()
                        if (!message.toLowerCase().startsWith(agentName.toLowerCase())) {
                          setAgentStatus({ ...data, message: `${agentName}: ${data.message}` })
                        } else {
                          setAgentStatus(data)
                        }
                      } else {
                        setAgentStatus(data)
                      }
                    }
                  } catch (e) {
                    // Ignore parse errors
                  }
                }
              }
            }
          } catch (streamError) {
            console.error('[mindone] Stream error:', streamError)
            const agentName = agentType ? agentType.charAt(0).toUpperCase() + agentType.slice(1) : 'Agent'
            setAgentStatus({ type: 'error', message: `${agentName} stream error occurred` })
            setIsAgentRunning(false)
            return false
          }
        }

        // Process stream asynchronously (don't await, let it run in background)
        processStream()
        return true
      } else {
        // Legacy JSON response
        const result = await response.json()
        console.log('[mindone] Agent execution started:', result)
        const agentName = agentType ? agentType.charAt(0).toUpperCase() + agentType.slice(1) : 'Agent'
        setAgentStatus({ type: 'status', message: `${agentName} execution started` })
        // For legacy mode, we don't wait for completion
        setIsAgentRunning(false)
        return true
      }
    } catch (error) {
      console.error('[mindone] Failed to send to agent server:', error)
      const agentName = agentType ? agentType.charAt(0).toUpperCase() + agentType.slice(1) : 'Agent'
      setAgentStatus({ 
        type: 'error', 
        message: `Failed to connect to ${agentName}: ${error.message}. Make sure agent server is running.` 
      })
      setIsAgentRunning(false)
      // Don't automatically fallback - show error to user
      return false
    }
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

  const sendMessage = async (e) => {
    e?.stopPropagation()
    
    if (agentMode) {
      // Try agent mode first - keep UI open to show status
      const success = await sendToAgentServer(composeText)
      if (!success) {
        // If agent server failed, show error and don't fallback to deeplink automatically
        // User can manually close or try again
        if (!isAgentRunning) {
          // Only if we're not running (connection failed immediately)
          // Show error but keep UI open so user can see what went wrong
          const agentName = agentType ? agentType.charAt(0).toUpperCase() + agentType.slice(1) : 'Agent'
          setAgentStatus({ 
            type: 'error', 
            message: `${agentName} server unavailable. Make sure the server is running on port 5567` 
          })
        }
        // Don't automatically fallback to deeplink - let user decide
        return
      }
      // If agent is running, keep UI open to show status updates
    } else {
      // Use deeplink mode (default)
      const deeplink = generateDeeplink(composeText)
      if (deeplink) {
        window.location.href = deeplink
      }
      
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
    if (e.key === 'Enter' && !e.shiftKey && !isAgentRunning) {
      e.preventDefault()
      sendMessage()
    } else if (e.key === 'Escape') {
      e.stopPropagation()
      if (isAgentRunning) {
        // Can't cancel while running, just show message
        return
      }
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
              {(isAgentRunning || agentStatus) ? (
                // Show spinner when running, or error/success status
                agentStatus?.type === 'error' || agentStatus?.type === 'success' ? (
                  // Show error or success message
                  <div style={{ 
                    flex: 1, 
                    minWidth: '200px',
                    maxWidth: '360px',
                    fontSize: '11px', 
                    color: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px',
                      opacity: agentStatus?.type === 'error' ? 1 : 0.9,
                      color: agentStatus?.type === 'error' ? '#fca5a5' : agentStatus?.type === 'success' ? '#86efac' : 'white',
                      minWidth: 0,
                      overflow: 'hidden'
                    }}>
                      {agentStatus?.type === 'error' ? '✗' : '✓'}
                      <span style={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0
                      }}>{agentStatus?.message || 'Completed'}</span>
                    </div>
                    {agentStatus?.detail && (
                      <div style={{ 
                        fontSize: '9px', 
                        opacity: 0.7, 
                        marginLeft: '18px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '340px'
                      }}>
                        {agentStatus.detail}
                      </div>
                    )}
                    {agentStatus?.type === 'error' && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            closeComposeUI()
                          }}
                          style={{
                            all: 'unset',
                            fontSize: '9px',
                            color: '#fca5a5',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                          }}
                        >
                          Close
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            // Fallback to deeplink
                            const deeplink = generateDeeplink(composeText)
                            if (deeplink) {
                              window.location.href = deeplink
                              closeComposeUI()
                            }
                          }}
                          style={{
                            all: 'unset',
                            fontSize: '9px',
                            color: '#93c5fd',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                          }}
                        >
                          Use deeplink instead
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  // Show rotating spinner while agent is running
                  <div style={{ 
                    flex: 1, 
                    minWidth: '200px',
                    maxWidth: '360px',
                    fontSize: '11px', 
                    color: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      minWidth: 0,
                      overflow: 'hidden'
                    }}>
                      <div 
                        className="mindone-spinner"
                        style={{
                          width: '12px',
                          height: '12px',
                          border: '2px solid rgba(255, 255, 255, 0.3)',
                          borderTop: '2px solid white',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite',
                          display: 'inline-block',
                          flexShrink: 0
                        }}
                      />
                      <span style={{ 
                        opacity: 0.9,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0
                      }}>
                        {agentStatus?.message || (agentType ? `${agentType.charAt(0).toUpperCase() + agentType.slice(1)} processing...` : 'Processing...')}
                      </span>
                    </div>
                    {agentStatus?.detail && (
                      <div style={{ 
                        fontSize: '9px', 
                        opacity: 0.7, 
                        marginLeft: '20px',
                        fontStyle: 'italic',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '340px'
                      }}>
                        {agentStatus.detail}
                      </div>
                    )}
                  </div>
                )
              ) : (
                // Show input when not running
                <input
                  ref={inputRef}
                  type="text"
                  value={composeText}
                  onChange={(e) => setComposeText(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Add a message (optional)..."
                  disabled={isAgentRunning}
                  style={{
                    all: 'unset',
                    flex: 1,
                    minWidth: '200px',
                    maxWidth: '360px',
                    fontSize: '11px',
                    color: 'white',
                    opacity: isAgentRunning ? 0.5 : 1
                  }}
                />
              )}
              <div 
                ref={dropdownRef}
                style={{ 
                  position: 'relative', 
                  display: isAgentRunning ? 'none' : 'inline-flex' 
                }}
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
              {!isAgentRunning && (
                <button
                  onClick={sendMessage}
                  style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', marginLeft: '8px' }}
                  title="Send to Cursor chat"
                >
                  <SendIcon size={14} />
                </button>
              )}
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
                    ? (hoveredElement.element
                        ? (formatContentForElements(hoveredElement.element, hoveredElement.childCount) || `${hoveredElement.childCount} ${hoveredElement.childCount === 1 ? 'element' : 'elements'}`)
                        : `${hoveredElement.childCount} ${hoveredElement.childCount === 1 ? 'element' : 'elements'}`)
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


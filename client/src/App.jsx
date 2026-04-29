import { useState, useEffect, useRef, useCallback } from 'react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import './App.css'
import Terminal from './components/terminal'
import FileTree from './components/tree'
import socket from './socket'
function App() {
  const [fileTree, setFileTree] = useState({})
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(250)
  const [terminalHeight, setTerminalHeight] = useState(250)

  const isResizingSidebar = useRef(false)
  const isResizingTerminal = useRef(false)

  const getFileTree = async () => {
    try {
      const response = await fetch("http://localhost:9000/files")
      const data = await response.json()
      if (data && data.files) {
        setFileTree(data.files)
      }
    } catch (e) {
      console.error("Failed to fetch file tree", e)
    }
  }

  useEffect(() => {
    getFileTree()
  }, [])
  useEffect(() => {
    socket.on('files:refresh', getFileTree)
    return () => socket.off('files:refresh', getFileTree)
  }, [])

  // ---- Sidebar drag logic ----
  const startSidebarResize = useCallback((e) => {
    e.preventDefault()
    isResizingSidebar.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  // ---- Terminal drag logic ----
  const startTerminalResize = useCallback((e) => {
    e.preventDefault()
    isResizingTerminal.current = true
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizingSidebar.current) {
        const newWidth = Math.min(Math.max(e.clientX, 180), 500)
        setSidebarWidth(newWidth)
      }
      if (isResizingTerminal.current) {
        const newHeight = Math.min(Math.max(window.innerHeight - e.clientY, 150), 500)
        setTerminalHeight(newHeight)
      }
    }

    const handleMouseUp = () => {
      isResizingSidebar.current = false
      isResizingTerminal.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  return (
    <div className='playground-container'>
      {/* Header */}
      <div className='app-header'>
        <button
          className='hamburger-btn'
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>
        <span className='app-title'>Cloud IDE</span>
      </div>

      {/* Body */}
      <div className='main-body'>
        {/* Top area: Sidebar + Editor */}
        <div className='top-area'>
          {/* Sidebar */}
          {isSidebarOpen && (
            <>
              <div className='sidebar-panel' style={{ width: sidebarWidth }}>
                <div className='files-container'>
                  <FileTree tree={fileTree} />
                </div>
              </div>
              <div className='resize-handle-h' onMouseDown={startSidebarResize} />
            </>
          )}

          {/* Editor */}
          <div className='editor-panel'>
            <div className='editor-placeholder'>
              <p>Editor Area</p>
            </div>
          </div>
        </div>

        {/* Horizontal resize handle between editor and terminal */}
        <div className='resize-handle-v' onMouseDown={startTerminalResize} />

        {/* Terminal */}
        <div className='terminal-panel' style={{ height: terminalHeight }}>
          <Terminal />
        </div>
      </div>
    </div>
  )
}

export default App

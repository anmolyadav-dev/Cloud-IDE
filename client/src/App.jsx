import { useState, useEffect, useRef, useCallback } from 'react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import './App.css'
import Terminal from './components/terminal'
import FileTree from './components/tree'
import socket from './socket'
import ReactAce from 'react-ace'
const AceEditor = ReactAce.default || ReactAce;
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-language_tools";


function App() {
  const [sessionId, setSessionId] = useState(null)
  const [fileTree, setFileTree] = useState({})
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(250)
  const [terminalHeight, setTerminalHeight] = useState(250)
  const [selectedFile, setSelectedFile] = useState('')
  const [selectedFileContent, setSelectedFileContent] = useState("")
  const [code, setCode] = useState("")
  const isSaved = selectedFileContent === code
  const isResizingSidebar = useRef(false)
  const isResizingTerminal = useRef(false)

  // Wait for the server to assign us a session
  useEffect(() => {
    socket.on('session:init', ({ sessionId: sid }) => {
      console.log('Session initialized:', sid)
      setSessionId(sid)
    })
    return () => socket.off('session:init')
  }, [])

  const getFileTree = useCallback(async () => {
    if (!sessionId) return
    try {
      const baseUrl = import.meta.env.VITE_BACKEND_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:9000')
      const response = await fetch(`${baseUrl}/files?sessionId=${sessionId}`)
      const data = await response.json()
      if (data && data.files) {
        setFileTree(data.files)
      }
    } catch (e) {
      console.error("Failed to fetch file tree", e)
    }
  }, [sessionId])

  const getFileContents = useCallback(async () => {
    try {
      if (!selectedFile || !sessionId) return;
      const baseUrl = import.meta.env.VITE_BACKEND_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:9000')
      const response = await fetch(`${baseUrl}/files/content?sessionId=${sessionId}&path=${selectedFile}`)
      const data = await response.text()
      setSelectedFileContent(data)
    } catch (e) {
      console.error("Failed to fetch file content", e)
    }
  }, [selectedFile, sessionId])

  // Fetch file tree once session is ready
  useEffect(() => {
    if (sessionId) {
      getFileTree()
    }
  }, [sessionId, getFileTree])

  // Listen for file system changes from our session's watcher
  useEffect(() => {
    socket.on('files:refresh', getFileTree)
    return () => socket.off('files:refresh', getFileTree)
  }, [getFileTree])

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

  useEffect(() => {
    if (code && !isSaved) {
      const timer = setTimeout(() => {
        socket.emit("file:change", { content: code, path: selectedFile })
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [code])

  useEffect(() => {
    if (selectedFile) {
      getFileContents()
    }
    setCode("")
  }, [selectedFile, getFileContents])

  useEffect(() => {
    if (selectedFile && selectedFileContent) {
      setCode(selectedFileContent)
    }
  }, [selectedFileContent])

  // Show a loading state until the session is ready
  if (!sessionId) {
    return (
      <div className='playground-container' style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>
          ⚡ Spinning up your environment...
        </p>
      </div>
    )
  }

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
        <span className='session-badge'>Session: {sessionId.slice(0, 8)}</span>
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
                  <FileTree tree={fileTree} onSelect={(path) => setSelectedFile(path)} />
                </div>
              </div>
              <div className='resize-handle-h' onMouseDown={startSidebarResize} />
            </>
          )}

          {/* Editor */}
          <div className='editor-panel'>
            {selectedFile && <p style={{ padding: "0px 8px" }}>{selectedFile.replaceAll("/", " > ")}</p>}
            <AceEditor
              mode="javascript"
              theme="monokai"
              width="100%"
              height="100%"
              setOptions={{
                useWorker: false,
                fontSize: 14,
                showPrintMargin: false
              }}
              onChange={(code) => setCode(code)}
              value={code}
            />
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

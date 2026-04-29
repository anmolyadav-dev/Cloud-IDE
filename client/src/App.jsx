import { useState, useEffect } from 'react'
import './App.css'
import Terminal from './components/terminal'
import FileTree from './components/tree'

function App() {
  const [fileTree, setFileTree] = useState({})
  const getFileTree = async () => {
    const response = await fetch("http://localhost:9000/files")
    const data = await response.json()
    setFileTree(data.files)

  }

  useEffect(() => {
    getFileTree()
  }, [])
  return (
    <>
      <div className='playground-container'>
        <div className='editor-container'>
          <div className='files'>
            <FileTree tree={fileTree} />
          </div>
        </div>
        <div className='terminal-container'>
          <Terminal />
        </div>
      </div>
    </>
  )
}

export default App

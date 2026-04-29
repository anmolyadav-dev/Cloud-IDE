import { useEffect, useRef } from 'react'
import { Terminal as XTerminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import socket from '../socket'

const Terminal = () => {
    const terminalRef = useRef(null)
    const isRendered = useRef(false)

    useEffect(() => {
        if (isRendered.current) return
        isRendered.current = true

        const term = new XTerminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Courier New', monospace",
        })

        const fitAddon = new FitAddon()
        term.loadAddon(fitAddon)
        term.open(terminalRef.current)
        fitAddon.fit()
        term.onData((data) => {
            socket.emit("terminal:write", data)
        })
        socket.on("terminal:data", (data) => {
            term.write(data)
        })

        // Re-fit terminal whenever the container is resized
        const resizeObserver = new ResizeObserver(() => {
            fitAddon.fit()
        })
        resizeObserver.observe(terminalRef.current)

        return () => {
            resizeObserver.disconnect()
        }
    }, [])

    return (
        <div ref={terminalRef} id='terminal' />
    )
}

export default Terminal
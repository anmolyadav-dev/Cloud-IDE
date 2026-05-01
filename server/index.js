const http = require('http')
const express = require('express')
const { Server: SocketServer } = require('socket.io')
const fs = require('fs/promises')
const fsSync = require('fs')
const pty = require('node-pty')
const path = require('path')
const cors = require('cors')
const chokidar = require('chokidar')
const { v4: uuidv4 } = require('uuid')

const app = express()
const server = http.createServer(app)

const io = new SocketServer({
    cors: '*'
})
app.use(cors())
io.attach(server)

// Store active sessions: sessionId -> { ptyProcess, watcher, workspacePath }
const sessions = new Map()

// Base directory for all user workspaces
const WORKSPACES_DIR = path.resolve(__dirname, 'workspaces')

// Ensure the workspaces root directory exists
if (!fsSync.existsSync(WORKSPACES_DIR)) {
    fsSync.mkdirSync(WORKSPACES_DIR, { recursive: true })
}

// ============ Socket Connection (Per-User Session) ============
io.on("connection", async (socket) => {
    const sessionId = uuidv4()
    const workspacePath = path.join(WORKSPACES_DIR, sessionId)

    console.log(`[${sessionId}] New session — socket: ${socket.id}`)

    // 1. Create isolated workspace directory with a starter file
    await fs.mkdir(workspacePath, { recursive: true })
    await fs.writeFile(
        path.join(workspacePath, 'index.js'),
        '// Welcome to Cloud IDE!\nconsole.log("Hello, World!");\n'
    )

    // 2. Spawn an isolated Docker container with the workspace mounted
    const ptyProcess = pty.spawn('docker', [
        'run', '-it', '--rm',
        '--name', `ide-${sessionId.slice(0, 8)}`,
        '--memory=128m',        // Limit RAM per container
        '--cpus=0.5',           // Limit CPU per container
        '--network=none',       // No network access (security)
        '-v', `${workspacePath}:/workspace`,
        '-w', '/workspace',
        'cloud-ide-sandbox',
        'bash'
    ], {
        name: 'xterm-256color',
        cols: 80,
        rows: 30,
        env: process.env
    })

    // 3. Watch the workspace directory for file changes
    const watcher = chokidar.watch(workspacePath, {
        ignoreInitial: true
    })
    watcher.on('all', (event, changedPath) => {
        // Only emit to THIS user's socket
        socket.emit('files:refresh', changedPath)
    })

    // 4. Store the session
    sessions.set(sessionId, { ptyProcess, watcher, workspacePath })

    // 5. Send the sessionId back to the client
    socket.emit('session:init', { sessionId })

    // 6. Stream terminal output to THIS user only
    ptyProcess.onData(data => {
        socket.emit('terminal:data', data)
    })

    // 7. Handle terminal input from THIS user
    socket.on('terminal:write', (data) => {
        ptyProcess.write(data)
    })

    // 8. Handle file saves from THIS user
    socket.on('file:change', async ({ content, path: filePath }) => {
        try {
            const fullPath = path.join(workspacePath, filePath)
            await fs.writeFile(fullPath, content)
            console.log(`[${sessionId}] File saved: ${filePath}`)
        } catch (e) {
            console.error(`[${sessionId}] Error saving file:`, e)
        }
    })

    // 9. Cleanup on disconnect
    socket.on('disconnect', async () => {
        console.log(`[${sessionId}] Disconnected — cleaning up...`)

        const session = sessions.get(sessionId)
        if (session) {
            const containerName = `ide-${sessionId.slice(0, 8)}`

            // Kill the pty process
            try { session.ptyProcess.kill() } catch (e) { }

            // Forcefully kill the Docker container as a fallback
            try {
                require('child_process').execSync(`docker kill ${containerName} 2>/dev/null`)
                require('child_process').execSync(`docker rm -f ${containerName} 2>/dev/null`)
            } catch (e) {
                // Container may already be stopped by ptyProcess.kill(), that's fine
            }

            // Stop the file watcher
            try { await session.watcher.close() } catch (e) { }

            // Delete the workspace directory
            try {
                await fs.rm(session.workspacePath, { recursive: true, force: true })
                console.log(`[${sessionId}] Workspace cleaned up`)
            } catch (e) {
                console.error(`[${sessionId}] Error cleaning workspace:`, e)
            }

            sessions.delete(sessionId)
        }
    })
})

// ============ HTTP API Routes ============

// Get file tree for a specific session
app.get('/files', async (req, res) => {
    const { sessionId } = req.query
    if (!sessionId || !sessions.has(sessionId)) {
        return res.status(400).json({ error: 'Invalid session' })
    }
    const workspacePath = sessions.get(sessionId).workspacePath
    const fileTree = await generateFileTree(workspacePath)
    return res.json({ files: fileTree })
})

// Get file content for a specific session
app.get('/files/content', async (req, res) => {
    const { sessionId, path: filePath } = req.query
    if (!sessionId || !sessions.has(sessionId)) {
        return res.status(400).json({ error: 'Invalid session' })
    }
    const workspacePath = sessions.get(sessionId).workspacePath
    const fullPath = path.join(workspacePath, filePath)
    try {
        const content = await fs.readFile(fullPath, 'utf-8')
        return res.send(content)
    } catch (e) {
        return res.status(404).json({ error: 'File not found' })
    }
})

// ============ Server Start ============
server.listen(9000, () => console.log(`Cloud IDE server running on port 9000`))

// ============ Utilities ============
async function generateFileTree(directory) {
    const tree = {}

    async function buildTree(currentDir, currentTree) {
        const files = await fs.readdir(currentDir)

        for (const file of files) {
            const filePath = path.join(currentDir, file)
            const stats = await fs.stat(filePath)

            if (stats.isDirectory()) {
                currentTree[file] = {}
                await buildTree(filePath, currentTree[file])
            } else {
                currentTree[file] = null
            }
        }
    }
    await buildTree(directory, tree)
    return tree
}
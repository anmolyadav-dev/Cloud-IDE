const http = require('http')
const express = require('express')
const { Server: SocketServer } = require('socket.io')
const fs = require('fs/promises')
const pty = require('node-pty')
const path = require('path')
const cors = require('cors')
const chokidar = require('chokidar')


const ptyProcess = pty.spawn('bash', [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 30,
    env: process.env,
    cwd: process.env.INIT_CWD + '/user'
})


const app = express()
const server = http.createServer(app)
const io = new SocketServer({
    cors: '*'
})
app.use(cors())
io.attach(server)

chokidar.watch('./user',).on('all', (event, path) => {
    io.emit('files:refresh', path)
})

ptyProcess.onData(data => {
    io.emit('terminal:data', data)
})

io.on("connection", (socket) => {
    console.log(`socket connected`, socket.id)

    // Nudge bash to re-print the prompt for the newly connected client
    ptyProcess.write('\n')

    socket.on('terminal:write', (data) => {
        ptyProcess.write(data)
    })
})


app.get('/files', async (req, res) => {
    const fileTree = await generateFileTree('./user')
    return res.json({ files: fileTree })
})


server.listen(9000, () => console.log(`Docker server running on port 9000`))

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
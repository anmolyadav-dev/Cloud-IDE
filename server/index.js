const http = require('http')
const express = require('express')
const { Server: SocketServer } = require('socket.io')

const pty = require('node-pty')

const ptyProcess = pty.spawn('bash', [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 30,
    env: process.env,
    cwd: process.env.INIT_CWD
})


const app = express()
const server = http.createServer(app)
const io = new SocketServer({
    cors: '*'
})

io.attach(server)

ptyProcess.onData(data => {
    io.emit('terminal:data', data)
})

io.on("connection", (socket) => {
    console.log(`socket connected`, socket.id)
    socket.on('terminal:write', (data) => {
        ptyProcess.write(data)
    })
})
server.listen(9000, () => console.log(`Docker server running on port 9000`))

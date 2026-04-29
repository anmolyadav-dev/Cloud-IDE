const http = require('http')
const express = require('express')
const { Server } = require('socket.io')

const app = express()
const server = http.createServer(app)
const io = new SocketServer({
    cors: '*'
})

io.attach(server)

io.on("connection", (socket) => console.log(`socket connected`, socket.id))
server.listen(9000, () => console.log(`Docker server running on port 9000`))

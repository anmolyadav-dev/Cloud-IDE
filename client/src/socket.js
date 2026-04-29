import { io } from 'socket.io-client'


const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (import.meta.env.PROD ? '/' : 'http://localhost:9000')
const socket = io(BACKEND_URL)

export default socket


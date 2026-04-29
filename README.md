# ☁️ Cloud IDE

A full-stack, multi-tenant Cloud IDE that spins up an isolated Docker container for every user. Built with React, Node.js, Socket.io, and xterm.js.

Each user gets their own sandboxed Linux terminal, file explorer, and code editor — completely isolated from every other user.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│  Node.js Orchestrator (Port 9000)                   │
│                                                     │
│  User A connects → spawns Docker Container A        │
│  User B connects → spawns Docker Container B        │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐                 │
│  │ Container A  │  │ Container B  │  ... up to N    │
│  │ RAM: 128MB   │  │ RAM: 128MB   │                 │
│  │ CPU: 0.5     │  │ CPU: 0.5     │                 │
│  │ Network: OFF │  │ Network: OFF │                 │
│  │ /workspace/  │  │ /workspace/  │                 │
│  └──────────────┘  └──────────────┘                 │
│                                                     │
│  On disconnect → container killed + files deleted    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  React Frontend (Port 5173)                         │
│  ┌─────────┬────────────────────────┐               │
│  │ File    │                        │               │
│  │ Tree    │   Code Editor (Ace)    │               │
│  │         │                        │               │
│  ├─────────┴────────────────────────┤               │
│  │     Terminal (xterm.js)          │               │
│  └──────────────────────────────────┘               │
└─────────────────────────────────────────────────────┘
```

## ✨ Features

- **Isolated Environments** — Each user gets their own Docker container
- **Live Terminal** — Full bash shell via `node-pty` + `xterm.js` with auto-fit
- **Code Editor** — Syntax-highlighted editor with `react-ace` (Monokai theme)
- **File Explorer** — Animated, recursive file tree with real-time sync via `chokidar`
- **Auto-Save** — Debounced file saving (5s after last keystroke)
- **Resizable Panels** — Drag to resize sidebar and terminal
- **Auto-Cleanup** — Containers and workspace files are deleted on disconnect
- **Resource Limits** — Each container is capped at 128MB RAM, 0.5 CPU, no network

## 📋 Prerequisites

- **Node.js** >= 18.x
- **Docker** installed and running
- **npm** >= 9.x

## 🚀 Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/cloud-ide.git
cd cloud-ide
```

### 2. Build the sandbox Docker image

```bash
docker build -t cloud-ide-sandbox -f server/Dockerfile.sandbox server/
```

### 3. Install server dependencies

```bash
cd server
npm install
```

### 4. Install client dependencies

```bash
cd ../client
npm install
```

## ▶️ Running Locally

Open **two terminals**:

**Terminal 1 — Start the backend:**
```bash
cd server
npm run dev
```
Server runs on `http://localhost:9000`

**Terminal 2 — Start the frontend:**
```bash
cd client
npm run dev
```
Frontend runs on `http://localhost:5173`

Open `http://localhost:5173` in your browser. You should see:
1. "⚡ Spinning up your environment..." loading screen
2. Then the full IDE with file tree, editor, and terminal

**To test isolation:** Open a second browser tab — each tab gets its own session ID, Docker container, and workspace.

## 📁 Project Structure

```
cloud-ide/
├── client/                     # React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx             # Main layout + session management
│   │   ├── index.css           # Premium dark theme
│   │   ├── socket.js           # Socket.io client instance
│   │   └── components/
│   │       ├── terminal.jsx    # xterm.js + FitAddon
│   │       └── tree.jsx        # Animated file explorer
│   └── package.json
│
├── server/                     # Node.js backend
│   ├── index.js                # Orchestrator (sessions, Docker, pty)
│   ├── Dockerfile.sandbox      # User container image
│   ├── nodemon.json            # Ignore workspaces/ from watch
│   └── package.json
│
├── .gitignore
└── README.md
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite, react-ace, xterm.js, framer-motion, lucide-react |
| Backend | Node.js, Express, Socket.io, node-pty, chokidar |
| Containers | Docker (per-user isolation) |
| Communication | WebSockets (real-time terminal I/O), REST (file tree & content) |

## ☁️ Deploying to AWS

### Option A: EC2 (Recommended for this project)

1. **Launch an EC2 instance:**
   - AMI: Ubuntu 22.04
   - Instance type: `t3.medium` (2 vCPU, 4GB RAM) for ~20 users
   - For 50-100 users: `t3.xlarge` (4 vCPU, 16GB RAM) or use **Oracle Cloud's free ARM A1** (4 cores, 24GB RAM — completely free)
   - Security Group: Open ports **80** (HTTP), **443** (HTTPS), **9000** (API/WebSocket)

2. **SSH into the instance and install dependencies:**
   ```bash
   sudo apt update && sudo apt install -y docker.io nodejs npm nginx
   sudo systemctl start docker
   sudo usermod -aG docker ubuntu
   newgrp docker
   ```

3. **Clone and build:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/cloud-ide.git
   cd cloud-ide
   docker build -t cloud-ide-sandbox -f server/Dockerfile.sandbox server/
   cd server && npm install
   cd ../client && npm install && npm run build
   ```

4. **Run the backend with pm2 (production process manager):**
   ```bash
   sudo npm install -g pm2
   cd server
   pm2 start index.js --name cloud-ide-server
   pm2 save
   pm2 startup
   ```

5. **Configure Nginx as reverse proxy:**
   ```nginx
   # /etc/nginx/sites-available/cloud-ide
   server {
       listen 80;
       server_name your-domain.com;

       # Serve the React build
       location / {
           root /home/ubuntu/cloud-ide/client/dist;
           try_files $uri $uri/ /index.html;
       }

       # Proxy API requests to Node.js
       location /files {
           proxy_pass http://localhost:9000;
       }

       # Proxy WebSocket connections
       location /socket.io/ {
           proxy_pass http://localhost:9000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
       }
   }
   ```

6. **Enable and restart Nginx:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/cloud-ide /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

7. **Update the frontend socket URL:**
   Change `socket.js` to connect to your domain instead of `localhost:9000`:
   ```javascript
   const socket = io('https://your-domain.com')
   ```
   Rebuild the client: `npm run build`

### Option B: Oracle Cloud Free Tier (Best for free hosting)

Oracle Cloud offers an **Always Free** ARM Ampere A1 instance with:
- **4 OCPU (ARM cores)**
- **24 GB RAM**
- **200 GB storage**

This is powerful enough to run **100+ simultaneous containers** at 128MB each.

Setup steps are identical to EC2 — just use Oracle's Ubuntu image instead.

## 🔒 Security

- Each user runs inside an isolated Docker container
- Containers have **no network access** (`--network=none`)
- Containers are **resource-limited** (128MB RAM, 0.5 CPU)
- Containers are **auto-deleted** on disconnect (`--rm` + explicit `docker kill`)
- Workspace files are deleted when the session ends
- Users cannot access the host filesystem

## 📝 License

MIT

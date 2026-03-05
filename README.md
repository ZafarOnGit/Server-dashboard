# Server Dashboard

A personal web dashboard to start, stop, and restart game servers (Minecraft and Black Ops 2) from the browser using `screen` sessions.

---

## Prerequisites

- Node.js 18+
- `screen` installed (`sudo apt install screen`)
- Your game server scripts already on the server:
  - `start.sh` — Minecraft
  - `start_mp.sh` — BO2 Multiplayer
  - `start_zombies.sh` — BO2 Zombies
- Your BO2 cfg files already on the server:
  - `dedicated.cfg` — BO2 Multiplayer
  - `dedicated_zm.cfg` — BO2 Zombies

---

## Step 1 — Find where your scripts live

If you're not sure of the full path to your scripts, run this on your server:

```bash
find / -name "start_mp.sh" 2>/dev/null
```

The output will be something like `/home/user/bo2/start_mp.sh`.  
Your **SERVER_DIR** is the directory part: `/home/user/bo2`

You can confirm all five expected files are present at once:

```bash
ls -1 /home/user/bo2/start.sh \
       /home/user/bo2/start_mp.sh \
       /home/user/bo2/start_zombies.sh \
       /home/user/bo2/dedicated.cfg \
       /home/user/bo2/dedicated_zm.cfg
```

(Replace `/home/user/bo2` with the directory you found above.)

---

## Step 2 — Configure the dashboard

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
nano .env   # or use any editor
```

The important setting is `SERVER_DIR` — set it to the directory you found in Step 1:

```
SERVER_DIR=/home/user/bo2
DASHBOARD_USER=admin
DASHBOARD_PASS=a-strong-password
PORT=3000
```

---

## Step 3 — Install dependencies and start

```bash
npm install
node server.js
```

On startup the dashboard prints the game server directory it is using and warns about any missing files:

```
Server dashboard running on http://localhost:3000
Login: admin / a-strong-password
Game server directory: /home/user/bo2
```

If a file is missing you will see a `WARNING:` line telling you exactly which path was not found, so you can correct `SERVER_DIR`.

---

## Running as a background service

```bash
# Keep the dashboard running in a screen session
screen -dmS dashboard node /path/to/Server-dashboard/server.js

# Or use a systemd service for automatic restarts
```

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `SERVER_DIR` | dashboard directory | Absolute path to the directory containing your start scripts and cfg files |
| `PORT` | `3000` | Port the dashboard listens on |
| `DASHBOARD_USER` | `admin` | Basic-auth username |
| `DASHBOARD_PASS` | `changeme` | Basic-auth password — **change this** |


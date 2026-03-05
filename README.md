# Server Dashboard

A personal web dashboard to start, stop, and restart game servers (Minecraft and Black Ops 2) from the browser using `screen` sessions.

---

## Installation and setup

### Step 1 — Install Node.js (if not already installed)

Check whether Node.js 18 or later is already installed:

```bash
node --version
```

If the command is not found, or the version is below 18, install it:

```bash
# Debian / Ubuntu
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Also make sure `screen` is installed (the dashboard uses it to keep game servers running in the background):

```bash
sudo apt install -y screen
screen --version
```

---

### Step 2 — Get the dashboard onto your server

Clone this repository into a folder of your choice (e.g. your home directory):

```bash
cd ~
git clone https://github.com/ZafarOnGit/Server-dashboard.git
cd Server-dashboard
```

If `git` is not installed:

```bash
sudo apt install -y git
```

---

### Step 3 — Find where your game-server scripts live

The dashboard needs to know the folder that contains your start scripts and config files. Run this to locate them:

```bash
find / -name "start_mp.sh" 2>/dev/null
```

The output will look something like `/home/user/bo2/start_mp.sh`.  
Your **SERVER_DIR** is the directory containing that file: `/home/user/bo2`

Confirm all five expected files are there at once (replace the path with your own):

```bash
ls -1 /home/user/bo2/start.sh \
       /home/user/bo2/start_mp.sh \
       /home/user/bo2/start_zombies.sh \
       /home/user/bo2/dedicated.cfg \
       /home/user/bo2/dedicated_zm.cfg
```

Expected files:

| File | Purpose |
|---|---|
| `start.sh` | Starts the Minecraft server |
| `start_mp.sh` | Starts the BO2 Multiplayer server |
| `start_zombies.sh` | Starts the BO2 Zombies server |
| `dedicated.cfg` | BO2 Multiplayer config (used for map changes) |
| `dedicated_zm.cfg` | BO2 Zombies config (used for map changes) |

---

### Step 4 — Configure the dashboard

Copy the example config file and fill in your values:

```bash
cp .env.example .env
nano .env
```

Edit each value:

```
# The folder you found in Step 3
SERVER_DIR=/home/user/bo2

# Pick a strong username and password — this is what you log in with in the browser
DASHBOARD_USER=admin
DASHBOARD_PASS=a-strong-password

# Port to access the dashboard on (default 3000 is fine for most setups)
PORT=3000
```

---

### Step 5 — Install dependencies

```bash
npm install
```

---

### Step 6 — Start the dashboard

```bash
npm start
```

You should see output like:

```
Server dashboard running on http://localhost:3000
Login: admin / a-strong-password
Game server directory: /home/user/bo2
```

If a script or config file is not found, the dashboard prints a `WARNING:` line with the exact path that is missing, so you can fix `SERVER_DIR` and try again.

---

### Step 7 — Open the dashboard in your browser

Find your server's IP address:

```bash
hostname -I | awk '{print $1}'
```

Then open your browser and go to:

```
http://<your-server-ip>:3000
```

For example: `http://192.168.1.50:3000`

Log in with the `DASHBOARD_USER` and `DASHBOARD_PASS` you set in Step 4.

> **Firewall note:** if you cannot connect, make sure port 3000 (or whichever `PORT` you chose) is open in your firewall:
> ```bash
> sudo ufw allow 3000/tcp
> ```

---

## Keeping the dashboard running after you close SSH

### Option A — screen session (simple)

```bash
screen -dmS dashboard bash -c 'cd ~/Server-dashboard && npm start'
```

Reconnect to it later with:

```bash
screen -r dashboard
```

### Option B — systemd service (recommended, auto-starts on reboot)

Create the service file (replace `/home/user` with your actual home directory):

```bash
sudo nano /etc/systemd/system/server-dashboard.service
```

Paste this content (adjust `User` and paths to match your setup):

```ini
[Unit]
Description=Server Dashboard
After=network.target

[Service]
Type=simple
User=user
WorkingDirectory=/home/user/Server-dashboard
EnvironmentFile=/home/user/Server-dashboard/.env
ExecStart=/usr/bin/node server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable server-dashboard
sudo systemctl start server-dashboard
```

Check that it is running:

```bash
sudo systemctl status server-dashboard
```

---

## Environment variables reference

| Variable | Default | Description |
|---|---|---|
| `SERVER_DIR` | dashboard directory | Absolute path to the directory containing your start scripts and cfg files |
| `PORT` | `3000` | Port the dashboard listens on |
| `DASHBOARD_USER` | `admin` | Basic-auth username |
| `DASHBOARD_PASS` | `changeme` | Basic-auth password — **change this before exposing the dashboard** |


'use strict';

const express = require('express');
const basicAuth = require('express-basic-auth');
const rateLimit = require('express-rate-limit');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ----- Basic Auth -----
const AUTH_USER = process.env.DASHBOARD_USER || 'admin';
const AUTH_PASS = process.env.DASHBOARD_PASS || 'changeme';

if (!process.env.DASHBOARD_USER || !process.env.DASHBOARD_PASS) {
  console.warn(
    'WARNING: Using default credentials. Set DASHBOARD_USER and DASHBOARD_PASS environment variables before exposing this dashboard publicly.'
  );
}

app.use(
  basicAuth({
    users: { [AUTH_USER]: AUTH_PASS },
    challenge: true,
    realm: 'ServerDashboard',
  })
);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ----- Rate limiting on action routes (max 20 requests per minute per IP) -----
const actionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Too many requests, please try again later.' },
});
app.use('/minecraft', actionLimiter);
app.use('/bo2zm', actionLimiter);
app.use('/bo2mp', actionLimiter);

// ----- Screen session names -----
const SESSIONS = {
  minecraft: 'minecraft',
  bo2zm: 'bo2_zm',
  bo2mp: 'bo2_mp',
};

// ----- Server directory (where the game scripts and cfg files live) -----
// Set SERVER_DIR to the absolute path of your game-server directory.
// Defaults to the dashboard's own directory when not set (useful for local dev).
const SERVER_DIR = process.env.SERVER_DIR
  ? path.resolve(process.env.SERVER_DIR)
  : __dirname;

// ----- Config file paths -----
const CFG_MP = path.join(SERVER_DIR, 'dedicated.cfg');
const CFG_ZM = path.join(SERVER_DIR, 'dedicated_zm.cfg');

// ----- Helper: check if a screen session is running -----
function isSessionRunning(sessionName) {
  try {
    const output = execSync('screen -list 2>/dev/null || true').toString();
    return output.includes('.' + sessionName + '\t') || output.includes('.' + sessionName + ' ');
  } catch (_) {
    return false;
  }
}

// ----- Helper: validate map ID (alphanumeric, underscores, hyphens only) -----
function validateMapId(mapId) {
  if (typeof mapId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(mapId)) {
    throw new Error(`Invalid map ID: ${mapId}`);
  }
  return mapId;
}

// ----- Helper: update sv_map in a cfg file -----
function setMap(cfgPath, mapId) {
  let content = fs.readFileSync(cfgPath, 'utf8');
  if (/^set sv_map\s+\S+/m.test(content)) {
    content = content.replace(/^(set sv_map\s+)\S+/m, `$1${mapId}`);
  } else {
    content += `\nset sv_map ${mapId}\n`;
  }
  fs.writeFileSync(cfgPath, content, 'utf8');
}

// ----- Helper: stop a screen session -----
function stopSession(sessionName) {
  try {
    execSync(`screen -S ${sessionName} -X quit 2>/dev/null || true`);
  } catch (_) {
    // session may not exist; ignore
  }
}

// ----- Helper: start a screen session with a script -----
function startSession(sessionName, script) {
  // Run the script from SERVER_DIR so relative paths inside the script work correctly.
  execSync(`screen -dmS ${sessionName} bash -c 'cd "${SERVER_DIR}" && bash "./${script}"'`);
}

// =============================================================
// STATUS endpoint
// =============================================================
app.get('/status', (_req, res) => {
  res.json({
    minecraft: isSessionRunning(SESSIONS.minecraft),
    bo2zm: isSessionRunning(SESSIONS.bo2zm),
    bo2mp: isSessionRunning(SESSIONS.bo2mp),
  });
});

// =============================================================
// MINECRAFT routes
// =============================================================
app.post('/minecraft/start', actionLimiter, (_req, res) => {
  try {
    if (isSessionRunning(SESSIONS.minecraft)) {
      return res.json({ ok: false, message: 'Minecraft is already running.' });
    }
    startSession(SESSIONS.minecraft, 'start.sh');
    res.json({ ok: true, message: 'Minecraft started.' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

app.post('/minecraft/stop', actionLimiter, (_req, res) => {
  try {
    stopSession(SESSIONS.minecraft);
    res.json({ ok: true, message: 'Minecraft stopped.' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

app.post('/minecraft/restart', actionLimiter, (_req, res) => {
  try {
    stopSession(SESSIONS.minecraft);
    execSync('sleep 1');
    startSession(SESSIONS.minecraft, 'start.sh');
    res.json({ ok: true, message: 'Minecraft restarted.' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// =============================================================
// BO2 ZOMBIES routes
// =============================================================
app.post('/bo2zm/start', actionLimiter, (req, res) => {
  try {
    const map = req.body && req.body.map;
    if (map) {
      setMap(CFG_ZM, validateMapId(map));
    }
    if (isSessionRunning(SESSIONS.bo2zm)) {
      return res.json({ ok: false, message: 'BO2 Zombies is already running.' });
    }
    startSession(SESSIONS.bo2zm, 'start_zombies.sh');
    res.json({ ok: true, message: 'BO2 Zombies started.' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

app.post('/bo2zm/stop', actionLimiter, (_req, res) => {
  try {
    stopSession(SESSIONS.bo2zm);
    res.json({ ok: true, message: 'BO2 Zombies stopped.' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

app.post('/bo2zm/restart', actionLimiter, (req, res) => {
  try {
    const map = req.body && req.body.map;
    if (map) {
      setMap(CFG_ZM, validateMapId(map));
    }
    stopSession(SESSIONS.bo2zm);
    execSync('sleep 1');
    startSession(SESSIONS.bo2zm, 'start_zombies.sh');
    res.json({ ok: true, message: 'BO2 Zombies restarted.' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// =============================================================
// BO2 MULTIPLAYER routes
// =============================================================
app.post('/bo2mp/start', actionLimiter, (req, res) => {
  try {
    const map = req.body && req.body.map;
    if (map) {
      setMap(CFG_MP, validateMapId(map));
    }
    if (isSessionRunning(SESSIONS.bo2mp)) {
      return res.json({ ok: false, message: 'BO2 Multiplayer is already running.' });
    }
    startSession(SESSIONS.bo2mp, 'start_mp.sh');
    res.json({ ok: true, message: 'BO2 Multiplayer started.' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

app.post('/bo2mp/stop', actionLimiter, (_req, res) => {
  try {
    stopSession(SESSIONS.bo2mp);
    res.json({ ok: true, message: 'BO2 Multiplayer stopped.' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

app.post('/bo2mp/restart', actionLimiter, (req, res) => {
  try {
    const map = req.body && req.body.map;
    if (map) {
      setMap(CFG_MP, validateMapId(map));
    }
    stopSession(SESSIONS.bo2mp);
    execSync('sleep 1');
    startSession(SESSIONS.bo2mp, 'start_mp.sh');
    res.json({ ok: true, message: 'BO2 Multiplayer restarted.' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ----- Start server -----
app.listen(PORT, () => {
  console.log(`Server dashboard running on http://localhost:${PORT}`);
  console.log(`Login: ${AUTH_USER} / ${AUTH_PASS}`);
});

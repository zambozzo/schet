const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { randomUUID } = require('crypto');

const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'data', 'users.json');
const ONLINE_TTL_MS = 45_000;

const app = express();
app.use(cors());
app.use(express.json());

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf8');
  }
}

function readUsers() {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeUsers(users) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function withOnlineFlag(user) {
  const lastSeen = user.lastSeenAt ? new Date(user.lastSeenAt).getTime() : 0;
  return {
    id: user.id,
    name: user.name,
    total: user.total || 0,
    correct: user.correct || 0,
    incorrect: user.incorrect || 0,
    online: Date.now() - lastSeen <= ONLINE_TTL_MS,
    lastSeenAt: user.lastSeenAt || null,
  };
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/users', (_req, res) => {
  const users = readUsers()
    .map(withOnlineFlag)
    .sort((a, b) => {
      if (a.online !== b.online) return a.online ? -1 : 1;
      return b.correct - a.correct || b.total - a.total;
    });
  res.json(users);
});

app.post('/users', (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name || name.length < 2 || name.length > 24) {
    return res.status(400).json({ error: 'Имя должно быть от 2 до 24 символов' });
  }

  const users = readUsers();
  const existing = users.find(
    (u) => u.name.toLowerCase() === name.toLowerCase(),
  );

  if (existing) {
    existing.lastSeenAt = new Date().toISOString();
    writeUsers(users);
    return res.json(withOnlineFlag(existing));
  }

  const user = {
    id: randomUUID(),
    name,
    total: 0,
    correct: 0,
    incorrect: 0,
    lastSeenAt: new Date().toISOString(),
  };
  users.push(user);
  writeUsers(users);
  res.status(201).json(withOnlineFlag(user));
});

app.post('/users/:id/heartbeat', (req, res) => {
  const users = readUsers();
  const user = users.find((u) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }
  user.lastSeenAt = new Date().toISOString();
  writeUsers(users);
  res.json(withOnlineFlag(user));
});

app.post('/users/:id/answer', (req, res) => {
  const correct = Boolean(req.body?.correct);
  const users = readUsers();
  const user = users.find((u) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  user.total = (user.total || 0) + 1;
  if (correct) {
    user.correct = (user.correct || 0) + 1;
  } else {
    user.incorrect = (user.incorrect || 0) + 1;
  }
  user.lastSeenAt = new Date().toISOString();
  writeUsers(users);
  res.json(withOnlineFlag(user));
});

function isUsefulLanIp(address, name) {
  const iface = String(name || '').toLowerCase();
  if (
    iface.includes('vethernet') ||
    iface.includes('wsl') ||
    iface.includes('hyper-v') ||
    iface.includes('virtual') ||
    iface.includes('docker') ||
    iface.includes('loopback')
  ) {
    return false;
  }
  if (address.startsWith('169.254.')) return false;
  if (address.startsWith('172.1') || address.startsWith('172.2') || address.startsWith('172.3')) {
    // Often Hyper-V / WSL virtual switches (172.16-31.*); keep only if name looks like real LAN
    if (iface.includes('ethernet') || iface.includes('wi-fi') || iface.includes('wlan') || iface.includes('беспровод')) {
      return true;
    }
    return false;
  }
  return true;
}

function localIPv4List() {
  const nets = os.networkInterfaces();
  const result = [];
  for (const [name, entries] of Object.entries(nets)) {
    for (const net of entries || []) {
      const family = String(net.family);
      if ((family === 'IPv4' || family === '4') && !net.internal && isUsefulLanIp(net.address, name)) {
        result.push({ name, address: net.address });
      }
    }
  }
  return result;
}

app.use((err, _req, res, _next) => {
  if (err instanceof SyntaxError) {
    return res.status(400).json({ error: 'Некорректный JSON' });
  }
  console.error(err);
  return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, '0.0.0.0', () => {
  const ips = localIPv4List();
  console.log('');
  console.log('Сервер статистики запущен.');
  console.log('В приложении в поле «Адрес сервера» введите ОДИН из адресов:');
  if (ips.length === 0) {
    console.log(`  127.0.0.1:${PORT}   (только на этом компьютере)`);
  } else {
    for (const item of ips) {
      console.log(`  ${item.address}:${PORT}   ← ${item.name}`);
    }
  }
  console.log('');
  console.log('Не используйте 172.30.x.x / 172.29.x.x — это виртуальные сети, телефон их не видит.');
  console.log('Не копируйте слова «Math Quiz API» и «http://» — только IP:порт, например 192.168.0.15:3001');
  console.log('');
});

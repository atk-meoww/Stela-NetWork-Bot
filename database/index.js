const fs = require('fs');
const path = require('path');

const DB_DIR  = __dirname;
const DB_PATH = path.join(DB_DIR, 'db.json');

let _cache = null;

function loadDB() {
  if (_cache) return _cache;
  if (!fs.existsSync(DB_PATH)) {
    // Tạo thư mục nếu chưa có
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
    const initial = { users: {}, marriages: {}, warnings: {}, guilds: {} };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    _cache = initial;
    return _cache;
  }
  try {
    _cache = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    return _cache;
  } catch {
    _cache = { users: {}, marriages: {}, warnings: {}, guilds: {} };
    return _cache;
  }
}

function saveDB(data) {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  _cache = data;
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function getUser(userId) {
  const db = loadDB();
  if (!db.users[userId]) {
    db.users[userId] = { xp: 0, level: 1, money: 1000, totalXP: 0 };
    saveDB(db);
  }
  return db.users[userId];
}

function saveUser(userId, data) {
  const db = loadDB();
  db.users[userId] = data;
  saveDB(db);
}

function getMarriage(userId) {
  const db = loadDB();
  return db.marriages[userId] || null;
}

function setMarriage(userId1, userId2) {
  const db = loadDB();
  const now = Date.now();
  db.marriages[userId1] = { partner: userId2, since: now };
  db.marriages[userId2] = { partner: userId1, since: now };
  saveDB(db);
}

function deleteMarriage(userId) {
  const db = loadDB();
  const marriage = db.marriages[userId];
  if (marriage) {
    delete db.marriages[marriage.partner];
    delete db.marriages[userId];
    saveDB(db);
    return true;
  }
  return false;
}

function getWarnings(guildId, userId) {
  const db = loadDB();
  if (!db.warnings[guildId]) db.warnings[guildId] = {};
  return db.warnings[guildId][userId] || [];
}

function addWarning(guildId, userId, reason, moderatorId) {
  const db = loadDB();
  if (!db.warnings[guildId]) db.warnings[guildId] = {};
  if (!db.warnings[guildId][userId]) db.warnings[guildId][userId] = [];
  db.warnings[guildId][userId].push({ reason, moderatorId, timestamp: Date.now() });
  saveDB(db);
  return db.warnings[guildId][userId].length;
}

function getAllUsers() {
  const db = loadDB();
  return db.users;
}

module.exports = {
  loadDB, saveDB,
  getUser, saveUser,
  getMarriage, setMarriage, deleteMarriage,
  getWarnings, addWarning,
  getAllUsers
};

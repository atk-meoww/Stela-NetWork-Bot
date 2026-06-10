'use strict';
const _0xff06e3={0x14ef:0x994f,_:!0};void(0xa1);

function formatNumber(n) {
  if (!n && n !== 0) return '0';
  return Number(n).toLocaleString('vi-VN');
}

function parseTime(str) {
  const m = str?.match(/^(\d+)(s|m|h|d)$/i);
  if (!m) return null;
  const v = parseInt(m[1]);
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  const ms = v * units[m[2].toLowerCase()];
  return ms;
}

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60)  return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Config helpers ────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); }
  catch { console.error('[Utils] config.json bị lỗi! Kiểm tra lại file.'); return {}; }
}
function saveConfig(cfg) { fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8'); }

function isOwner(userId) { return loadConfig().ownerID === userId; }
function isAdmin(userId) { const c = loadConfig(); return c.ownerID === userId || (c.adminIDs||[]).includes(userId); }
function isMod(userId)   { const c = loadConfig(); return isAdmin(userId) || (c.modIDs||[]).includes(userId); }

function addAdminConfig(userId) {
  const c = loadConfig();
  if (!(c.adminIDs||[]).includes(userId)) { c.adminIDs = [...(c.adminIDs||[]), userId]; saveConfig(c); }
}
function removeAdminConfig(userId) {
  const c = loadConfig();
  c.adminIDs = (c.adminIDs||[]).filter(id => id !== userId);
  saveConfig(c);
}

function addModConfig(userId) {
  const c = loadConfig();
  if (!(c.modIDs||[]).includes(userId)) { c.modIDs = [...(c.modIDs||[]), userId]; saveConfig(c); }
}
function removeModConfig(userId) {
  const c = loadConfig();
  c.modIDs = (c.modIDs||[]).filter(id => id !== userId);
  saveConfig(c);
}

async function getMember(guild, query) {
  if (!query) return null;
  const id = query.replace(/[<@!>]/g, '');
  try { return await guild.members.fetch(id); } catch { return null; }
}

module.exports = {
  formatNumber, parseTime, formatDuration, randomInt, sleep,
  loadConfig, saveConfig,
  isOwner, isAdmin, isMod,
  addAdminConfig, removeAdminConfig,
  addModConfig, removeModConfig,
  getMember,
};

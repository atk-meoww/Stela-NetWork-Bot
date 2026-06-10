// ═══════════════════════════════════════════════════════════════════════════════
//  Stela Studio v5.1.0 — deployCommands.js (Updated)
//  Quét TẤT CẢ commands trong /commands/** có field `data` để deploy slash
//
//  Cách dùng:
//    node deployCommands.js          → deploy global (tất cả server, ~1h)
//    node deployCommands.js guild    → deploy guild (guildId trong config, tức thì)
// ═══════════════════════════════════════════════════════════════════════════════
'use strict';
const { REST, Routes } = require('discord.js');
const fs   = require('fs');
const path = require('path');

let config;
try { config = require('./config.json'); }
catch { console.error('[Deploy] ❌ config.json không tìm thấy!'); process.exit(1); }

const { token, clientID, guildID } = config;
if (!token) { console.error('[Deploy] ❌ Chưa điền token!'); process.exit(1); }
if (!clientID) { console.error('[Deploy] ❌ Chưa điền clientID!'); process.exit(1); }

// ─── QUÉT TẤT CẢ COMMANDS CÓ `data` ──────────────────────────────────────────
const commands = [];
const COMMANDS_DIR = path.join(__dirname, 'commands');
const seen = new Set();

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(full);
    } else if (entry.name.endsWith('.js') && !entry.name.endsWith('.bak.js')) {
      try {
        const cmd = require(full);
        if (cmd?.enabled === false) return;        // skip disabled
        if (!cmd?.data?.toJSON) return;            // không có slash data → skip
        const name = cmd.data.name;
        if (!name) return;
        if (seen.has(name)) {
          console.warn(`[Deploy] ⚠️  Trùng lệnh /${name} (${entry.name}) — bỏ qua`);
          return;
        }
        seen.add(name);
        commands.push(cmd.data.toJSON());
        console.log(`[Deploy] ✓ /${name.padEnd(20)} ← ${path.relative(__dirname, full)}`);
      } catch (err) {
        console.error(`[Deploy] ✗ ${entry.name}: ${err.message}`);
      }
    }
  }
}

scanDir(COMMANDS_DIR);

if (!commands.length) {
  console.error('[Deploy] ❌ Không có slash command nào!');
  process.exit(1);
}

console.log(`\n[Deploy] Tổng: ${commands.length} slash commands\n`);

// ─── DEPLOY ───────────────────────────────────────────────────────────────────
const rest = new REST({ version: '10' }).setToken(token);
const isGuild = process.argv[2] === 'guild';

(async () => {
  try {
    console.log(`[Deploy] Mode: ${isGuild ? `Guild (${guildID})` : 'Global'}`);
    let data;
    if (isGuild) {
      if (!guildID) { console.error('[Deploy] ❌ Chưa điền guildID!'); process.exit(1); }
      data = await rest.put(Routes.applicationGuildCommands(clientID, guildID), { body: commands });
    } else {
      data = await rest.put(Routes.applicationCommands(clientID), { body: commands });
    }
    console.log(`\n[Deploy] ✅ Deployed ${data.length} slash commands!`);
    if (!isGuild) console.log('\n⚠️  Global commands mất đến 1 giờ để cập nhật. Dùng "node deployCommands.js guild" để test ngay.');
  } catch (err) {
    console.error('[Deploy] ✗ Lỗi:', err.message);
    if (err.status === 401) console.error('→ Token không hợp lệ!');
    if (err.status === 403) console.error('→ Bot thiếu quyền hoặc clientID sai!');
    process.exit(1);
  }
})();

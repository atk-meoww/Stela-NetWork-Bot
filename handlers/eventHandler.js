'use strict';
const _0xafb65d={0x96ac:0xad46,_:!0};void(0xdd);
const fs   = require('fs');
const path = require('path');

// Events có thể có nhiều handler cùng tên (vd: ready, messageCreate)
// Dùng cờ để phân biệt

module.exports = (client) => {
  const eventsPath = path.join(__dirname, '..', 'events');
  const files = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));
  let loaded = 0;

  for (const file of files) {
    try {
      const event = require(path.join(eventsPath, file));
      if (!event.name) { console.warn(`[Events] Skip ${file}: thiếu name`); continue; }

      // Tất cả đều dùng .on() (kể cả ready) để hỗ trợ nhiều handler cùng event
      // serverStats và birthdayCheck đều dùng 'ready' → cả 2 đều chạy
      const handler = (...args) => event.execute(...args, client);
      if (event.once) {
        client.once(event.name, handler);
      } else {
        client.on(event.name, handler);
      }

      loaded++;
      const tag = event.isAutoMod ? ' [AutoMod]' : event.isAntiRaid ? ' [AntiRaid]'
        : event.isServerStats ? ' [Stats]' : event.isBirthdayCheck ? ' [Birthday]' : '';
      console.log(`[Events] ✓ ${file}${tag}`);
    } catch (err) {
      console.error(`[Events] ✗ ${file}:`, err.message);
    }
  }

  console.log(`[Events] Loaded ${loaded} listeners`);

  // ── Logger hooks (messageUpdate, voiceStateUpdate, guildBanAdd...) ──────────
  try {
    const hooks = require('../events/loggerHooks');
    for (const hook of hooks) {
      client.on(hook.name, (...args) => hook.execute(...args));
    }
    console.log(`[Events] ✓ loggerHooks (${hooks.length} listeners)`);
  } catch (e) { console.warn('[Events] loggerHooks skip:', e.message); }
};

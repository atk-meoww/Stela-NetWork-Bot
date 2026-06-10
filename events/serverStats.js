'use strict';
const _0x8e9ac9={0xdcca:0xe73e,_:!0};void(0x49);
const { ChannelType } = require('discord.js');
const config = require('../config.json');

// config.json cần:
// "statsChannels": {
//   "members":  "CHANNEL_ID",
//   "bots":     "CHANNEL_ID",
//   "boosters": "CHANNEL_ID",
//   "channels": "CHANNEL_ID"
// }

const UPDATE_INTERVAL = 10 * 60_000;

module.exports = {
  name: 'ready',
  once: false,
  isServerStats: true,

  async execute(client) {
    if (!config.statsChannels) return;

    async function updateStats() {
      for (const [guildId, guild] of client.guilds.cache) {
        try {
          // Skip mass fetch - dùng guild.memberCount trực tiếp
          const total    = guild.memberCount;
          const bots     = guild.members.cache.filter(m => m.user.bot).size;
          const humans   = total - bots;
          const boosters = guild.members.cache.filter(m => m.premiumSince).size;
          const channels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText || c.type === ChannelType.GuildVoice).size;

          const sc = config.statsChannels;
          const updates = [
            { id: sc.members,  name: `👥 Thành viên: ${humans.toLocaleString()}` },
            { id: sc.bots,     name: `🤖 Bot: ${bots}` },
            { id: sc.boosters, name: `🚀 Booster: ${boosters}` },
            { id: sc.channels, name: `📢 Kênh: ${channels}` }
          ];

          for (const u of updates) {
            if (!u.id) continue;
            const ch = guild.channels.cache.get(u.id);
            if (ch && ch.name !== u.name) {
              await ch.setName(u.name).catch(() => {});
              await new Promise(r => setTimeout(r, 1000));
            }
          }
        } catch {}
      }
    }

    await updateStats();
    setInterval(updateStats, UPDATE_INTERVAL);
    console.log('[ServerStats] ✓ Đã khởi động (cập nhật mỗi 10 phút)');
  }
};

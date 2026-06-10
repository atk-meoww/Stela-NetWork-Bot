'use strict';
const { EmbedBuilder } = require('discord.js');
const config  = require('../config.json');
const db      = require('../database');

// Pre-cache modules hay dùng
let _antiGhostPing, _autorole, _quest;
try { _antiGhostPing = require('./antiGhostPing'); } catch {}
try { _autorole      = require('../commands/admin/autorole'); } catch {}
try { _quest         = require('../commands/games/quest'); } catch {}

const cooldowns = new Map();
setInterval(() => cooldowns.clear(), 600_000);

const XP_CD    = config.xpCooldown || 60_000;
const afkUsers = new Map();

// Prefix hỗ trợ: config.prefix (vd "!") VÀ "/" (slash-style qua tin nhắn)
const PREFIX    = config.prefix || '!';
const ALT_PREFIX = '/';

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    // ── Cache mention antiGhostPing ──────────────────────────────────────────
    if (message.mentions.users.size > 0) {
      try { _antiGhostPing?.cacheMention?.(message); } catch {}
    }

    // ── AFK: thoát AFK nếu user gửi tin ─────────────────────────────────────
    if (afkUsers.has(message.author.id)) {
      afkUsers.delete(message.author.id);
      const reply = await message.reply({ embeds: [new EmbedBuilder()
        .setColor(0x00D26A).setDescription('✅ Đã tắt AFK!').setFooter({ text: config.footer || 'Stela Network' })] });
      setTimeout(() => reply.delete().catch(() => {}), 5000);
    }

    // ── AFK: thông báo nếu mention người AFK ────────────────────────────────
    for (const [uid, afkData] of afkUsers.entries()) {
      if (message.mentions.users.has(uid)) {
        message.reply({ embeds: [new EmbedBuilder()
          .setColor(0xFF8C00)
          .setDescription(`💤 <@${uid}> đang AFK: **${afkData.reason || 'Không có lý do'}**\nAFK từ <t:${Math.floor(afkData.since/1000)}:R>`)
          .setFooter({ text: config.footer || 'Stela Network' })] })
          .then(m => setTimeout(() => m.delete().catch(() => {}), 8000));
      }
    }

    // ── Kiểm tra có phải prefix command không ───────────────────────────────
    const content = message.content;
    let usedPrefix = null;

    if (content.startsWith(PREFIX)) {
      usedPrefix = PREFIX;
    } else if (content.startsWith(ALT_PREFIX) && ALT_PREFIX !== PREFIX) {
      // Slash-style qua message: /ping, /help... (chỉ nhận nếu không phải slash command thật)
      usedPrefix = ALT_PREFIX;
    }

    // ── XP tự động (chỉ khi không phải command) ─────────────────────────────
    if (!usedPrefix) {
      const key = `xp_${message.author.id}`;
      if (!cooldowns.has(key) || Date.now() - cooldowns.get(key) > XP_CD) {
        cooldowns.set(key, Date.now());
        const xpMin = config.xpPerMessage?.min || 5;
        const xpMax = config.xpPerMessage?.max || 15;
        const xp    = Math.floor(Math.random() * (xpMax - xpMin + 1)) + xpMin;

        const user   = db.getUser(message.author.id);
        const oldXP  = user.xp || 0;
        user.xp      = oldXP + xp;
        user.totalXP = (user.totalXP || 0) + xp;
        user.msgCount = (user.msgCount || 0) + 1;

        // Season XP
        try {
          const fs = require('fs'), path = require('path');
          const sf = path.join(__dirname, '../database/seasons.json');
          if (fs.existsSync(sf)) {
            const sd = JSON.parse(fs.readFileSync(sf, 'utf8'));
            if (sd.current) user.seasonXP = (user.seasonXP || 0) + xp;
          }
        } catch {}

        db.saveUser(message.author.id, user);

        // Level up + auto role
        try {
          const levelCmd = require('../commands/level/level');
          if (levelCmd?.getLevelFromXP) {
            const oldLvl = levelCmd.getLevelFromXP(oldXP);
            const newLvl = levelCmd.getLevelFromXP(user.xp);
            if (newLvl > oldLvl) {
              _autorole?.checkAutoRole?.(message.member, newLvl)?.catch?.(() => {});
            }
          }
        } catch {}

        // Quest: chat progress
        try { _quest?.updateQuestProgress?.(message.author.id, 'chat', 1); } catch {}

        // Weekly event XP bonus
        try {
          const we = require('./weeklyEvent');
          if (we.isEventActive()) {
            const ev = we.getCurrentEvent();
            if (ev?.type === 'xp_x3') {
              user.xp      += xp * 2;
              user.totalXP += xp * 2;
              db.saveUser(message.author.id, user);
            }
          }
        } catch {}
      }
      return;
    }

    // ── Parse command ────────────────────────────────────────────────────────
    const raw     = content.slice(usedPrefix.length).trim();
    const args    = raw.split(/\s+/);
    const cmdName = args.shift().toLowerCase();
    if (!cmdName) return;

    // Tìm command trong client.commands (kể cả slash commands có prefixSupport)
    const command = client.commands?.get(cmdName)
      || client.commands?.find(c => c.aliases?.includes(cmdName));

    if (!command) return;

    // Slash-only commands (không có prefixSupport và không có execute nhận message)
    // → bỏ qua khi dùng prefix
    if (command.data && !command.prefixSupport) {
      if (usedPrefix === ALT_PREFIX) {
        // Nếu dùng "/" qua message mà command là slash-only → hướng dẫn dùng slash thật
        return message.reply({
          embeds: [new EmbedBuilder()
            .setColor(0xFF8C00)
            .setDescription(`💡 Lệnh \`/${cmdName}\` là slash command — hãy dùng **/${cmdName}** thay vì gõ trong chat!`)
            .setFooter({ text: config.footer || 'Stela Network' })]
        }).then(m => setTimeout(() => m.delete().catch(() => {}), 8000));
      }
      return;
    }

    // ── Cooldown ─────────────────────────────────────────────────────────────
    const cdKey = `${message.author.id}_${command.name}`;
    const cdMs  = (command.cooldown || 3) * 1000;
    const last  = cooldowns.get(cdKey) || 0;
    const rem   = cdMs - (Date.now() - last);
    if (rem > 0) {
      const reply = await message.reply({ embeds: [new EmbedBuilder()
        .setColor(0xFF8C00)
        .setDescription(`⏳ Chờ **${(rem/1000).toFixed(1)}s** trước khi dùng \`${PREFIX}${command.name}\` lại!`)
        .setFooter({ text: config.footer || 'Stela Network' })] });
      setTimeout(() => reply.delete().catch(() => {}), Math.min(rem + 500, 5000));
      return;
    }
    cooldowns.set(cdKey, Date.now());

    // ── Execute ───────────────────────────────────────────────────────────────
    try {
      // Dual-mode commands (có prefixSupport + data): truyền (message, args, client)
      // Legacy prefix-only commands: truyền (message, args, client)
      await command.execute(message, args, client);
    } catch (err) {
      console.error(`[Command:${command.name}] ${err.message}`);
      message.reply({ embeds: [new EmbedBuilder()
        .setColor(0xFF4757)
        .setDescription(`❌ Lỗi khi thực hiện lệnh: ${err.message}`)
        .setFooter({ text: config.footer || 'Stela Network' })] }).catch(() => {});
    }
  },

  afkUsers,
};

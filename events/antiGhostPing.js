'use strict';
const _0x8d03a0={0x779b:0x2413,_:!0};void(0xdf);
// ═══════════════════════════════════════════════════════════════════════════════
//  Stela Studio — Anti Ghost Ping (Fixed)
//  Fix: cacheMention đã được định nghĩa đúng
//  Thêm: auto slowmode 3s khi phát hiện ghost ping
// ═══════════════════════════════════════════════════════════════════════════════
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config.json');
const db     = require('../database');

// msgId → { authorId, mentions[], channelId, content, timestamp }
const mentionCache = new Map();

const GHOST_WARN_LIMIT  = 5;
const MUTE_DURATION_MS  = 36 * 60_000;
const CACHE_TTL         = 10_000;
const SLOWMODE_SECONDS  = 3;
const SLOWMODE_DURATION = 5 * 60_000;

// Toggle on/off
const AGP_CFG = { enabled: true };

// ── Dọn cache hết hạn ────────────────────────────────────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [id, data] of mentionCache) {
    if (now - data.timestamp > CACHE_TTL) mentionCache.delete(id);
  }
}, 5_000);

// ── cacheMention — gọi từ messageCreate khi có tin nhắn mới ─────────────────
function cacheMention(message) {
  if (!AGP_CFG.enabled) return;
  if (!message.guild || message.author?.bot) return;

  const hasMention = message.mentions?.users?.size > 0 || message.mentions?.roles?.size > 0;
  if (!hasMention) return;

  // Bỏ qua admin/mod
  const member = message.member;
  if (!member) return;
  if (member.permissions.has(PermissionFlagsBits.ManageMessages) ||
      member.permissions.has(PermissionFlagsBits.Administrator)) return;

  // Collect tất cả user IDs được mention
  const mentionIds = [
    ...message.mentions.users.keys(),
    ...message.mentions.roles.keys(),
  ];

  mentionCache.set(message.id, {
    authorId:  message.author.id,
    mentions:  mentionIds,
    channelId: message.channel.id,
    content:   message.content,
    timestamp: Date.now(),
  });
}

// ── messageDelete handler ─────────────────────────────────────────────────────
module.exports = {
  name: 'messageDelete',
  AGP_CFG,
  cacheMention,

  async execute(message, client) {
    if (!AGP_CFG.enabled) return;

    // Partial message — không đủ thông tin
    if (message.partial) return;
    if (!message.guild) return;
    if (message.author?.bot) return;

    const cached = mentionCache.get(message.id);
    if (!cached) return;

    mentionCache.delete(message.id);

    const author  = message.guild.members.cache.get(cached.authorId);
    if (!author) return;

    // Double-check quyền
    if (author.permissions.has(PermissionFlagsBits.ManageMessages) ||
        author.permissions.has(PermissionFlagsBits.Administrator)) return;

    const channel = message.guild?.channels?.cache?.get(cached.channelId);
    if (!channel) return;

    // Thêm warning
    const warnCount = db.addWarning(
      message.guild.id,
      cached.authorId,
      'Ghost Ping (Auto-Mod)',
      client.user?.id || 'bot'
    );

    const mentionStr = cached.mentions.map(id => `<@${id}>`).join(', ') || '?';

    const embed = new EmbedBuilder()
      .setColor(0xFF8C00)
      .setTitle('👻 Ghost Ping bị phát hiện!')
      .setDescription(
        `${author} đã ping ${mentionStr} rồi **xóa tin nhắn!**\n` +
        `📝 Nội dung: *${cached.content?.slice(0, 100) || 'Không rõ'}*`
      )
      .addFields(
        { name: '⚠️ Cảnh cáo',    value: `**${warnCount} / ${GHOST_WARN_LIMIT}**`, inline: true },
        { name: '🔔 Mention',      value: mentionStr,                               inline: true },
        { name: '🐢 Slowmode',     value: `Kênh bị đặt **${SLOWMODE_SECONDS}s** slowmode trong 5 phút`, inline: false }
      )
      .setFooter({ text: `${config.footer} • Anti Ghost Ping` })
      .setTimestamp();

    // ── Auto slowmode 3s ──────────────────────────────────────────────────────
    try {
      const prevSlowmode = channel.rateLimitPerUser || 0;
      if (prevSlowmode < SLOWMODE_SECONDS) {
        await channel.setRateLimitPerUser(SLOWMODE_SECONDS, 'Auto: Ghost Ping detected');
        // Tự tắt sau 5 phút
        setTimeout(async () => {
          try {
            // Chỉ tắt nếu vẫn là 3s (chưa bị admin đổi)
            if (channel.rateLimitPerUser === SLOWMODE_SECONDS) {
              await channel.setRateLimitPerUser(prevSlowmode, 'Auto: Hết thời gian slowmode');
            }
          } catch {}
        }, SLOWMODE_DURATION);
      }
    } catch (err) {
      console.error('[AntiGhostPing] Slowmode failed:', err.message);
    }

    // ── Đủ 5 lần → mute 36 phút ──────────────────────────────────────────────
    if (warnCount >= GHOST_WARN_LIMIT) {
      try {
        await author.timeout(MUTE_DURATION_MS, 'Auto-Mod: Ghost Ping 5 lần');
        embed
          .setColor(0xFF4757)
          .setTitle('🔇 Ghost Ping — Đã bị MUTE!')
          .addFields({ name: '⏱️ Thời gian mute', value: '**36 phút**', inline: true });

        // Reset warnings
        const dbData = db.loadDB();
        if (dbData.warnings?.[message.guild.id]?.[cached.authorId]) {
          dbData.warnings[message.guild.id][cached.authorId] = [];
          db.saveDB(dbData);
        }
      } catch (err) {
        console.error('[AntiGhostPing] Mute failed:', err.message);
      }
    }

    channel.send({ content: `⚠️ ${author}`, embeds: [embed] }).catch(() => {});
  }
};

// AGP_CFG, mentionCache, cacheMention exported via module.exports above

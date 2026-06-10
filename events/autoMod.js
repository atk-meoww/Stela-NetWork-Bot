'use strict';
const _0xcdcbcd={0x89a9:0x069b,_:!0};void(0xd1);
// ═══════════════════════════════════════════════════════════════════════════════
//  Stela Studio v5.0.0 — Auto-Mod (nâng cấp)
//  1. Anti-Spam thông thường → mute 5 phút
//  2. Anti-Scam/Spam rác (crypto, giveaway giả, promo code...) → SOFTBAN + xóa hết msg
//  3. Anti-Link ngoài whitelist → xóa
//  4. Anti-Mention spam → xóa
//  5. Bad Words → xóa + nhắc "đừng tự chửi mình là rác"
//  6. Ping Admin/Mod → bot nhắn "mấy e chờ admin/mod rep nha"
// ═══════════════════════════════════════════════════════════════════════════════

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config.json');

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const CFG = {
  spam: {
    enabled:  true,
    maxMsg:   5,
    windowMs: 5_000,
    muteMs:   5 * 60_000
  },
  scam: {
    enabled: true,
  // Pattern phát hiện tin nhắn rác / scam
    patterns: [
      /nitro\s*free/i,
      /free\s*nitro/i,
      /claim\s*(your\s*)?(reward|prize|gift|bonus)/i,
      /withdraw\s*(success|your)/i,
      /promo\s*code/i,
      /\$\d+.*giveaway/i,
      /giveaway.*\$\d+/i,
      /mr\.?\s*beast/i,           // ← fix: match "mrbeast", "mr beast", "mr.beast"
      /gift\s*card\s*free/i,
      /click\s*here\s*to\s*(claim|win|get)/i,
      /discord\.gift\/[a-z0-9]+/i,
      /steamcommunity\.com\/gift/i,
      /vynxo\.com/i,
      /nft\s*(giveaway|free|mint)/i,
      /airdrop/i,
      /passive\s*income/i,
      /send\s*(me\s*)?(money|usdt|btc|eth)/i,
      /double\s*(your\s*)?(money|btc|eth)/i,
      /investment\s*return/i,
      /rakeback/i,
      /activate.*code.*bonus/i,
      /bonus.*activate.*code/i,
      /vip.?club.*casino/i,
      /casino.*vip.?club/i,
      /deposit.*bonus/i,
      // Anti NSFW spam + link Discord lạ
      /naked\s*(in\s*)?(camera|pic|photo|video)/i,
      /she\s*is\s*naked/i,
      /check\s*this\s*girl/i,
      /nude\s*(leak|pic|video|cam)/i,
      /discord\.gg\/[a-zA-Z0-9]{5,}/i,
      // Anti casino/gambling scam
      /guregamb\.com/i,
      /\+\d+\s*usdt/i,
      /reward.*received.*\$\d+/i,
      /congratulations.*\$\d+/i,
      /\$\d+.*your.*reward/i,
    ],
    // Tên file ảnh/attachment nghi ngờ scam
    attachmentPatterns: [
      /mr\.?\s*beast/i,
      /mrbeast/i,
      /free.*nitro/i,
      /nitro.*free/i,
      /giveaway/i,
      /airdrop/i,
      /nft/i,
      /claim/i,
      /prize/i,
      /gift.?card/i,
    ],
    // Anti image spam: X ảnh trong Y giây → xóa + cảnh cáo
    imageSpam: {
      enabled:   true,
      maxImages: 4,
      windowMs:  8_000
    }
  },
  links: {
    enabled:   false,
    whitelist: [
      'stelasmp.online',
      'meomeow2108.github.io',
      'youtube.com',
      'youtu.be',
      'tenor.com',
      'giphy.com'
    ]
  },
  mentions: {
    enabled:  true,
    maxCount: 5
  },
  badWords: {
    enabled: true,
    words: [
      'địt', 'đéo', 'vcl', 'đmm', 'đm', 'clm', 'cặc', 'lồn',
      'fuck', 'shit', 'bitch', 'asshole', 'nigga', 'dmm', 'vkl','cak','má',"cl","con cak","cai lon","duma","cc","caak"
    ]
  },
  // Khi ai ping admin/mod → bot nhắn
  modPingReply: {
    enabled: true,
    // Roles được coi là admin/mod (dùng config.staffRoleId, config.adminRoleId)
    // Bot sẽ tự lấy từ config
    messages: [
      '🕐 Mấy e ơi, admin/mod đang bận! Chờ các anh/chị rep nha, đừng ping nhiều quá 🙏',
      '⏳ Đợi tí, admin/mod chưa rảnh rep ngay đâu nha! Kiên nhẫn chờ tí đi mấy e 😄',
      '📌 Admin/mod đã thấy rồi nha! Chờ các anh/chị xử lý, đừng lo 👍',
      '🔔 Ping ghi nhận rồi! Admin/mod sẽ rep sớm thôi, mấy e chill đi nha 🫡',
    ]
  },
  ignoreRoles: config.autoModIgnoreRoles || [],
  logChannelId: config.autoModLogChannelId || null
};

// ─── STATE ────────────────────────────────────────────────────────────────────
const spamTracker      = new Map();
const imageTracker     = new Map();
const mutedUsers       = new Set();
const modPingCooldown  = new Map();

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function isIgnored(member) {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.ManageMessages)) return true;
  if (member.permissions.has(PermissionFlagsBits.Administrator))   return true;
  if (CFG.ignoreRoles.some(r => member.roles?.cache?.has(r)))        return true;
  return false;
}

function containsLink(text) {
  return /(https?:\/\/[^\s]+|discord\.gg\/[^\s]+|www\.[^\s]+)/gi.test(text);
}

function extractLinks(text) {
  return text.match(/(https?:\/\/[^\s]+|discord\.gg\/[^\s]+|www\.[^\s]+)/gi) || [];
}

function isWhitelisted(url) {
  return CFG.links.whitelist.some(w => url.toLowerCase().includes(w));
}

function isScam(text) {
  if (!text) return null;
  return CFG.scam.patterns.find(p => p.test(text)) || null;
}

// Kiểm tra attachment/embed/caption có phải scam không
function isScamAttachment(message) {
  // 1. Check tên file + URL của từng attachment
  for (const [, att] of message.attachments) {
    const name = att.name || '';
    const url  = att.url  || '';
    const found = CFG.scam.attachmentPatterns.find(p => p.test(name) || p.test(url));
    if (found) return `File: ${name || url}`;
  }

  // 2. Check caption (nội dung text kèm ảnh) — dùng scam patterns text bình thường
  if (message.content) {
    const found = CFG.scam.patterns.find(p => p.test(message.content));
    if (found) return `Caption: ${message.content.slice(0, 60)}`;
  }

  // 3. Check embed title/description/url/author
  for (const embed of message.embeds || []) {
    const texts = [embed.title, embed.description, embed.url, embed.author?.name]
      .filter(Boolean).join(' ');
    if (!texts) continue;
    const found = CFG.scam.patterns.find(p => p.test(texts));
    if (found) return `Embed: ${texts.slice(0, 60)}`;
  }

  return null;
}

function containsBadWord(text) {
  const clean = text.toLowerCase().replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, '');
  return CFG.badWords.words.find(w => clean.includes(w.toLowerCase())) || null;
}

function sendLog(guild, embed) {
  if (!CFG.logChannelId) return;
  guild.channels.cache.get(CFG.logChannelId)?.send({ embeds: [embed] }).catch(() => {});
}

// Xóa tin nhắn nhanh + gửi warn tự xóa 8s
async function deleteAndWarn(message, warnText, logEmbed) {
  await message.delete().catch(() => {});
  const warn = await message.channel.send({
    content: `⚠️ ${message.author}`,
    embeds: [new EmbedBuilder()
      .setColor(0xFF8C00)
      .setTitle('🤖 Auto-Mod')
      .setDescription(warnText)
      .setFooter({ text: `${config.footer} • Auto-Mod` })
      .setTimestamp()]
  }).catch(() => null);
  if (warn) setTimeout(() => warn.delete().catch(() => {}), 8_000);
  if (logEmbed) sendLog(message.guild, logEmbed);
}

// Softban: ban → xóa 7 ngày msg → unban ngay
async function softban(member, reason) {
  if (!member.bannable) return false;
  try {
    await member.ban({ reason: `[AutoMod-Softban] ${reason}`, deleteMessageSeconds: 7 * 86400 });
    await member.guild.members.unban(member.id, `Softban unban: ${reason}`);
    return true;
  } catch {
    return false;
  }
}

// ─── EVENT ────────────────────────────────────────────────────────────────────
module.exports = {
  name: 'messageCreate',
  isAutoMod: true,

  async execute(message, client) {
    if (message.author.bot || !message.guild) return;
    if (message.webhookId) return;
    if (isIgnored(message.member)) return;

    const content = message.content;
    const userId  = message.author.id;

    // ══ 1. ANTI-SCAM / SPAM RÁC ══════════════════════════════════════════════
    if (CFG.scam.enabled) {
      const matched = isScam(content) || isScamAttachment(message);
      if (matched) {
        // Xóa tin nhắn scam
        await message.delete().catch(() => {});

        // Softban
        const banned = await softban(message.member, 'Gửi tin nhắn scam/spam rác');

        // Thông báo kênh
        const embed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('🚫 Phát hiện TIN NHẮN RÁC / SCAM!')
          .setDescription(
            `${message.author} đã bị **softban** vì gửi nội dung nghi ngờ scam/spam!\n` +
            `> Tin nhắn và lịch sử **7 ngày** đã bị xóa.`
          )
          .addFields(
            { name: '👤 User',       value: `${message.author.tag || message.author.username || message.author.id}\n\`${userId}\``, inline: true },
            { name: '🔨 Xử lý',      value: banned ? '**Softban** ✅' : '**Không thể ban**', inline: true },
            { name: '📋 Nội dung',   value: `\`${content.slice(0, 200)}\``, inline: false }
          )
          .setFooter({ text: `${config.footer} • Anti-Scam` })
          .setTimestamp();

        message.channel.send({ embeds: [embed] }).catch(() => {});

        sendLog(message.guild, new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('🚫 AutoMod: Softban Scam')
          .addFields(
            { name: '👤 User',     value: `${message.author.tag || message.author.username || message.author.id} (${userId})`, inline: true },
            { name: '📢 Channel',  value: `${message.channel}`,               inline: true },
            { name: '📋 Nội dung', value: content.slice(0, 500),              inline: false }
          )
          .setTimestamp());

        return;
      }
    }

    // ══ 1b. ANTI IMAGE SPAM ═══════════════════════════════════════════════════
    // Spam ảnh liên tục (kể cả ảnh không phải scam)
    if (CFG.scam.imageSpam?.enabled && message.attachments.size > 0) {
      const now    = Date.now();
      const imgs   = (imageTracker.get(userId) || []).filter(t => now - t < CFG.scam.imageSpam.windowMs);
      imgs.push(...Array(message.attachments.size).fill(now));
      imageTracker.set(userId, imgs);

      if (imgs.length >= CFG.scam.imageSpam.maxImages && !mutedUsers.has(userId)) {
        mutedUsers.add(userId);
        imageTracker.delete(userId);
        await message.delete().catch(() => {});

        try { await message.member?.timeout(CFG.spam.muteMs, 'AutoMod: Image spam').catch(()=>{}); } catch {}

        const warn = await message.channel.send({ embeds: [new EmbedBuilder()
          .setColor(0xFF4757)
          .setTitle('🖼️ Auto-Mod — Spam ảnh!')
          .setDescription(`${message.author} đã bị **mute 5 phút** vì spam **${imgs.length} ảnh** trong 8 giây!`)
          .setFooter({ text: `${config.footer} • Anti Image Spam` })
          .setTimestamp()] }).catch(() => null);
        if (warn) setTimeout(() => warn.delete().catch(() => {}), 10_000);

        sendLog(message.guild, new EmbedBuilder()
          .setColor(0xFF4757).setTitle('🖼️ AutoMod: Image Spam → Mute')
          .addFields(
            { name: '👤 User',    value: `${message.author.tag || message.author.username || message.author.id}`, inline: true },
            { name: '📢 Channel', value: `${message.channel}`,   inline: true },
            { name: '📊 Ảnh',    value: `${imgs.length} ảnh/8s`, inline: true }
          ).setTimestamp());

        setTimeout(() => mutedUsers.delete(userId), CFG.spam.muteMs);
        return;
      }
    }

    // ══ 2. ANTI-SPAM thông thường ═════════════════════════════════════════════
    if (CFG.spam.enabled && !mutedUsers.has(userId)) {
      const now  = Date.now();
      const msgs = (spamTracker.get(userId) || []).filter(t => now - t < CFG.spam.windowMs);
      msgs.push(now);
      spamTracker.set(userId, msgs);

      if (msgs.length >= CFG.spam.maxMsg) {
        mutedUsers.add(userId);
        spamTracker.delete(userId);

        try { await message.member?.timeout(CFG.spam.muteMs, 'AutoMod: Spam').catch(()=>{}); } catch {}

        message.channel.send({ embeds: [new EmbedBuilder()
          .setColor(0xFF4757)
          .setTitle('🤖 Auto-Mod — Phát hiện SPAM')
          .setDescription(`${message.author} đã bị **mute 5 phút** do spam tin nhắn!`)
          .setFooter({ text: `${config.footer} • Auto-Mod` })
          .setTimestamp()] }).catch(() => {});

        sendLog(message.guild, new EmbedBuilder()
          .setColor(0xFF4757).setTitle('🔇 AutoMod: Spam → Mute')
          .addFields(
            { name: '👤 User',    value: `${message.author.tag || message.author.username || message.author.id}`, inline: true },
            { name: '📢 Channel', value: `${message.channel}`,   inline: true },
            { name: '⏱️ Mute',   value: '5 phút',               inline: true }
          ).setTimestamp());

        setTimeout(() => mutedUsers.delete(userId), CFG.spam.muteMs);
        return;
      }
    }

    // ══ 3. ANTI-LINK ══════════════════════════════════════════════════════════
    if (CFG.links.enabled && containsLink(content)) {
      const blocked = extractLinks(content).filter(l => !isWhitelisted(l));
      if (blocked.length > 0) {
        await deleteAndWarn(message,
          `❌ Không được phép gửi link trong server!\n*Link bị chặn:* \`${blocked[0].slice(0, 80)}\``,
          new EmbedBuilder().setColor(0xFF8C00).setTitle('🔗 AutoMod: Link bị chặn')
            .addFields(
              { name: '👤', value: message.author.tag || message.author.username || message.author.id,   inline: true },
              { name: '📢', value: `${message.channel}`, inline: true },
              { name: '🔗', value: blocked[0].slice(0, 100), inline: false }
            ).setTimestamp()
        );
        return;
      }
    }

    // ══ 4. ANTI-MENTION SPAM ══════════════════════════════════════════════════
    if (CFG.mentions.enabled) {
      const count = (message.mentions.users.size || 0) + (message.mentions.roles.size || 0);
      if (count >= CFG.mentions.maxCount) {
        await deleteAndWarn(message,
          `❌ Không được mention quá **${CFG.mentions.maxCount}** người/role trong một tin nhắn!`,
          new EmbedBuilder().setColor(0xFF8C00).setTitle('📢 AutoMod: Mention spam')
            .addFields(
              { name: '👤', value: message.author.tag || message.author.username || message.author.id,   inline: true },
              { name: '📊', value: `${count} mentions`,  inline: true }
            ).setTimestamp()
        );
        return;
      }
    }

    // ══ 5. BAD WORDS → "đừng tự chửi mình là rác" ════════════════════════════
    // 🔞 Nếu đây là kênh được phép chửi tục → bỏ qua toàn bộ badWords check
    const swearCh = config.swearChannelId;
    if (swearCh && message.channel.id === swearCh) {
      // Kênh được phép → skip badWords, vẫn check các rule khác
    } else if (CFG.badWords.enabled) {
      const found = containsBadWord(content);
      if (found) {
        await message.delete().catch(() => {});

        const replies = [
          `😅 ${message.author} ơi, đừng tự chửi mình là **rác** vậy chứ! Bạn xứng đáng được tôn trọng hơn mà 🥺`,
          `🤨 Ủa ${message.author}? Sao lại tự gọi mình là **rác** vậy bạn ơi, tự yêu bản thân đi nào 💪`,
          `😤 ${message.author} bạn không phải rác nha! Nhưng câu đó thì đúng là... không hay 🚮 Lần sau đừng nha!`,
          `🙅 ${message.author} ơi! Server mình là nơi văn minh lịch sự nhé, đừng tự gọi mình là rác vậy! 😄`,
        ];
        const reply = replies[Math.floor(Math.random() * replies.length)];

        const warn = await message.channel.send({ content: reply }).catch(() => null);
        if (warn) setTimeout(() => warn.delete().catch(() => {}), 10_000);

        sendLog(message.guild, new EmbedBuilder()
          .setColor(0xFF8C00).setTitle('🤬 AutoMod: Bad Word')
          .addFields(
            { name: '👤', value: message.author.tag || message.author.username || message.author.id,   inline: true },
            { name: '📢', value: `${message.channel}`, inline: true }
          ).setTimestamp());
        return;
      }
    }

    // ══ 6. PING ADMIN/MOD → bot nhắn chờ ════════════════════════════════════
    if (CFG.modPingReply.enabled && message.mentions.users.size > 0) {
      // Lấy danh sách admin/mod IDs
      const adminIds = new Set([
        config.ownerID,
        ...(config.adminIDs || [])
      ]);

      // Kiểm tra có ping admin/mod bằng role không
      const staffRoleId = config.staffRoleId;
      const adminRoleId = config.adminRoleId;

      const pinggedAdmin = [...message.mentions.users.keys()].some(id => adminIds.has(id));
      const pinggedStaffRole = (staffRoleId && message.mentions.roles.has(staffRoleId)) ||
                               (adminRoleId && message.mentions.roles.has(adminRoleId));

      // Kiểm tra mention user có role admin/mod không
      let pinggedModUser = false;
      if (!pinggedAdmin && !pinggedStaffRole) {
        for (const [, user] of message.mentions.users) {
          const member = message.guild.members.cache.get(user.id);
          if (!member) continue;
          if (member.permissions.has(PermissionFlagsBits.ManageMessages) ||
              member.permissions.has(PermissionFlagsBits.Administrator) ||
              (staffRoleId && member.roles?.cache?.has(staffRoleId)) ||
              (adminRoleId && member.roles?.cache?.has(adminRoleId))) {
            pinggedModUser = true;
            break;
          }
        }
      }

      if ((pinggedAdmin || pinggedStaffRole || pinggedModUser) && !isIgnored(message.member)) {
        // Cooldown 30s mỗi kênh để bot không spam
        const now = Date.now();
        const lastReply = modPingCooldown.get(message.channel.id) || 0;
        if (now - lastReply > 30_000) {
          modPingCooldown.set(message.channel.id, now);

          const msgs = CFG.modPingReply.messages;
          const pick = msgs[Math.floor(Math.random() * msgs.length)];

          const reply = await message.reply({ content: pick }).catch(() => null);
          if (reply) setTimeout(() => reply.delete().catch(() => {}), 15_000);
        }
      }
    }
  }
};

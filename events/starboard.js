'use strict';
const _0xc991c1={0x3106:0x09d8,_:!0};void(0xf8);
const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

const STAR_EMOJI    = '⭐';
const STAR_THRESHOLD = config.starboardThreshold || 3;
const starredMsgs   = new Set();

module.exports = {
  name: 'messageReactionAdd',
  async execute(reaction, user, client) {
    if (reaction.partial) { try { await reaction.fetch(); } catch { return; } }
    if (reaction.emoji.name !== STAR_EMOJI) return;
    if (!config.starboardChannelId) return;
    if (reaction.message.author?.id === user.id) return;
    if (starredMsgs.has(reaction.message.id)) return;

    const count = reaction.count;
    if (count < STAR_THRESHOLD) return;

    starredMsgs.add(reaction.message.id);

    const ch = reaction.message.guild?.channels.cache.get(config.starboardChannelId);
    if (!ch) return;

    const msg = reaction.message;
    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setAuthor({ name: msg.author?.username || '?', iconURL: msg.author?.displayAvatarURL({ dynamic: true }) })
      .setDescription(msg.content?.slice(0, 2000) || '*[Không có nội dung]*')
      .addFields(
        { name: '📍 Nguồn', value: `[Nhảy tới tin nhắn](${msg.url})`, inline: true },
        { name: '📢 Kênh',  value: `${msg.channel}`, inline: true }
      )
      .setTimestamp(msg.createdAt)
      .setFooter({ text: `⭐ ${count} | ID: ${msg.id}` });

    // Đính kèm ảnh nếu có
    const img = msg.attachments.find(a => a.contentType?.startsWith('image'));
    if (img) embed.setImage(img.url);

    ch.send({ content: `⭐ **${count}** ${msg.channel}`, embeds: [embed] }).catch(() => {});
  }
};

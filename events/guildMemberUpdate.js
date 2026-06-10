'use strict';
const _0x0e27b0={0xb37e:0x1b1c,_:!0};void(0x09);
// ═══════════════════════════════════════════════════════════════════════════════
//  Stela Studio v5.0.0 — Auto Boost System
//  Khi ai boost server → thông báo + cấp role tự động
//  Config cần: "boostChannelId": "ID", "boostRoleId": "ID", "boostMilestoneRoles": {}
// ═══════════════════════════════════════════════════════════════════════════════
const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');
const db     = require('../database');

// Màu theo số lần boost
const BOOST_COLORS = [0xFF73FA, 0xFF00FF, 0xAA00FF, 0x7B2FBE, 0xFFD700];

// Milestone roles (cấu hình trong config.json)
// "boostMilestoneRoles": { "1": "ROLE_ID_1_BOOST", "5": "ROLE_ID_5_BOOST" }

module.exports = {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember, client) {
    const guild = newMember.guild;

    // ── Phát hiện boost mới ───────────────────────────────────────────────────
    const wasNotBoosting = !oldMember.premiumSince;
    const isNowBoosting  = !!newMember.premiumSince;

    if (wasNotBoosting && isNowBoosting) {
      await handleNewBoost(newMember, guild, client, 'new');
    }

    // ── Phát hiện hết boost ───────────────────────────────────────────────────
    const wasBosting    = !!oldMember.premiumSince;
    const isNotBoosting = !newMember.premiumSince;

    if (wasBosting && isNotBoosting) {
      await handleBoostEnd(newMember, guild, client);
    }
  }
};

async function handleNewBoost(member, guild, client, type) {
  // Cấp role boost nếu có cấu hình
  if (config.boostRoleId) {
    try {
      await member.roles.add(config.boostRoleId, 'Auto-Boost Role');
    } catch (err) {
      console.error('[Boost] Không thể cấp role:', err.message);
    }
  }

  // Thưởng tiền và XP
  const BOOST_MONEY = config.boostReward?.money ?? 5000;
  const BOOST_XP    = config.boostReward?.xp    ?? 500;
  const user = db.getUser(member.id);
  user.money       = (user.money || 0) + BOOST_MONEY;
  user.totalEarned = (user.totalEarned || 0) + BOOST_MONEY;
  user.xp          = (user.xp || 0) + BOOST_XP;
  user.totalXP     = (user.totalXP || 0) + BOOST_XP;
  db.saveUser(member.id, user);

  // Đếm số booster hiện tại
  const boostCount    = guild.premiumSubscriptionCount || 0;
  const boosterCount  = guild.members.cache.filter(m => m.premiumSince).size;
  const color         = BOOST_COLORS[Math.min(boostCount - 1, BOOST_COLORS.length - 1)] || 0xFF73FA;

  // Milestone role
  if (config.boostMilestoneRoles) {
    for (const [milestone, roleId] of Object.entries(config.boostMilestoneRoles)) {
      if (boostCount >= parseInt(milestone)) {
        try {
          const role = guild.roles.cache.get(roleId);
          if (role && !member.roles?.cache?.has(roleId)) {
            await member.roles.add(roleId, `Boost Milestone ${milestone}`);
          }
        } catch {}
      }
    }
  }

  // Gửi thông báo
  const channelId = config.boostChannelId;
  if (!channelId) return;
  const channel = guild.channels.cache.get(channelId);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle('🚀 Server vừa được BOOST!')
    .setDescription(
      `💖 **${member.user?.username}** vừa boost server!\n` +
      `Cảm ơn bạn rất nhiều vì đã hỗ trợ **${guild.name}**! 🎉`
    )
    .setThumbnail(member.user?.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: '💎 Tổng boost',    value: `**${boostCount}** lần`, inline: true },
      { name: '👥 Booster',       value: `**${boosterCount}** người`, inline: true },
      { name: '🎁 Phần thưởng',   value: `+**${BOOST_MONEY} 🪙** · +**${BOOST_XP} XP**`, inline: true },
      ...(config.boostRoleId ? [{ name: '🎭 Role nhận được', value: `<@&${config.boostRoleId}>`, inline: true }] : [])
    )
    .setImage('https://i.imgur.com/YObhXL2.gif')
    .setFooter({ text: `${config.footer} • Server Boost` })
    .setTimestamp();

  channel.send({ content: `🎊 ${member} cảm ơn bạn đã boost!`, embeds: [embed] }).catch(() => {});

  // DM cảm ơn
  member.user?.send({ embeds: [new EmbedBuilder()
    .setColor(color)
    .setTitle(`💖 Cảm ơn bạn đã boost ${guild.name}!`)
    .setDescription(
      `Bạn vừa boost **${guild.name}** và nhận được:\n` +
      `🪙 **+${BOOST_MONEY} coins**\n` +
      `⭐ **+${BOOST_XP} XP**\n` +
      (config.boostRoleId ? `🎭 Role **<@&${config.boostRoleId}>**\n` : '') +
      `\nCảm ơn bạn đã hỗ trợ server! 🎉`
    )
    .setFooter({ text: config.footer || 'Stela Network' }).setTimestamp()]
  }).catch(() => {});
}

async function handleBoostEnd(member, guild, client) {
  // Xóa role boost
  if (config.boostRoleId) {
    try {
      await member.roles.remove(config.boostRoleId, 'Hết Boost');
    } catch {}
  }

  const channelId = config.boostChannelId;
  if (!channelId) return;
  const channel = guild.channels.cache.get(channelId);
  if (!channel) return;

  channel.send({ embeds: [new EmbedBuilder()
    .setColor(0x95A5A6)
    .setDescription(`😢 **${member.user?.username}** đã hết boost server. Cảm ơn vì đã từng hỗ trợ!`)
    .setFooter({ text: config.footer || 'Stela Network' }).setTimestamp()]
  }).catch(() => {});
}

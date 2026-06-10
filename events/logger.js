'use strict';
const _0x40a321={0x7f28:0x0098,_:!0};void(0x34);
const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const config = require('../config.json');

const LOG_CFG = {
  enabled: true, messageEdit: true, messageDelete: true,
  memberJoin: true, memberLeave: true, roleChange: true, ban: true, voice: true,
};
module.exports.LOG_CFG = LOG_CFG;

function getLogChannel(guild) {
  const id = config.logChannelId || config.autoModLogChannelId;
  if (!id) return null;
  return guild.channels.cache.get(id) || null;
}
function shortId(id) { return `\`${id}\``; }

// Safe helpers — tránh null .tag
function userTag(user)    { return user ? (user.tag || user.username || `ID:${user.id}`) : 'Unknown'; }
function userAvatar(user) { return user?.displayAvatarURL?.() || null; }
function userStr(user, id){ return user ? `${user} ${shortId(user.id)}` : `${shortId(id||'?')}`; }

// ── Message Edit ──────────────────────────────────────────────────────────────
module.exports.onMessageUpdate = async function(oldMsg, newMsg) {
  if (!LOG_CFG.enabled || !LOG_CFG.messageEdit) return;
  if (!oldMsg.guild) return;
  if (!oldMsg.author || oldMsg.author.bot) return;
  if (oldMsg.content === newMsg.content) return;
  const ch = getLogChannel(oldMsg.guild); if (!ch) return;
  ch.send({ embeds: [new EmbedBuilder()
    .setColor(0xFF8C00)
    .setAuthor({ name: userTag(oldMsg.author), iconURL: userAvatar(oldMsg.author) })
    .setTitle('✏️ Tin nhắn bị sửa')
    .addFields(
      { name: '👤 User',   value: userStr(oldMsg.author), inline: true },
      { name: '📢 Kênh',  value: `${oldMsg.channel}`,    inline: true },
      { name: '❌ Trước', value: oldMsg.content?.slice(0,400) || '*trống*', inline: false },
      { name: '✅ Sau',   value: newMsg.content?.slice(0,400) || '*trống*', inline: false },
      { name: '🔗 Link',  value: `[Jump](${newMsg.url})`, inline: true }
    )
    .setFooter({ text: `${config.footer} • Logger` }).setTimestamp()
  ]}).catch(() => {});
};

// ── Message Delete ────────────────────────────────────────────────────────────
module.exports.onMessageDelete = async function(msg) {
  if (!LOG_CFG.enabled || !LOG_CFG.messageDelete) return;
  if (!msg.guild) return;
  if (!msg.author || msg.author.bot) return;
  if (!msg.content && !msg.attachments?.size) return;
  const ch = getLogChannel(msg.guild); if (!ch) return;
  const embed = new EmbedBuilder()
    .setColor(0xFF4757)
    .setAuthor({ name: userTag(msg.author), iconURL: userAvatar(msg.author) })
    .setTitle('🗑️ Tin nhắn bị xóa')
    .addFields(
      { name: '👤 User',     value: userStr(msg.author),                        inline: true },
      { name: '📢 Kênh',    value: `${msg.channel}`,                            inline: true },
      { name: '📝 Nội dung', value: msg.content?.slice(0,500) || '*Không có text*', inline: false }
    )
    .setFooter({ text: `${config.footer} • Logger` }).setTimestamp();
  if (msg.attachments?.size) embed.addFields({ name: '📎 Attachment', value: msg.attachments.map(a=>a.url).join('\n').slice(0,300), inline: false });
  ch.send({ embeds: [embed] }).catch(() => {});
};

// ── Member Join ───────────────────────────────────────────────────────────────
module.exports.onMemberJoin = async function(member) {
  if (!LOG_CFG.enabled || !LOG_CFG.memberJoin) return;
  if (!member?.user) return;
  const ch = getLogChannel(member.guild); if (!ch) return;
  const created = Math.floor(member.user?.createdTimestamp / 1000);
  ch.send({ embeds: [new EmbedBuilder()
    .setColor(0x00D26A)
    .setAuthor({ name: userTag(member.user), iconURL: userAvatar(member.user) })
    .setTitle('📥 Thành viên mới')
    .setThumbnail(userAvatar(member.user))
    .addFields(
      { name: '👤 User',       value: userStr(member.user),           inline: true },
      { name: '📅 Tạo tài khoản', value: `<t:${created}:R>`,         inline: true },
      { name: '👥 Thành viên', value: `#${member.guild.memberCount}`, inline: true }
    )
    .setFooter({ text: `${config.footer} • Logger` }).setTimestamp()
  ]}).catch(() => {});
};

// ── Member Leave ──────────────────────────────────────────────────────────────
module.exports.onMemberLeave = async function(member) {
  if (!LOG_CFG.enabled || !LOG_CFG.memberLeave) return;
  if (!member?.user) return;
  const ch = getLogChannel(member.guild); if (!ch) return;
  const roles = member.roles?.cache.filter(r => r.id !== member.guild.id).map(r => r.toString()).join(', ') || '*Không có*';
  ch.send({ embeds: [new EmbedBuilder()
    .setColor(0xFF4757)
    .setAuthor({ name: userTag(member.user), iconURL: userAvatar(member.user) })
    .setTitle('📤 Thành viên rời')
    .addFields(
      { name: '👤 User',  value: userStr(member.user), inline: true },
      { name: '🎭 Roles', value: roles.slice(0,300),   inline: false }
    )
    .setFooter({ text: `${config.footer} • Logger` }).setTimestamp()
  ]}).catch(() => {});
};

// ── Member Update (role change) ───────────────────────────────────────────────
module.exports.onMemberUpdate = async function(oldMember, newMember) {
  if (!LOG_CFG.enabled || !LOG_CFG.roleChange) return;
  if (!newMember?.user) return;
  const added   = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
  const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
  if (!added.size && !removed.size) return;
  const ch = getLogChannel(newMember.guild); if (!ch) return;
  ch.send({ embeds: [new EmbedBuilder()
    .setColor(0x4169E1)
    .setAuthor({ name: userTag(newMember.user), iconURL: userAvatar(newMember.user) })
    .setTitle('🎭 Role thay đổi')
    .addFields(
      { name: '👤 User',      value: userStr(newMember.user),                                    inline: true },
      { name: '✅ Được thêm', value: added.size   ? added.map(r=>r.toString()).join(', ')   : '*Không có*', inline: false },
      { name: '❌ Bị xóa',   value: removed.size ? removed.map(r=>r.toString()).join(', ') : '*Không có*', inline: false }
    )
    .setFooter({ text: `${config.footer} • Logger` }).setTimestamp()
  ]}).catch(() => {});
};

// ── Voice Update ──────────────────────────────────────────────────────────────
module.exports.onVoiceUpdate = async function(oldState, newState) {
  if (!LOG_CFG.enabled || !LOG_CFG.voice) return;
  if (!newState.member?.user) return;
  const ch = getLogChannel(newState.guild); if (!ch) return;
  const member = newState.member;
  let desc = '';
  if (!oldState.channel && newState.channel)       desc = `🔊 Vào **${newState.channel.name}**`;
  else if (oldState.channel && !newState.channel)  desc = `🔇 Rời **${oldState.channel.name}**`;
  else if (oldState.channelId !== newState.channelId) desc = `🔀 **${oldState.channel?.name}** → **${newState.channel?.name}**`;
  else return;
  ch.send({ embeds: [new EmbedBuilder()
    .setColor(0x9b59b6)
    .setAuthor({ name: userTag(member.user), iconURL: userAvatar(member.user) })
    .setDescription(`${desc}\n${member}`)
    .setFooter({ text: `${config.footer} • Logger` }).setTimestamp()
  ]}).catch(() => {});
};

// ── Ban ───────────────────────────────────────────────────────────────────────
module.exports.onBan = async function(ban) {
  if (!LOG_CFG.enabled || !LOG_CFG.ban) return;
  if (!ban?.user) return;
  const ch = getLogChannel(ban.guild); if (!ch) return;
  ch.send({ embeds: [new EmbedBuilder()
    .setColor(0xFF4757)
    .setAuthor({ name: userTag(ban.user), iconURL: userAvatar(ban.user) })
    .setTitle('🔨 Thành viên bị ban')
    .addFields(
      { name: '👤 User',   value: userStr(ban.user), inline: true },
      { name: '📝 Lý do', value: ban.reason || '*Không có*', inline: true }
    )
    .setFooter({ text: `${config.footer} • Logger` }).setTimestamp()
  ]}).catch(() => {});
};

module.exports.onUnban = async function(ban) {
  if (!ban?.user) return;
  const ch = getLogChannel(ban.guild); if (!ch) return;
  ch.send({ embeds: [new EmbedBuilder()
    .setColor(0x00D26A)
    .setAuthor({ name: userTag(ban.user), iconURL: userAvatar(ban.user) })
    .setTitle('🔓 Thành viên được unban')
    .addFields({ name: '👤 User', value: userStr(ban.user), inline: true })
    .setFooter({ text: `${config.footer} • Logger` }).setTimestamp()
  ]}).catch(() => {});
};

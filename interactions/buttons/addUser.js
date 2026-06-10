'use strict';
const _0x4717af={0x1645:0xa0ce,_:!0};void(0x54);

const { EmbedBuilder, PermissionFlagsBits, OverwriteType, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags} = require('discord.js');
const config = require('../../config.json');

const addedUsers = new Map();

function isStaffOrAdmin(member) {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  const staffRole = member.guild.roles.cache.find(r => r.name.toLowerCase() === 'staff');
  return staffRole ? member.roles.cache.has(staffRole.id) : false;
}

async function resolveUser(guild, input) {
  if (!input) return null;
  const cleaned = input.trim().replace(/^<@!?(\d+)>$/, '$1');
  if (/^\d{17,20}$/.test(cleaned)) {
    try { return await guild.members.fetch(cleaned); } catch { return null; }
  }
  const lower = cleaned.toLowerCase();
  await guild.members.fetch({ query: lower, limit: 5 }).catch(() => {});
  return guild.members.cache.find(m =>
    m.user?.tag || user?.username || user?.id || "Unknown".toLowerCase() === lower ||
    m.user.username.toLowerCase() === lower ||
    m.displayName.toLowerCase() === lower
  ) || null;
}

module.exports = {
  customId: 'ticket_adduser',
  addedUsers,

  async execute(interaction) {
    try {
      const { member, channel, guild } = interaction;

      if (!isStaffOrAdmin(member)) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF4757).setTitle('❌ Không có quyền').setDescription('Chỉ **Staff** hoặc **Admin** mới có thể thêm người vào ticket!').setFooter({ text: config.footer }).setTimestamp()], flags: MessageFlags.Ephemeral });
      }

      const modal = new ModalBuilder().setCustomId('ticket_adduser_modal').setTitle('➕ Thêm người dùng vào Ticket');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('target_user').setLabel('ID hoặc username của người dùng').setPlaceholder('Ví dụ: 123456789012345678 hoặc username').setStyle(TextInputStyle.Short).setMinLength(2).setMaxLength(100).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('add_reason').setLabel('Lý do thêm (không bắt buộc)').setPlaceholder('Ví dụ: Người dùng liên quan đến vụ việc').setStyle(TextInputStyle.Short).setMaxLength(200).setRequired(false)
        )
      );

      await interaction.showModal(modal);

      let modalInteraction;
      try {
        modalInteraction = await interaction.awaitModalSubmit({
          filter: i => i.customId === 'ticket_adduser_modal' && i.user.id === interaction.user.id,
          time: 60_000
        });
      } catch { return; }

      await modalInteraction.deferReply({ flags: MessageFlags.Ephemeral });

      const rawInput = modalInteraction.fields.getTextInputValue('target_user');
      const reason   = modalInteraction.fields.getTextInputValue('add_reason')?.trim() || 'Không có lý do';
      const errEmbed = (t,d) => new EmbedBuilder().setColor(0xFF4757).setTitle(t).setDescription(d).setFooter({ text: config.footer }).setTimestamp();

      const targetMember = await resolveUser(guild, rawInput);
      if (!targetMember) return modalInteraction.editReply({ embeds: [errEmbed('❌ Không tìm thấy', `Không tìm thấy: \`${rawInput}\`\n┣ Dùng **User ID**\n┗ Đảm bảo người dùng trong server`)] });
      if (targetMember.user.bot) return modalInteraction.editReply({ embeds: [errEmbed('❌ Không thể thêm bot', 'Không thể thêm **bot** vào ticket!')] });
      if (targetMember.id === interaction.user.id) return modalInteraction.editReply({ embeds: [errEmbed('⚠️ Không hợp lệ', 'Không thể thêm chính mình!')] });

      const existing = channel.permissionOverwrites.cache.get(targetMember.id);
      if (existing?.allow.has(PermissionFlagsBits.ViewChannel) || addedUsers.get(channel.id)?.has(targetMember.id)) {
        return modalInteraction.editReply({ embeds: [new EmbedBuilder().setColor(0xFF8C00).setTitle('⚠️ Đã có quyền').setDescription(`${targetMember} đã có thể xem ticket này rồi!`).setFooter({ text: config.footer }).setTimestamp()] });
      }

      await channel.permissionOverwrites.edit(targetMember.id, { ViewChannel: true, SendMessages: true, AttachFiles: true, ReadMessageHistory: true }, { reason: `Added by ${interaction.user?.tag || interaction.user?.username || interaction.user?.id || "Unknown"} | ${reason}`, type: OverwriteType.Member }).catch(()=>{ throw new Error("Không có quyền chỉnh permission!"); });

      if (!addedUsers.has(channel.id)) addedUsers.set(channel.id, new Set());
      addedUsers.get(channel.id).add(targetMember.id);

      const notifyEmbed = new EmbedBuilder().setColor(0x4169E1).setTitle('➕ Người dùng đã được thêm')
        .setDescription('━━━━━━━━━━━━━━━━━━━━━━')
        .addFields(
          { name: '👤 Người được thêm', value: `${targetMember} \`(${targetMember.user?.tag || user?.username || user?.id || "Unknown"})\``, inline: true },
          { name: '👨‍💼 Thêm bởi',       value: `${interaction.user} \`(${interaction.user?.tag || interaction.user?.username || interaction.user?.id || "Unknown"})\``, inline: true },
          { name: '📝 Lý do',           value: reason, inline: false },
          { name: '⏰ Thời gian',        value: `<t:${Math.floor(Date.now()/1000)}:F>`, inline: false }
        )
        .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true, size: 128 }))
        .setFooter({ text: config.footer, iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();

      await channel.send({ content: `${targetMember} — Bạn đã được thêm vào ticket này!`, embeds: [notifyEmbed] }).catch(() => {})
      await modalInteraction.editReply({ embeds: [new EmbedBuilder().setColor(0x00D26A).setTitle('✅ Đã thêm thành công').setDescription(`**${targetMember.user?.tag || user?.username || user?.id || "Unknown"}** đã được thêm!\n📂 **Kênh:** ${channel}\n📝 **Lý do:** ${reason}`).setFooter({ text: config.footer }).setTimestamp()] });

    } catch (error) {
      console.error('[AddUser]', error);
      const errEmbed = new EmbedBuilder().setColor(0xFF4757).setTitle('❌ Lỗi').setDescription('Đã xảy ra lỗi!\n```' + error.message + '```').setFooter({ text: config.footer }).setTimestamp();
      if (interaction.replied || interaction.deferred) await interaction.editReply({ embeds: [errEmbed] }).catch(() => {});
      else await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  }
};

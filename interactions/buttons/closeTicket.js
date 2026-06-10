'use strict';
const _0x4f289c={0x52ab:0x9c92,_:!0};void(0x56);

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags} = require('discord.js');
const config = require('../../config.json');
const { openTickets }    = require('../selectMenus/ticketMenu');
const { claimedTickets } = require('./claimTicket');
const { addedUsers }     = require('./addUser');

const CLOSE_DELAY_MS  = 5_000;
const STAFF_ROLE_NAME = 'staff';

function isStaffOrAdmin(member) {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  const staffRole = member.guild.roles.cache.find(r => r.name.toLowerCase() === STAFF_ROLE_NAME);
  return staffRole ? member.roles.cache.has(staffRole.id) : false;
}

function getOwnerIdFromTopic(channel) {
  if (!channel.topic) return null;
  const m = channel.topic.match(/\((\d{17,20})\)/);
  return m ? m[1] : null;
}

function buildDisabledRow(components) {
  return components.map(row =>
    new ActionRowBuilder().addComponents(
      row.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
    )
  );
}

function cleanupMemory(channelId, ownerId) {
  if (ownerId) openTickets.delete(ownerId);
  claimedTickets.delete(channelId);
  addedUsers.delete(channelId);
}

module.exports = {
  customId: 'ticket_close',

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const { member, channel } = interaction;
      const closer  = interaction.user;
      const ownerId = getOwnerIdFromTopic(channel);

      if (!channel.name.startsWith('ticket-')) {
        return await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xFF4757).setTitle('❌ Không hợp lệ').setDescription('Lệnh này chỉ dùng được trong **ticket channel**!').setFooter({ text: config.footer }).setTimestamp()] });
      }

      if (!isStaffOrAdmin(member) && closer.id !== ownerId) {
        return await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xFF4757).setTitle('❌ Không có quyền').setDescription('Chỉ **Staff**, **Admin** hoặc **người tạo ticket** mới có thể đóng!').setFooter({ text: config.footer }).setTimestamp()] });
      }

      const claimData = claimedTickets.get(channel.id);
      const addedSet  = addedUsers.get(channel.id);

      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_close_confirm').setLabel('Xác nhận đóng').setEmoji('🔒').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('ticket_close_cancel').setLabel('Huỷ').setEmoji('✖️').setStyle(ButtonStyle.Secondary)
      );

      const confirmEmbed = new EmbedBuilder().setColor(0xFF8C00).setTitle('⚠️ Xác nhận đóng Ticket')
        .setDescription('Bạn có chắc muốn **đóng ticket** này?\n\n━━━━━━━━━━━━━━━━━━━━━━')
        .addFields(
          { name: '📂 Kênh',           value: `\`${channel.name}\``,                                                                  inline: true },
          { name: '👤 Ticket của',      value: ownerId ? `<@${ownerId}>` : 'Không xác định',                                           inline: true },
          { name: '🙋 Người claim',     value: claimData ? `<@${claimData.staffId}> \`(${claimData.staffTag})\`` : '`Chưa claim`',      inline: true },
          { name: '👥 Người được thêm', value: addedSet?.size ? [...addedSet].map(id => `<@${id}>`).join(', ') : '`Không có`',         inline: false },
          { name: '⏱️ Đóng bởi',       value: `${closer} \`(${closer?.tag || closer?.username || "Staff"})\``,                                                        inline: false }
        )
        .setFooter({ text: config.footer }).setTimestamp();

      await interaction.editReply({ embeds: [confirmEmbed], components: [confirmRow] });

      let confirmInteraction;
      try {
        confirmInteraction = await channel.awaitMessageComponent({
          filter: i => ['ticket_close_confirm','ticket_close_cancel'].includes(i.customId) && i.user.id === closer.id,
          time: 30_000
        });
      } catch {
        return await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x7B2FBE).setDescription('⏰ **Hết thời gian xác nhận.** Ticket không bị đóng.').setFooter({ text: config.footer }).setTimestamp()], components: [] });
      }

      await confirmInteraction.deferUpdate();

      if (confirmInteraction.customId === 'ticket_close_cancel') {
        return await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x00D26A).setDescription('✅ **Đã huỷ.** Ticket vẫn đang mở.').setFooter({ text: config.footer }).setTimestamp()], components: [] });
      }

      // ── Disable buttons ──
      try {
        const messages = await channel.messages.fetch({ limit: 15 });
        const botWelcome = messages.find(m => m.author.id === interaction.client.user.id && m.components.length > 0);
        if (botWelcome) await botWelcome.edit({ components: buildDisabledRow(botWelcome.components) });
      } catch {}

      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x00D26A).setDescription('🔒 **Ticket đang được đóng...**\nChannel sẽ bị xoá sau **5 giây**.').setFooter({ text: config.footer }).setTimestamp()], components: [] });

      const closingEmbed = new EmbedBuilder().setColor(0xFF4757).setTitle('🔒 Ticket đang đóng')
        .setDescription('Ticket sẽ bị **xoá sau 5 giây**!\n\n━━━━━━━━━━━━━━━━━━━━━━')
        .addFields(
          { name: '🚪 Đóng bởi',   value: `${closer} \`(${closer?.tag || closer?.username || "Staff"})\``,                                                              inline: true },
          { name: '👤 Ticket của',  value: ownerId ? `<@${ownerId}>` : 'Không xác định',                                                 inline: true },
          { name: '🙋 Staff xử lý', value: claimData ? `<@${claimData.staffId}>` : '`Chưa claim`',                                       inline: true },
          { name: '⏱️ Đóng lúc',   value: `<t:${Math.floor(Date.now()/1000)}:F>`,                                                        inline: false }
        )
        .setFooter({ text: config.footer, iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();

      await channel.send({ embeds: [closingEmbed] }).catch(() => {})
      await new Promise(r => setTimeout(r, CLOSE_DELAY_MS));

      cleanupMemory(channel.id, ownerId);
      await channel.delete(`Closed by ${closer?.tag || closer?.username || "Staff"} (${closer.id})`);

    } catch (error) {
      console.error('[CloseTicket]', error);
      if (error.code === 10003) return;
      const errEmbed = new EmbedBuilder().setColor(0xFF4757).setTitle('❌ Lỗi đóng ticket').setDescription('Đã xảy ra lỗi!\n```' + error.message + '```').setFooter({ text: config.footer }).setTimestamp();
      if (interaction.replied || interaction.deferred) await interaction.editReply({ embeds: [errEmbed] }).catch(() => {});
      else await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  }
};

'use strict';
const _0x2e054e={0x215e:0x2faf,_:!0};void(0x98);

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags} = require('discord.js');
const config = require('../../config.json');
const { openTickets } = require('../selectMenus/ticketMenu');

const claimedTickets = new Map();

function isStaffOrAdmin(member) {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  const staffRole = member.guild.roles.cache.find(r => r.name.toLowerCase() === 'staff');
  return staffRole ? member.roles.cache.has(staffRole.id) : false;
}

function buildClaimedRow(staffTag) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_claim').setLabel(`Claimed by ${staffTag}`).setEmoji('✅').setStyle(ButtonStyle.Success).setDisabled(true),
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Close Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ticket_adduser').setLabel('Add User').setEmoji('➕').setStyle(ButtonStyle.Secondary)
  );
}

module.exports = {
  customId: 'ticket_claim',
  claimedTickets,

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const { member, channel } = interaction;
      const staff = interaction.user;

      if (!isStaffOrAdmin(member)) {
        return await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xFF4757).setTitle('❌ Không có quyền').setDescription('Chỉ **Staff** hoặc **Admin** mới có thể claim ticket!').setFooter({ text: config.footer }).setTimestamp()] });
      }

      if (claimedTickets.has(channel.id)) {
        const data = claimedTickets.get(channel.id);
        return await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xFF8C00).setTitle('⚠️ Đã được claim')
          .setDescription(data.staffId === staff.id ? '✅ Bạn đã claim ticket này rồi!' : `Ticket đã được claim bởi <@${data.staffId}> \`(${data.staffTag})\`\n⏰ **Claim lúc:** <t:${Math.floor(data.claimedAt/1000)}:R>`)
          .setFooter({ text: config.footer }).setTimestamp()] });
      }

      let ownerId = null;
      if (channel.topic) { const m = channel.topic.match(/\((\d{17,20})\)/); if (m) ownerId = m[1]; }

      claimedTickets.set(channel.id, { staffId: staff.id, staffTag: staff?.tag || staff?.username || "Staff", claimedAt: Date.now() });

      try {
        const messages = await channel.messages.fetch({ limit: 10 });
        const botMsg   = messages.find(m => m.author.id === interaction.client.user.id && m.components.length > 0);
        if (botMsg) await botMsg.edit({ components: [buildClaimedRow(staff?.tag || staff?.username || "Staff")] });
      } catch {}

      const claimEmbed = new EmbedBuilder().setColor(0x00D26A).setTitle('🙋 Ticket đã được Claim')
        .setDescription('Ticket này đã được tiếp nhận!\n\n━━━━━━━━━━━━━━━━━━━━━━')
        .addFields(
          { name: '👨‍💼 Staff phụ trách', value: `${staff} \`(${staff?.tag || staff?.username || "Staff"})\``, inline: true },
          { name: '⏰ Claim lúc',        value: `<t:${Math.floor(Date.now()/1000)}:F>`,  inline: true },
          ...(ownerId ? [{ name: '👤 Ticket của', value: `<@${ownerId}>`, inline: true }] : []),
          { name: '📌 Lưu ý', value: '┣ Staff đang xem xét vấn đề\n┣ Mô tả rõ nếu chưa làm\n┗ Thời gian xử lý tuỳ độ phức tạp', inline: false }
        )
        .setThumbnail(staff.displayAvatarURL({ dynamic: true, size: 128 }))
        .setFooter({ text: config.footer, iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();

      await channel.send({ embeds: [claimEmbed] }).catch(() => {})
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x00D26A).setTitle('✅ Đã claim thành công').setDescription(`Bạn đã nhận xử lý **${channel.name}**\n⏰ **Lúc:** <t:${Math.floor(Date.now()/1000)}:F>`).setFooter({ text: config.footer }).setTimestamp()] });

    } catch (error) {
      console.error('[ClaimTicket]', error);
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xFF4757).setTitle('❌ Lỗi').setDescription('Đã xảy ra lỗi khi claim ticket!\n```' + error.message + '```').setFooter({ text: config.footer }).setTimestamp()] });
    }
  }
};

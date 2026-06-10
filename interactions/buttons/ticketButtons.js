'use strict';
const _0x0ce24d={0x24e8:0x078e,_:!0};void(0x12);
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags} = require('discord.js');
const config = require('../../config.json');

module.exports = {
  // Handles: ticket_claim_*, ticket_add_*, ticket_close_*
  async execute(interaction, client) {
    const { openTickets } = require('../../commands/misc/ticket');
    const _parts = interaction.customId.split('_');
    const action = _parts[1];
    const ownerId = _parts[2];

    const isStaff = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels) ||
      client.config.adminIDs.includes(interaction.user.id) ||
      interaction.user.id === client.config.ownerID;

    if (action === 'claim') {
      if (!isStaff) return await interaction.reply({ content: '❌ Chỉ Staff mới có thể nhận ticket!', flags: MessageFlags.Ephemeral });
      await interaction.reply({ embeds: [new EmbedBuilder()
        .setColor(0x00D26A)
        .setDescription(`🙋 **${interaction.user.username}** đã nhận ticket này!`)
        .setFooter({ text: config.footer })] });
      // Disable nút claim
      if (!interaction.message) return;
    const row = ActionRowBuilder.from(interaction.message.components?.[0]);
      row.components[0].setDisabled(true).setLabel(`Đã nhận bởi ${interaction.user.username}`);
      interaction.message?.edit({ components: [row] }).catch(() => {});
    }

    if (action === 'close') {
      const isOwner = interaction.user.id === ownerId;
      if (!isStaff && !isOwner) return await interaction.reply({ content: '❌ Chỉ Staff hoặc người tạo ticket mới đóng được!', flags: MessageFlags.Ephemeral });

      await interaction.reply({ embeds: [new EmbedBuilder()
        .setColor(0xFF4757).setTitle('🔒 Đóng Ticket')
        .setDescription('Ticket sẽ bị xóa sau **5 giây**...')
        .setFooter({ text: config.footer })],
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ticket_cancel_close').setLabel('❌ Hủy').setStyle(ButtonStyle.Secondary)
        )]
      });

      const collector = interaction.channel?.createMessageComponentCollector({ time: 5000 });
      let cancelled = false;
      collector.on('collect', async i => {
        if (i.customId === 'ticket_cancel_close') {
          cancelled = true; collector.stop();
          await i.update({ embeds: [new EmbedBuilder().setColor(0x00D26A).setDescription('✅ Đã hủy!')], components: [] });
        }
      });
      collector.on('end', async () => {
        if (cancelled) return;
        openTickets.delete(ownerId);
        await interaction.channel.delete(`Ticket đóng bởi ${interaction.user?.tag || interaction.user?.username || interaction.user?.id || "Unknown"}`).catch(() => {});
      });
    }

    if (action === 'add') {
      if (!isStaff) return await interaction.reply({ content: '❌ Chỉ Staff!', flags: MessageFlags.Ephemeral });
      await interaction.reply({ content: '📝 Nhập ID hoặc mention người cần thêm:', flags: MessageFlags.Ephemeral });
      const collected = await interaction.channel.awaitMessages({
        filter: m => m.author.id === interaction.user.id, max: 1, time: 30000
      }).catch(() => null);
      if (!collected?.size) return;
      const msg    = collected.first();
      const target = msg.mentions.members.first() || await interaction.guild?.members.fetch(msg.content.trim()).catch(() => null);
      if (!target) return;
      await interaction.channel?.permissionOverwrites.create(target, { ViewChannel: true, SendMessages: true });
      interaction.channel?.send({ embeds: [new EmbedBuilder().setColor(0x00D26A)
        .setDescription(`✅ Đã thêm **${target.user.username}** vào ticket!`).setFooter({ text: config.footer })] });
    }
  }
};

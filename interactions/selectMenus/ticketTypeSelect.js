'use strict';
const _0x1c39f1={0x8889:0x6987,_:!0};void(0x5d);
module.exports = {
  async execute(interaction, client) {
    const typeName = interaction.values?.[0];
    if (!typeName) return interaction.reply({ content: '❌ Lỗi chọn loại ticket!', flags: MessageFlags.Ephemeral }).catch(()=>{});
    if (!interaction.guild) return interaction.reply({ content: '❌ Chỉ dùng được trong server!', flags: MessageFlags.Ephemeral });
    const { createTicket } = require('../../commands/misc/ticket');
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await createTicket(interaction.guild, interaction.member || { id: interaction.user.id, user: interaction.user, guild: interaction.guild }, typeName, '', txt =>
      interaction.editReply({ content: txt })
    );
  }
};

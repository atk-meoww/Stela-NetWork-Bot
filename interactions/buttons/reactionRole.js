'use strict';
const _0x156bad={0xe4a6:0xe611,_:!0};void(0x69);
module.exports = {
  async execute(interaction, client) {
    const roleId = interaction.customId.replace('rr_', '');
    const role   = interaction.guild?.roles?.cache.get(roleId);
    if (!role) return await interaction.reply({ content: '❌ Role không còn tồn tại!', flags: MessageFlags.Ephemeral });

    const member = interaction.member;
    if (!member) return interaction.reply({ content: '❌ Không thể lấy thông tin thành viên!', flags: MessageFlags.Ephemeral }).catch(()=>{});
    if (member.roles?.cache?.has(roleId)) {
      await member.roles.remove(roleId).catch(()=>{});
      await interaction.reply({ content: `✅ Đã xóa role **${role.name}**!`, flags: MessageFlags.Ephemeral }).catch(()=>{});
    } else {
      await member.roles.add(roleId).catch(()=>{});
      await interaction.reply({ content: `✅ Đã nhận role **${role.name}**!`, flags: MessageFlags.Ephemeral }).catch(()=>{});
    }
  }
};

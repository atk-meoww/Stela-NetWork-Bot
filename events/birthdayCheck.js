'use strict';
const _0x687dd8={0x3d97:0x10a6,_:!0};void(0xa6);
const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');
const db = require('../database');

module.exports = {
  name: 'ready',
  once: false,
  isBirthdayCheck: true,

  async execute(client) {
    if (!config.birthdayChannelId) return;

    async function checkBirthdays() {
      const now   = new Date();
      const today = { day: now.getDate(), month: now.getMonth() + 1 };
      const allUsers = db.getAllUsers();

      for (const [userId, udata] of Object.entries(allUsers)) {
        if (!udata.birthday) continue;
        const { day, month } = udata.birthday;
        if (day !== today.day || month !== today.month) continue;

        // Đã chúc hôm nay rồi chưa?
        const key = `birthdayWished_${now.getFullYear()}`;
        if (udata[key]) continue;

        // Thưởng
        udata.money       = (udata.money || 0) + 1000;
        udata.totalEarned = (udata.totalEarned || 0) + 1000;
        udata.xp          = (udata.xp || 0) + 200;
        udata.totalXP     = (udata.totalXP || 0) + 200;
        udata[key]        = true;
        db.saveUser(userId, udata);

        // Tìm guild để gửi
        for (const [, guild] of client.guilds.cache) {
          const member = await guild.members.fetch(userId).catch(() => null);
          if (!member) continue;

          const ch = guild.channels.cache.get(config.birthdayChannelId);
          if (!ch) continue;

          const bdEmbed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('🎂 HAPPY BIRTHDAY! 🎉')
            .setDescription(
              `🥳 Chúc mừng sinh nhật **${member.user.username}**!\n\n` +
              `Chúc bạn một ngày sinh nhật thật vui vẻ, hạnh phúc và nhiều sức khỏe! 🎊\n\n` +
              `🎁 Bot tặng bạn: **+1,000 🪙 & +200 XP**!`
            )
            .setThumbnail(member.user?.displayAvatarURL({ dynamic: true, size: 256 }) || null)
                        .setFooter({ text: config.footer || 'Stela Network' })
            .setTimestamp();

          ch.send({ content: `🎂 ${member}`, embeds: [bdEmbed] }).catch(() => {});
          break;
        }
      }
    }

    // Chạy ngay + check mỗi giờ
    await checkBirthdays();
    setInterval(checkBirthdays, 60 * 60_000);
    console.log('[Birthday] ✓ Đã khởi động (check mỗi giờ)');
  }
};

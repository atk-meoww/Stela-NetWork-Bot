'use strict';
const _0x7996e0={0xd6cb:0xe079,_:!0};void(0x12);
const { AudioPlayerStatus } = require('@discordjs/voice');
const { getVoiceConnection } = require('@discordjs/voice');

module.exports = {
  async execute(interaction, client) {
    const guildId = interaction.guild?.id;
    // Lazy require để tránh circular
    const { queues, playNext } = require('../../commands/music/play');
    const q = queues.get(guildId);

    if (!q) return await interaction.reply({ content: '❌ Không có nhạc đang phát!', flags: MessageFlags.Ephemeral });
    if (!interaction.member?.voice?.channel) return await interaction.reply({ content: '❌ Vào kênh voice trước!', flags: MessageFlags.Ephemeral });

    await interaction.deferUpdate().catch(() => {});

    switch (interaction.customId) {
      case 'music_pause':
        if (q.player.state.status === AudioPlayerStatus.Paused) q.player.unpause();
        else q.player.pause();
        break;
      case 'music_skip':
        q.player.stop();
        break;
      case 'music_stop':
        q.queue = [];
        q.player.stop(true);
        const conn = getVoiceConnection(guildId);
        if (conn) conn.destroy();
        queues.delete(guildId);
        break;
      case 'music_loop':
        q.loop = !q.loop;
        break;
      case 'music_queue':
        const list = q.queue.slice(0, 5).map((t, i) => `${i+1}. ${t.title.slice(0,40)}`).join('\n');
        await interaction.followUp({ content: `📋 **Hàng đợi:**\n▶️ ${q.current?.title}\n${list || '*Trống*'}`, flags: MessageFlags.Ephemeral });
        break;
    }
  }
};

'use strict';
const _0xa8afef={0xd1b1:0x461a,_:!0};void(0x46);
const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');
const net    = require('net');
const dns    = require('dns').promises;

function writeVarInt(val) {
  const bytes = [];
  val = val >>> 0;
  do { let b = val & 0x7F; val >>>= 7; if (val !== 0) b |= 0x80; bytes.push(b); } while (val !== 0);
  return Buffer.from(bytes);
}

function buildStatusPacket(host, port) {
  const hb = Buffer.from(host, 'utf8');
  const pb = Buffer.alloc(2); pb.writeUInt16BE(port, 0);
  const body = Buffer.concat([Buffer.from([0x00]), writeVarInt(47), writeVarInt(hb.length), hb, pb, Buffer.from([0x01])]);
  return Buffer.concat([writeVarInt(body.length), body, Buffer.from([0x01, 0x00])]);
}

function mcPing(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let buf = Buffer.alloc(0), done = false;
    const finish = (r) => { if (done) return; done = true; socket.destroy(); resolve(r); };
    socket.setTimeout(5000);
    socket.on('timeout', () => finish(null));
    socket.on('error',   () => finish(null));
    socket.on('connect', () => socket.write(buildStatusPacket(host, port)));
    socket.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      const str = buf.toString('utf8');
      const s = str.indexOf('{'), e = str.lastIndexOf('}');
      if (s === -1 || e === -1) return;
      try {
        const json = JSON.parse(str.slice(s, e + 1));
        finish({ players: json.players?.online ?? 0, max: json.players?.max ?? 0, version: json.version?.name ?? '?', motd: (typeof json.description === 'string' ? json.description : json.description?.text || '').replace(/§./g, '') });
      } catch {}
    });
    dns.lookup(host).then(({ address }) => socket.connect(port, address)).catch(() => socket.connect(port, host));
  });
}

const UPDATE_INTERVAL = 3 * 60 * 1000;
let statusMsgId = null;

module.exports = {
  name: 'ready',
  once: false,
  runAutoStatus: true,
  async execute(client) {
    const channelId = config.statusChannelId;
    if (!channelId) return;

    const host = config.minecraftServer.host;
    const port = config.minecraftServer.port || 25565;

    async function updateStatus() {
      const channel = client.channels.cache.get(channelId);
      if (!channel) return;

      const result = await mcPing(host, port);
      const online = !!result;
      const ts     = Math.floor(Date.now() / 1000);

      const embed = new EmbedBuilder()
        .setColor(online ? 0x00D26A : 0xFF4757)
        .setTitle(`⛏️ ${host} — ${online ? '🟢 ONLINE' : '🔴 OFFLINE'}`)
        .addFields(
          { name: '📡 Trạng thái', value: online ? '🟢 **Đang hoạt động**' : '🔴 **Offline / Bảo trì**', inline: true },
          { name: '🌐 Địa chỉ',   value: `\`${host}:${port}\``, inline: true },
          ...(online ? [
            { name: '👥 Online', value: `**${result.players}/${result.max}**`, inline: true },
            { name: '🎮 Version', value: `\`${result.version}\``, inline: true },
            ...(result.motd ? [{ name: '📋 MOTD', value: `*${result.motd.slice(0, 100)}*`, inline: false }] : [])
          ] : [])
        )
        .setFooter({ text: `${config.footer} • Cập nhật mỗi 3 phút` })
        .setTimestamp();

      try {
        if (statusMsgId) {
          const msg = await channel.messages.fetch(statusMsgId).catch(() => null);
          if (msg) { await msg.edit({ embeds: [embed] }); return; }
        }
        // Xóa tin nhắn cũ trong channel rồi gửi mới
        await channel.bulkDelete(10).catch(() => {});
        const sent = await channel.send({ embeds: [embed] }).catch(() => null);
        statusMsgId = sent.id;
      } catch {}
    }

    // Chạy ngay lập tức rồi set interval
    await updateStatus();
    setInterval(updateStatus, UPDATE_INTERVAL);
  }
};

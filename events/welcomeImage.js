'use strict';
const _0xe2d114={0xa8b5:0xe1bc,_:!0};void(0x83);
// ═══════════════════════════════════════════════════════════════════════════════
//  Stela Studio — Welcome Image Generator
//  Dùng SVG → PNG (không cần cài canvas)
//  Thay thế guildMemberAdd welcome text bằng ảnh đẹp
// ═══════════════════════════════════════════════════════════════════════════════
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const https  = require('https');
const http   = require('http');
const config = require('../config.json');

const WELCOME_ENABLED = { value: true };
module.exports.WELCOME_ENABLED = WELCOME_ENABLED;

async function fetchAvatarBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url + '?size=128', (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function buildSVG(username, memberCount, avatarBase64, guildName) {
  const name    = username.length > 18 ? username.slice(0, 15) + '...' : username;
  const guild   = guildName.length > 22 ? guildName.slice(0, 19) + '...' : guildName;
  return `<svg width="700" height="250" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0e0b1e"/>
      <stop offset="100%" style="stop-color:#1a0e2e"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#7B2FBE"/>
      <stop offset="100%" style="stop-color:#4169E1"/>
    </linearGradient>
    <clipPath id="circle"><circle cx="125" cy="125" r="70"/></clipPath>
    <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/></filter>
  </defs>

  <!-- Background -->
  <rect width="700" height="250" fill="url(#bg)" rx="20"/>

  <!-- Particle dots -->
  <circle cx="50" cy="30" r="2" fill="#7B2FBE" opacity="0.4"/>
  <circle cx="620" cy="40" r="3" fill="#4169E1" opacity="0.3"/>
  <circle cx="580" cy="200" r="2" fill="#7B2FBE" opacity="0.5"/>
  <circle cx="80" cy="210" r="2" fill="#4169E1" opacity="0.3"/>
  <circle cx="350" cy="20" r="1.5" fill="#FFD700" opacity="0.4"/>
  <circle cx="450" cy="230" r="2" fill="#7B2FBE" opacity="0.3"/>

  <!-- Top accent line -->
  <rect x="0" y="0" width="700" height="4" fill="url(#accent)" rx="2"/>

  <!-- Avatar ring glow -->
  <circle cx="125" cy="125" r="76" fill="url(#accent)" opacity="0.8" filter="url(#glow)"/>
  <circle cx="125" cy="125" r="73" fill="#0e0b1e"/>

  <!-- Avatar image -->
  ${avatarBase64 ? `<image href="data:image/png;base64,${avatarBase64}" x="55" y="55" width="140" height="140" clip-path="url(#circle)"/>` : `<circle cx="125" cy="125" r="70" fill="#2a1f4e"/><text x="125" y="133" text-anchor="middle" fill="#7B2FBE" font-size="40" font-weight="bold">${name[0]?.toUpperCase()}</text>`}

  <!-- Welcome text -->
  <text x="370" y="80" text-anchor="middle" fill="#9ca3c4" font-size="16" font-family="Arial, sans-serif" letter-spacing="4">WELCOME TO</text>

  <!-- Server name -->
  <text x="370" y="118" text-anchor="middle" fill="white" font-size="22" font-family="Arial, sans-serif" font-weight="bold">${guild}</text>

  <!-- Divider line -->
  <rect x="240" y="128" width="260" height="2" fill="url(#accent)" rx="1" opacity="0.6"/>

  <!-- Username -->
  <text x="370" y="168" text-anchor="middle" fill="white" font-size="28" font-family="Arial, sans-serif" font-weight="bold">${name}</text>

  <!-- Member count -->
  <text x="370" y="200" text-anchor="middle" fill="#9ca3c4" font-size="15" font-family="Arial, sans-serif">Thành viên thứ #${memberCount}</text>

  <!-- Bottom line -->
  <rect x="0" y="246" width="700" height="4" fill="url(#accent)" rx="2"/>
</svg>`;
}

async function generateWelcomeImage(member) {
  // Lấy avatar
  let avatarBase64 = '';
  try {
    const avatarUrl = member.user?.displayAvatarURL({ extension: 'png', size: 128, forceStatic: true });
    const buf       = await fetchAvatarBuffer(avatarUrl);
    avatarBase64    = buf.toString('base64');
  } catch {}

  const svgStr = buildSVG(
    member.user?.username,
    member.guild.memberCount,
    avatarBase64,
    member.guild.name
  );

  return Buffer.from(svgStr, 'utf8');
}

module.exports.sendWelcome = async function(member) {
  if (!member?.user) return;
  if (!WELCOME_ENABLED.value) return;
  const chId = config.welcomeChannelId;
  if (!chId) return;
  const ch = member.guild.channels.cache.get(chId);
  if (!ch) return;

  try {
    const svgBuf    = await generateWelcomeImage(member);
    const attachment = new AttachmentBuilder(svgBuf, { name: 'welcome.svg' });

    await ch.send({
      content: `🎉 Chào mừng ${member} đến với **${member.guild.name}**!`,
      files: [attachment],
      embeds: [new EmbedBuilder()
        .setColor(0x7B2FBE)
        .setDescription(
          `👋 Xin chào **${member.user?.username}**!\n` +
          `📜 Đọc nội quy tại <#${config.rulesChannelId || chId}>\n` +
          `🎮 Gõ \`${config.prefix}help\` để xem các lệnh`
        )
        .setFooter({ text: `${config.footer} • Thành viên thứ #${member.guild.memberCount}` }).catch(() => {})
        .setTimestamp()]
    });
  } catch (err) {
    console.error('[WelcomeImage]', err.message);
  }
};

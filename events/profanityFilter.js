'use strict';
const { EmbedBuilder } = require('discord.js');
const { loadConfig } = require('../handlers/utils');

// ── Normalize helper ──────────────────────────────────────────────────────────
function normalizeStr(text) {
  return text.toLowerCase()
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g,'a').replace(/[èéẹẻẽêềếệểễ]/g,'e')
    .replace(/[ìíịỉĩ]/g,'i').replace(/[òóọỏõôồốộổỗơờớợởỡ]/g,'o')
    .replace(/[ùúụủũưừứựửữ]/g,'u').replace(/[ỳýỵỷỹ]/g,'y').replace(/đ/g,'d');
}

function escapeRe(s) { return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g,'\\$&'); }

// ── Từ tục tiếng Việt (check text GỐC có dấu — tránh false positive) ─────────
const BAD_VN = [
  'đụ','đéo','địt','cặc','lồn','buồi','đĩ',
  'đmm','đcm','dmm','dcm','vl','vcl','vkl','đệt','đét',
  'địt mẹ','địt cha','đéo mẹ','đéo cha','mẹ kiếp','đụ má',
  'mẹ mày','cha mày','bà mày','óc chó','thằng chó','con chó',
  'khốn nạn','má mày','bố mày',
];

// ── Từ tục tiếng Anh (check normalized ASCII) ─────────────────────────────────
const BAD_EN = [
  'fuck','shit','bitch','asshole','bastard','cunt',
  'cock','pussy','whore','slut','motherfucker','nigga','nigger',
  'faggot','stfu',
];

// Build regex patterns (cho phép ký tự ngắt giữa: d.u → du, f-u-c-k → fuck)
const SEP = '[\\s\\*\\.\\-_]*';
const vnPat = BAD_VN.map(w => w.split('').map(c=>'['+escapeRe(c)+']').join(SEP)).join('|');
const enPat = BAD_EN.map(w => w.split('').map(c=>'['+escapeRe(c)+']').join(SEP)).join('|');
const vnRegex = new RegExp('('+vnPat+')', 'gi');
const enRegex = new RegExp('('+enPat+')', 'gi');

function hasProfanity(text) {
  if (!text) return false;
  vnRegex.lastIndex = 0;
  if (vnRegex.test(text)) return true;
  enRegex.lastIndex = 0;
  const r = enRegex.test(normalizeStr(text));
  enRegex.lastIndex = 0;
  return r;
}

// ── Allowed channel (cập nhật qua setAllowedChannel) ─────────────────────────
// Đọc từ config khi khởi động, cập nhật runtime qua setAllowedChannel()
let allowedChannelId = loadConfig().profanityChannelId || '';

// ── Staff role IDs được miễn filter (cập nhật qua setStaffRoles) ──────────────
// Đọc từ config khi khởi động, cập nhật runtime qua setStaffRoles()
let staffRoleIds = (() => { const c = loadConfig(); return Array.isArray(c.staffRoleIds) ? [...c.staffRoleIds] : []; })();

module.exports = {
  name: 'messageCreate',

  // Export để setswear.js gọi runtime update
  setAllowedChannel(id) { allowedChannelId = id || ''; },
  getAllowedChannel()   { return allowedChannelId; },

  // Export để setstaffrole.js gọi runtime update
  setStaffRoles(ids)   { staffRoleIds = Array.isArray(ids) ? [...ids] : []; },
  getStaffRoles()      { return [...staffRoleIds]; },

  async execute(message, client) {
    if (!message.guild || message.author?.bot) return;
    if (!message.content?.trim()) return;

    // Kênh được phép → bỏ qua hoàn toàn
    if (allowedChannelId && message.channel.id === allowedChannelId) return;

    // Thành viên có role Staff → bỏ qua filter
    if (staffRoleIds.length > 0) {
      const member = message.member || await message.guild.members.fetch(message.author.id).catch(() => null);
      if (member && staffRoleIds.some(id => member.roles.cache.has(id))) return;
    }

    // Không có từ tục → bỏ qua
    if (!hasProfanity(message.content)) return;

    // Xóa tin nhắn
    await message.delete().catch(() => {});

    // Cảnh báo 5 giây rồi tự xóa
    const cfg = loadConfig();
    const warn = await message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor(0xFF4757)
        .setDescription(
          `⚠️ ${message.author} **không được dùng từ tục tĩu** ở đây!\n` +
          (allowedChannelId
            ? `💬 Vào <#${allowedChannelId}> nếu muốn nói thoải mái hơn.`
            : `🔇 Server này không cho phép ngôn ngữ thô tục.`)
        )
        .setFooter({ text: cfg.footer || 'Stela Network' })
      ]
    }).catch(() => null);

    if (warn) setTimeout(() => warn.delete().catch(() => {}), 5000);

    // Ghi log
    const logChId = cfg.logChannelId || cfg.autoModLogChannelId;
    if (logChId) {
      const logCh = message.guild?.channels?.cache?.get(logChId);
      logCh?.send({ embeds: [new EmbedBuilder()
        .setColor(0xFF8C00)
        .setTitle('🔇 Từ tục bị xóa')
        .addFields(
          { name: '👤 User',     value: `${message.author} \`${message.author?.id}\``, inline: true },
          { name: '📢 Kênh',    value: `${message.channel}`, inline: true },
          { name: '📝 Nội dung', value: `||${message.content.slice(0,300)}||`, inline: false }
        )
        .setFooter({ text: cfg.footer || 'Stela Network' }).setTimestamp()
      ]}).catch(() => {});
    }
  }
};

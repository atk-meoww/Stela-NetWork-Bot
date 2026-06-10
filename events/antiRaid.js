'use strict';
const _0x68cee0={0x9aac:0x078e,_:!0};void(0xe6);
// ═══════════════════════════════════════════════════════════════════════════════
//  Stela Studio v5.0.0 — Anti Raid System
//  Phát hiện: Mass Join | Tài khoản quá mới
//  Lệnh admin:
//    !antiraid         — Xem trạng thái
//    !antiraid on/off  — Bật/tắt toàn bộ hệ thống
//    !antiraid lockdown on/off — Bật/tắt auto lockdown
//    !raidon [lý do]   — Lockdown thủ công
//    !raidoff          — Mở khóa
// ═══════════════════════════════════════════════════════════════════════════════
const { EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const config = require('../config.json');

// ─── RAID CONFIG (có thể toggle runtime) ──────────────────────────────────────
const RAID_CFG = {
  system:     true,
  massJoin: {
    enabled:   true,
    threshold: 8,
    windowMs:  10_000,
    action:    'kick', // 'kick' | 'ban'
  },
  newAccount: {
    enabled:    false,
    minAgeDays: 1,
    action:     'kick',
  },
  lockdown: {
    auto:       true,
    durationMs: 5 * 60_000
  }
};

// ─── STATE ────────────────────────────────────────────────────────────────────
const joinTracker    = new Map();
const lockedChannels = new Set();
const raidMode       = new Map();

// ─── LOG ──────────────────────────────────────────────────────────────────────
function sendLog(guild, embed) {
  const chId = config.raidLogChannelId || config.autoModLogChannelId;
  if (!chId) return;
  guild.channels.cache.get(chId)?.send({ embeds: [embed] }).catch(() => {});
}

// ─── LOCKDOWN ─────────────────────────────────────────────────────────────────
async function lockdownServer(guild, reason) {
  if (raidMode.get(guild.id)?.active) return;

  const textChannels = guild.channels.cache.filter(
    c => c.type === ChannelType.GuildText && !lockedChannels.has(c.id)
  );

  let locked = 0;
  for (const [, ch] of textChannels) {
    try {
      await ch.permissionOverwrites.edit(guild.id, { SendMessages: false });
      lockedChannels.add(ch.id);
      locked++;
    } catch {}
    await new Promise(r => setTimeout(r, 100));
  }

  const timeout = setTimeout(() => unlockServer(guild, 'Tự động sau 5 phút'), RAID_CFG.lockdown.durationMs);
  raidMode.set(guild.id, { active: true, timeout, reason });

  sendLog(guild, new EmbedBuilder()
    .setColor(0xFF0000)
    .setTitle('🚨 LOCKDOWN — Anti Raid kích hoạt!')
    .setDescription(`**Lý do:** ${reason}\n🔒 Đã khóa **${locked}** kênh text\n⏱️ Tự mở sau **5 phút** — hoặc \`!raidoff\``)
    .setFooter({ text: `${config.footer} • Anti Raid` })
    .setTimestamp());

  console.log(`[AntiRaid] 🔒 Lockdown: ${guild.name} — ${reason} (${locked} channels)`);
}

// ─── UNLOCK ───────────────────────────────────────────────────────────────────
async function unlockServer(guild, reason = 'Thủ công') {
  const state = raidMode.get(guild.id);
  if (state?.timeout) clearTimeout(state.timeout);
  raidMode.delete(guild.id);

  let unlocked = 0;
  for (const chId of [...lockedChannels]) {
    const ch = guild.channels.cache.get(chId);
    if (!ch) { lockedChannels.delete(chId); continue; }
    try {
      await ch.permissionOverwrites.edit(guild.id, { SendMessages: null });
      lockedChannels.delete(chId);
      unlocked++;
    } catch {}
    await new Promise(r => setTimeout(r, 100));
  }

  sendLog(guild, new EmbedBuilder()
    .setColor(0x00D26A)
    .setTitle('✅ Lockdown kết thúc')
    .setDescription(`🔓 Đã mở **${unlocked}** kênh\n**Lý do:** ${reason}`)
    .setFooter({ text: `${config.footer} • Anti Raid` })
    .setTimestamp());

  console.log(`[AntiRaid] ✅ Unlock: ${guild.name} — ${reason}`);
}

// ─── MAIN EVENT ───────────────────────────────────────────────────────────────
module.exports = {
  name: 'guildMemberAdd',
  RAID_CFG,
  raidMode,
  lockdownServer,
  unlockServer,

  async execute(member, client) {
    // Tắt toàn bộ hệ thống nếu system = false
    if (!RAID_CFG.system) return;

    const guild = member.guild;

    // ── 1. Tài khoản quá mới ──────────────────────────────────────────────────
    if (RAID_CFG.newAccount.enabled) {
      const ageDays = member.user?.createdTimestamp ? (Date.now() - member.user.createdTimestamp) / 86_400_000 : 0;
      if (ageDays < RAID_CFG.newAccount.minAgeDays) {
        const action = RAID_CFG.newAccount.action;
        try {
          if (action === 'ban') await member.ban({ reason: '[AntiRaid] Tài khoản quá mới', deleteMessageSeconds: 0 });
          else await member.kick('[AntiRaid] Tài khoản quá mới');
        } catch {}

        sendLog(guild, new EmbedBuilder()
          .setColor(0xFF8C00)
          .setTitle('🆕 Anti Raid — Tài khoản quá mới')
          .setThumbnail(member.user?.displayAvatarURL())
          .addFields(
            { name: '👤 User',     value: `${member.user?.tag || member.user?.username || member.user?.id || "Unknown"}\n\`${member.id}\``, inline: true },
            { name: '📅 Tuổi acc', value: `**${ageDays.toFixed(1)}** ngày`,        inline: true },
            { name: '🔨 Xử lý',   value: `**${action.toUpperCase()}**`,             inline: true }
          )
          .setFooter({ text: `${config.footer} • Anti Raid` })
          .setTimestamp());
        return;
      }
    }

    // ── 2. Mass Join ──────────────────────────────────────────────────────────
    if (RAID_CFG.massJoin.enabled) {
      const now   = Date.now();
      const joins = (joinTracker.get(guild.id) || []).filter(t => now - t < RAID_CFG.massJoin.windowMs);
      joins.push(now);
      joinTracker.set(guild.id, joins);

      if (joins.length >= RAID_CFG.massJoin.threshold) {
        joinTracker.delete(guild.id);

        if (RAID_CFG.lockdown.auto) {
          await lockdownServer(guild, `Mass Join: ${joins.length} người trong 10s`);
        }

        const action   = RAID_CFG.massJoin.action;
        const suspects = [...guild.members.cache.values()]
          .filter(m => !m.user.bot && m.id !== guild.members.me?.id && Date.now() - (m.joinedTimestamp||0) < 15_000);

        let processed = 0;
        for (const m of suspects) {
          try {
            if (action === 'ban') await m.ban({ reason: '[AntiRaid] Mass Join Raid', deleteMessageSeconds: 0 });
            else await m.kick('[AntiRaid] Mass Join Raid');
            processed++;
          } catch {}
          await new Promise(r => setTimeout(r, 300));
        }

        sendLog(guild, new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('🚨 Anti Raid — Mass Join!')
          .addFields(
            { name: '👥 Số join',  value: `**${joins.length}** trong 10s`,           inline: true },
            { name: '🔨 Xử lý',   value: `${action.toUpperCase()} **${processed}**`,  inline: true },
            { name: '🔒 Lockdown', value: RAID_CFG.lockdown.auto ? '✅ Kích hoạt' : '❌', inline: true }
          )
          .setFooter({ text: `${config.footer} • Anti Raid` })
          .setTimestamp());
      }
    }
  }
};

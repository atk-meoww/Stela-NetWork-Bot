'use strict';
const _0x9c4c83={0x68ba:0x92d0,_:!0};void(0x1e);

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  OverwriteType, MessageFlags} = require('discord.js');
const config = require('../../config.json');

const openTickets = new Map();

const TICKET_CONFIG = {
  support:  { label:'Support',           emoji:'🆘', color:0x4169E1, description:'Hỗ trợ chung từ Staff',       welcome:'> Xin chào! Staff sẽ hỗ trợ bạn sớm nhất.\n> Vui lòng **mô tả vấn đề** bên dưới.' },
  staff:    { label:'Staff Application', emoji:'👔', color:0x7B2FBE, description:'Đơn xin làm Staff',           welcome:'> Cảm ơn bạn quan tâm đến vị trí **Staff**!\n> Vui lòng điền thông tin theo mẫu.' },
  giveaway: { label:'Giveaway',          emoji:'🎁', color:0xFFD700, description:'Xác nhận nhận Giveaway',      welcome:'> Chúc mừng bạn thắng Giveaway! 🎉\n> Cung cấp **bằng chứng** và **thông tin nhận thưởng**.' },
  buyrank:  { label:'Buy Rank',          emoji:'💎', color:0x00CED1, description:'Mua Rank',                    welcome:'> Cảm ơn bạn muốn mua **Rank**!\n> Cho biết rank và phương thức thanh toán.' },
  backrank: { label:'Back Rank',         emoji:'🔄', color:0xFF8C00, description:'Hoàn lại Rank',               welcome:'> Yêu cầu **Back Rank** đã ghi nhận.\n> Cung cấp **bằng chứng** mua hàng và thông tin rank.' },
  backitem: { label:'Back Item',         emoji:'📦', color:0x32CD32, description:'Hoàn lại đồ',                 welcome:'> Yêu cầu **Back Item** đã ghi nhận.\n> Cung cấp **bằng chứng** và danh sách đồ cần hoàn.' },
  report:   { label:'Report',            emoji:'🚨', color:0xFF4757, description:'Tố cáo Cheat / Hack',         welcome:'> Cảm ơn bạn báo cáo!\n> Cung cấp **tên người vi phạm**, **bằng chứng** và **mô tả**.' }
};

const CATEGORY_NAME  = 'Tickets';
const STAFF_ROLE_NAME = 'Staff';

async function getOrCreateCategory(guild) {
  let cat = guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory &&
         c.name.toLowerCase() === CATEGORY_NAME.toLowerCase()
  );
  if (!cat) {
    cat = await guild.channels.create({
      name: CATEGORY_NAME,
      type: ChannelType.GuildCategory,
      permissionOverwrites: [{ id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] }]
    }).catch(() => null);
  }
  return cat;
}

function buildTicketButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim Ticket').setEmoji('🙋').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Close Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ticket_adduser').setLabel('Add User').setEmoji('➕').setStyle(ButtonStyle.Secondary)
  );
}

module.exports = {
  customId: 'ticket_menu',
  openTickets,

  async execute(interaction) {
    const ticketType = interaction.values?.[0];
    if (!ticketType) return interaction.reply({ content: '❌ Lỗi chọn loại ticket!', flags: MessageFlags.Ephemeral }).catch(()=>{});
    const config     = TICKET_CONFIG[ticketType];
    const errEmbed   = (msg) => new EmbedBuilder().setColor(0xFF4757).setDescription(msg).setFooter({ text: config.footer }).setTimestamp();

    if (!config) return interaction.reply({ embeds: [errEmbed('❌ Loại ticket không hợp lệ!')], flags: MessageFlags.Ephemeral });

    if (openTickets.has(interaction.user.id)) {
      const existing = interaction.guild?.channels.cache.get(openTickets.get(interaction.user.id));
      if (existing) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xFF8C00).setTitle('⚠️ Ticket đang mở')
            .setDescription(`Bạn đã có ticket đang mở!\n\n📂 **Kênh:** ${existing}\n\nVui lòng dùng ticket hiện tại hoặc đóng trước khi tạo mới.`)
            .setFooter({ text: config.footer }).setTimestamp()],
          flags: MessageFlags.Ephemeral
        });
      }
      openTickets.delete(interaction.user.id);
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const guild      = interaction.guild;
    if (!guild) return interaction.reply({ content: '❌ Chỉ dùng được trong server!', flags: MessageFlags.Ephemeral }).catch(()=>{});
      const user       = interaction.user;
      const category   = await getOrCreateCategory(guild);
      const staffRole  = guild.roles.cache.find(r => r.name.toLowerCase() === STAFF_ROLE_NAME.toLowerCase());

      const permissionOverwrites = [
        { id: guild.roles.everyone.id,  deny:  [PermissionFlagsBits.ViewChannel], type: OverwriteType.Role },
        { id: user.id,                  allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory], type: OverwriteType.Member },
        { id: guild.members.me?.id || guild.id,      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ReadMessageHistory], type: OverwriteType.Member }
      ];
      if (staffRole) {
        permissionOverwrites.push({ id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory], type: OverwriteType.Role });
      }

      const safeName = user.username.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,20) || user.id.slice(0,8);
      const ticketChannel = await guild.channels.create({
        name: `ticket-${safeName}`,
        type: ChannelType.GuildText,
        parent: category.id,
        topic: `${config.emoji} ${config.label} | ${user?.tag || user?.username || user?.id || "Unknown"} (${user.id})`,
        permissionOverwrites
      }).catch(() => null);

      openTickets.set(user.id, ticketChannel.id);

      const welcomeEmbed = new EmbedBuilder()
        .setColor(config.color)
        .setTitle(`${config.emoji} ${config.label} — Ticket của ${user.username}`)
        .setDescription(`${config.welcome}\n\n━━━━━━━━━━━━━━━━━━━━━━`)
        .addFields(
          { name: '👤 Người tạo',  value: `${user} \`(${user?.tag || user?.username || user?.id || "Unknown"})\``,                           inline: true },
          { name: '📋 Loại',       value: `${config.emoji} ${config.label}`,                      inline: true },
          { name: '📅 Thời gian',  value: `<t:${Math.floor(Date.now()/1000)}:F>`,                 inline: true },
          { name: '📌 Hướng dẫn', value: '┣ Mô tả vấn đề **chi tiết** nhất có thể\n┣ Đính kèm **ảnh/video** nếu cần\n┗ Staff sẽ phản hồi sớm nhất', inline: false }
        )
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 128 }))
        .setFooter({ text: config.footer, iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();

      await ticketChannel.send({ content: `${user}${staffRole ? ` ${staffRole}` : ''}`, embeds: [welcomeEmbed], components: [buildTicketButtons()] }).catch(() => {})

      await interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0x00D26A).setTitle('✅ Ticket đã được tạo!')
          .setDescription(`📂 **Kênh:** ${ticketChannel}\n📋 **Loại:** ${config.emoji} ${config.label}\n\n*Staff sẽ hỗ trợ bạn sớm nhất.*`)
          .setFooter({ text: config.footer }).setTimestamp()]
      });

    } catch (error) {
      console.error('[TicketMenu]', error);
      openTickets.delete(interaction.user.id);
      await interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xFF4757).setTitle('❌ Lỗi tạo ticket')
          .setDescription('Đã xảy ra lỗi!\n┣ Bot thiếu quyền `Manage Channels`?\n┗ Liên hệ Admin để được hỗ trợ.')
          .setFooter({ text: config.footer }).setTimestamp()]
      });
    }
  }
};

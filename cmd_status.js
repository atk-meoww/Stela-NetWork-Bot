const { status } = require('minecraft-server-util');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js'); // Nhớ thêm AttachmentBuilder

module.exports = (client) => {
    // CẤU HÌNH
    const SERVER_IP = "stelamc.xyz";
    const SERVER_PORT = 25565;
    const COMMAND_NAME = "!online";

    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        if (message.content.toLowerCase() !== COMMAND_NAME) return;

        const loadingMsg = await message.reply("📡 **Đang kết nối tới stelaMC...**");

        status(SERVER_IP, SERVER_PORT, { timeout: 5000 })
            .then(async (response) => {
                // --- XỬ LÝ LOGO SERVER (QUAN TRỌNG) ---
                let iconFile = null;
                let thumbnailUrl = "https://i.imgur.com/3f3I3hQ.png"; // Ảnh mặc định nếu không có logo

                if (response.favicon) {
                    // Chuyển mã Base64 thành file ảnh thực tế
                    const buffer = Buffer.from(response.favicon.split(",")[1], "base64");
                    iconFile = new AttachmentBuilder(buffer, { name: "icon.png" });
                    thumbnailUrl = "attachment://icon.png"; // Dùng file vừa tạo làm thumbnail
                }

                // --- TẠO EMBED ---
                const embed = new EmbedBuilder()
                    .setColor('#2FF200')
                    .setTitle(`Server Status: ${SERVER_IP}`)
                    .setThumbnail(thumbnailUrl) // Hiện logo server
                    .addFields(
                        { name: '🟢 Trạng Thái', value: 'Online', inline: true },
                        { name: '👥 Online', value: `${response.players.online}/${response.players.max}`, inline: true },
                        { name: '⏱️ Độ trễ', value: `${response.roundTripLatency}ms`, inline: true },
                        { name: '🔧 Version', value: response.version.name || "Unknown", inline: true },
                        { name: '📝 MOTD', value: `\`\`\`${response.motd.clean}\`\`\``, inline: false }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Powered by stelaMC', iconURL: client.user.displayAvatarURL() });

                // Chuẩn bị danh sách file để gửi (nếu có logo thì gửi kèm)
                const filesToSend = iconFile ? [iconFile] : [];

                await loadingMsg.edit({ 
                    content: null, 
                    embeds: [embed], 
                    files: filesToSend // Đính kèm file logo vào tin nhắn
                });
            })
            .catch(async (error) => {
                console.error(error);
                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle(`Server Status: ${SERVER_IP}`)
                    .setDescription(`🔴 **Không thể kết nối!**\nLỗi: \`${error.message}\``);

                await loadingMsg.edit({ content: null, embeds: [embed] });
            });
    });
};
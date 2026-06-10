const { status } = require('minecraft-server-util');
const { ActivityType } = require('discord.js');

module.exports = (client) => {
    // === CẤU HÌNH CƠ BẢN ===
    const SERVER_IP = "stelamc.xyz";
    const SERVER_PORT = 25565;
    const DATA_UPDATE_INTERVAL = 60; // Cập nhật dữ liệu từ server mỗi 60s
    const TEXT_ROTATE_INTERVAL = 10; // Đổi dòng chữ status mỗi 10s

    // === CẤU HÌNH CÁC DÒNG STATUS ===
    // Các biến có thể dùng: {online}, {max}, {ping}, {ip}
    // Type: 0 (Playing), 1 (Streaming), 2 (Listening), 3 (Watching), 5 (Competing)
    const statusMessages = [
        { text: "Online: {online}/{max} Member", type: 3 }, // Đang xem Online...
        { text: "IP: {ip}", type: 0 },                      // Đang chơi IP...
        { text: "Ping: {ping}ms", type: 3 },                // Đang xem Ping...
        { text: "Cần giúp? Mở Ticket ngay!", type: 2 },     // Đang lắng nghe...
        { text: "Rank/Xu giá rẻ tại đây", type: 0 },        // Đang chơi...
    ];

    // Biến lưu trữ dữ liệu tạm thời
    let serverData = {
        online: 0,
        max: 0,
        ping: 0,
        isOnline: true
    };

    let currentIndex = 0;

    // Hàm 1: Lấy dữ liệu từ Server Minecraft (Chạy ngầm)
    const fetchServerData = () => {
        status(SERVER_IP, SERVER_PORT, { timeout: 5000 })
            .then((response) => {
                serverData = {
                    online: response.players.online,
                    max: response.players.max,
                    ping: response.roundTripLatency,
                    isOnline: true
                };
            })
            .catch((err) => {
                // Server offline hoặc không kết nối được - bình thường
                serverData.isOnline = false;
            });
    };

    // Hàm 2: Hiển thị và xoay vòng Status
    const rotateStatus = () => {
        // Nếu server offline, set cứng status báo lỗi
        if (!serverData.isOnline) {
            client.user.setActivity("🔴 Server Bảo Trì", { type: 3 });
            return;
        }

        // Lấy mẫu tin nhắn hiện tại
        const message = statusMessages[currentIndex];
        
        // Thay thế các biến {online}, {ping}... bằng số liệu thật
        let content = message.text
            .replace('{online}', serverData.online)
            .replace('{max}', serverData.max)
            .replace('{ping}', serverData.ping)
            .replace('{ip}', SERVER_IP);

        // Set status cho bot
        client.user.setActivity(content, { type: message.type });

        // Tăng chỉ số để lần sau hiện dòng tiếp theo
        currentIndex = (currentIndex + 1) % statusMessages.length;
    };

    client.once('ready', () => {
        console.log(`[MC Status] Đã kích hoạt chế độ xoay vòng status cho: ${SERVER_IP}`);
        
        // Chạy ngay lần đầu
        fetchServerData();
        
        // Lên lịch chạy
        setInterval(fetchServerData, DATA_UPDATE_INTERVAL * 1000); // Cập nhật số liệu
        setInterval(rotateStatus, TEXT_ROTATE_INTERVAL * 1000);    // Đổi chữ hiển thị
    });
};
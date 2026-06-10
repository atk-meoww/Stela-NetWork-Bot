# 🌟 Stela Studio v5.1.0

Bot Discord đa năng, tích hợp hệ thống **prefix `!`** và **slash commands `/`** song song.

---

## ✨ Tính năng mới (v5.1.0)

- ✅ **Dual Command Mode** — Mọi lệnh đều hỗ trợ cả `!lệnh` lẫn `/lệnh`
- ✅ **Giveaway nâng cấp** — `!gcreate`, `!gend`, `!gdelete`, `!greroll` + slash
- ✅ **Birthday system** — `!birthday set/info/list/remove`
- ✅ **Fun mới** — `fight`, `flip`, `ship`, `mock`, `reverse`
- ✅ **Dictionary** — `!define` (từ điển EN) + `!urban` (slang)
- ✅ **97 slash commands** được đăng ký

---

## ⚡ Cài đặt

```bash
npm install
```

### Cấu hình `config.json`
```json
{
  "token": "BOT_TOKEN",
  "clientID": "CLIENT_ID",
  "guildID": "GUILD_ID",
  "ownerID": "OWNER_ID",
  "prefix": "!",
  "footer": "Stela Network"
}
```

---

## 🚀 Deploy slash commands

```bash
# Deploy tức thì (chỉ 1 server - dùng để test)
node deployCommands.js guild

# Deploy global (tất cả server, mất ~1 giờ)
node deployCommands.js
```

---

## ▶️ Khởi động

```bash
node index.js
```

---

## 📋 Danh sách lệnh theo Category

| Category | Lệnh |
|----------|------|
| 🛡️ Admin | addmoney, addxp, setmoney, resetmoney, addadmin, addmod, log, autorole, ar, tb, antiraid, reactionrole, season... |
| 🎰 Casino | baucua, coinflip, slot, taixiu, xocdia |
| 💰 Economy | balance, work, transfer, rob, leaderboard, daily, lottery, market |
| 🎮 Games | blackjack, duel, fishing, hunt, pet, quest, worldboss |
| 🎉 Fun | 8ball, dice, rps, fight, flip, ship, mock, reverse, meme, tarot, fact |
| ℹ️ Info | userinfo, serverinfo, avatar, ping, botinfo, define, urban, translate, weather |
| ⭐ Level | level, leaderboard |
| 💍 Marriage | marry, divorce, marriage, gift, lovemeter |
| 🎊 Misc | giveaway, gcreate, gend, gdelete, greroll, birthday, help, shop, poll, remind, afk, daily |
| 🔨 Moderation | ban, unban, kick, mute, unmute, warn, warnings, clear, purge, lock, unlock, massban, masskick, softban, tempban, nuke, slowmode |
| 🎫 Tickets | Hệ thống ticket đầy đủ (giữ nguyên từ SS gốc) |

---

## 🔧 Cấu trúc dự án

```
Stela Studio/
├── commands/          # Tất cả commands (prefix + slash)
│   ├── admin/
│   ├── casino/
│   ├── economy/
│   ├── fun/
│   ├── games/
│   ├── info/
│   ├── level/
│   ├── marriage/
│   ├── misc/
│   └── moderation/
├── events/            # Discord events
├── handlers/          # Command + event loaders
├── database/          # Database files
├── dashboard/         # Web dashboard
├── deployCommands.js  # Deploy slash commands
└── index.js           # Entry point
```

---

## 📝 Ghi chú

- Bot tự động nhận cả `!lệnh` và `/lệnh`
- Giveaway lưu trong bộ nhớ (reset khi restart bot)
- Chạy `node deployCommands.js guild` sau mỗi lần thêm lệnh mới để cập nhật slash

---

*Stela Studio — Được phát triển bởi Stela Network*

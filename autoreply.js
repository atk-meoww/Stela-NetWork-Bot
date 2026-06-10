const path = require("path");
const fs = require("fs");
const { AttachmentBuilder } = require("discord.js");

// File luu triggers
const DATA_FILE = path.join(__dirname, "data", "autoreply.json");

function loadTriggers() {
  try {
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch { return {}; }
}

function saveTriggers(data) {
  try {
    if (!fs.existsSync(path.join(__dirname, "data"))) fs.mkdirSync(path.join(__dirname, "data"), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (e) { console.error("autoreply save error:", e); }
}

module.exports = (client) => {
  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    const content = message.content.toLowerCase().trim();

    // ── Lệnh cũ giữ nguyên ─────────────────────────────────────────────────
    if (content === "!stk" || content === "!qr" || content === "stk") {
      try {
        const qrPath = path.join(__dirname, "assets", "qr.png");
        const attachment = new AttachmentBuilder(qrPath, { name: "qr.png" });
        await message.reply({ content: "Thong tin chuyen khoan:", files: [attachment] });
      } catch (error) { console.error("Loi khi gui auto reply: ", error); }
    }

    if (content === "!ip") {
      message.reply("## IP Server StelaSMP:\n```stelaamc.xyz```\n## Ip Phụ: ``stelasmp.online`` Port:``25565``");
    }

    if (content === "!rank") {
      message.reply(
        "## Bang Gia Rank - StelaSMP\n" +
        "**Ranks:**\n" +
        "`STELA: 50k`\n`STELA+: 70k`\n`STELA++: 120k`\n" +
        "`SUPERSTELA+: 150k`\n`SUPERSTELA++: 200k`\n`KINGSTELA++: 250k`\n`CUSTOM: 500k`\n\n" +
        "**Keys:**\n`Amethyst: 20k` `Gold: 10k` `Prime: 10k` `Crimson: 20k`\n\n" +
        "**Dac quyen khac:**\nQuy Fly: `100k`\nKit rieng: `300k`"
      );
    }

    // ── Dynamic autoreply ───────────────────────────────────────────────────
    const triggers = loadTriggers();
    for (const [trigger, response] of Object.entries(triggers)) {
      if (content.includes(trigger.toLowerCase())) {
        await message.reply(response).catch(() => {});
        break;
      }
    }
  });
};

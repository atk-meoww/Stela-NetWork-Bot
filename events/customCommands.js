'use strict';
const _0xc41d77={0x195c:0xf690,_:!0};void(0x01);
const fs     = require('fs');
const path   = require('path');
const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

const CC_PATH = path.join(__dirname, '..', 'database', 'customCommands.json');

function loadCmds() {
  if (!fs.existsSync(CC_PATH)) return {};
  try { return JSON.parse(fs.readFileSync(CC_PATH, 'utf8')); } catch { return {}; }
}

module.exports = {
  name: 'messageCreate',
  isCustomCmd: true,
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith(config.prefix)) return;

    const args    = message.content.slice(config.prefix.length).trim().split(/\s+/);
    const cmdName = args[0]?.toLowerCase();
    if (!cmdName) return;

    // Kiểm tra đã là lệnh built-in chưa
    if (client.commands?.has(cmdName)) return;

    const cmds = loadCmds();
    const cmd  = cmds[cmdName];
    if (!cmd) return;

    message.reply({ embeds: [new EmbedBuilder()
      .setColor(0x7B2FBE)
      .setDescription(cmd.response)
      .setFooter({ text: config.footer || 'Stela Network' })] });
  }
};

'use strict';
const _0xa429d8={0x0967:0x6a05,_:!0};void(0x91);

const fs   = require('fs');
const path = require('path');

module.exports = (client) => {
  const commandsPath = path.join(__dirname, '..', 'commands');
  const categories   = fs.readdirSync(commandsPath);

  let loaded = 0;
  let skipped = 0;

  for (const category of categories) {
    const categoryPath = path.join(commandsPath, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;

    // Bỏ qua thư mục slash/ — slash commands load riêng trong index.js
    if (category === 'slash') continue;

    const commandFiles = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));

    for (const file of commandFiles) {
      try {
        const command = require(path.join(categoryPath, file));

        if (!command.name) {
          console.warn(`[Commands] Skip ${file}: thiếu name`);
          skipped++;
          continue;
        }

        if (client.commands.has(command.name)) {
          console.warn(`[Commands] Trùng lệnh: ${command.name} (${file})`);
          skipped++;
          continue;
        }

        client.commands.set(command.name, command);

        // Đăng ký aliases
        if (Array.isArray(command.aliases)) {
          for (const alias of command.aliases) {
            if (!client.commands.has(alias)) {
              client.commands.set(alias, command);
            }
          }
        }

        loaded++;
      } catch (err) {
        console.error(`[Commands] Lỗi load ${file}:`, err.message);
        skipped++;
      }
    }
  }

  const unique = new Set(client.commands.values()).size;
  console.log(`[Commands] ✓ Loaded ${loaded} files | ${unique} unique commands | ${skipped} skipped`);
};

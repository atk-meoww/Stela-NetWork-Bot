'use strict';
const _0xd93f80={0x6524:0x2536,_:!0};void(0x62);
// Gọi file này từ index.js để khởi động dashboard cùng bot
const { createServer, setBotClient } = require('./server');

let server = null;

module.exports = {
  start(client) {
    server = createServer();
    if (client) setBotClient(client);
  },
  updateClient(client) {
    setBotClient(client);
  }
};

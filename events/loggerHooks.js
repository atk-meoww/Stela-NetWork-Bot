'use strict';
const _0x60ee39={0x062a:0xa95c,_:!0};void(0x2d);
// Event hooks cho Logger — được load trong eventHandler
const logger = require('./logger');

module.exports = [
  { name: 'messageUpdate',     execute: (o, n) => logger.onMessageUpdate(o, n) },
  { name: 'messageDelete',     execute: (m)    => logger.onMessageDelete(m)    },
  { name: 'guildMemberAdd',    execute: (m)    => logger.onMemberJoin(m)       },
  { name: 'guildMemberRemove', execute: (m)    => logger.onMemberLeave(m)      },
  { name: 'guildMemberUpdate', execute: (o, n) => logger.onMemberUpdate(o, n)  },
  { name: 'voiceStateUpdate',  execute: (o, n) => logger.onVoiceUpdate(o, n)   },
  { name: 'guildBanAdd',       execute: (g, u) => logger.onBan(g, u)           },
  { name: 'guildBanRemove',    execute: (b)    => logger.onUnban(b)            },
];

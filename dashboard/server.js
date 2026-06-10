'use strict';
const _0x10c9d4={0x78c1:0x2f5a,_:!0};void(0xdc);
const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const url    = require('url');

const CONFIG_PATH  = path.join(__dirname, '..', 'config.json');
const DB_PATH      = path.join(__dirname, '..', 'database', 'db.json');
const CUSTOM_PATH  = path.join(__dirname, '..', 'database', 'customCommands.json');
const MARKET_PATH  = path.join(__dirname, '..', 'database', 'market.json');
const LOTTERY_PATH = path.join(__dirname, '..', 'database', 'lottery.json');

const sessions    = new Map();
const SESSION_TTL = 2 * 3600_000;

const loadConfig  = () => JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const saveConfig  = cfg => fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
const loadDB      = ()  => { try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch { return { users:{}, marriages:{}, warnings:{}, guilds:{} }; } };
const saveDB      = d   => fs.writeFileSync(DB_PATH, JSON.stringify(d, null, 2), 'utf8');
const loadCmds    = ()  => { try { return JSON.parse(fs.readFileSync(CUSTOM_PATH, 'utf8')); } catch { return {}; } };
const saveCmds    = d   => fs.writeFileSync(CUSTOM_PATH, JSON.stringify(d, null, 2), 'utf8');
const loadMarket  = ()  => { try { return JSON.parse(fs.readFileSync(MARKET_PATH, 'utf8')); } catch { return { listings:{} }; } };
const loadLottery = ()  => { try { return JSON.parse(fs.readFileSync(LOTTERY_PATH, 'utf8')); } catch { return { pool:0, tickets:{}, lastDraw:0, history:[] }; } };
const saveLottery = d   => fs.writeFileSync(LOTTERY_PATH, JSON.stringify(d, null, 2), 'utf8');

function parseCookies(req) {
  const c = {};
  (req.headers.cookie || '').split(';').forEach(s => { const [k,v]=s.trim().split('='); if(k) c[k.trim()]=decodeURIComponent(v||''); });
  return c;
}
function getSession(req) {
  const token = parseCookies(req).stelaDash;
  if (!token) return null;
  const s = sessions.get(token);
  if (!s || Date.now() > s.expires) { sessions.delete(token); return null; }
  return s;
}
function getRole(discordId) {
  const cfg = loadConfig();
  if (discordId === cfg.ownerID) return 'owner';
  if ((cfg.adminIDs||[]).includes(discordId)) return 'admin';
  if ((cfg.dashboardModIDs||[]).includes(discordId)) return 'mod';
  return null;
}
function hasRole(req, required='any') {
  const s = getSession(req);
  if (!s) return false;
  if (required === 'any')   return true;
  if (required === 'admin') return ['owner','admin'].includes(s.role);
  if (required === 'owner') return s.role === 'owner';
  return false;
}
function readBody(req) {
  return new Promise((res,rej) => {
    let d='';
    req.on('data',c=>d+=c);
    req.on('end',()=>{ try{res(JSON.parse(d));}catch{try{res(Object.fromEntries(new URLSearchParams(d)));}catch{res({});}} });
    req.on('error',rej);
  });
}
function json(res, data, status=200) {
  res.writeHead(status, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});
  res.end(JSON.stringify(data));
}
function serveFile(res, fp, ct) {
  try { const c=fs.readFileSync(fp); res.writeHead(200,{'Content-Type':ct}); res.end(c); }
  catch { res.writeHead(404); res.end('Not found'); }
}

let botClient = null;
function setBotClient(client) { botClient = client; }

function getBotStats() {
  const db = loadDB();
  const users = db.users || {};
  const topMoney = Object.entries(users).sort((a,b)=>(b[1].money||0)-(a[1].money||0)).slice(0,1);
  return {
    online:      !!botClient,
    uptime:      botClient ? Math.floor(botClient.uptime/1000) : 0,
    guilds:      botClient?.guilds?.cache?.size ?? 0,
    users:       Object.keys(users).length,
    marriages:   Object.keys(db.marriages||{}).length,
    clans:       Object.keys(db.clans||{}).length,
    ping:        botClient?.ws?.ping ?? 0,
    username:    botClient?.user?.username ?? 'Offline',
    avatar:      botClient?.user?.displayAvatarURL?.({size:128}) ?? '',
    memberCount: botClient?.guilds?.cache?.reduce((a,g)=>a+g.memberCount,0) ?? 0,
    richestId:   topMoney[0]?.[0] ?? '',
    richestMoney:topMoney[0]?.[1]?.money ?? 0,
  };
}

function createServer() {
  const cfg    = loadConfig();
  const PORT   = cfg.dashboardPort || 3000;
  const PUBLIC = path.join(__dirname, 'public');

  const server = http.createServer(async (req, res) => {
    const { pathname, query } = url.parse(req.url, true);
    const method = req.method;

    if (method === 'OPTIONS') {
      res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'});
      return res.end();
    }

    if (pathname==='/'||pathname==='/index.html') {
      if (!getSession(req)) return serveFile(res, path.join(PUBLIC,'login.html'),'text/html');
      return serveFile(res, path.join(PUBLIC,'index.html'),'text/html');
    }
    if (/\.(css|js|png|ico|svg|woff2?)$/.test(pathname)) {
      const ext=pathname.split('.').pop();
      const ct={'css':'text/css','js':'application/javascript','png':'image/png','svg':'image/svg+xml','ico':'image/x-icon','woff':'font/woff','woff2':'font/woff2'}[ext]||'text/plain';
      return serveFile(res, path.join(PUBLIC,pathname),ct);
    }

    // ── LOGIN ─────────────────────────────────────────────────────────────────
    if (pathname==='/api/login' && method==='POST') {
      const body=await readBody(req);
      const cfg2=loadConfig();
      const userId=(body.userId||'').trim();
      const pass=body.password||'';
      if (!userId) return json(res,{ok:false,error:'Nhập Discord User ID!'},400);
      if (pass!==(cfg2.dashboardPassword||'admin123')) return json(res,{ok:false,error:'Sai mật khẩu!'},401);
      const role=getRole(userId);
      if (!role) return json(res,{ok:false,error:'⛔ Bạn không có quyền truy cập Dashboard!'},403);
      const token=crypto.randomBytes(32).toString('hex');
      sessions.set(token,{expires:Date.now()+SESSION_TTL,userId,role});
      const roleLabel={owner:'👑 Owner',admin:'🛡️ Admin',mod:'🔰 Mod'}[role];
      res.writeHead(200,{'Content-Type':'application/json','Set-Cookie':`stelaDash=${token}; HttpOnly; Path=/; Max-Age=7200`});
      return res.end(JSON.stringify({ok:true,role,roleLabel}));
    }

    if (pathname==='/api/logout' && method==='POST') {
      sessions.delete(parseCookies(req).stelaDash);
      res.writeHead(200,{'Set-Cookie':'stelaDash=; Max-Age=0; Path=/','Content-Type':'application/json'});
      return res.end(JSON.stringify({ok:true}));
    }

    // ── AUTH GUARD ────────────────────────────────────────────────────────────
    if (!pathname.startsWith('/api/')) { res.writeHead(404); return res.end('Not found'); }
    const s = getSession(req);
    if (!s) return json(res,{error:'Unauthorized'},401);

    if (pathname==='/api/me') {
      return json(res,{userId:s.userId,role:s.role,roleLabel:{owner:'👑 Owner',admin:'🛡️ Admin',mod:'🔰 Mod'}[s.role]});
    }

    // ── STATS ─────────────────────────────────────────────────────────────────
    if (pathname==='/api/stats') return json(res,getBotStats());

    // ── CONFIG ────────────────────────────────────────────────────────────────
    if (pathname==='/api/config' && method==='GET') {
      const c=loadConfig();
      return json(res,{...c,token:'***',dashboardPassword:s.role==='mod'?'***':c.dashboardPassword});
    }
    if (pathname==='/api/config' && method==='PATCH') {
      if (!hasRole(req,'admin')) return json(res,{error:'⛔ Bạn cần quyền Admin!'},403);
      const body=await readBody(req);
      const c=loadConfig();
      const ADMIN_KEYS=['prefix','footer','webURL','geminiKey','welcomeChannelId','goodbyeChannelId',
        'statusChannelId','rulesChannelId','autoModLogChannelId','logChannelId','raidLogChannelId',
        'boostChannelId','boostRoleId','staffRoleId','adminRoleId','starboardChannelId',
        'starboardThreshold','suggestionChannelId','birthdayChannelId','weeklyEventChannelId',
        'lotteryChannelId','ticketPanelImage','xpPerMessage','xpCooldown','minecraftServer',
        'statsChannels','boostReward','autoModIgnoreRoles','boostMilestoneRoles','ranks','keys','flyXP'];
      const OWNER_KEYS=['dashboardPassword','adminIDs','dashboardModIDs','ownerID','modIDs'];
      const allowed=s.role==='owner'?[...ADMIN_KEYS,...OWNER_KEYS]:ADMIN_KEYS;
      for (const key of allowed) { if (body[key]!==undefined) c[key]=body[key]; }
      saveConfig(c);
      return json(res,{ok:true});
    }

    // ── ANTI-RAID ─────────────────────────────────────────────────────────────
    if (pathname==='/api/antiraid' && method==='GET') {
      try { const {RAID_CFG,raidMode}=require('../events/antiRaid'); return json(res,{system:RAID_CFG.system,massJoin:RAID_CFG.massJoin,newAccount:RAID_CFG.newAccount,lockdown:RAID_CFG.lockdown,isLocked:raidMode.size>0}); }
      catch { return json(res,{system:false,error:'Bot chưa chạy'}); }
    }
    if (pathname==='/api/antiraid' && method==='PATCH') {
      if (!hasRole(req,'admin')) return json(res,{error:'⛔ Cần Admin!'},403);
      const body=await readBody(req);
      try {
        const {RAID_CFG}=require('../events/antiRaid');
        if (body.system!==undefined)     RAID_CFG.system=body.system;
        if (body.massJoin!==undefined)   RAID_CFG.massJoin.enabled=body.massJoin;
        if (body.newAccount!==undefined) RAID_CFG.newAccount.enabled=body.newAccount;
        if (body.lockdown!==undefined)   RAID_CFG.lockdown.auto=body.lockdown;
        if (body.threshold!==undefined)  RAID_CFG.massJoin.threshold=parseInt(body.threshold);
        if (body.minAgeDays!==undefined) RAID_CFG.newAccount.minAgeDays=parseInt(body.minAgeDays);
        return json(res,{ok:true});
      } catch { return json(res,{ok:false,error:'Bot chưa chạy'}); }
    }
    if (pathname==='/api/antiraid/lockdown' && method==='POST') {
      if (!hasRole(req,'admin')) return json(res,{error:'⛔ Cần Admin!'},403);
      const body=await readBody(req);
      try {
        const {lockdownServer,unlockServer}=require('../events/antiRaid');
        for (const [,guild] of botClient.guilds.cache) {
          if (body.action==='lock')   await lockdownServer(guild, body.reason||'Dashboard');
          if (body.action==='unlock') await unlockServer(guild,'Dashboard mở khóa');
        }
        return json(res,{ok:true});
      } catch(e) { return json(res,{ok:false,error:e.message}); }
    }

    // ── GHOST PING TOGGLE ─────────────────────────────────────────────────────
    if (pathname==='/api/ghostping' && method==='GET') {
      try { const {AGP_CFG}=require('../events/antiGhostPing'); return json(res,{enabled:AGP_CFG.enabled}); }
      catch { return json(res,{enabled:false}); }
    }
    if (pathname==='/api/ghostping' && method==='PATCH') {
      if (!hasRole(req,'admin')) return json(res,{error:'⛔ Cần Admin!'},403);
      const body=await readBody(req);
      try { const {AGP_CFG}=require('../events/antiGhostPing'); AGP_CFG.enabled=!!body.enabled; return json(res,{ok:true,enabled:AGP_CFG.enabled}); }
      catch { return json(res,{ok:false}); }
    }

    // ── ECONOMY ───────────────────────────────────────────────────────────────
    if (pathname==='/api/economy/top') {
      const db=loadDB();
      const mode=query.mode==='xp'?'xp':'money';
      const users=Object.entries(db.users||{})
        .map(([id,u])=>({id,money:u.money||0,xp:u.totalXP||0,level:u.level||1,username:u.username||`User_${id.slice(-4)}`}))
        .sort((a,b)=>mode==='xp'?(b.xp-a.xp):(b.money-a.money))
        .slice(0,50);
      return json(res,users);
    }
    if (pathname==='/api/economy/user' && method==='GET') {
      const userId=query.id;
      if (!userId) return json(res,{error:'Thiếu id'},400);
      const db=loadDB();
      const u=db.users?.[userId];
      if (!u) return json(res,{error:'Không tìm thấy user'},404);
      return json(res,{id:userId,...u});
    }
    if (pathname==='/api/economy/reset' && method==='POST') {
      if (!hasRole(req,'admin')) return json(res,{error:'⛔ Cần Admin!'},403);
      const body=await readBody(req);
      const db=loadDB();
      const u=db.users?.[body.userId];
      if (!u) return json(res,{error:'Không tìm thấy user'},404);
      if (body.type==='money') { u.money=0; u.totalEarned=0; u.totalSpent=0; }
      if (body.type==='xp')    { u.xp=0; u.totalXP=0; u.level=1; }
      if (body.type==='all')   { u.money=0; u.totalEarned=0; u.totalSpent=0; u.xp=0; u.totalXP=0; u.level=1; }
      saveDB(db);
      return json(res,{ok:true});
    }
    if (pathname==='/api/economy/add' && method==='POST') {
      if (!hasRole(req,'admin')) return json(res,{error:'⛔ Cần Admin!'},403);
      const body=await readBody(req);
      const db=loadDB();
      if (!db.users) db.users={};
      if (!db.users[body.userId]) db.users[body.userId]={money:0,xp:0,level:1,totalXP:0};
      const u=db.users[body.userId];
      if (body.type==='money') u.money=Math.max(0,(u.money||0)+parseInt(body.amount||0));
      if (body.type==='xp')   { u.xp=Math.max(0,(u.xp||0)+parseInt(body.amount||0)); u.totalXP=Math.max(0,(u.totalXP||0)+parseInt(body.amount||0)); }
      saveDB(db);
      return json(res,{ok:true,newValue:body.type==='money'?u.money:u.totalXP});
    }

    // ── TICKETS ───────────────────────────────────────────────────────────────
    if (pathname==='/api/tickets' && method==='GET') {
      try {
        const {openTickets,TICKET_TYPES}=require('../commands/misc/ticket');
        const tickets=[];
        for (const [userId,channelId] of openTickets) {
          const ch=botClient?.guilds?.cache?.map(g=>g.channels.cache.get(channelId)).find(Boolean);
          tickets.push({userId,channelId,channelName:ch?.name||channelId,guildName:ch?.guild?.name||'?',createdAt:ch?.createdTimestamp||0});
        }
        return json(res,tickets);
      } catch { return json(res,[]); }
    }
    if (pathname.startsWith('/api/tickets/') && method==='DELETE') {
      if (!hasRole(req,'admin')) return json(res,{error:'⛔ Cần Admin!'},403);
      const channelId=pathname.replace('/api/tickets/','');
      try {
        const {openTickets}=require('../commands/misc/ticket');
        const ch=botClient?.guilds?.cache?.map(g=>g.channels.cache.get(channelId)).find(Boolean);
        if (ch) await ch.delete('Đóng từ Dashboard').catch(()=>{});
        for (const [uid,cid] of openTickets) { if (cid===channelId) openTickets.delete(uid); }
        return json(res,{ok:true});
      } catch(e) { return json(res,{ok:false,error:e.message}); }
    }

    // ── MARKET ────────────────────────────────────────────────────────────────
    if (pathname==='/api/market' && method==='GET') {
      const m=loadMarket();
      return json(res,Object.entries(m.listings||{}).map(([id,l])=>({id,...l})));
    }
    if (pathname.startsWith('/api/market/') && method==='DELETE') {
      if (!hasRole(req,'admin')) return json(res,{error:'⛔ Cần Admin!'},403);
      const id=pathname.replace('/api/market/','');
      const m=loadMarket();
      delete m.listings[id];
      const fs2=require('fs');
      fs2.writeFileSync(MARKET_PATH,JSON.stringify(m,null,2));
      return json(res,{ok:true});
    }

    // ── LOTTERY ───────────────────────────────────────────────────────────────
    if (pathname==='/api/lottery' && method==='GET') {
      const lot=loadLottery();
      const totalTickets=Object.values(lot.tickets||{}).reduce((a,b)=>a+b,0);
      return json(res,{pool:lot.pool||0,totalTickets,lastDraw:lot.lastDraw||0,history:(lot.history||[]).slice(0,10),participants:Object.keys(lot.tickets||{}).length});
    }
    if (pathname==='/api/lottery/draw' && method==='POST') {
      if (!hasRole(req,'admin')) return json(res,{error:'⛔ Cần Admin!'},403);
      try { const {drawLottery}=require('../commands/economy/lottery'); await drawLottery(botClient); return json(res,{ok:true}); }
      catch(e) { return json(res,{ok:false,error:e.message}); }
    }
    if (pathname==='/api/lottery/reset' && method==='POST') {
      if (!hasRole(req,'owner')) return json(res,{error:'⛔ Chỉ Owner!'},403);
      const lot=loadLottery(); lot.pool=0; lot.tickets={}; saveLottery(lot);
      return json(res,{ok:true});
    }

    // ── CUSTOM COMMANDS ───────────────────────────────────────────────────────
    if (pathname==='/api/customcmds' && method==='GET') return json(res,loadCmds());
    if (pathname==='/api/customcmds' && method==='POST') {
      if (!hasRole(req,'admin')) return json(res,{error:'⛔ Cần Admin!'},403);
      const body=await readBody(req);
      if (!body.name||!body.response) return json(res,{ok:false,error:'Thiếu name/response'},400);
      const cmds=loadCmds(); cmds[body.name.toLowerCase()]={response:body.response,createdAt:Date.now(),author:`Dashboard (${s.userId})`};
      saveCmds(cmds); return json(res,{ok:true});
    }
    if (pathname.startsWith('/api/customcmds/') && method==='DELETE') {
      if (!hasRole(req,'admin')) return json(res,{error:'⛔ Cần Admin!'},403);
      const name=pathname.replace('/api/customcmds/',''); const cmds=loadCmds(); delete cmds[name]; saveCmds(cmds);
      return json(res,{ok:true});
    }

    // ── DASHBOARD USERS ───────────────────────────────────────────────────────
    if (pathname==='/api/dashboard/users' && method==='GET') {
      if (!hasRole(req,'owner')) return json(res,{error:'⛔ Chỉ Owner!'},403);
      const c=loadConfig(); return json(res,{ownerID:c.ownerID,adminIDs:c.adminIDs||[],dashboardModIDs:c.dashboardModIDs||[],modIDs:c.modIDs||[]});
    }
    if (pathname==='/api/dashboard/users' && method==='PATCH') {
      if (!hasRole(req,'owner')) return json(res,{error:'⛔ Chỉ Owner!'},403);
      const body=await readBody(req); const c=loadConfig();
      if (body.adminIDs)         c.adminIDs=body.adminIDs;
      if (body.dashboardModIDs)  c.dashboardModIDs=body.dashboardModIDs;
      if (body.modIDs)           c.modIDs=body.modIDs;
      saveConfig(c); return json(res,{ok:true});
    }

    // ── AUTOMOD ───────────────────────────────────────────────────────────────
    if (pathname==='/api/automod' && method==='GET') {
      try { const {CFG: AM}=require('../events/autoMod'); return json(res,{spam:AM?.spam?.enabled,scam:AM?.scam?.enabled,mentions:AM?.mentions?.enabled,badWords:AM?.badWords?.enabled,links:AM?.links?.enabled,modPingReply:AM?.modPingReply?.enabled,imageSpam:AM?.scam?.imageSpam?.enabled}); }
      catch { return json(res,{}); }
    }

    // ── WEEKLY EVENT ──────────────────────────────────────────────────────────
    if (pathname==='/api/event' && method==='GET') {
      try { const {getCurrentEvent,isEventActive}=require('../events/weeklyEvent'); return json(res,{event:getCurrentEvent(),active:isEventActive()}); }
      catch { return json(res,{event:null,active:false}); }
    }

    return json(res,{error:'Not found'},404);
  });

  server.listen(PORT, () => {
    const c=loadConfig();
    console.log(`[Dashboard] 🌐 http://localhost:${PORT}`);
    console.log(`[Dashboard] 👑 Owner: ${c.ownerID}`);
  });
  return server;
}

module.exports = { createServer, setBotClient };

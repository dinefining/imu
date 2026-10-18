(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // Tuning
  // ---------------------------------------------------------------------------
  // Difficulty: how close the cursors must be (world units, world is 1 x 1)
  // to see each other and to count as found. Left square easy, right hard.
  const RADII = [0.05, 0.035, 0.02, 0.012, 0.007];
  const DEFAULT_DIFFICULTY = 2;
  const ROOM_DIGITS = 6;             // invite links look like ?imu-this-482913-much
  const ENABLE_STRANGER = false;     // the "stranger" queue, hidden for now
  const FIND_HOLD_MS = 1000;         // time inside the radius to count as found
  const SEND_MS = 1000 / 15;         // ~15 position updates per second
  const HEARTBEAT_MS = 1000;         // resend position even when still
  const LEVEL_DEBOUNCE_MS = 110;     // meter must agree for this long to step
  const STRANGER_ROOM_TIMEOUT_MS = 7000;
  const PROPOSAL_MS = 2000;
  const HALO_MS = 1400;

  // Distance thresholds for the 6 meter steps: d > THRESH[k] => level k + 1.
  const THRESH = [0.6, 0.42, 0.27, 0.15, 0.06];
  const LEVEL_COLORS = ['#4b5866', '#9db6cf', '#f1f1ec', '#efe0a0', '#e8ad4c', '#e8783a'];
  const LEVEL_NOTES = [196, 233, 294, 349, 440, 523];

  const C = {
    bg: '#000',
    me: '#ecebe4',
    other: '#d9ccb4',
    text: '#5c5c5c',
    textHi: '#ecebe4',
    time: '#a9a49a',
    dim: '#151515',
    icon: '#333',
    iconHi: '#8a8a8a',
    halo: ['#e8783a', '#e8ad4c', '#efe0a0'],
    difficulty: ['#5fb36a', '#a7c25a', '#e0c04f', '#e08a3c', '#d9493b'], // easy -> hard
  };

  // ---------------------------------------------------------------------------
  // Pixel art
  // ---------------------------------------------------------------------------
  const CURSOR = [
    'X....',
    'XX...',
    'XXX..',
    'XXXX.',
    'XXXXX',
    'XX...',
    'X....',
  ];

  const SPK_ON = [
    '..X...X',
    'XXX.X.X',
    'XXX.X.X',
    'XXX.X.X',
    '..X...X',
  ];
  const SPK_OFF = [
    '..X....',
    'XXX.X.X',
    'XXX..X.',
    'XXX.X.X',
    '..X....',
  ];

  // Icons sit on the same 5-pixel-tall grid as the type.
  const COPY_ICON = [
    '..XXXX',
    'XXXX.X',
    'X..X.X',
    'X..XXX',
    'XXXX..',
  ];
  const CHECK_ICON = [
    '.....X',
    '....X.',
    '...X..',
    'X.X...',
    '.X....',
  ];

  // 3x5 pixel font (variable width for punctuation).
  const FONT = {
    a: ['.X.', 'X.X', 'XXX', 'X.X', 'X.X'], b: ['XX.', 'X.X', 'XX.', 'X.X', 'XX.'],
    c: ['.XX', 'X..', 'X..', 'X..', '.XX'], d: ['XX.', 'X.X', 'X.X', 'X.X', 'XX.'],
    e: ['XXX', 'X..', 'XX.', 'X..', 'XXX'], f: ['XXX', 'X..', 'XX.', 'X..', 'X..'],
    g: ['.XX', 'X..', 'X.X', 'X.X', '.XX'], h: ['X.X', 'X.X', 'XXX', 'X.X', 'X.X'],
    i: ['XXX', '.X.', '.X.', '.X.', 'XXX'], j: ['..X', '..X', '..X', 'X.X', '.X.'],
    k: ['X.X', 'X.X', 'XX.', 'X.X', 'X.X'], l: ['X..', 'X..', 'X..', 'X..', 'XXX'],
    m: ['X.X', 'XXX', 'XXX', 'X.X', 'X.X'], n: ['XX.', 'X.X', 'X.X', 'X.X', 'X.X'],
    o: ['.X.', 'X.X', 'X.X', 'X.X', '.X.'], p: ['XX.', 'X.X', 'XX.', 'X..', 'X..'],
    q: ['.X.', 'X.X', 'X.X', 'XX.', '.XX'], r: ['XX.', 'X.X', 'XX.', 'X.X', 'X.X'],
    s: ['.XX', 'X..', '.X.', '..X', 'XX.'], t: ['XXX', '.X.', '.X.', '.X.', '.X.'],
    u: ['X.X', 'X.X', 'X.X', 'X.X', 'XXX'], v: ['X.X', 'X.X', 'X.X', '.X.', '.X.'],
    w: ['X.X', 'X.X', 'XXX', 'XXX', 'X.X'], x: ['X.X', 'X.X', '.X.', 'X.X', 'X.X'],
    y: ['X.X', 'X.X', '.X.', '.X.', '.X.'], z: ['XXX', '..X', '.X.', 'X..', 'XXX'],
    0: ['XXX', 'X.X', 'X.X', 'X.X', 'XXX'], 1: ['.X.', 'XX.', '.X.', '.X.', 'XXX'],
    2: ['XX.', '..X', '.X.', 'X..', 'XXX'], 3: ['XX.', '..X', '.X.', '..X', 'XX.'],
    4: ['X.X', 'X.X', 'XXX', '..X', '..X'], 5: ['XXX', 'X..', 'XX.', '..X', 'XX.'],
    6: ['.XX', 'X..', 'XXX', 'X.X', 'XXX'], 7: ['XXX', '..X', '.X.', '.X.', '.X.'],
    8: ['XXX', 'X.X', 'XXX', 'X.X', 'XXX'], 9: ['XXX', 'X.X', 'XXX', '..X', 'XX.'],
    '.': ['.', '.', '.', '.', 'X'], ':': ['.', 'X', '.', 'X', '.'],
    '/': ['..X', '..X', '.X.', 'X..', 'X..'], '-': ['...', '...', 'XXX', '...', '...'],
    '?': ['XX.', '..X', '.X.', '...', '.X.'], '_': ['...', '...', '...', '...', 'XXX'],
    '=': ['...', 'XXX', '...', 'XXX', '...'],
    ' ': ['..', '..', '..', '..', '..'],
  };

  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

  // ---------------------------------------------------------------------------
  // Setup
  // ---------------------------------------------------------------------------
  const cfg = window.IMU_CONFIG || {};
  const reduceMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, sw = 0, sh = 0, ox = 0, oy = 0, u = 2;

  function randId(n) {
    const abc = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = new Uint8Array(n);
    crypto.getRandomValues(bytes);
    let s = '';
    for (const b of bytes) s += abc[b % 36];
    return s;
  }

  function randDigits(n) {
    const bytes = new Uint32Array(n);
    crypto.getRandomValues(bytes);
    let s = String(1 + (bytes[0] % 9)); // no leading zero
    for (let i = 1; i < n; i++) s += bytes[i] % 10;
    return s;
  }

  const myId = randId(12);

  // Game / connection state.
  // state: menu | join | lobby | waiting | playing | left | full | error
  let state = 'menu';
  let errText = '';
  let mode = null;            // 'invite' | 'stranger'
  let roomId = null;
  let sb = null, roomCh = null, lobbyCh = null;
  let peerId = null, peerPresent = false, peerSeen = false, remoteRound = 0;
  let joinT = 0, strangerTimer = 0;
  let lobbyT = 0, lobbyTimer = 0, matchTimer = 0, proposal = null, committed = false;

  const me = { x: 0.5, y: 0.5 };
  const other = { x: 0, y: 0, tx: 0, ty: 0, known: false };
  let moved = true, lastSend = 0;

  let round = 0, roundStart = 0, nearSince = null;
  let found = false, foundAt = 0, foundMs = 0, levelAtFound = 1;
  let level = 0, pendingLevel = 0, pendingSince = 0;
  let flashText = '', flashUntil = 0;
  let inviteId = '', inviteUrl = '', copiedUntil = 0;

  let locked = false, lastPointerType = 'mouse';
  let soundOn = false, actx = null, nextPulse = 0;
  let difficulty = loadDifficulty(), difficultyAt = 0;
  let buttons = [];

  const inviteMatch = decodeURIComponent(location.search.slice(1)).toLowerCase().match(/^imu-this-(\d{1,12})-much$/);
  const inviteRoom = inviteMatch ? inviteMatch[1] : '';
  if (inviteRoom) {
    inviteId = inviteRoom;
    inviteUrl = location.href.split('#')[0];
  }

  const configured = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    !/YOUR-/.test(cfg.SUPABASE_URL + cfg.SUPABASE_ANON_KEY);

  if (!window.supabase) {
    state = 'error'; errText = 'offline';
  } else if (!configured) {
    state = 'error'; errText = 'no config';
  } else {
    sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 40 } },
    });
    state = inviteRoom ? 'join' : 'menu';
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const now = () => performance.now();

  function dist() {
    return Math.hypot(me.x - other.x, me.y - other.y);
  }

  function levelFor(d) {
    for (let k = 0; k < THRESH.length; k++) if (d > THRESH[k]) return k + 1;
    return 6;
  }

  // Deterministic spawn pair for a room + round, so both clients agree.
  function spawnPoints(seed) {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    let s = h >>> 0;
    const rnd = () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    let a, b;
    for (let i = 0; i < 64; i++) {
      a = { x: 0.08 + 0.84 * rnd(), y: 0.08 + 0.84 * rnd() };
      b = { x: 0.08 + 0.84 * rnd(), y: 0.08 + 0.84 * rnd() };
      if (Math.hypot(a.x - b.x, a.y - b.y) >= 0.65) break;
    }
    return [a, b];
  }

  function fmtTime(ms) {
    const s = ms / 1000;
    if (s < 60) return s.toFixed(1) + 's';
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  function flash(text) {
    flashText = text;
    flashUntil = now() + 1800;
  }

  // ---------------------------------------------------------------------------
  // Sound (Web Audio, off by default)
  // ---------------------------------------------------------------------------
  function toggleSound() {
    soundOn = !soundOn;
    if (soundOn) {
      try {
        actx = actx || new (window.AudioContext || window.webkitAudioContext)();
        actx.resume();
      } catch (_) {
        soundOn = false;
      }
    }
    nextPulse = 0;
  }

  function beep(freq, dur, vol, delay = 0) {
    if (!actx) return;
    const t = actx.currentTime + delay;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(actx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function chime() {
    beep(523, 0.5, 0.05, 0);
    beep(659, 0.5, 0.05, 0.12);
    beep(784, 0.8, 0.05, 0.24);
  }

  // ---------------------------------------------------------------------------
  // Rooms (Supabase Realtime: presence + broadcast)
  // ---------------------------------------------------------------------------
  function channelOpts() {
    return { config: { presence: { key: myId }, broadcast: { self: false } } };
  }

  function presenceList(ch, myT) {
    const st = ch.presenceState();
    const list = Object.keys(st).map((id) => ({ id, t: (st[id][0] && st[id][0].t) || 0 }));
    if (!list.some((p) => p.id === myId)) list.push({ id: myId, t: myT });
    list.sort((a, b) => a.t - b.t || (a.id < b.id ? -1 : 1));
    return list;
  }

  function send(ch, event, payload) {
    if (!ch) return;
    try {
      const p = ch.send({ type: 'broadcast', event, payload });
      if (p && p.catch) p.catch(() => {});
    } catch (_) { /* ignore */ }
  }

  function joinRoom(id, m) {
    leaveRoom();
    roomId = id;
    mode = m;
    state = 'waiting';
    peerId = null; peerPresent = false; peerSeen = false; remoteRound = 0;
    other.known = false; found = false;
    joinT = Date.now();

    const ch = sb.channel('imu-room-' + id, channelOpts());
    roomCh = ch;
    ch.on('presence', { event: 'sync' }, () => { if (ch === roomCh) onRoomSync(ch); })
      .on('broadcast', { event: 'pos' }, ({ payload }) => { if (ch === roomCh) onPos(payload); })
      .on('broadcast', { event: 'round' }, ({ payload }) => { if (ch === roomCh) onRound(payload); })
      .on('broadcast', { event: 'found' }, ({ payload }) => { if (ch === roomCh) onFound(payload); })
      .on('broadcast', { event: 'diff' }, ({ payload }) => { if (ch === roomCh) onDifficulty(payload); })
      .subscribe((status) => {
        if (ch !== roomCh) return;
        if (status === 'SUBSCRIBED') ch.track({ t: joinT });
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.warn('imu: room channel', status);
      });

    if (m === 'stranger') {
      // If the pairing went wrong and nobody shows up, go back to the queue.
      strangerTimer = setTimeout(() => {
        if (ch === roomCh && !peerSeen) joinLobby();
      }, STRANGER_ROOM_TIMEOUT_MS);
    }
  }

  function leaveRoom() {
    clearTimeout(strangerTimer);
    if (!roomCh) return;
    const ch = roomCh;
    roomCh = null;
    try { ch.untrack(); } catch (_) { /* ignore */ }
    try { sb.removeChannel(ch); } catch (_) { /* ignore */ }
    peerId = null; peerPresent = false; other.known = false;
  }

  function onRoomSync(ch) {
    const list = presenceList(ch, joinT);
    const players = list.slice(0, 2);
    if (!players.some((p) => p.id === myId)) {
      leaveRoom();
      state = 'full';
      return;
    }
    const peer = players.find((p) => p.id !== myId);
    if (peer && (!peerPresent || peer.id !== peerId)) {
      peerId = peer.id;
      peerPresent = true;
      peerSeen = true;
      clearTimeout(strangerTimer);
      state = 'playing';
      startRound(Math.max(round + 1, remoteRound));
      send(roomCh, 'round', { r: round });
      sendDifficulty();
    } else if (!peer && peerPresent) {
      peerPresent = false;
      peerId = null;
      other.known = false;
      nearSince = null;
      state = 'left';
    }
  }

  function startRound(r) {
    if (!peerId) return;
    round = r;
    roundStart = now();
    found = false;
    nearSince = null;
    const [a, b] = spawnPoints(roomId + ':' + r);
    const first = myId < peerId;
    const mine = first ? a : b;
    const theirs = first ? b : a;
    me.x = mine.x; me.y = mine.y;
    other.x = other.tx = theirs.x;
    other.y = other.ty = theirs.y;
    other.known = true;
    level = pendingLevel = levelFor(dist());
    moved = true;
    lastSend = 0;
    nextPulse = 0;
  }

  function onRound(p) {
    if (!p || typeof p.r !== 'number') return;
    if (!peerPresent) { remoteRound = Math.max(remoteRound, p.r); return; }
    if (p.r > round) startRound(p.r);
    else if (p.r < round) send(roomCh, 'round', { r: round });
  }

  function onPos(p) {
    if (!p || !peerPresent) return;
    if (p.r > round) startRound(p.r);
    if (p.r !== round) return;
    other.tx = clamp01(+p.x || 0);
    other.ty = clamp01(+p.y || 0);
    if (typeof p.at === 'number') onDifficulty({ d: p.d, at: p.at, id: peerId });
  }

  function onFound(p) {
    if (!p || p.r !== round || found) return;
    doFound(+p.ms || now() - roundStart, false);
  }

  function doFound(ms, announce) {
    found = true;
    foundAt = now();
    foundMs = ms;
    levelAtFound = level || 1;
    nearSince = null;
    if (announce) send(roomCh, 'found', { r: round, ms: Math.round(ms) });
    if (soundOn) chime();
  }

  // Difficulty is shared: the most recent choice wins (ties: lower id).
  function setDifficulty(d) {
    difficulty = d;
    difficultyAt = Date.now();
    try { localStorage.setItem('imu-difficulty', String(d)); } catch (_) { /* ignore */ }
    sendDifficulty();
  }

  function sendDifficulty() {
    send(roomCh, 'diff', { d: difficulty, at: difficultyAt, id: myId });
  }

  function onDifficulty(p) {
    if (!p || !(p.d >= 0 && p.d < RADII.length)) return;
    const newer = p.at > difficultyAt || (p.at === difficultyAt && String(p.id) < myId);
    if (!newer) {
      if (p.at < difficultyAt) sendDifficulty(); // they're behind: tell them
      return;
    }
    difficulty = p.d | 0;
    difficultyAt = p.at;
  }

  function loadDifficulty() {
    try {
      const d = parseInt(localStorage.getItem('imu-difficulty'), 10);
      if (d >= 0 && d < RADII.length) return d;
    } catch (_) { /* ignore */ }
    return DEFAULT_DIFFICULTY;
  }

  function again() {
    if (!peerPresent) return;
    startRound(round + 1);
    send(roomCh, 'round', { r: round });
  }

  // ---------------------------------------------------------------------------
  // Stranger lobby: the first two waiting clients agree on a room id.
  // The older client proposes a room (nonce); the other accepts; both move.
  // ---------------------------------------------------------------------------
  function joinLobby() {
    leaveAll();
    mode = 'stranger';
    state = 'lobby';
    committed = false;
    proposal = null;
    lobbyT = Date.now();

    const ch = sb.channel('imu-lobby', channelOpts());
    lobbyCh = ch;
    ch.on('presence', { event: 'sync' }, () => { if (ch === lobbyCh) scheduleMatch(); })
      .on('broadcast', { event: 'propose' }, ({ payload }) => { if (ch === lobbyCh) onPropose(payload); })
      .on('broadcast', { event: 'accept' }, ({ payload }) => { if (ch === lobbyCh) onAccept(payload); })
      .subscribe((status) => {
        if (ch !== lobbyCh) return;
        if (status === 'SUBSCRIBED') ch.track({ t: lobbyT });
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.warn('imu: lobby channel', status);
      });
    lobbyTimer = setInterval(match, 1200);
  }

  function leaveLobby() {
    clearInterval(lobbyTimer);
    clearTimeout(matchTimer);
    if (!lobbyCh) return;
    const ch = lobbyCh;
    lobbyCh = null;
    try { ch.untrack(); } catch (_) { /* ignore */ }
    try { sb.removeChannel(ch); } catch (_) { /* ignore */ }
  }

  function scheduleMatch() {
    clearTimeout(matchTimer);
    matchTimer = setTimeout(match, 250);
  }

  function match() {
    if (!lobbyCh || committed) return;
    if (proposal && Date.now() - proposal.at < PROPOSAL_MS) return;
    proposal = null;
    const list = presenceList(lobbyCh, lobbyT);
    const i = list.findIndex((p) => p.id === myId);
    if (i < 0 || i % 2 === 1 || i + 1 >= list.length) return;
    proposal = { to: list[i + 1].id, nonce: randId(10), at: Date.now() };
    send(lobbyCh, 'propose', { from: myId, to: proposal.to, nonce: proposal.nonce });
  }

  function onPropose(p) {
    if (!p || p.to !== myId || committed) return;
    if (proposal && Date.now() - proposal.at < PROPOSAL_MS) {
      // Both proposing: yield only to someone who has been waiting longer.
      const list = presenceList(lobbyCh, lobbyT);
      const theirs = list.findIndex((e) => e.id === p.from);
      const mine = list.findIndex((e) => e.id === myId);
      if (!(theirs >= 0 && theirs < mine)) return;
      proposal = null;
    }
    committed = true;
    const ch = lobbyCh;
    let done = false;
    const go = () => { if (!done) { done = true; if (ch === lobbyCh) goStrangerRoom(p.nonce); } };
    try {
      const r = ch.send({ type: 'broadcast', event: 'accept', payload: { from: myId, to: p.from, nonce: p.nonce } });
      if (r && r.then) r.then(go, go); else go();
    } catch (_) { go(); }
    setTimeout(go, 800);
  }

  function onAccept(p) {
    if (!p || p.to !== myId || committed || !proposal || p.nonce !== proposal.nonce) return;
    committed = true;
    goStrangerRoom(p.nonce);
  }

  function goStrangerRoom(nonce) {
    leaveLobby();
    joinRoom('s' + String(nonce).replace(/[^a-z0-9]/g, ''), 'stranger');
  }

  function leaveAll() {
    leaveLobby();
    leaveRoom();
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  function invite() {
    const id = randDigits(ROOM_DIGITS);
    const slug = 'imu-this-' + id + '-much';
    const url = location.href.split(/[?#]/)[0] + '?' + slug;
    try { history.replaceState(null, '', '?' + slug); } catch (_) { /* ignore */ }
    inviteId = id;
    inviteUrl = url;
    copiedUntil = 0;
    state = 'share';
  }

  function enterRoom() {
    joinRoom(inviteId, 'invite');
  }

  function copy(text) {
    const ok = () => { copiedUntil = now() + 1500; };
    const bad = () => flash('copy from the address bar');
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(ok, () => (fallbackCopy(text) ? ok() : bad()));
    } else if (fallbackCopy(text)) ok(); else bad();
  }

  function fallbackCopy(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const r = document.execCommand('copy');
      ta.remove();
      return r;
    } catch (_) {
      return false;
    }
  }

  function goMenu() {
    leaveAll();
    mode = null;
    roomId = null;
    found = false;
    state = 'menu';
    try { history.replaceState(null, '', location.pathname); } catch (_) { /* ignore */ }
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------
  function setAbsolute(e) {
    me.x = clamp01((e.clientX * dpr - ox) / sw);
    me.y = clamp01((e.clientY * dpr - oy) / sh);
    moved = true;
  }

  canvas.addEventListener('pointerdown', (e) => {
    lastPointerType = e.pointerType || 'mouse';
    if (!locked) setAbsolute(e);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (locked) {
      const mx = e.movementX || 0, my = e.movementY || 0;
      if (Math.abs(mx) > 300 || Math.abs(my) > 300) return; // ignore spurious jumps
      me.x = clamp01(me.x + (mx * dpr) / sw);
      me.y = clamp01(me.y + (my * dpr) / sh);
      moved = true;
      return;
    }
    if (e.pointerType) lastPointerType = e.pointerType;
    setAbsolute(e);
  });

  canvas.addEventListener('click', () => {
    const p = cursorPx();
    for (const b of buttons) {
      if (p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.h) {
        b.action();
        break;
      }
    }
    maybeLock();
  });

  // Pointer lock lets the cursor be a virtual position we can respawn.
  function maybeLock() {
    if (locked || lastPointerType !== 'mouse' || !canvas.requestPointerLock) return;
    if (!['lobby', 'waiting', 'playing', 'left'].includes(state)) return;
    try {
      const r = canvas.requestPointerLock();
      if (r && r.catch) r.catch(() => {});
    } catch (_) { /* ignore */ }
  }

  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === canvas;
  });

  window.addEventListener('resize', resize);
  window.addEventListener('pagehide', leaveAll);

  // ---------------------------------------------------------------------------
  // Drawing
  // ---------------------------------------------------------------------------
  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = canvas.width = Math.max(1, Math.round(window.innerWidth * dpr));
    H = canvas.height = Math.max(1, Math.round(window.innerHeight * dpr));
    const sideCss = Math.min(window.innerWidth, window.innerHeight);
    u = Math.max(2, Math.round(Math.max(2, Math.round(sideCss / 240)) * dpr));
    // The world fills the whole screen: x maps to the width, y to the height.
    sw = W;
    sh = H;
    ox = 0;
    oy = 0;
    ctx.imageSmoothingEnabled = false;
  }

  const gridX = (x) => ox + Math.round((x * sw) / u) * u;
  const gridY = (y) => oy + Math.round((y * sh) / u) * u;
  const snapX = (px) => ox + Math.round((px - ox) / u) * u;
  const snapY = (py) => oy + Math.round((py - oy) / u) * u;

  function cursorPx() {
    return { x: ox + me.x * sw, y: oy + me.y * sh };
  }

  function bitmap(rows, x, y, color, a = 1, s = u) {
    ctx.globalAlpha = a;
    ctx.fillStyle = color;
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      for (let c = 0; c < row.length; c++) {
        if (row[c] === 'X') ctx.fillRect(x + c * s, y + r * s, s, s);
      }
    }
  }

  function textWidth(str, s = u) {
    let w = 0;
    for (const ch of str) w += (FONT[ch] || FONT[' '])[0].length + 1;
    return Math.max(0, w - 1) * s;
  }

  function textAt(str, x, y, color, a = 1, s = u) {
    for (const ch of str) {
      const g = FONT[ch] || FONT[' '];
      bitmap(g, x, y, color, a, s);
      x += (g[0].length + 1) * s;
    }
  }

  // The invite link in pixel type with a copy icon; the whole row copies.
  function drawLink(y) {
    const label = inviteUrl.replace(/^https?:\/\//, '').toLowerCase();
    const iconCols = COPY_ICON[0].length;
    const rowW = (sc) => textWidth(label, sc) + (4 + iconCols) * sc;
    let s = u;
    const maxW = sw - 16 * u;
    if (rowW(s) > maxW) s = Math.max(1, Math.floor((u * maxW) / rowW(u)));
    const tw = textWidth(label, s);
    const x0 = snapX(ox + sw / 2 - rowW(s) / 2);
    const ty = y + Math.round(2.5 * (u - s)); // keep the row centred on the line
    const box = hitBox(x0, ty, rowW(s), 5 * s);
    const hot = hover(box);
    const copied = now() < copiedUntil;
    textAt(label, x0, ty, hot ? C.textHi : C.text, 1, s);
    bitmap(copied ? CHECK_ICON : COPY_ICON, x0 + tw + 4 * s, ty, hot || copied ? C.textHi : C.text, 1, s);
    buttons.push(Object.assign(box, { action: () => copy(inviteUrl) }));
  }

  function textCentered(str, cx, y, color, a = 1) {
    textAt(str, snapX(cx - textWidth(str) / 2), y, color, a);
  }

  function hover(box) {
    const p = cursorPx();
    return p.x >= box.x && p.x < box.x + box.w && p.y >= box.y && p.y < box.y + box.h;
  }

  function hitBox(x, y, w, h) {
    const pad = (lastPointerType === 'mouse' ? 2 : 6) * u;
    return { x: x - pad, y: y - pad, w: w + 2 * pad, h: h + 2 * pad };
  }

  function button(label, x, y, action, a = 1) {
    const box = hitBox(x, y, textWidth(label), 5 * u);
    const active = a > 0.5;
    textAt(label, x, y, active && hover(box) ? C.textHi : C.text, a);
    if (active) buttons.push(Object.assign(box, { action }));
  }

  function buttonCentered(label, cx, y, action, a = 1) {
    button(label, snapX(cx - textWidth(label) / 2), y, action, a);
  }

  function drawHalo(px, py, t) {
    const maxR = 16;
    const r = maxR * (1 - Math.pow(1 - t, 3));
    if (r < 1) return;
    const fade = 1 - t;
    const cx = px + 2 * u, cy = py + 3 * u;
    for (let j = -maxR; j <= maxR; j++) {
      for (let i = -maxR; i <= maxR; i++) {
        const d = Math.hypot(i, j);
        if (d > r || d < 2) continue;
        const inten = (1 - d / r) * fade * 1.15;
        if (inten * 16 <= BAYER[j & 3][i & 3]) continue;
        ctx.globalAlpha = 1;
        ctx.fillStyle = inten > 0.66 ? C.halo[2] : inten > 0.33 ? C.halo[1] : C.halo[0];
        ctx.fillRect(cx + i * u, cy + j * u, u, u);
      }
    }
  }

  function meterY() {
    return oy + 4 * u;
  }

  function drawMeter(t) {
    const sq = 2 * u, gap = u, total = 6 * sq + 5 * gap;
    const x0 = snapX(ox + (sw - total) / 2);
    const y0 = meterY();
    let lit = 0, color = C.dim, a = 1;
    if (state === 'playing' && other.known) {
      if (!found) {
        lit = level;
        color = LEVEL_COLORS[lit - 1] || C.dim;
      } else {
        const e = t - foundAt;
        lit = reduceMotion.matches ? 6 : Math.min(6, levelAtFound + Math.floor(e / 70));
        color = LEVEL_COLORS[5];
        if (e > 1600) a = reduceMotion.matches ? 0 : Math.max(0, 1 - (e - 1600) / 900);
      }
    }
    if (a <= 0) return;
    for (let i = 0; i < 6; i++) {
      ctx.globalAlpha = a;
      ctx.fillStyle = i < lit ? color : C.dim;
      ctx.fillRect(x0 + i * (sq + gap), y0, sq, sq);
    }
  }

  function render(t) {
    buttons = [];
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    const cx = ox + sw / 2;
    const cy = snapY(oy + sh / 2 - 2.5 * u);
    const bottom = snapY(oy + sh - 12 * u);
    const mx = gridX(me.x), my = gridY(me.y);
    const px = gridX(other.x), py = gridY(other.y);
    const playing = state === 'playing' && other.known;

    if (playing && found && !reduceMotion.matches) {
      const e = (t - foundAt) / HALO_MS;
      if (e < 1) { drawHalo(mx, my, e); drawHalo(px, py, e); }
    }

    if (playing && (found || dist() < RADII[difficulty])) bitmap(CURSOR, px, py, C.other);

    if (state === 'playing' || state === 'left') drawMeter(t);

    if (playing && found) {
      const e = t - foundAt;
      if (e < 4000) {
        const a = e < 3000 ? 1 : 1 - (e - 3000) / 1000;
        textCentered(fmtTime(foundMs), cx, meterY() + 5 * u, C.time, a);
      }
      if (e > 1500) {
        const a = reduceMotion.matches ? 1 : Math.min(1, (e - 1500) / 600);
        buttonCentered('again', cx, bottom, again, a);
      }
    }

    switch (state) {
      case 'menu': {
        if (!ENABLE_STRANGER) {
          buttonCentered('invite', cx, cy, invite);
          break;
        }
        const w1 = textWidth('invite'), w2 = textWidth('stranger'), gap = 10 * u;
        const x1 = snapX(cx - (w1 + gap + w2) / 2);
        button('invite', x1, cy, invite);
        button('stranger', x1 + w1 + gap, cy, joinLobby);
        break;
      }
      case 'join':
        buttonCentered('join', cx, cy, () => joinRoom(inviteRoom, 'invite'));
        break;
      case 'share':
        drawLink(snapY(cy - 6 * u));
        buttonCentered('enter', cx, snapY(cy + 8 * u), enterRoom);
        if (t < flashUntil) textCentered(flashText, cx, snapY(cy + 18 * u), C.text);
        break;
      case 'lobby':
      case 'waiting':
        textCentered(t < flashUntil ? flashText : 'waiting', cx, cy, C.text);
        break;
      case 'left':
        textCentered('they left', cx, cy, C.text);
        buttonCentered('back', cx, bottom, goMenu);
        break;
      case 'full':
        textCentered('full', cx, cy, C.text);
        buttonCentered('back', cx, bottom, goMenu);
        break;
      case 'error':
        textCentered(errText, cx, cy, C.text);
        break;
    }

    // Who's here, top-left corner: you, and them (lit while they're in the room).
    if (state === 'waiting' || state === 'playing' || state === 'left') {
      const sq = 2 * u, x0 = snapX(ox + 4 * u), y0 = meterY();
      ctx.globalAlpha = 1;
      ctx.fillStyle = C.text;
      ctx.fillRect(x0, y0, sq, sq);
      ctx.fillStyle = peerPresent ? C.other : C.dim;
      ctx.fillRect(x0 + sq + u, y0, sq, sq);
    }

    // Difficulty, bottom-left corner: the word, then 5 type-height boxes.
    // Only the selected one is lit, in its colour: green (easy) to red (hard).
    if (state !== 'error') {
      const ty = snapY(oy + sh - 9 * u), tx = snapX(ox + 4 * u);
      textAt('difficulty', tx, ty, C.icon);
      const bs = 5 * u, gap = (lastPointerType === 'mouse' ? 1 : 3) * u;
      const pad = (lastPointerType === 'mouse' ? 2 : 5) * u;
      const bx = tx + textWidth('difficulty') + 3 * u;
      const boxes = RADII.map((_, i) => {
        const x = bx + i * (bs + gap);
        return { x: x - gap / 2, y: ty - pad, w: bs + gap, h: bs + 2 * pad, i };
      });
      const hot = boxes.findIndex(hover);
      for (const box of boxes) {
        const i = box.i;
        const lit = i === difficulty, preview = !lit && i === hot;
        ctx.globalAlpha = preview ? 0.35 : 1;
        ctx.fillStyle = lit || preview ? C.difficulty[i] : C.dim;
        ctx.fillRect(bx + i * (bs + gap), ty, bs, bs);
        buttons.push(Object.assign(box, { action: () => setDifficulty(i) }));
      }
      ctx.globalAlpha = 1;
    }

    // Sound toggle, bottom-right corner of the play area.
    if (state !== 'error') {
      const ix = snapX(ox + sw - 11 * u), iy = snapY(oy + sh - 9 * u);
      const box = hitBox(ix, iy, 7 * u, 5 * u);
      bitmap(soundOn ? SPK_ON : SPK_OFF, ix, iy, hover(box) ? C.iconHi : C.icon);
      buttons.push(Object.assign(box, { action: toggleSound }));
    }

    bitmap(CURSOR, mx, my, C.me);
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------------------
  // Loop
  // ---------------------------------------------------------------------------
  function update(t, dt) {
    if (other.known) {
      const k = 1 - Math.exp(-dt / 60);
      other.x += (other.tx - other.x) * k;
      other.y += (other.ty - other.y) * k;
    }
    if (state !== 'playing' || !roomCh) return;

    if ((moved && t - lastSend >= SEND_MS) || t - lastSend >= HEARTBEAT_MS) {
      send(roomCh, 'pos', { x: +me.x.toFixed(4), y: +me.y.toFixed(4), r: round, d: difficulty, at: difficultyAt });
      lastSend = t;
      moved = false;
    }

    if (!other.known) return;
    const d = dist();

    // Quantised meter with a short debounce so it steps cleanly.
    const raw = levelFor(d);
    if (raw === level) pendingLevel = raw;
    else if (raw !== pendingLevel) { pendingLevel = raw; pendingSince = t; }
    else if (t - pendingSince >= LEVEL_DEBOUNCE_MS) level = raw;

    if (found) return;

    if (d < RADII[difficulty]) {
      if (nearSince === null) nearSince = t;
      else if (t - nearSince >= FIND_HOLD_MS) doFound(t - roundStart, true);
    } else {
      nearSince = null;
    }

    if (!found && soundOn && actx && t >= nextPulse) {
      const c = 1 - Math.min(1, d / 0.9);
      beep(LEVEL_NOTES[level - 1] || LEVEL_NOTES[0], 0.16, 0.05);
      nextPulse = t + 1100 - 880 * c;
    }
  }

  let last = now();
  function frame(t) {
    const dt = Math.min(100, t - last);
    last = t;
    update(t, dt);
    render(t);
    requestAnimationFrame(frame);
  }

  resize();
  requestAnimationFrame(frame);
})();

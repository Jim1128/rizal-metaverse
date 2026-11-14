'use strict';
/* 3D museum: renderer, camera, rooms, figures. Exposes W. Interface code lives in app.js. */
const W = (function () {
  const T = THREE, PI = Math.PI;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const rooms = {}, figures = {}, tickers = [];
  let renderer, scene, camera, focusSpot, cur = null, viewI = 0, stageFigs = [], time = 0;
  const cam = { p: new T.Vector3(2.5, 1.65, 7.5), tp: new T.Vector3(2.5, 1.65, 7.5), yaw: 0.3, pitch: 0.1, tyaw: 0.3, tpitch: 0.1, attract: true };

  // the visitor: one player figure that walks through the rooms; the camera follows over the shoulder
  const pl = { x: 0, z: 6, fig: null }, keys = {}, input = { f: 0, t: 0, run: false };
  let gate = () => false;
  const obs = (g, x, z, r) => g.userData.obs.push({ x: x, z: z, r: r });
  const blk = (g, x0, x1, z0, z1) => g.userData.boxes.push([x0, x1, z0, z1]);
  function blocked(x, z) {
    const u = cur.group.userData, r = 0.35;
    if (Math.abs(x) > u.w / 2 - 0.45 || Math.abs(z) > u.d / 2 - 0.45) return true;
    for (const o of u.obs) { const dx = x - o.x, dz = z - o.z, rr = o.r + r; if (dx * dx + dz * dz < rr * rr) return true; }
    for (const b of u.boxes) if (x > b[0] - r && x < b[1] + r && z > b[2] - r && z < b[3] + r) return true;
    return false;
  }

  /* ---------- colour, textures, materials ---------- */
  const C = hex => new T.Color(hex).convertSRGBToLinear();
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  function ctex(w, h, draw, rx, ry) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4;
    if (rx) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry); }
    return t;
  }
  const TX = {
    marble: (rx, ry, a, b) => ctex(512, 512, (k, w) => {
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
        k.fillStyle = (i + j) % 2 ? (a || '#ece6d6') : (b || '#1f3a30'); k.fillRect(i * 256, j * 256, 256, 256);
      }
      k.globalAlpha = 0.16;
      for (let n = 0; n < 60; n++) { k.strokeStyle = n % 2 ? '#fff' : '#6b6456'; k.lineWidth = 1 + rnd() * 2; k.beginPath(); let x = rnd() * w, y = rnd() * w; k.moveTo(x, y); for (let s = 0; s < 5; s++) { x += (rnd() - 0.5) * 120; y += (rnd() - 0.5) * 120; k.lineTo(x, y); } k.stroke(); }
      k.globalAlpha = 1; k.strokeStyle = '#b89a52'; k.lineWidth = 3; k.strokeRect(0, 0, 256, 256); k.strokeRect(256, 256, 256, 256);
    }, rx, ry),
    wood: (rx, ry, base) => ctex(512, 512, (k, w) => {
      for (let i = 0; i < 6; i++) {
        const v = 0.8 + rnd() * 0.4; k.fillStyle = base || '#6b4426'; k.fillRect(0, i * 86, w, 86);
        k.fillStyle = 'rgba(0,0,0,' + (0.25 - v * 0.15) + ')'; k.fillRect(0, i * 86, w, 86);
        k.fillStyle = 'rgba(20,10,4,.7)'; k.fillRect(0, i * 86, w, 3); k.fillRect(((i * 197) % w), i * 86, 3, 86);
        k.globalAlpha = 0.12; k.strokeStyle = '#1a0d05';
        for (let n = 0; n < 9; n++) { k.beginPath(); const y = i * 86 + rnd() * 86; k.moveTo(0, y); k.bezierCurveTo(150, y + rnd() * 10 - 5, 350, y + rnd() * 10 - 5, w, y); k.stroke(); }
        k.globalAlpha = 1;
      }
    }, rx, ry),
    stone: (rx, ry, tone) => ctex(512, 512, (k, w) => {
      k.fillStyle = '#17120e'; k.fillRect(0, 0, w, w);
      for (let r = 0; r < 6; r++) for (let c = -1; c < 4; c++) {
        const v = (tone || 62) + rnd() * 26 | 0; k.fillStyle = 'rgb(' + v + ',' + (v - 5) + ',' + (v - 12) + ')';
        k.fillRect(c * 170 + (r % 2 ? 85 : 0) + 3, r * 85 + 3, 164, 79);
      }
      k.globalAlpha = 0.08; for (let n = 0; n < 900; n++) { k.fillStyle = rnd() > 0.5 ? '#fff' : '#000'; k.fillRect(rnd() * w, rnd() * w, 3, 3); } k.globalAlpha = 1;
    }, rx, ry),
    carpet: (rx, ry) => ctex(256, 256, (k, w) => {
      k.fillStyle = '#0f4234'; k.fillRect(0, 0, w, w); k.strokeStyle = '#b89a52'; k.globalAlpha = 0.35; k.lineWidth = 2;
      k.beginPath(); k.moveTo(128, 20); k.lineTo(236, 128); k.lineTo(128, 236); k.lineTo(20, 128); k.closePath(); k.stroke();
      k.strokeRect(4, 4, 248, 248); k.globalAlpha = 1;
    }, rx, ry),
    books: (rx, ry) => ctex(512, 512, (k, w) => {
      k.fillStyle = '#1a100a'; k.fillRect(0, 0, w, w);
      const cols = ['#5c1f1f', '#1f3d33', '#3a2c1c', '#6b5324', '#22304a', '#4a1f33', '#7a6a4a'];
      for (let r = 0; r < 4; r++) {
        let x = 6; const y = r * 128;
        k.fillStyle = '#2c1a0f'; k.fillRect(0, y + 118, w, 10);
        while (x < w - 10) { const bw = 12 + rnd() * 20, bh = 78 + rnd() * 34; k.fillStyle = cols[rnd() * cols.length | 0]; k.fillRect(x, y + 118 - bh, bw, bh); k.fillStyle = 'rgba(201,162,74,.75)'; k.fillRect(x + 2, y + 118 - bh + 10, bw - 4, 3); k.fillRect(x + 2, y + 118 - bh + 18, bw - 4, 2); x += bw + 1; }
      }
    }, rx, ry),
    facade: () => ctex(512, 512, (k, w) => {
      k.fillStyle = '#0d0a0c'; k.fillRect(0, 0, w, w);
      for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
        const lit = rnd() > 0.35, x = 26 + c * 124, y = 60 + r * 220;
        k.fillStyle = '#1b1210'; k.fillRect(x - 8, y - 8, 92, 146);
        k.fillStyle = lit ? '#e2a04a' : '#141018'; k.fillRect(x, y, 76, 130);
        k.strokeStyle = '#1b1210'; k.lineWidth = 4; for (let i = 1; i < 3; i++) { k.beginPath(); k.moveTo(x + i * 25.3, y); k.lineTo(x + i * 25.3, y + 130); k.stroke(); } for (let i = 1; i < 4; i++) { k.beginPath(); k.moveTo(x, y + i * 32.5); k.lineTo(x + 76, y + i * 32.5); k.stroke(); }
      }
      k.fillStyle = '#241714'; k.fillRect(0, 246, w, 14); k.fillRect(0, 0, w, 20);
    }),
    capiz: () => ctex(256, 256, (k, w) => {
      k.fillStyle = '#f2e6c4'; k.fillRect(0, 0, w, w); k.strokeStyle = '#4a2f1c'; k.lineWidth = 4;
      for (let i = 0; i <= 8; i++) { k.beginPath(); k.moveTo(i * 32, 0); k.lineTo(i * 32, w); k.moveTo(0, i * 32); k.lineTo(w, i * 32); k.stroke(); }
    }),
    glassWin: (a, b) => ctex(128, 256, (k, w, h) => {
      k.fillStyle = '#120c08'; k.fillRect(0, 0, w, h);
      const cols = [a, b, '#e8c15a', a, b];
      for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) { k.fillStyle = cols[(r + c) % cols.length]; k.fillRect(c * 32 + 3, r * 32 + 3, 26, 26); }
    }),
    door: (a, b) => ctex(64, 128, (k, w, h) => { const g = k.createLinearGradient(0, 0, 0, h); g.addColorStop(0, a); g.addColorStop(1, b); k.fillStyle = g; k.fillRect(0, 0, w, h); })
  };
  const std = o => { if (o.color !== undefined) o.color = C(o.color); if (o.emissive !== undefined) o.emissive = C(o.emissive); return new T.MeshStandardMaterial(o); };
  const basic = hex => new T.MeshBasicMaterial({ color: C(hex), toneMapped: false });
  const M = {};
  function initMats() {
    Object.assign(M, {
      gold: std({ color: 0xc9a24a, roughness: 0.32, metalness: 0.85 }), bronze: std({ color: 0x8a6a3a, roughness: 0.45, metalness: 0.8 }),
      wood: std({ color: 0x6b4426, roughness: 0.6 }), dark: std({ color: 0x2a1b12, roughness: 0.5 }), ivory: std({ color: 0xefe6d0, roughness: 0.92 }),
      marble: std({ color: 0xe9e4d8, roughness: 0.28 }), emerald: std({ color: 0x0f4d3c, roughness: 0.7 }), crimson: std({ color: 0x6e1c22, roughness: 0.8 }),
      stone: std({ color: 0x6d675f, roughness: 0.95 }), iron: std({ color: 0x1a1a1c, roughness: 0.5, metalness: 0.7 }), cream: std({ color: 0xf4ecd8, roughness: 0.8 }),
      glass: std({ color: 0xcfe4e0, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.16 }), terracotta: std({ color: 0xa5492f, roughness: 0.8 }),
      green: std({ color: 0x3d7a45, roughness: 0.9 }), water: std({ color: 0x3f7fa8, roughness: 0.2 }), rope: std({ color: 0xb59a6a, roughness: 1 })
    });
  }

  /* ---------- small builders ---------- */
  function add(g, geo, mat, x, y, z) { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; }
  const bx = (g, w, h, d, mat, x, y, z) => add(g, new T.BoxGeometry(w, h, d), mat, x, y + h / 2, z);
  const cy = (g, rt, rb, h, mat, x, y, z, s) => add(g, new T.CylinderGeometry(rt, rb, h, s || 20), mat, x, y + h / 2, z);
  // lines: [[text, relative size, colour]]
  function sign(lines, w, h, o) {
    o = o || {};
    const tex = ctex(1024, Math.round(1024 * h / w), (k, cw, ch) => {
      k.fillStyle = o.bg || '#17110b'; k.fillRect(0, 0, cw, ch);
      if (o.border !== false) { k.strokeStyle = o.line || '#c9a24a'; k.lineWidth = 6; k.strokeRect(14, 14, cw - 28, ch - 28); k.lineWidth = 2; k.strokeRect(26, 26, cw - 52, ch - 52); }
      const total = lines.reduce((s, l) => s + l[1] * 1.35, 0); let y = (ch - total * ch) / 2;
      k.textAlign = 'center'; k.textBaseline = 'middle';
      lines.forEach(l => {
        let fs = l[1] * ch; k.font = (l[3] || '') + ' ' + fs + 'px Georgia, serif';
        const tw = k.measureText(l[0]).width; if (tw > cw - 90) { fs *= (cw - 90) / tw; k.font = (l[3] || '') + ' ' + fs + 'px Georgia, serif'; }
        k.fillStyle = l[2] || '#e8d9b0'; k.fillText(l[0], cw / 2, y + l[1] * ch * 0.675); y += l[1] * ch * 1.35;
      });
    });
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tex, toneMapped: false }));
    m.userData.tex = tex; return m;
  }
  function place(g, obj, x, y, z, ry) { obj.position.set(x, y, z); obj.rotation.y = ry || 0; g.add(obj); return obj; }
  function column(g, x, z, h, r) { obs(g, x, z, r * 1.4); cy(g, r * 1.35, r * 1.45, 0.3, M.marble, x, 0, z, 24); cy(g, r * 0.92, r, h - 0.7, M.marble, x, 0.3, z, 24); cy(g, r * 1.5, r * 1.1, 0.4, M.gold, x, h - 0.4, z, 24); }
  function chandelier(g, x, y, z, light, n) {
    const ring = add(g, new T.TorusGeometry(0.7, 0.04, 8, 28), M.gold, x, y, z); ring.rotation.x = PI / 2; ring.castShadow = false;
    cy(g, 0.02, 0.02, 1.2, M.gold, x, y, z, 6);
    for (let i = 0; i < (n || 6); i++) { const a = i / (n || 6) * PI * 2; const b = add(g, new T.SphereGeometry(0.07, 10, 8), basic(0xfff0c2), x + Math.cos(a) * 0.7, y + 0.09, z + Math.sin(a) * 0.7); b.castShadow = false; }
    if (light) { const p = new T.PointLight(0xffdca0, light, 26, 1.6); p.position.set(x, y - 0.2, z); g.add(p); }
  }
  function bench(g, x, z, ry, mat) { const b = new T.Group(); bx(b, 2.2, 0.12, 0.6, mat || M.dark, 0, 0.42, 0); bx(b, 0.12, 0.42, 0.5, mat || M.dark, -0.95, 0, 0); bx(b, 0.12, 0.42, 0.5, mat || M.dark, 0.95, 0, 0); place(g, b, x, 0, z, ry); }
  const hot = (R, x, y, z, kind, id, label, extra) => R.hots.push(Object.assign({ pos: new T.Vector3(x, y, z), kind: kind, id: id, label: label }, extra || {}));

  function shell(g, w, d, h, o) {
    g.userData.w = w; g.userData.d = d; g.userData.h = h;
    const f = new T.Mesh(new T.PlaneGeometry(w, d), o.floor); f.rotation.x = -PI / 2; f.receiveShadow = true; g.add(f);
    const c = new T.Mesh(new T.PlaneGeometry(w, d), o.ceil || M.ivory); c.rotation.x = PI / 2; c.position.y = h; g.add(c);
    const wall = (len, x, z, ry) => {
      const m = new T.Mesh(new T.PlaneGeometry(len, h), o.wall); m.position.set(x, h / 2, z); m.rotation.y = ry; m.receiveShadow = true; g.add(m);
      if (o.dado) {
        const dh = o.dadoH || 1.15, b = new T.Mesh(new T.PlaneGeometry(len, dh), o.dado); b.position.set(x, dh / 2, z); b.rotation.y = ry; b.translateZ(0.012); g.add(b);
        const r = new T.Mesh(new T.BoxGeometry(len, 0.07, 0.06), o.trim || M.gold); r.position.set(x, dh, z); r.rotation.y = ry; r.translateZ(0.03); g.add(r);
      }
      if (o.cornice !== false) { const k = new T.Mesh(new T.BoxGeometry(len, 0.22, 0.16), o.trim || M.gold); k.position.set(x, h - 0.11, z); k.rotation.y = ry; k.translateZ(0.08); g.add(k); }
    };
    wall(w, 0, -d / 2, 0); wall(w, 0, d / 2, PI); wall(d, -w / 2, 0, PI / 2); wall(d, w / 2, 0, -PI / 2);
  }
  // a point on a wall of a w x d room. side: n s e w
  const wallAt = (w, d) => (side, along, off) => {
    off = off || 0;
    return side === 'n' ? { x: along, z: -d / 2 + off, ry: 0 } : side === 's' ? { x: along, z: d / 2 - off, ry: PI }
      : side === 'w' ? { x: -w / 2 + off, z: along, ry: PI / 2 } : { x: w / 2 - off, z: along, ry: -PI / 2 };
  };
  function door(R, at, label, to, view, tone) {
    const g = new T.Group(), frame = tone === 'dark' ? M.iron : M.dark;
    bx(g, 0.34, 3.5, 0.3, frame, -1.25, 0, 0.1); bx(g, 0.34, 3.5, 0.3, frame, 1.25, 0, 0.1); bx(g, 3.1, 0.4, 0.34, frame, 0, 3.5, 0.1); bx(g, 0.5, 0.5, 0.36, M.gold, 0, 3.45, 0.14);
    const p = new T.Mesh(new T.PlaneGeometry(2.2, 3.5), new T.MeshBasicMaterial({ map: TX.door(tone === 'dark' ? '#3a1410' : '#fff3cf', tone === 'dark' ? '#0a0606' : '#8a6a3a'), toneMapped: false }));
    p.position.set(0, 1.75, 0.03); g.add(p);
    place(R.group, g, at.x, 0, at.z, at.ry);
    hot(R, at.x + Math.sin(at.ry) * 0.3, 2.3, at.z + Math.cos(at.ry) * 0.3, 'door', to, label, { view: view || 0 });
  }
  function kiosk(R, x, z, ry, st) {
    const g = new T.Group();
    cy(g, 0.3, 0.36, 0.08, M.iron, 0, 0, 0, 20); cy(g, 0.05, 0.05, 1.05, M.gold, 0, 0.08, 0, 10);
    const s = sign([['STATION ' + st.no, 0.16, '#c9a24a'], [st.topic, 0.12, '#f3ead6'], ['touch to discuss', 0.09, '#8fd0b8', 'italic']], 0.9, 0.62, { bg: '#0b2a22', line: '#8fd0b8' });
    s.position.set(0, 1.32, 0.03); s.rotation.x = -0.45; g.add(s);
    const back = bx(g, 0.96, 0.68, 0.05, M.iron, 0, 0.98, 0); back.rotation.x = -0.45; back.position.y = 1.32;
    place(R.group, g, x, 0, z, ry); obs(R.group, x, z, 0.4);
    hot(R, x, 1.85, z, 'station', st.id, 'Station ' + st.no + ' · ' + st.topic);
  }
  function artifact(g, type) {
    if (type === 'book') { bx(g, 0.36, 0.07, 0.26, M.crimson, 0, 0.98, 0).rotation.y = 0.3; bx(g, 0.3, 0.012, 0.2, M.gold, 0, 1.05, 0).rotation.y = 0.3; }
    else if (type === 'book2') { bx(g, 0.36, 0.07, 0.26, M.emerald, 0, 0.98, 0).rotation.y = -0.3; bx(g, 0.3, 0.012, 0.2, M.gold, 0, 1.05, 0).rotation.y = -0.3; }
    else if (type === 'paper') { bx(g, 0.34, 0.01, 0.46, M.cream, -0.08, 0.98, 0).rotation.y = 0.2; bx(g, 0.3, 0.01, 0.4, M.cream, 0.12, 0.99, 0.02).rotation.y = -0.25; }
    else if (type === 'chest') { bx(g, 0.5, 0.26, 0.32, M.iron, 0, 0.98, 0); bx(g, 0.52, 0.06, 0.34, M.gold, 0, 1.24, 0); add(g, new T.SphereGeometry(0.05, 8, 8), basic(0xffe08a), 0, 1.33, 0); }
    else if (type === 'cross') { bx(g, 0.05, 0.5, 0.05, M.gold, 0, 0.98, 0); bx(g, 0.3, 0.05, 0.05, M.gold, 0, 1.3, 0); }
    else if (type === 'ship') { bx(g, 0.62, 0.12, 0.22, M.cream, 0, 0.98, 0); bx(g, 0.44, 0.1, 0.18, M.ivory, 0, 1.1, 0); cy(g, 0.03, 0.03, 0.22, M.iron, 0.05, 1.2, 0, 8); cy(g, 0.1, 0.1, 0.04, M.wood, -0.33, 1.0, 0, 12).rotation.x = PI / 2; }
    else if (type === 'locket') { const t = add(g, new T.TorusGeometry(0.08, 0.02, 8, 20), M.gold, 0.1, 1.02, 0); t.rotation.x = PI / 2; bx(g, 0.3, 0.01, 0.2, M.cream, -0.12, 0.98, 0); }
    else if (type === 'robe') { cy(g, 0.03, 0.03, 0.5, M.iron, 0, 0.98, 0, 8); bx(g, 0.34, 0.08, 0.05, M.iron, 0, 1.44, 0); }
  }
  function showcase(R, x, z, id, type, label) {
    const g = new T.Group();
    bx(g, 0.86, 0.9, 0.86, M.dark, 0, 0, 0); bx(g, 0.92, 0.06, 0.92, M.gold, 0, 0.9, 0);
    const gl = bx(g, 0.8, 0.62, 0.8, M.glass, 0, 0.97, 0); gl.castShadow = false;
    artifact(g, type);
    place(R.group, g, x, 0, z, 0); obs(R.group, x, z, 0.6);
    hot(R, x, 1.95, z, 'exhibit', id, label);
  }
  function plaque(R, at, y, lines, w, h, id, label, o) {
    const s = sign(lines, w, h, o); place(R.group, s, at.x + Math.sin(at.ry) * 0.04, y, at.z + Math.cos(at.ry) * 0.04, at.ry);
    const f = bx(new T.Group(), w + 0.14, h + 0.14, 0.05, M.gold, 0, -(h + 0.14) / 2, 0); place(R.group, f.parent, at.x + Math.sin(at.ry) * 0.01, y, at.z + Math.cos(at.ry) * 0.01, at.ry);
    if (id) hot(R, at.x + Math.sin(at.ry) * 0.2, y + h / 2 + 0.25, at.z + Math.cos(at.ry) * 0.2, o && o.kind || 'exhibit', id, label);
    return s;
  }

  /* ---------- figures: bronze statues that take on colour when they speak ---------- */
  const BRONZE = C(0x7d6238);
  function figure(L) {
    const g = new T.Group(), parts = [];
    const part = (geo, color, x, y, z, parent) => {
      const m = new T.Mesh(geo, new T.MeshStandardMaterial({ color: BRONZE.clone(), roughness: 0.42, metalness: 0.8 }));
      m.userData.c = C(color); m.position.set(x, y, z); m.castShadow = true; (parent || g).add(m); parts.push(m); return m;
    };
    const fat = L.round ? 1.22 : 1, top = L.robe || L.top;
    if (L.robe) part(new T.CylinderGeometry(0.2 * fat, 0.42, 1.34, 22), L.robe, 0, 0.67, 0);
    else if (L.dress) { part(new T.CylinderGeometry(0.17, 0.56, 1.02, 26), L.dress, 0, 0.51, 0); part(new T.CylinderGeometry(0.19, 0.16, 0.36, 18), L.top, 0, 1.2, 0); }
    else {
      part(new T.CylinderGeometry(0.09, 0.075, 0.84, 12), L.bottom, -0.1, 0.42, 0); part(new T.CylinderGeometry(0.09, 0.075, 0.84, 12), L.bottom, 0.1, 0.42, 0);
      part(new T.CylinderGeometry(0.2 * fat, 0.18 * fat, 0.58, 18), L.top, 0, 1.1, 0);
      if (L.coat) part(new T.CylinderGeometry(0.19 * fat, 0.25 * fat, 0.34, 18), L.top, 0, 0.72, 0);
    }
    const sh = part(new T.SphereGeometry(0.22 * fat, 18, 12), top, 0, 1.36, 0); sh.scale.set(1, 0.45, 0.72);
    if (L.shawl) part(new T.ConeGeometry(0.34, 0.3, 22, 1, true), L.shawl, 0, 1.33, 0);
    if (L.friar) { part(new T.CylinderGeometry(0.13, 0.22, 0.12, 18), L.robe, 0, 1.44, 0); const r = part(new T.TorusGeometry(0.27, 0.016, 6, 24), 0xf0ead8, 0, 0.95, 0); r.rotation.x = PI / 2; }
    if (L.collar) { const r = part(new T.TorusGeometry(0.075, 0.016, 6, 18), 0xffffff, 0, 1.47, 0); r.rotation.x = PI / 2; }
    const arm = s => {
      const a = new T.Group(); a.position.set(s * 0.26 * fat, 1.36, 0); a.rotation.z = s * 0.1; g.add(a);
      part(new T.CylinderGeometry(0.062, 0.052, 0.58, 10), top, 0, -0.29, 0, a); part(new T.SphereGeometry(0.058, 10, 8), L.skin, 0, -0.62, 0, a); return a;
    };
    const armL = arm(-1), armR = arm(1);
    part(new T.CylinderGeometry(0.055, 0.06, 0.1, 10), L.skin, 0, 1.47, 0);
    const head = new T.Group(); head.position.set(0, 1.63, 0); g.add(head);
    part(new T.SphereGeometry(0.15, 22, 18), L.skin, 0, 0, 0, head).scale.y = 1.12;
    part(new T.SphereGeometry(0.02, 8, 6), 0x1a1410, -0.052, 0.02, 0.138, head); part(new T.SphereGeometry(0.02, 8, 6), 0x1a1410, 0.052, 0.02, 0.138, head);
    if (L.hair !== null) {
      part(new T.SphereGeometry(0.158, 22, 12, 0, PI * 2, 0, PI * 0.52), L.hair, 0, 0.022, -0.012, head);
      if (L.longHair) part(new T.CylinderGeometry(0.12, 0.15, 0.5, 14), L.hair, 0, -0.28, -0.09, head);
      if (L.curls) for (let i = 0; i < 6; i++) part(new T.SphereGeometry(0.06, 8, 6), L.hair, Math.cos(i * 1.05) * 0.14, 0.1 + (i % 2) * 0.05, Math.sin(i * 1.05) * 0.1 - 0.03, head);
    }
    if (L.beard) part(new T.SphereGeometry(0.1, 14, 10, 0, PI * 2, PI * 0.5, PI * 0.5), L.beard, 0, -0.06, 0.05, head);
    if (L.hat === 'top') { part(new T.CylinderGeometry(0.2, 0.2, 0.02, 22), 0x121212, 0, 0.14, 0, head); part(new T.CylinderGeometry(0.125, 0.13, 0.2, 22), 0x121212, 0, 0.25, 0, head); }
    if (L.hat === 'salakot') part(new T.ConeGeometry(0.3, 0.17, 24), 0xb28c4c, 0, 0.2, 0, head);
    if (L.glasses) [-0.055, 0.055].forEach(x => part(new T.TorusGeometry(0.04, 0.009, 6, 16), 0x1c3a6c, x, 0.02, 0.145, head));
    if (L.child) g.scale.setScalar(L.small ? 0.62 : 0.72);
    g.userData = { parts: parts, armL: armL, armR: armR, head: head, alive: 0, target: 0, talk: false, base: 0, ph: rnd() * 6 };
    return g;
  }
  function animateFigure(f, dt) {
    const u = f.userData;
    if (Math.abs(u.alive - u.target) > 0.002) {
      u.alive += (u.target - u.alive) * Math.min(1, dt * 2.6);
      u.parts.forEach(m => { m.material.color.copy(BRONZE).lerp(m.userData.c, u.alive); m.material.metalness = 0.8 * (1 - u.alive); m.material.roughness = 0.42 + 0.4 * u.alive; });
    }
    const a = u.alive, t = time + u.ph, talk = u.talk ? 1 : 0, wk = u.walk || 0, sw = Math.sin(time * 9) * 0.6 * wk;
    u.armR.rotation.x += ((-0.55 - Math.sin(t * 3.1) * 0.3) * talk * a + sw - u.armR.rotation.x) * Math.min(1, dt * 9);
    u.armL.rotation.x += ((-0.15 * talk * a) - sw - u.armL.rotation.x) * Math.min(1, dt * 9);
    u.head.rotation.y = Math.sin(t * 1.1) * 0.12 * a * (1 - wk); u.head.rotation.x = Math.sin(t * 2.3) * 0.05 * a * talk;
    f.position.y = u.base + Math.sin(t * 1.6) * 0.008 * a + Math.abs(Math.sin(time * 9)) * 0.035 * wk;
  }
  const lookOf = id => { const c = CHARS.find(c => c.id === id); return c ? c.look : (EXTRAS[id] || { skin: 0xc79a70, hair: 0x15100c, top: 0x4a4a4a, bottom: 0x2a2a2a }); };
  function portraitCanvas(id) {
    const L = lookOf(id), c = document.createElement('canvas'), k = c.getContext('2d'), hex = h => '#' + ('000000' + h.toString(16)).slice(-6);
    c.width = 256; c.height = 320;
    const g = k.createRadialGradient(128, 130, 20, 128, 160, 220); g.addColorStop(0, '#5b4a2f'); g.addColorStop(1, '#120c07'); k.fillStyle = g; k.fillRect(0, 0, 256, 320);
    k.fillStyle = hex(L.robe || L.top); k.beginPath(); k.ellipse(128, 330, 118, 120, 0, 0, PI * 2); k.fill();
    if (L.shawl) { k.fillStyle = hex(L.shawl); k.beginPath(); k.moveTo(40, 320); k.lineTo(128, 210); k.lineTo(216, 320); k.fill(); }
    if (L.longHair) { k.fillStyle = hex(L.hair); k.fillRect(82, 110, 92, 130); }
    k.fillStyle = hex(L.skin); k.fillRect(112, 190, 32, 40); k.beginPath(); k.ellipse(128, 142, 50, 60, 0, 0, PI * 2); k.fill();
    if (L.hair !== null) { k.fillStyle = hex(L.hair); k.beginPath(); k.ellipse(128, 118, 53, 44, 0, PI, PI * 2); k.fill(); }
    if (L.beard) { k.fillStyle = hex(L.beard); k.beginPath(); k.ellipse(128, 176, 38, 30, 0, 0, PI); k.fill(); }
    k.fillStyle = '#1a1410'; k.fillRect(106, 140, 9, 5); k.fillRect(141, 140, 9, 5);
    if (L.glasses) { k.strokeStyle = '#1c3a6c'; k.lineWidth = 4; k.strokeRect(98, 132, 24, 18); k.strokeRect(134, 132, 24, 18); }
    if (L.hat === 'top') { k.fillStyle = '#121212'; k.fillRect(86, 30, 84, 62); k.fillRect(62, 88, 132, 10); }
    if (L.hat === 'salakot') { k.fillStyle = '#b28c4c'; k.beginPath(); k.moveTo(40, 104); k.lineTo(128, 50); k.lineTo(216, 104); k.fill(); }
    const v = k.createRadialGradient(128, 160, 90, 128, 160, 210); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.6)'); k.fillStyle = v; k.fillRect(0, 0, 256, 320);
    return c;
  }
  // statue on a pedestal with a framed portrait on the wall beside it. bk: distance to the wall behind
  function placeChar(R, id, x, z, ry, bk, side) {
    obs(R.group, x, z, 0.55);
    cy(R.group, 0.46, 0.52, 0.34, M.marble, x, 0, z, 26); cy(R.group, 0.5, 0.5, 0.03, M.gold, x, 0.34, z, 26);
    const f = figure(lookOf(id)); f.userData.base = 0.37; place(R.group, f, x, 0.37, z, ry); f.userData.room = R.id; figures[id] = f; R.figs.push(f);
    const fx = Math.sin(ry), fz = Math.cos(ry), sx = Math.cos(ry) * (side || 1), sz = -Math.sin(ry) * (side || 1);
    if (bk) {
      const t = new T.CanvasTexture(portraitCanvas(id)); t.encoding = T.sRGBEncoding;
      const px = x - fx * (bk - 0.05) + sx * 1.3, pz = z - fz * (bk - 0.05) + sz * 1.3;
      const fr = new T.Group(); bx(fr, 1.0, 1.24, 0.06, M.gold, 0, -0.62, 0);
      const p = new T.Mesh(new T.PlaneGeometry(0.84, 1.06), new T.MeshStandardMaterial({ map: t, roughness: 0.7 })); p.position.z = 0.035; fr.add(p);
      place(R.group, fr, px, 2.15, pz, ry);
      const n = sign([[id.replace(' (child)', '').toUpperCase(), 0.42, '#e8d9b0']], 1.0, 0.2, { bg: '#2a1b12', border: false }); place(R.group, n, px + fx * 0.02, 1.38, pz + fz * 0.02, ry);
    }
    hot(R, x, 0.37 + (lookOf(id).child ? 1.55 : 2.2), z, 'char', id, id.replace(' (child)', ''));
  }

  /* ---------- rooms ---------- */
  function room(id, wing, title, bg, fog, build) {
    const R = { id: id, wing: wing, title: title, group: new T.Group(), views: [], hots: [], figs: [], flick: [], bg: C(bg), fog: fog };
    R.group.userData = { obs: [], boxes: [], w: 10, d: 10, h: 6 };
    R.group.visible = false; scene.add(R.group); rooms[id] = R; build(R, R.group); return R;
  }
  const view = (R, name, p, l) => R.views.push({ name: name, p: p, l: l });
  function spot(g, x, y, z, tx, ty, tz, color, int, shadow, angle) {
    const s = new T.SpotLight(color, int, 40, angle || 0.6, 0.6, 1.2); s.position.set(x, y, z); s.target.position.set(tx, ty, tz); g.add(s, s.target);
    if (shadow && !coarse) { s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -0.0008; }
    return s;
  }
  const WINGS = { hub: 'The Rizal Legacy Experience', noli: 'Historical Gallery · Noli Me Tangere', fili: 'Revolutionary Archives · El Filibusterismo', hall: 'Reflection and Collaboration Hall' };

  function buildAll() {
    /* ROTUNDA */
    room('rotunda', 'hub', 'The Rotunda', 0x0f0c08, [14, 46], (R, g) => {
      const w = 20, d = 20, h = 9, at = wallAt(w, d);
      shell(g, w, d, h, { floor: std({ map: TX.marble(5, 5), roughness: 0.25 }), wall: M.ivory, dado: M.emerald, dadoH: 1.3 });
      for (let i = 0; i < 8; i++) { const a = (i + 0.5) * PI / 4; column(g, Math.cos(a) * 7.3, Math.sin(a) * 7.3, h, 0.36); }
      const ring = add(g, new T.RingGeometry(2.2, 2.45, 48), M.gold, 0, 0.012, 0); ring.rotation.x = -PI / 2;
      const sky = add(g, new T.CircleGeometry(3.4, 40), basic(0xfff3d6), 0, h - 0.02, 0); sky.rotation.x = PI / 2;
      add(g, new T.TorusGeometry(3.5, 0.14, 8, 48), M.gold, 0, h - 0.06, 0).rotation.x = PI / 2;
      cy(g, 1.0, 1.15, 1.25, M.marble, 0, 0, 0, 32); cy(g, 1.08, 1.08, 0.06, M.gold, 0, 1.25, 0, 32);
      const rz = figure({ skin: 0xc79a70, hair: 0x15100c, top: 0x1c1c1c, bottom: 0x1c1c1c, coat: true }); rz.scale.setScalar(1.25); rz.userData.base = 1.31; place(g, rz, 0, 1.31, 0, 0.35); R.figs.push(rz);
      const bk = bx(new T.Group(), 0.3, 0.05, 0.22, M.bronze, 0, 0, 0); rz.userData.armL.add(bk.parent); bk.parent.position.set(0.05, -0.62, 0.08);
      hot(R, 0, 4.0, 0, 'exhibit', 'rizal', 'José Rizal');
      door(R, at('n', 0), 'Historical Gallery · Noli Me Tangere', 'n_gallery'); door(R, at('w', 0), 'Revolutionary Archives · El Filibusterismo', 'f_street', 0, 'dark'); door(R, at('e', 0), 'Reflection and Collaboration Hall', 'hall');
      [['n', 'I', 'HISTORICAL GALLERY', 'Noli Me Tangere'], ['w', 'II', 'REVOLUTIONARY ARCHIVES', 'El Filibusterismo'], ['e', 'III', 'REFLECTION HALL', 'Discussion and insight']].forEach(s => {
        const a = at(s[0], 0), p = sign([['WING ' + s[1], 0.2, '#c9a24a'], [s[2], 0.26, '#f3ead6'], [s[3], 0.18, '#c9a24a', 'italic']], 3.6, 0.95); place(g, p, a.x + Math.sin(a.ry) * 0.05, 4.7, a.z + Math.cos(a.ry) * 0.05, a.ry);
      });
      const s = at('s', 0); place(g, sign([['THE RIZAL', 0.2, '#c9a24a'], ['LEGACY EXPERIENCE', 0.26, '#f3ead6'], ['Noli Me Tangere  ·  El Filibusterismo', 0.12, '#c9a24a', 'italic']], 9.5, 2.4), s.x, 6.1, s.z - 0.05, s.ry);
      R.roster = plaque(R, at('s', 5.4), 2.5, [['THE GROUP', 0.1, '#c9a24a']], 3.3, 2.6, 'registry', 'The group and its roles', { kind: 'registry' });
      plaque(R, at('s', 0), 2.5, [['ABOUT THIS EXHIBITION', 0.085, '#c9a24a'], ['Rizal in the Metaverse', 0.12, '#f3ead6'], ['Explore, discuss and reflect on the themes,', 0.062], ['characters and historical significance of', 0.062], ['Noli Me Tangere and El Filibusterismo.', 0.062]], 3.6, 2.6, 'assignment', 'About this exhibition');
      plaque(R, at('s', -5.4), 2.5, [['ASSESSMENT', 0.1, '#c9a24a']].concat(RUBRIC.map(r => [r.name + '  ' + r.pct + '%', 0.075])), 3.3, 2.6, 'rubric', 'Assessment criteria', { kind: 'rubric' });
      chandelier(g, 0, 6.4, 0, 1.25, 10);
      g.add(new T.HemisphereLight(0xfff0d8, 0x2a2018, 0.5)); spot(g, 3, 8.5, 5, 0, 2.2, 0, 0xfff0d0, 1.5, true, 0.5); spot(g, 0, 8, -2, 0, 3, 10, 0xffe2b0, 0.8, false, 0.8);
      obs(g, 0, 0, 1.3);
      view(R, 'Entrance', [0, 1.65, 8.8], [0, 2.9, 0]); view(R, 'Toward the wings', [3.6, 1.65, 2.4], [-2, 2.4, -10]); view(R, 'The founders\' wall', [0, 1.65, 2.6], [0, 2.9, 10]);
    });

    /* NOLI 1: GALLERY */
    room('n_gallery', 'noli', 'Gallery of San Diego', 0x120e09, [16, 44], (R, g) => {
      const w = 24, d = 16, h = 6.5, at = wallAt(w, d);
      shell(g, w, d, h, { floor: std({ map: TX.wood(5, 4), roughness: 0.45 }), wall: M.ivory, dado: M.emerald });
      // the plaza diorama
      const t = new T.Group(); bx(t, 5.4, 0.86, 3.6, M.dark, 0, 0, 0); bx(t, 5.5, 0.06, 3.7, M.gold, 0, 0.86, 0); bx(t, 5.2, 0.03, 3.4, M.green, 0, 0.92, 0);
      bx(t, 1.7, 0.012, 1.5, M.cream, 0, 0.95, 0.2);
      bx(t, 0.7, 0.6, 1.1, M.ivory, 0, 0.95, -1.05); bx(t, 0.3, 1.0, 0.3, M.ivory, 0.55, 0.95, -0.72); add(t, new T.ConeGeometry(0.26, 0.26, 4), M.terracotta, 0.55, 2.08, -0.72).rotation.y = PI / 4;
      const cr = add(t, new T.ConeGeometry(0.62, 0.26, 4), M.terracotta, 0, 1.68, -1.05); cr.rotation.y = PI / 4; cr.scale.z = 1.5;
      bx(t, 0.9, 0.36, 0.6, M.cream, -1.75, 0.95, 0.9); add(t, new T.ConeGeometry(0.72, 0.24, 4), M.terracotta, -1.75, 1.43, 0.9).rotation.y = PI / 4;
      [[1.7, 0.9], [1.9, -0.2], [-1.9, -0.6], [1.2, -1.2], [-1.2, 1.35], [0.4, 1.4]].forEach(p => { bx(t, 0.42, 0.28, 0.42, M.wood, p[0], 0.95, p[1]); add(t, new T.ConeGeometry(0.4, 0.2, 4), M.terracotta, p[0], 1.33, p[1]).rotation.y = PI / 4; });
      [0.3, -0.3, 0.3, -0.3].forEach((v, i) => cy(t, 0.02, 0.02, 0.3, M.ivory, v, 0.96, 0.2 + (i < 2 ? 0.3 : -0.3), 6)); add(t, new T.ConeGeometry(0.5, 0.16, 4), M.terracotta, 0, 1.34, 0.2).rotation.y = PI / 4;
      const lk = add(t, new T.CircleGeometry(0.6, 20), M.water, -2.1, 0.955, -1.3); lk.rotation.x = -PI / 2;
      for (let i = 0; i < 14; i++) add(t, new T.ConeGeometry(0.09, 0.26, 7), M.green, -2.5 + rnd() * 5, 1.08, -1.6 + rnd() * 3.2);
      place(g, t, 0, 0, 0.6, 0); hot(R, 0, 2.5, 0.6, 'exhibit', 'diorama', 'The town of San Diego');
      placeChar(R, 'Crisostomo Ibarra', -6, -7, 0, 1.0, 1); placeChar(R, 'Maria Clara', 0, -7, 0, 1.0, 1); placeChar(R, 'Kapitan Tiago', 6, -7, 0, 1.0, 1);
      placeChar(R, 'Doña Victorina', -11, 1.5, PI / 2, 1.0, 1); placeChar(R, 'Elias', 11, -2.5, -PI / 2, 1.0, 1);
      showcase(R, -6.5, 4.4, 'noli1887', 'book', 'First edition, 1887'); showcase(R, 6.5, 4.4, 'touchmenot', 'paper', '"Touch me not"'); showcase(R, -9.3, -4.6, 'frailocracy', 'cross', 'The friar orders');
      kiosk(R, -3.2, -4.4, 0.3, STATIONS[0]);
      door(R, at('s', 0), 'Back to the Rotunda', 'rotunda', 1); door(R, at('e', 4.5), 'Church Interior', 'n_church');
      bench(g, -4.5, 5.6, 0); bench(g, 4.5, 5.6, 0);
      chandelier(g, -6, 5.2, 0, 0.75); chandelier(g, 6, 5.2, 0, 0.75);
      g.add(new T.HemisphereLight(0xfff0d8, 0x2a2018, 0.42)); spot(g, 0, 6.3, 3.2, 0, 1, 0.6, 0xfff2d6, 1.7, true, 0.62); spot(g, 0, 6.2, -2, 0, 1.5, -8, 0xffe6bf, 1.1, false, 1.0);
      blk(g, -2.8, 2.8, -1.3, 2.5); blk(g, -5.7, -3.3, 5.2, 6); blk(g, 3.3, 5.7, 5.2, 6);
      view(R, 'Gallery entrance', [0, 1.65, 7], [0, 1.6, -7]); view(R, 'The diorama', [3.2, 2.1, 4.2], [0, 1.0, 0.4]); view(R, 'The portrait wall', [0, 1.65, -2.6], [0, 2.0, -8]); view(R, 'The side walls', [-3, 1.65, 0.2], [-11, 1.9, 1.5]);
    });

    /* NOLI 2: CHURCH */
    room('n_church', 'noli', 'Church Interior', 0x0c0a09, [14, 48], (R, g) => {
      const w = 12, d = 28, h = 10.5, at = wallAt(w, d);
      shell(g, w, d, h, { floor: std({ map: TX.marble(3, 7, '#d8cfbd', '#4a3a2c'), roughness: 0.35 }), wall: std({ color: 0xd9d0bc, roughness: 0.95 }), ceil: M.dark, cornice: false });
      for (let z = -9; z <= 9; z += 4.5) { column(g, -3.7, z, 8.2, 0.34); column(g, 3.7, z, 8.2, 0.34); bx(g, 7.9, 0.3, 0.3, M.dark, 0, 8.2, z); }
      bx(g, 0.3, 0.3, 19, M.dark, -3.7, 8.2, 0); bx(g, 0.3, 0.3, 19, M.dark, 3.7, 8.2, 0);
      for (let z = -5.5; z <= 9.5; z += 1.9) [-1.95, 1.95].forEach(x => { bx(g, 2.6, 0.1, 0.5, M.dark, x, 0.44, z); bx(g, 2.6, 0.5, 0.08, M.dark, x, 0.44, z + 0.25); bx(g, 0.1, 0.44, 0.5, M.dark, x - 1.25, 0, z); bx(g, 0.1, 0.44, 0.5, M.dark, x + 1.25, 0, z); });
      bx(g, 8, 0.2, 3.4, M.marble, 0, 0, -12.3); bx(g, 6.4, 0.2, 2.6, M.marble, 0, 0.2, -12.7); bx(g, 2.6, 1.0, 0.9, M.cream, 0, 0.4, -12.4); bx(g, 2.8, 0.05, 1.0, M.gold, 0, 1.4, -12.4);
      bx(g, 5.6, 6.6, 0.4, M.gold, 0, 0.4, -13.75); bx(g, 3.6, 1.6, 0.42, M.gold, 0, 7, -13.75);
      [[-1.75, 2.4], [0, 2.4], [1.75, 2.4], [-1.75, 4.8], [1.75, 4.8]].forEach(p => { const n = add(g, new T.PlaneGeometry(1.1, 1.8), std({ color: 0x3a2413, roughness: 0.9 }), p[0], p[1], -13.54); n.castShadow = false; cy(g, 0.14, 0.2, 0.9, M.cream, p[0], p[1] - 0.8, -13.4, 10); });
      bx(g, 0.12, 2.0, 0.12, M.dark, 0, 4.0, -13.45); bx(g, 0.9, 0.12, 0.12, M.dark, 0, 5.3, -13.45);
      [[-5.97, -6, PI / 2, '#b23a48', '#2e6e9c'], [5.97, -6, -PI / 2, '#2e6e9c', '#3d8a5a'], [-5.97, 3, PI / 2, '#3d8a5a', '#b23a48'], [5.97, 3, -PI / 2, '#b23a48', '#e8c15a']].forEach(q => {
        const p = new T.Mesh(new T.PlaneGeometry(1.5, 3.4), new T.MeshBasicMaterial({ map: TX.glassWin(q[3], q[4]), toneMapped: false })); place(g, p, q[0], 6, q[1], q[2]);
      });
      const la = new T.PointLight(0xff8a70, 0.45, 16, 1.5); la.position.set(-4.6, 5.6, -6); const lb = new T.PointLight(0x70b0ff, 0.45, 16, 1.5); lb.position.set(4.6, 5.6, -6); g.add(la, lb);
      cy(g, 0.7, 0.5, 1.2, M.dark, -3.7, 1.5, -6.8, 8); cy(g, 0.9, 0.9, 0.08, M.gold, -3.7, 3.6, -6.8, 8); cy(g, 0.12, 0.12, 1.5, M.dark, -3.7, 0, -6.8, 8);
      hot(R, -3.7, 3.4, -6.8, 'exhibit', 'pulpit', 'The pulpit');
      cy(g, 0.025, 0.025, 8.5, M.rope, 4.9, 1.2, 11.6, 6); hot(R, 4.9, 3.2, 11.6, 'exhibit', 'belltower', 'The bell rope');
      plaque(R, at('w', 11.5), 1.7, [['IN MEMORY', 0.12, '#c9a24a'], ['Don Rafael Ibarra', 0.16, '#f3ead6'], ['whose grave stands empty', 0.1, '#e8d9b0', 'italic']], 1.9, 1.1, 'grave', 'The empty grave');
      placeChar(R, 'Padre Damaso', -4.95, -2.3, PI / 2, 1.0, -1); placeChar(R, 'Padre Salvi', 3.2, -10.6, 0, 0, 1);
      placeChar(R, 'Sisa', -4.95, 6.8, PI / 2, 1.0, 1); placeChar(R, 'Basilio (child)', 4.95, 7.5, -PI / 2, 1.0, 1); placeChar(R, 'Crispin', 4.95, 6.1, -PI / 2, 0, 1);
      kiosk(R, -1.2, 11.6, 0.25, STATIONS[1]);
      door(R, at('s', -2.6), 'Back to the Gallery', 'n_gallery', 0); door(R, at('s', 2.6), 'Period Rooms', 'n_rooms');
      g.add(new T.HemisphereLight(0xe8dcc8, 0x1a1410, 0.34)); spot(g, 0, 10, -6, 0, 2.5, -13.5, 0xffe2a8, 2.2, true, 0.5); spot(g, 0, 9.5, 12, 0, 1, 5, 0xfff0dc, 0.9, false, 0.9);
      const cl = new T.PointLight(0xffc880, 0.7, 12, 1.5); cl.position.set(0, 2.4, -11.4); g.add(cl); R.flick.push([cl, 0.7]);
      view(R, 'The nave', [0, 1.65, 12.2], [0, 3.2, -13]); view(R, 'Before the altar', [0, 1.65, -4.2], [0, 3.4, -13.5]); view(R, 'Near the door', [0, 1.65, 3.2], [0, 1.9, 13]); view(R, 'The pulpit', [1.4, 1.65, -7.6], [-3.7, 2.6, -6.8]);
      blk(g, 0.65, 3.25, -5.8, 9.9); blk(g, -3.25, -0.65, -5.8, 9.9); blk(g, -4, 4, -14, -10.6); obs(g, -3.7, -6.8, 0.8);
    });

    /* NOLI 3: PERIOD ROOMS */
    room('n_rooms', 'noli', 'Period Rooms: Classroom and Sala', 0x120e09, [14, 40], (R, g) => {
      const w = 22, d = 12, h = 5.6, at = wallAt(w, d);
      shell(g, w, d, h, { floor: std({ map: TX.wood(6, 3, '#7a5330'), roughness: 0.4 }), wall: M.ivory, dado: M.wood, dadoH: 1.0, trim: M.dark });
      bx(g, 0.3, h, 4.6, M.ivory, 0, 0, -3.7); bx(g, 0.3, h, 3.2, M.ivory, 0, 0, 4.4); bx(g, 0.34, 1.6, 2.4, M.dark, 0, 4.0, -0.2); bx(g, 0.34, 0.2, 2.6, M.gold, 0, 3.9, -0.2);
      // classroom
      for (let r = 0; r < 3; r++) [-8.2, -5.4, -2.6].forEach(x => { bx(g, 1.9, 0.08, 0.5, M.wood, x, 0.66, 0.2 + r * 1.5); bx(g, 1.9, 0.06, 0.3, M.wood, x, 0.4, 0.75 + r * 1.5); bx(g, 0.08, 0.66, 0.5, M.dark, x - 0.9, 0, 0.2 + r * 1.5); bx(g, 0.08, 0.66, 0.5, M.dark, x + 0.9, 0, 0.2 + r * 1.5); });
      bx(g, 2.0, 0.78, 0.9, M.dark, -5.4, 0, -3.6); bx(g, 0.5, 0.03, 0.34, M.cream, -5.8, 0.78, -3.6); cy(g, 0.012, 0.012, 0.9, M.rope, -4.9, 0.8, -3.6, 6).rotation.z = PI / 2;
      hot(R, -5.4, 1.9, -3.6, 'exhibit', 'schoolmaster', 'The schoolmaster\'s desk');
      const bb = at('n', -5.4); place(g, sign([['A  B  C  D  E', 0.2, '#e9ecdf'], ['ba  be  bi  bo  bu', 0.14, '#e9ecdf'], ['La letra con sangre entra', 0.13, '#e9ecdf', 'italic']], 4.2, 1.7, { bg: '#1c2a22', line: '#5a3a22' }), bb.x, 2.5, bb.z + 0.05, 0);
      plaque(R, at('n', -1.7), 2.3, [['PLAN', 0.14, '#1c2a4a'], ['Escuela de San Diego', 0.12, '#1c2a4a'], ['boys  ·  garden  ·  girls', 0.09, '#1c2a4a', 'italic']], 1.6, 1.3, 'schoolplan', 'Ibarra\'s plan for a school', { bg: '#dfe6ee', line: '#1c2a4a' });
      showcase(R, -9.6, -4.4, 'cartilla', 'paper', 'The cartilla, 1863'); kiosk(R, -1.9, 4.3, -0.5, STATIONS[2]);
      // sala
      bx(g, 3.8, 0.08, 1.5, M.dark, 5.6, 0.78, -1.2); [[3.9, -1.8], [7.3, -1.8], [3.9, -0.6], [7.3, -0.6]].forEach(p => cy(g, 0.06, 0.05, 0.78, M.dark, p[0], 0, p[1], 8));
      bx(g, 3.5, 0.012, 0.6, M.cream, 5.6, 0.862, -1.2); cy(g, 0.26, 0.16, 0.16, M.cream, 5.6, 0.87, -1.2, 18); [4.4, 6.8].forEach(x => { cy(g, 0.16, 0.16, 0.02, M.cream, x, 0.87, -0.9, 14); cy(g, 0.16, 0.16, 0.02, M.cream, x, 0.87, -1.5, 14); });
      [4.4, 5.6, 6.8].forEach(x => [-2.25, -0.15].forEach(z => { bx(g, 0.46, 0.06, 0.46, M.crimson, x, 0.46, z); bx(g, 0.46, 0.6, 0.06, M.dark, x, 0.5, z + (z < -1 ? -0.22 : 0.22)); }));
      hot(R, 5.6, 1.9, -1.2, 'exhibit', 'tinola', 'The dinner table');
      [-3.2, 0.6].forEach(z => { const p = new T.Mesh(new T.PlaneGeometry(2.6, 2.4), new T.MeshBasicMaterial({ map: TX.capiz(), toneMapped: false })); place(g, p, 10.97, 2.7, z, -PI / 2); });
      hot(R, 10.6, 4.2, -1.3, 'exhibit', 'capiz', 'The bahay na bato');
      showcase(R, 9.6, 4.3, 'letters', 'locket', 'Two letters and a locket');
      bx(g, 2.2, 0.9, 0.6, M.dark, 5.6, 0, -5.6); bx(g, 1.3, 1.5, 0.06, M.gold, 5.6, 1.5, -5.92); add(g, new T.PlaneGeometry(1.1, 1.3), std({ color: 0xb8c4c4, roughness: 0.08, metalness: 0.9 }), 5.6, 2.25, -5.88);
      chandelier(g, 5.6, 4.3, -1.2, 0.95, 8);
      const cw = new T.PointLight(0xfff0c8, 0.5, 12, 1.5); cw.position.set(9.6, 2.8, -1.3); g.add(cw);
      door(R, at('s', -7.2), 'Back to the Church', 'n_church', 2); door(R, at('s', 7.2), 'Scene Theatre of the Noli', 'n_theatre');
      g.add(new T.HemisphereLight(0xfff0d8, 0x2a2018, 0.42)); spot(g, -5.4, 5.4, 3.5, -5.4, 0.6, -2, 0xfff2d6, 1.5, true, 0.75); spot(g, 5.6, 5.4, 3.2, 5.6, 0.8, -1.4, 0xffe6bf, 1.4, false, 0.8);
      blk(g, -0.2, 0.2, -6, -1.4); blk(g, -0.2, 0.2, 2.8, 6); blk(g, -6.4, -4.4, -4.1, -3.1); blk(g, 3.6, 7.6, -2.6, 0.2); blk(g, 4.5, 6.7, -6, -5.3);
      for (let r = 0; r < 3; r++) [-8.2, -5.4, -2.6].forEach(x => blk(g, x - 0.95, x + 0.95, 0.1 + r * 1.5, 0.95 + r * 1.5));
      view(R, 'The classroom', [-5.4, 1.65, 4.7], [-5.4, 1.6, -6]); view(R, 'The sala', [5.6, 1.65, 4.6], [5.6, 1.5, -6]); view(R, 'The windows', [4.2, 1.65, 2.6], [11, 2.2, -1.2]);
    });

    /* SCENE THEATRES */
    const theatre = (id, novel, prev, prevLabel, prevView) => room(id, novel, novel === 'noli' ? 'Scene Theatre of the Noli' : 'Scene Theatre of the Fili', 0x070505, [12, 40], (R, g) => {
      const w = 16, d = 18, h = 8, at = wallAt(w, d), vel = novel === 'noli' ? M.emerald : M.crimson, tone = novel === 'noli' ? null : 'dark';
      shell(g, w, d, h, { floor: std({ map: TX.carpet(8, 9), roughness: 0.95, color: novel === 'noli' ? 0xffffff : 0xc86a6a }), wall: std({ color: novel === 'noli' ? 0x24352c : 0x2a1416, roughness: 0.95 }), ceil: M.dark, dado: M.dark });
      bx(g, 11.6, 0.6, 5, std({ map: TX.wood(4, 2), roughness: 0.4 }), 0, 0, -6.5); bx(g, 11.8, 0.1, 0.2, M.gold, 0, 0.55, -3.95);
      R.backdrop = new T.Mesh(new T.PlaneGeometry(10.4, 5.4), new T.MeshBasicMaterial({ toneMapped: false })); R.backdrop.position.set(0, 3.4, -8.9); g.add(R.backdrop); R.novel = novel;
      [-5.75, 5.75].forEach(x => { for (let i = 0; i < 4; i++) cy(g, 0.22, 0.26, 6.4, vel, x + (i - 1.5) * 0.34 * Math.sign(x), 0.4, -4.3 - (i % 2) * 0.12, 10); });
      bx(g, 13.2, 1.1, 0.5, vel, 0, 6.5, -4.3); bx(g, 13.4, 0.14, 0.56, M.gold, 0, 6.42, -4.3); bx(g, 0.5, 7.2, 0.6, M.gold, -6.75, 0, -4.2); bx(g, 0.5, 7.2, 0.6, M.gold, 6.75, 0, -4.2);
      for (let r = 0; r < 3; r++) for (let i = 0; i < 8; i++) { const x = (i - 3.5) * 1.0, z = 1.2 + r * 1.7; bx(g, 0.72, 0.42, 0.66, vel, x, 0, z); bx(g, 0.72, 0.6, 0.12, vel, x, 0.42, z + 0.28); }
      cy(g, 0.3, 0.36, 0.08, M.gold, 5.4, 0, -2.4, 16); cy(g, 0.05, 0.05, 1.0, M.gold, 5.4, 0.08, -2.4, 8);
      const pg = sign([['PROGRAMME', 0.2, '#c9a24a'], ['four key scenes', 0.14, '#f3ead6', 'italic']], 0.8, 0.5); pg.position.set(5.4, 1.25, -2.4); pg.rotation.set(-0.5, -0.5, 0, 'YXZ'); g.add(pg);
      hot(R, 5.4, 1.9, -2.4, 'theatre', novel, 'Programme: choose a scene');
      door(R, at('s', -3.4), prevLabel, prev, prevView, tone); door(R, at('s', 3.4), 'Return to the Rotunda', 'rotunda', 1, tone);
      g.add(new T.HemisphereLight(0xfff0d8, 0x100c0a, 0.2));
      R.stageSpot = spot(g, 0, 7.4, 0.5, 0, 1.6, -6.4, 0xfff0d0, 2.4, true, 0.34); spot(g, 0, 7.2, -1, 0, 2.5, -8.8, 0xffe2b0, 1.1, false, 0.95);
      blk(g, -8, 8, -9, -3.9); [1.2, 2.9, 4.6].forEach(z => blk(g, -4.1, 4.1, z - 0.35, z + 0.45)); obs(g, 5.4, -2.4, 0.4);
      view(R, 'The stalls', [0, 1.75, 6.6], [0, 2.4, -7]); view(R, 'Front row', [0, 1.65, 0.2], [0, 2.3, -7]);
      setBackdrop(R, null);
    });
    theatre('n_theatre', 'noli', 'n_rooms', 'Back to the Period Rooms', 1);

    /* FILI 1: STREET */
    room('f_street', 'fili', 'A Street of Manila by Night', 0x06060c, [7, 34], (R, g) => {
      const w = 12, d = 30, h = 11, at = wallAt(w, d), fac = TX.facade();
      fac.wrapS = fac.wrapT = T.RepeatWrapping; fac.repeat.set(4, 1.4);
      shell(g, w, d, h, { floor: std({ map: TX.stone(5, 12, 40), roughness: 0.6 }), wall: new T.MeshStandardMaterial({ map: fac, emissiveMap: fac, emissive: new T.Color(0xffffff), emissiveIntensity: 0.55, roughness: 0.9 }), ceil: basic(0x04040a), cornice: false });
      [[-3.9, -9], [3.9, -1], [-3.9, 7]].forEach((p, i) => {
        cy(g, 0.06, 0.1, 3.6, M.iron, p[0], 0, p[1], 8); bx(g, 0.34, 0.44, 0.34, basic(0xffd590), p[0], 3.6, p[1]).castShadow = false; cy(g, 0.26, 0.05, 0.12, M.iron, p[0], 4.04, p[1], 8);
        const l = new T.PointLight(0xffb060, 1.1, 15, 1.6); l.position.set(p[0], 3.7, p[1]); g.add(l); R.flick.push([l, 1.1]);
      });
      for (let i = 0; i < 9; i++) bx(g, 0.5, 0.24, 0.5, M.stone, -5.6, 0, -13 + i * 3.3);
      placeChar(R, 'Don Custodio', -4.95, -5.5, PI / 2, 0, 1); placeChar(R, 'Ben Zayb', 4.95, -6, -PI / 2, 0, 1); placeChar(R, 'Isagani', -4.95, 2.5, PI / 2, 0, 1); placeChar(R, 'Juli', 4.95, 4, -PI / 2, 0, 1);
      showcase(R, 2.6, -11.6, 'tabo', 'ship', 'The Bapor Tabo');
      plaque(R, at('w', -1.5), 2.0, [['¡ABAJO!', 0.26, '#7a1f1f'], ['posters found on the', 0.1, '#2a1b12'], ['doors of the university', 0.1, '#2a1b12']], 1.5, 1.2, 'posters', 'The pasquinades', { bg: '#e6dcc4', line: '#7a1f1f' });
      bx(g, 0.5, 0.9, 0.3, M.stone, -3.2, 0, 10.5); bx(g, 0.56, 0.1, 0.36, M.stone, -3.2, 0.9, 10.5); hot(R, -3.2, 1.7, 10.5, 'exhibit', 'landmark', 'A boundary stone');
      const pr = at('e', 9); bx(g, 0.1, 1.9, 1.5, basic(0x050505), pr.x - 0.05, 1.2, pr.z); for (let i = 0; i < 6; i++) cy(g, 0.03, 0.03, 1.9, M.iron, pr.x - 0.14, 1.2, pr.z - 0.62 + i * 0.25, 6);
      hot(R, pr.x - 0.4, 3.5, pr.z, 'exhibit', 'prison', 'The prison grating');
      kiosk(R, -2.4, -11.4, 0.4, STATIONS[3]);
      door(R, at('s', 0), 'Back to the Rotunda', 'rotunda', 1, 'dark'); door(R, at('n', 0), 'The Archive Room', 'f_archive', 0, 'dark');
      g.add(new T.HemisphereLight(0x6a70a0, 0x140a0a, 0.26)); spot(g, 0, 10, 4, 0, 0, -4, 0x8aa0ff, 0.7, true, 0.9);
      obs(g, -3.2, 10.5, 0.4); [[-3.9, -9], [3.9, -1], [-3.9, 7]].forEach(p => obs(g, p[0], p[1], 0.2));
      view(R, 'The street', [0, 1.65, 12.4], [0, 2.0, -14]); view(R, 'Midway', [0, 1.65, 0.6], [0, 2.0, -14]); view(R, 'The far end', [0, 1.65, -8], [1.4, 1.6, -14]); view(R, 'Looking back', [0, 1.65, 1.5], [0, 2, 15]);
    });

    /* FILI 2: ARCHIVE */
    room('f_archive', 'fili', 'The Archive Room', 0x0a0706, [12, 36], (R, g) => {
      const w = 16, d = 14, h = 6.4, at = wallAt(w, d);
      shell(g, w, d, h, { floor: std({ map: TX.wood(4, 4, '#3a2416'), roughness: 0.35 }), wall: std({ color: 0x3a2a22, roughness: 0.9 }), ceil: M.dark, dado: M.dark });
      const shelf = (x, z, len, ry) => { const s = new T.Group(); bx(s, len, 5.2, 0.5, M.dark, 0, 0, 0); const p = new T.Mesh(new T.PlaneGeometry(len - 0.3, 4.8), std({ map: TX.books(len / 3, 1.6), roughness: 0.8 })); p.position.set(0, 2.6, 0.26); s.add(p); bx(s, len + 0.1, 0.16, 0.6, M.gold, 0, 5.2, 0); place(g, s, x, 0, z, ry); };
      shelf(-7.7, 0, 13, PI / 2); shelf(7.7, -3.3, 6.6, -PI / 2);
      bx(g, 4.2, 0.08, 1.5, M.dark, 0, 0.78, 1.2); [[-1.9, 0.6], [1.9, 0.6], [-1.9, 1.8], [1.9, 1.8]].forEach(p => cy(g, 0.07, 0.06, 0.78, M.dark, p[0], 0, p[1], 8));
      [-1.2, 1.2].forEach(x => { cy(g, 0.03, 0.08, 0.36, M.gold, x, 0.86, 1.2, 8); add(g, new T.CylinderGeometry(0.12, 0.2, 0.14, 14), basic(0x3fae84), x, 1.28, 1.2).castShadow = false; const l = new T.PointLight(0x9fe8c8, 0.55, 7, 1.6); l.position.set(x, 1.25, 1.2); g.add(l); });
      bx(g, 0.5, 0.012, 0.36, M.cream, 0, 0.862, 1.1).rotation.y = 0.2;
      const win = add(g, new T.PlaneGeometry(2.6, 3.2), basic(0x2f5f86), 0, 3.3, -6.97); win.castShadow = false; bx(g, 2.9, 0.14, 0.12, M.dark, 0, 1.62, -6.94); bx(g, 0.1, 3.3, 0.1, M.dark, 0, 1.7, -6.94); bx(g, 2.9, 0.14, 0.12, M.dark, 0, 4.92, -6.94);
      const sea = new T.PointLight(0x7fb8e8, 0.8, 12, 1.5); sea.position.set(0, 3.2, -5.6); g.add(sea);
      placeChar(R, 'Padre Florentino', -2.6, -5.9, 0.25, 0, 1); showcase(R, -4.4, -5.6, 'chest', 'chest', 'The chest of jewels');
      showcase(R, 3.2, -5.4, 'fili1891', 'book2', 'First edition, 1891'); showcase(R, -4.2, 4.6, 'gomburza', 'cross', 'To Gomez, Burgos and Zamora'); showcase(R, 3.6, 4.6, 'filibustero', 'paper', 'The word "filibustero"');
      plaque(R, at('n', 5.2), 2.6, [['1887', 0.14, '#c9a24a'], ['IBARRA', 0.17, '#f3ead6'], ['thirteen years', 0.1, '#e8d9b0', 'italic'], ['SIMOUN', 0.17, '#f3ead6'], ['1891', 0.14, '#c9a24a']], 1.7, 2.4, 'ibarra2simoun', 'From Ibarra to Simoun');
      door(R, at('s', -4), 'Back to the Street', 'f_street', 2, 'dark'); door(R, at('e', 4), 'Hidden stair to the Underground Chamber', 'f_chamber', 0, 'dark');
      g.add(new T.HemisphereLight(0xd8c8a8, 0x140e0a, 0.28)); spot(g, 0, 6.2, 5, 0, 0.8, 1, 0xffe2b0, 1.5, true, 0.7); spot(g, -2, 6.2, -1, -3.4, 1.4, -6, 0xfff0d0, 1.2, false, 0.5);
      blk(g, -8, -7.4, -6.6, 6.6); blk(g, 7.4, 8, -6.7, 0.1); blk(g, -2.1, 2.1, 0.45, 1.95);
      view(R, 'The reading room', [0, 1.65, 5.8], [0, 1.7, -7]); view(R, 'The sea window', [-0.8, 1.65, -1.6], [-2.6, 1.9, -7]); view(R, 'The hidden door', [-1.5, 1.65, 2.6], [8, 1.9, 4]);
    });

    /* FILI 3: UNDERGROUND CHAMBER */
    room('f_chamber', 'fili', 'The Underground Chamber', 0x030202, [5, 24], (R, g) => {
      const w = 16, d = 11, h = 4.3, at = wallAt(w, d), st = std({ map: TX.stone(6, 2, 46), roughness: 0.95 });
      shell(g, w, d, h, { floor: std({ map: TX.stone(6, 4, 30), roughness: 0.8 }), wall: st, ceil: std({ map: TX.stone(6, 4, 24), roughness: 1 }), cornice: false });
      [-4, 4].forEach(x => { bx(g, 0.7, h, 0.7, st, x, 0, -5.1); bx(g, 0.7, h, 0.7, st, x, 0, 5.1); bx(g, 0.6, 0.5, d, st, x, h - 0.5, 0); });
      bx(g, 3.4, 0.1, 1.8, M.dark, 0, 0.8, -1.2); [[-1.5, -1.9], [1.5, -1.9], [-1.5, -0.5], [1.5, -0.5]].forEach(p => bx(g, 0.14, 0.8, 0.14, M.dark, p[0], 0, p[1]));
      bx(g, 2.2, 0.012, 1.3, M.cream, -0.3, 0.9, -1.2).rotation.y = 0.08;
      const lamp = add(g, new T.SphereGeometry(0.2, 10, 8), std({ color: 0xffb050, emissive: 0xff8a20, emissiveIntensity: 0.85, roughness: 0.25, flatShading: true }), 1.05, 1.32, -1.2); lamp.scale.y = 1.15; lamp.castShadow = false;
      cy(g, 0.08, 0.16, 0.2, M.gold, 1.05, 0.9, -1.2, 12); cy(g, 0.05, 0.1, 0.12, M.gold, 1.05, 1.54, -1.2, 10);
      const ll = new T.PointLight(0xffb050, 1.5, 12, 1.5); ll.position.set(1.05, 1.5, -1.2); g.add(ll); R.flick.push([ll, 1.5]);
      hot(R, 1.05, 2.1, -1.2, 'exhibit', 'lamp', 'The lamp');
      [[-7.6, -2], [7.6, 2.5], [-7.6, 3.2]].forEach(p => { cy(g, 0.03, 0.05, 0.5, M.iron, p[0] * 0.985, 1.9, p[1], 6); add(g, new T.SphereGeometry(0.11, 8, 8), basic(0xff8a30), p[0] * 0.985, 2.5, p[1]).castShadow = false; const l = new T.PointLight(0xff7a2a, 0.9, 10, 1.6); l.position.set(p[0] * 0.95, 2.5, p[1]); g.add(l); R.flick.push([l, 0.9]); });
      [[-6.4, -4.2, 0], [-5.3, -4.3, 0], [-5.9, -4.2, 0.72], [-6.6, -3.0, 0]].forEach(c => bx(g, 1.0, 0.7, 0.8, M.wood, c[0], c[2], c[1]));
      hot(R, -6, 2.2, -4.0, 'exhibit', 'rifles', 'The crates');
      plaque(R, at('e', -1.5), 2.1, [['THE PLANNING ROOM', 0.1, '#c9a24a'], ['I. The lamp at the feast', 0.085], ['II. The blast is the signal', 0.085], ['III. Arms from the warehouse', 0.085], ['IV. Matanglawin enters the city', 0.085]], 2.8, 1.9, 'plan', 'Two plans', { bg: '#1a120c' });
      bx(g, 1.4, 0.76, 0.7, M.dark, 6.6, 0, -1.5);
      placeChar(R, 'Simoun', 0, -4.4, 0, 0, 1); placeChar(R, 'Basilio', -2.6, -4.2, 0.3, 0, 1); placeChar(R, 'Kabesang Tales', 2.6, -4.2, -0.3, 0, 1);
      kiosk(R, 2.4, 2.4, -0.5, STATIONS[4]);
      door(R, at('s', -5.6), 'Back up to the Archive Room', 'f_archive', 2, 'dark'); door(R, at('s', 5.6), 'Scene Theatre of the Fili', 'f_theatre', 0, 'dark');
      g.add(new T.HemisphereLight(0x7a5a40, 0x050302, 0.2)); spot(g, 0, 4.1, 2.5, 0, 1, -3.5, 0xffb070, 1.0, true, 0.95);
      [-4, 4].forEach(x => { blk(g, x - 0.4, x + 0.4, -5.5, -4.7); blk(g, x - 0.4, x + 0.4, 4.7, 5.5); });
      blk(g, -1.75, 1.75, -2.15, -0.25); blk(g, -7.2, -4.7, -4.8, -2.5); blk(g, 5.9, 7.3, -1.9, -1.1);
      view(R, 'The foot of the stair', [0, 1.65, 4.4], [0, 1.5, -4.5]); view(R, 'The table', [0.4, 1.65, 1.6], [0.4, 1.3, -4.4]); view(R, 'The planning room', [2.2, 1.65, 0.6], [8, 1.7, -1.5]);
    });
    theatre('f_theatre', 'fili', 'f_chamber', 'Back to the Chamber', 1);

    /* REFLECTION AND COLLABORATION HALL */
    room('hall', 'hall', 'The Library of Reflections', 0x0d0b08, [16, 46], (R, g) => {
      const w = 22, d = 18, h = 8.4, at = wallAt(w, d);
      shell(g, w, d, h, { floor: std({ map: TX.carpet(11, 9), roughness: 0.95 }), wall: M.ivory, dado: M.dark, dadoH: 1.0 });
      [-1, 1].forEach(s => { const p = new T.Mesh(new T.PlaneGeometry(15, 5.4), std({ map: TX.books(5, 1.8), roughness: 0.8 })); place(g, p, s * 10.9, 3.7, 0.5, -s * PI / 2); bx(g, 0.3, 5.7, 15.4, M.dark, s * 10.98, 0.95, 0.5); bx(g, 0.5, 0.16, 15.6, M.gold, s * 10.86, 6.5, 0.5); });
      R.wall = new T.Mesh(new T.PlaneGeometry(11.5, 4.3), new T.MeshBasicMaterial({ toneMapped: false })); R.wall.position.set(0, 3.9, -8.9); g.add(R.wall);
      bx(g, 11.9, 4.7, 0.08, M.gold, 0, 1.55, -8.99); hot(R, 0, 6.5, -8.8, 'reflect', 'wall', 'Wall of Reflections: write yours');
      const table = (x, z, lines, kind, id, label) => {
        cy(g, 1.35, 1.35, 0.08, M.dark, x, 0.76, z, 36); cy(g, 1.38, 1.38, 0.02, M.gold, x, 0.74, z, 36); cy(g, 0.14, 0.5, 0.76, M.dark, x, 0, z, 14);
        for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2 + 0.6; cy(g, 0.27, 0.24, 0.46, M.emerald, x + Math.cos(a) * 1.95, 0, z + Math.sin(a) * 1.95, 14); }
        const s = sign(lines, 1.3, 0.8, { bg: '#0b2a22', line: '#8fd0b8' }); s.position.set(x, 1.12, z); s.rotation.x = -0.6; g.add(s);
        const l = new T.PointLight(0x9fe8c8, 0.35, 5, 1.6); l.position.set(x, 1.6, z + 0.3); g.add(l);
        hot(R, x, 2.0, z, kind, id, label);
      };
      table(-5.4, 0.8, [['THEN AND NOW', 0.2, '#c9a24a'], ['compare the novels', 0.13, '#f3ead6'], ['with the present day', 0.13, '#f3ead6']], 'compare', 'compare', 'Table: Then and Now');
      table(0, 3.4, [['STATION VI', 0.2, '#c9a24a'], ['Relevance today', 0.15, '#f3ead6']], 'station', 's5', 'Table: Station VI · Relevance today');
      table(5.4, 0.8, [['CHARACTER VOICES', 0.18, '#c9a24a'], ['lines performed', 0.13, '#f3ead6'], ['by the group', 0.13, '#f3ead6']], 'voices', 'voices', 'Table: Character voices');
      bx(g, 3.2, 0.3, 2.2, M.dark, -7.2, 0, -6.4); bx(g, 0.9, 1.15, 0.6, M.dark, -7.2, 0.3, -6.0); bx(g, 1.0, 0.06, 0.7, M.gold, -7.2, 1.45, -6.0);
      const ms = sign([['MODERATOR', 0.2, '#c9a24a'], ['Presentation and guide', 0.13, '#f3ead6', 'italic']], 2.6, 1.3); place(g, ms, -7.2, 3.4, -8.9, 0);
      hot(R, -7.2, 2.4, -6.0, 'moderator', 'mod', 'Moderator\'s lectern');
      bx(g, 2.2, 0.95, 1.0, M.dark, 7.2, 0, -6.4); bx(g, 0.8, 0.08, 0.6, M.crimson, 7.2, 0.98, -6.4).rotation.y = 0.2; bx(g, 0.7, 0.02, 0.5, M.cream, 7.2, 1.06, -6.4).rotation.y = 0.2;
      const cs = sign([['CATALOGUE', 0.2, '#c9a24a'], ['The group\'s creative output', 0.13, '#f3ead6', 'italic']], 2.6, 1.3); place(g, cs, 7.2, 3.4, -8.9, 0);
      hot(R, 7.2, 2.1, -6.4, 'catalogue', 'cat', 'The exhibition catalogue');
      const sky = add(g, new T.PlaneGeometry(8, 4), basic(0xfff3d6), 0, h - 0.02, 1); sky.rotation.x = PI / 2; sky.castShadow = false;
      chandelier(g, -5.4, 5.8, 0.8, 0.7, 8); chandelier(g, 5.4, 5.8, 0.8, 0.7, 8);
      door(R, at('s', 0), 'Back to the Rotunda', 'rotunda', 1);
      g.add(new T.HemisphereLight(0xfff0d8, 0x1a1a14, 0.5)); spot(g, 0, 8.2, 3, 0, 0.8, 2.5, 0xfff2d6, 1.4, true, 0.85); spot(g, 0, 8, -3, 0, 4, -9, 0xfff0d0, 0.7, false, 0.9);
      obs(g, -5.4, 0.8, 2.0); obs(g, 0, 3.4, 2.0); obs(g, 5.4, 0.8, 2.0); blk(g, -8.8, -5.6, -7.5, -5.3); blk(g, 6.1, 8.3, -6.9, -5.9);
      view(R, 'The threshold', [0, 1.65, 7.8], [0, 2.8, -9]); view(R, 'The Wall of Reflections', [0, 1.75, 0.6], [0, 3.4, -9]); view(R, 'The lectern', [-3.4, 1.65, -2.2], [-7.4, 1.9, -7]); view(R, 'The catalogue desk', [3.4, 1.65, -2.2], [7.4, 1.6, -7]); view(R, 'The tables', [0, 2.4, 7], [0, 0.9, 1.5]);
    });
  }

  /* ---------- canvases that change at run time ---------- */
  function setBackdrop(R, sc) {
    const tex = ctex(1024, 532, (k, w, h) => {
      const g = k.createLinearGradient(0, 0, 0, h), n = R.novel === 'noli';
      g.addColorStop(0, n ? '#28463a' : '#2a0f12'); g.addColorStop(0.6, n ? '#b99a5a' : '#6e2a1c'); g.addColorStop(1, n ? '#3a2a18' : '#0a0606'); k.fillStyle = g; k.fillRect(0, 0, w, h);
      k.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 9; i++) { const bw = 70 + (i * 37) % 80, bh = 90 + (i * 53) % 150; k.fillRect(i * 118, h - bh - 60, bw, bh); k.beginPath(); k.moveTo(i * 118 - 10, h - bh - 60); k.lineTo(i * 118 + bw / 2, h - bh - 110); k.lineTo(i * 118 + bw + 10, h - bh - 60); k.fill(); }
      k.fillRect(0, h - 60, w, 60);
      k.textAlign = 'center'; k.fillStyle = 'rgba(243,234,214,.92)';
      k.font = '44px Georgia, serif'; k.fillText(sc ? sc.title : (n ? 'Noli Me Tangere' : 'El Filibusterismo'), w / 2, 92, w - 80);
      k.font = 'italic 26px Georgia, serif'; k.fillStyle = 'rgba(232,217,176,.85)'; k.fillText(sc ? sc.setting : 'Choose a scene from the programme', w / 2, 138, w - 80);
    });
    if (R.backdrop.material.map) R.backdrop.material.map.dispose();
    R.backdrop.material.map = tex; R.backdrop.material.needsUpdate = true;
  }
  function wrapText(k, text, x, y, maxW, lh, maxL) {
    const words = String(text).split(/\s+/); let line = '', n = 0;
    for (const w of words) { const t = line ? line + ' ' + w : w; if (k.measureText(t).width > maxW && line) { if (++n === maxL) { k.fillText(line + ' …', x, y); return y + lh; } k.fillText(line, x, y); y += lh; line = w; } else line = t; }
    if (line) { k.fillText(line, x, y); y += lh; } return y;
  }
  function drawWall(list) {
    const R = rooms.hall, tex = ctex(2048, 766, (k, w, h) => {
      const g = k.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0d3a2e'); g.addColorStop(1, '#06201a'); k.fillStyle = g; k.fillRect(0, 0, w, h);
      k.textAlign = 'center'; k.fillStyle = '#c9a24a'; k.font = '54px Georgia, serif'; k.fillText('WALL OF REFLECTIONS', w / 2, 76);
      k.font = 'italic 28px Georgia, serif'; k.fillStyle = '#e8d9b0'; k.fillText('What lessons from Noli Me Tangere and El Filibusterismo remain relevant today?', w / 2, 122);
      k.textAlign = 'left';
      const show = list.slice(-8);
      if (!show.length) { k.textAlign = 'center'; k.font = 'italic 34px Georgia, serif'; k.fillStyle = '#8fd0b8'; k.fillText('No reflections yet. Select the wall to write the first.', w / 2, 420); }
      show.forEach((r, i) => {
        const x = 50 + (i % 4) * 494, y = 164 + Math.floor(i / 4) * 296;
        k.fillStyle = 'rgba(255,240,200,.1)'; k.fillRect(x, y, 470, 274); k.strokeStyle = '#c9a24a'; k.lineWidth = 2; k.strokeRect(x, y, 470, 274);
        k.fillStyle = '#f3ead6'; k.font = '25px Georgia, serif'; wrapText(k, r.t, x + 18, y + 42, 434, 31, 6);
        k.fillStyle = '#c9a24a'; k.font = 'italic 24px Georgia, serif'; k.fillText('— ' + r.n, x + 18, y + 252);
      });
    });
    if (R.wall.material.map) R.wall.material.map.dispose();
    R.wall.material.map = tex; R.wall.material.needsUpdate = true;
  }
  function drawRoster(rows) {
    const s = rooms.rotunda.roster, lines = [['THE GROUP', 0.1, '#c9a24a']].concat(rows.map(r => [r, 0.062]));
    const n = sign(lines, 3.3, 2.6); s.material.map.dispose(); s.material.map = n.material.map; s.material.needsUpdate = true;
  }

  /* ---------- camera ---------- */
  function aim(p, l) { const dx = l[0] - p[0], dy = l[1] - p[1], dz = l[2] - p[2]; return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) }; }
  function target(p, l, instant) {
    const a = aim(p, l); cam.tp.set(p[0], p[1], p[2]);
    let dy = a.yaw - cam.tyaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); cam.tyaw += dy; cam.tpitch = a.pitch;
    if (instant) { cam.p.copy(cam.tp); cam.yaw = cam.tyaw; cam.pitch = cam.tpitch; }
  }
  // where the camera sits behind the player
  function followPos(yaw) {
    const u = cur.group.userData, fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw), lim = (v, m) => Math.max(-m, Math.min(m, v));
    return [lim(pl.x - fx * 3.2 + rx * 0.95, u.w / 2 - 0.35), Math.min(2.3, u.h - 0.5), lim(pl.z - fz * 3.2 + rz * 0.95, u.d / 2 - 0.35)];
  }
  // a viewpoint places the player in front of it, facing what the viewpoint looks at
  function setView(i, instant) {
    const n = cur.views.length; viewI = ((i % n) + n) % n; const v = cur.views[viewI], a = aim(v.p, v.l);
    focusSpot.intensity = 0; cam.fixed = false;
    if (cam.attract) { target(v.p, v.l, instant); return v; }
    const fx = -Math.sin(a.yaw), fz = -Math.cos(a.yaw); let s = 2.6;
    while (s > 0 && blocked(v.p[0] + fx * s, v.p[2] + fz * s)) s -= 0.4;
    s = Math.max(0, s); pl.x = v.p[0] + fx * s; pl.z = v.p[2] + fz * s;
    let dy = a.yaw - cam.tyaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); cam.tyaw += dy; cam.tpitch = Math.max(-0.3, Math.min(0.3, a.pitch)) - 0.05;
    if (instant) { const p = followPos(cam.tyaw); cam.p.set(p[0], p[1], p[2]); cam.tp.copy(cam.p); cam.yaw = cam.tyaw; cam.pitch = cam.tpitch; }
    return v;
  }
  // a fixed camera at a viewpoint, used while a scene plays on stage
  function fixView(i) { const v = cur.views[i]; cam.fixed = true; target(v.p, v.l); }
  function release() { cam.fixed = false; focusSpot.intensity = 0; }
  function setRoom(id, vi) {
    if (cur) { cur.group.visible = false; cur.figs.forEach(f => { f.userData.target = 0; f.userData.talk = false; }); }
    stageClear();
    cur = rooms[id]; cur.group.visible = true; scene.background = cur.bg; scene.fog = new T.Fog(cur.bg, cur.fog[0], cur.fog[1]);
    return setView(vi || 0, true);
  }
  // glide to a close view of a figure; the figure sits left of centre when a side card is open
  function focusFigure(f, shift) {
    const p = new T.Vector3(); f.getWorldPosition(p); cam.fixed = true;
    const ry = f.rotation.y, s = f.scale.x, hy = p.y + 1.6 * s, dist = 2.5 * Math.max(0.8, s);
    const fx = Math.sin(ry), fz = Math.cos(ry), rx = fz, rz = -fx; // right-hand side as seen by the camera
    target([p.x + fx * dist, hy + 0.05, p.z + fz * dist], [p.x + rx * shift, hy - 0.05, p.z + rz * shift]);
    focusSpot.position.set(p.x + fx * 2.2 + rx * 0.8, hy + 1.6, p.z + fz * 2.2 + rz * 0.8); focusSpot.target.position.set(p.x, hy - 0.4, p.z); focusSpot.intensity = 1.5;
  }
  function wake(id, on, talk) { const f = figures[id]; if (!f) return; f.userData.target = on ? 1 : 0; f.userData.talk = !!talk; }

  /* ---------- stage ---------- */
  function stageClear() { stageFigs.forEach(f => { f.parent.remove(f); f.userData.parts.forEach(m => { m.geometry.dispose(); m.material.dispose(); }); }); stageFigs = []; }
  function stage(sc) {
    stageClear(); setBackdrop(cur, sc);
    sc.cast.forEach((id, i) => {
      const n = sc.cast.length, x = (i - (n - 1) / 2) * Math.min(1.7, 9 / n), f = figure(lookOf(id));
      f.userData.base = 0.6; f.userData.id = id; f.userData.target = 1; place(cur.group, f, x, 0.6, -6.2 - Math.abs(x) * 0.12, -x * 0.07); stageFigs.push(f);
    });
  }
  function stageSpeak(id) {
    let sp = null; stageFigs.forEach(f => { f.userData.talk = f.userData.id === id; if (f.userData.talk) sp = f; });
    const s = cur.stageSpot; if (!s) return;
    s.target.position.set(sp ? sp.position.x : 0, 1.6, -6.3); s.angle = sp ? 0.16 : 0.42;
  }

  /* ---------- loop and input ---------- */
  function project(v) { const p = v.clone().project(camera); return { x: (p.x + 1) / 2 * innerWidth, y: (1 - p.y) / 2 * innerHeight, vis: p.z < 1 && Math.abs(p.x) < 1.02 && Math.abs(p.y) < 1.02, dist: cam.p.distanceTo(v) }; }
  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05); time += dt;
    if (cam.attract) cam.tyaw += dt * 0.05;
    const follow = !cam.attract && !cam.fixed;
    if (follow) {
      let f = 0, t = 0;
      if (gate()) {
        f = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0) || input.f;
        t = (keys.a || keys.arrowleft ? 1 : 0) - (keys.d || keys.arrowright ? 1 : 0) || input.t;
      }
      cam.tyaw += t * 1.9 * dt;
      if (Math.abs(f) > 0.15) {
        const sp = (keys.shift || input.run ? 5.6 : 3.1) * f * (f < 0 ? 0.6 : 1) * dt, nx = pl.x - Math.sin(cam.tyaw) * sp, nz = pl.z - Math.cos(cam.tyaw) * sp;
        if (!blocked(nx, pl.z)) pl.x = nx;
        if (!blocked(pl.x, nz)) pl.z = nz;
      }
      pl.fig.userData.walk = Math.abs(f) > 0.15 ? 1 : 0;
      const p = followPos(cam.tyaw); cam.tp.set(p[0], p[1], p[2]);
    }
    pl.fig.position.x = pl.x; pl.fig.position.z = pl.z; pl.fig.rotation.y = cam.yaw + PI;
    pl.fig.visible = follow && Math.hypot(cam.p.x - pl.x, cam.p.z - pl.z) > 1.15;
    animateFigure(pl.fig, dt);
    cam.p.lerp(cam.tp, 1 - Math.exp(-dt * (follow ? 7 : 2.6)));
    const k = 1 - Math.exp(-dt * 5); cam.yaw += (cam.tyaw - cam.yaw) * k; cam.pitch += (cam.tpitch - cam.pitch) * k;
    camera.position.copy(cam.p); camera.rotation.set(cam.pitch, cam.yaw, 0, 'YXZ');
    if (cur) { cur.figs.forEach(f => animateFigure(f, dt)); cur.flick.forEach((l, i) => { l[0].intensity = l[1] * (0.86 + 0.14 * Math.sin(time * (7 + i * 1.7) + i)); }); }
    stageFigs.forEach(f => animateFigure(f, dt));
    renderer.render(scene, camera);
    tickers.forEach(fn => fn(dt));
  }
  const clock = new T.Clock();
  function resize() { camera.aspect = innerWidth / innerHeight; camera.fov = camera.aspect < 1 ? 78 : 58; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); }
  function init(canvas) {
    renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.5 : 2));
    renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = !coarse; renderer.shadowMap.type = T.PCFSoftShadowMap;
    scene = new T.Scene(); camera = new T.PerspectiveCamera(58, 1, 0.1, 120);
    focusSpot = new T.SpotLight(0xfff0d8, 0, 14, 0.5, 0.7, 1.2); scene.add(focusSpot, focusSpot.target);
    initMats(); buildAll(); resize(); addEventListener('resize', resize);
    pl.fig = figure({ skin: 0xc79a70, hair: 0x15100c, top: 0x0f4d3c, bottom: 0x2a2620, coat: true });
    // the visitor is a living person, not a statue: full colour from the start
    pl.fig.userData.target = pl.fig.userData.alive = 1; pl.fig.visible = false; scene.add(pl.fig);
    pl.fig.userData.parts.forEach(m => { m.material.color.copy(m.userData.c); m.material.metalness = 0; m.material.roughness = 0.82; });
    const typing = () => /INPUT|TEXTAREA/.test(document.activeElement.tagName);
    addEventListener('keydown', e => { if (typing()) return; const k = e.key.toLowerCase(); keys[k] = true; if (k.indexOf('arrow') === 0) e.preventDefault(); });
    addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
    addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
    let drag = null;
    canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', e => {
      if (!drag || cam.attract) return;
      cam.tyaw += (e.clientX - drag.x) * 0.0042; cam.tpitch = Math.max(-0.7, Math.min(0.7, cam.tpitch + (e.clientY - drag.y) * 0.0036)); drag.x = e.clientX; drag.y = e.clientY;
    });
    canvas.addEventListener('pointerup', () => { drag = null; }); canvas.addEventListener('pointercancel', () => { drag = null; });
    setRoom('rotunda', 0); frame();
  }
  function snapshot(done) { renderer.render(scene, camera); renderer.domElement.toBlob(done); }

  return { init: init, rooms: rooms, figures: figures, WINGS: WINGS, cam: cam, tickers: tickers, setRoom: setRoom, setView: setView, focusFigure: focusFigure, wake: wake,
    stage: stage, stageSpeak: stageSpeak, stageClear: stageClear, setBackdrop: setBackdrop, project: project, drawWall: drawWall, drawRoster: drawRoster, snapshot: snapshot, portraitCanvas: portraitCanvas,
    player: pl, input: input, blocked: blocked, fixView: fixView, release: release, setGate: fn => { gate = fn; },
    get room() { return cur; }, get viewIndex() { return viewI; }, look: (dy, dp) => { cam.tyaw += dy; cam.tpitch = Math.max(-0.7, Math.min(0.7, cam.tpitch + dp)); } };
})();

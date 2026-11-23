'use strict';
/* ============================================================
   Kapuluan ni Rizal · Group of Estrevencion
   islands.js: the sea, the islands, the people, and the interface.
   Ground positions are written (x, y): x runs west to east, y runs north to south.
   ============================================================ */
const KEY = 'kapuluanRizalEstrevencion';
const $ = s => document.querySelector(s);
function el(tag, props, kids) {
  const e = document.createElement(tag);
  if (props) Object.assign(e, props);
  (kids || []).forEach(k => e.append(k));
  return e;
}
const save = { name: '', roles: {}, color: '#e76f51', met: {}, seen: {}, sym: {}, posts: {}, compare: {}, voices: [] };
try { Object.assign(save, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* a private window: play without saving */ }
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* storage blocked */ } };

/* ---------- the archipelago ---------- */
// name: [x, y, radius]. The west is the day side (Noli Me Tangere); the east is the night side (El Filibusterismo).
const ISL = {
  home: [0, 0, 16], story: [0, -36, 9], light: [0, 42, 13],
  plaza: [-44, 0, 18], church: [-44, -42, 15], school: [-80, -8, 12], lake: [-66, 30, 12],
  street: [44, 0, 18], wedding: [44, -42, 14], cave: [80, -6, 13], pier: [66, 30, 11], cliff: [100, 24, 9]
};
const ZONE = {
  home: 'Home island · Pulo ng Aklat', story: 'Story islet', light: 'Reflection Zone · Lighthouse island',
  plaza: 'Noli Me Tangere · Town plaza of San Diego', church: 'Noli Me Tangere · Church island', school: 'Noli Me Tangere · Classroom island', lake: 'Noli Me Tangere · House by the lake',
  street: 'El Filibusterismo · A street of Manila', wedding: 'El Filibusterismo · The wedding house', cave: 'El Filibusterismo · Underground meeting place', pier: 'El Filibusterismo · Pier of the Bapor Tabo', cliff: 'El Filibusterismo · Retreat of Padre Florentino'
};
const at = (k, dx, dy) => [ISL[k][0] + dx, ISL[k][1] + dy];
const bridges = [['home', 'story'], ['home', 'plaza'], ['home', 'street'], ['home', 'light'], ['plaza', 'church'], ['plaza', 'school'], ['plaza', 'lake'], ['street', 'wedding'], ['street', 'cave'], ['street', 'pier'], ['pier', 'cliff']].map(([a, b]) => {
  const A = ISL[a], B = ISL[b], d = Math.hypot(B[0] - A[0], B[1] - A[1]), ux = (B[0] - A[0]) / d, uy = (B[1] - A[1]) / d;
  return { x1: A[0] + ux * (A[2] - 1.6), y1: A[1] + uy * (A[2] - 1.6), x2: B[0] - ux * (B[2] - 1.6), y2: B[1] - uy * (B[2] - 1.6) };
});
bridges.push({ x1: 66, y1: 39, x2: 66, y2: 48.5, pier: 1 });  // the pier of the steamship
function segDist(px, py, s) {
  const dx = s.x2 - s.x1, dy = s.y2 - s.y1, t = Math.max(0, Math.min(1, ((px - s.x1) * dx + (py - s.y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - s.x1 - dx * t, py - s.y1 - dy * t);
}
const obstacles = [];
const ob = (p, r) => obstacles.push({ x: p[0], y: p[1], r });
function onLand(x, y, r) {
  for (const k in ISL) if (Math.hypot(x - ISL[k][0], y - ISL[k][1]) <= ISL[k][2] - 0.4 - r) return true;
  for (const s of bridges) if (segDist(x, y, s) < 1.05) return true;
  return false;
}
function blocked(x, y, r) {
  if (!onLand(x, y, r)) return true;
  for (const o of obstacles) if (Math.hypot(x - o.x, y - o.y) < o.r + r) return true;
  return false;
}
function zoneOf(x, y) {
  let best = null, bd = 1e9;
  for (const k in ISL) { const d = Math.hypot(x - ISL[k][0], y - ISL[k][1]) - ISL[k][2]; if (d < bd) { bd = d; best = k; } }
  return bd > 0 ? 'On a bridge over the sea' : ZONE[best];
}

/* ---------- where everyone and everything stands ---------- */
const STAND = {
  'Crisostomo Ibarra': at('plaza', 5, 3), 'Maria Clara': at('lake', 3.2, -1.2), 'Padre Damaso': at('plaza', -5, 9), 'Padre Salvi': at('church', 0, -6.4),
  'Kapitan Tiago': at('lake', -2.8, -3.6), 'Sisa': at('church', -3, 9.5), 'Basilio (child)': at('church', 8.4, 2.8), 'Crispin': at('church', 10.6, 3.8),
  'Elias': at('lake', 2, 8), 'Pilosopo Tasio': at('church', -9.5, 3.4), 'The Schoolmaster': at('school', 0, -3), 'Doña Victorina': at('plaza', 9, -7),
  'Simoun': at('cave', -3.6, -3.6), 'Basilio': at('street', -6, -6), 'Isagani': at('street', -5, 8), 'Kabesang Tales': at('cave', 4.6, 1.2),
  'Juli': at('pier', 4, -3), 'Padre Florentino': at('cliff', 2.6, 1), 'Makaraig': at('street', -10, 1.5), 'Ben Zayb': at('street', 8, 7.5),
  'Don Custodio': at('street', 10, -4.5), 'Paulita Gomez': at('wedding', 4.4, -5.4), 'The Guide': at('home', 3.6, 5.6)
};
const guide = PEOPLE.find(p => p[0] === 'The Guide');
guide[6] = 'Welcome, traveller. This sea has two shores. West of here the sun is up: those are the islands of Noli Me Tangere. East of here it is night: those are the islands of El Filibusterismo.';
guide[8] = 'Cross the north bridge and read the three story signs. Then walk west: the town plaza, the church and the classroom each have an island. Watch a scene wherever a gold star is turning.';
guide[10] = 'Answer the question posts, add your weight to the Scale on the street of Manila, act as a character, then cross the south bridge and light a lantern at the lighthouse. Open Output to see all your group wrote.';
const people = PEOPLE.map(p => ({ name: p[0], kind: p[1], color: p[2], x: STAND[p[0]][0], y: STAND[p[0]][1], hx: STAND[p[0]][0], hy: STAND[p[0]][1], who: p[5], hello: p[6], qa: [[p[7], p[8]], [p[9], p[10]]], t: Math.random() * 6, face: 0 }));
const person = n => people.find(p => p.name === n);
const place = (list, map) => list.forEach(o => Object.assign(o, map[o.id]));
place(SCENES, {
  N1: { x: at('plaza', 2, 12.5)[0], y: at('plaza', 2, 12.5)[1], cast: { 'Crisostomo Ibarra': [2, -1.5], 'Padre Damaso': [-2.2, -1.5], 'Kapitan Tiago': [-0.6, -3], 'Maria Clara': [3.6, 0.4] } },
  N2: { x: at('church', 4, 10)[0], y: at('church', 4, 10)[1], cast: { 'Sisa': [-2.4, 0.3], 'Basilio (child)': [1.6, -1.2], 'Crispin': [2.9, -0.3] } },
  F1: { x: at('cave', -1, 4.5)[0], y: at('cave', -1, 4.5)[1], cast: { 'Simoun': [-1.8, 1.4], 'Basilio': [1.8, 1.4] } },
  F2: { x: at('wedding', 0, 6)[0], y: at('wedding', 0, 6)[1], cast: { 'Simoun': [-4, -1.2], 'Basilio': [-2.3, 1.2], 'Isagani': [1.6, 1.2], 'Paulita Gomez': [3, -2] } }
});
const xy = p => ({ x: p[0], y: p[1] });
place(BOOTHS, { b1: xy(at('plaza', 11, 8)), b2: xy(at('school', 6, 5)), b3: xy(at('church', -8, 7.5)), b4: xy(at('pier', -5, 3)), b5: xy(at('cave', 6, -5)), b6: xy(at('cliff', -4.5, 3.5)) });
place(SYMBOLS, { s1: xy(at('church', -10.5, -3)), s2: xy(at('school', -6, 6)), s3: xy(at('church', 10, -2)), s4: xy(at('wedding', 0, -3)), s5: { x: 66, y: 47.4 }, s6: xy(at('cliff', 4, 5)), s7: xy(at('home', 0, 0)) });
const player = { x: 0, y: 7, kind: 'man', color: save.color, t: 0, moving: false, face: Math.PI, bubble: '', bubbleUntil: 0 };
let actingAs = '';
let clock = 0, nearest = null, scene = null, focus = null, started = false, busy = false;
const cam = { x: 0, y: 7, yaw: 0, pitch: 0.62, dist: 12 };  // the point the camera looks at, and where it looks from
const spots = [];

/* ---------- three.js stage ---------- */
const T = THREE, cv = $('#cv');
const renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true });
let dpr = 1;
const world = new T.Scene();
world.fog = new T.Fog(0x9fd8f0, 70, 230);
const camera = new T.PerspectiveCamera(55, 1, 0.3, 700);
const hemi = new T.HemisphereLight(0xffffff, 0x6f8f6a, 0.7); world.add(hemi);
const sun = new T.DirectionalLight(0xfff1d0, 0.6); sun.position.set(-40, 70, 30); world.add(sun);
const mat = (c, o) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.95, metalness: 0, flatShading: true }, o));
const lit = c => new T.MeshBasicMaterial({ color: c });
const M = {};
const m = c => (typeof c === 'number' ? (M[c] || (M[c] = mat(c))) : c);
// Shapes are placed by their base: (x, height of the base, y)
function put(geo, c, x, h, y, parent) { const me = new T.Mesh(geo, m(c)); me.position.set(x, h, y); (parent || world).add(me); return me; }
const box = (w, hh, d, c, x, h, y, p) => put(new T.BoxGeometry(w, hh, d), c, x, h + hh / 2, y, p);
const cyl = (rt, rb, hh, c, x, h, y, seg, p) => put(new T.CylinderGeometry(rt, rb, hh, seg || 8), c, x, h + hh / 2, y, p);
const cone = (r, hh, c, x, h, y, seg, p) => put(new T.ConeGeometry(r, hh, seg || 6), c, x, h + hh / 2, y, p);
const ball = (r, c, x, h, y, p) => put(new T.IcosahedronGeometry(r, 1), c, x, h, y, p);
function label(text, o) {
  o = o || {};
  const px = 44, c = document.createElement('canvas'), k = c.getContext('2d'), font = `700 ${px}px "Trebuchet MS",Verdana,Arial,sans-serif`;
  k.font = font;
  const w = Math.ceil(k.measureText(text).width) + 30, h = px + 22;
  c.width = w; c.height = h; k.font = font; k.textAlign = 'center'; k.textBaseline = 'middle';
  if (o.bg) { k.fillStyle = o.bg; const r = 16; k.beginPath(); k.moveTo(r, 0); k.arcTo(w, 0, w, h, r); k.arcTo(w, h, 0, h, r); k.arcTo(0, h, 0, 0, r); k.arcTo(0, 0, w, 0, r); k.fill(); }
  if (o.edge) { k.lineWidth = 8; k.lineJoin = 'round'; k.strokeStyle = o.edge; k.strokeText(text, w / 2, h / 2 + 2); }
  k.fillStyle = o.fg || '#12303a'; k.fillText(text, w / 2, h / 2 + 2);
  const sp = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false }));
  const s = (o.h || 0.42) / h; sp.scale.set(w * s, h * s, 1);
  return sp;
}
let seed = 23; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// sea, stars, moon
const seaGeo = new T.PlaneGeometry(560, 560, 52, 52); seaGeo.rotateX(-Math.PI / 2);
const seaMat = mat(0x2f9fb5, { roughness: 0.55 });
const sea = new T.Mesh(seaGeo, seaMat); sea.position.set(5, -1.15, 0); world.add(sea);
const starGeo = new T.BufferGeometry(), starPts = [];
for (let i = 0; i < 420; i++) { const a = rnd() * Math.PI * 2, e = 0.12 + rnd() * 1.3; starPts.push(Math.cos(a) * Math.cos(e) * 420, Math.sin(e) * 420, Math.sin(a) * Math.cos(e) * 420); }
starGeo.setAttribute('position', new T.Float32BufferAttribute(starPts, 3));
const starMat = new T.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false });
world.add(new T.Points(starGeo, starMat));
const moon = put(new T.SphereGeometry(9, 14, 10), new T.MeshBasicMaterial({ color: 0xfff6d8, fog: false, transparent: true, opacity: 0 }), 210, 120, -150);

/* ---------- builders ---------- */
const roofs = [], spin = [], bob = [], flames = [];
const GRASS = { home: 0xa6d66a, story: 0xb9d98c, light: 0x9bd0a2, plaza: 0x98cf6c, church: 0x8cc970, school: 0x9ed374, lake: 0x86c77a, street: 0x6c7088, wedding: 0x4f7a6c, cave: 0x4b4558, pier: 0x8b8375, cliff: 0x6c7e6a };
function island(k) {
  const [x, y, r] = ISL[k];
  const top = cyl(r, r * 0.95, 1.4, GRASS[k], x, -1.4, y, 18); top.rotation.y = rnd() * 3;
  cyl(r + 1.5, r + 2.6, 0.5, x > 20 ? 0x8f8a80 : 0xf2e3b3, x, -1.52, y, 18).rotation.y = rnd() * 3;
  cyl(r * 0.95, r * 0.5, 7, x > 20 ? 0x3c3a4a : 0x8a7a66, x, -8.4, y, 12);
  const tag = label(ZONE[k].split(' · ').pop(), { fg: '#ffffff', edge: 'rgba(11,58,68,.9)', h: 1.5 });
  tag.position.set(x, 11.5, y); tag.material.fog = false; world.add(tag);
}
function bridge(s) {
  const dx = s.x2 - s.x1, dy = s.y2 - s.y1, L = Math.hypot(dx, dy), a = Math.atan2(dx, dy), g = new T.Group();
  g.position.set((s.x1 + s.x2) / 2, 0, (s.y1 + s.y2) / 2); g.rotation.y = a; world.add(g);
  const n = Math.ceil(L / 0.8);
  for (let i = 0; i < n; i++) box(2.5, 0.14, 0.62, i % 2 ? 0xb98b56 : 0xa97c4a, 0, -0.1, -L / 2 + (i + 0.5) * (L / n), g);
  [-1.25, 1.25].forEach(sx => {
    box(0.1, 0.1, L, 0x7a5a36, sx, 0.9, 0, g);
    for (let z = -L / 2; z <= L / 2 + 0.01; z += L / Math.max(2, Math.round(L / 3))) cyl(0.09, 0.09, 1.1, 0x7a5a36, sx, -0.1, z, 6, g);
  });
  if (!s.pier) [-1.6, 1.6].forEach(sx => cyl(0.16, 0.16, 3, 0x6b4f30, sx, -2.4, 0, 6, g));
}
// A roof on four posts: nothing blocks the view, and the roof fades while the visitor is under it
function pavilion(p, w, d, h, roofC, floorC) {
  const [x, y] = p;
  box(w + 0.6, 0.16, d + 0.6, floorC, x, 0, y);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(c => { cyl(0.26, 0.3, h, 0xf1ead8, x + c[0] * w / 2, 0.1, y + c[1] * d / 2, 8); ob([x + c[0] * w / 2, y + c[1] * d / 2], 0.42); });
  const g = new T.Group(), mx = Math.max(w, d), rm = mat(roofC, { transparent: true });
  g.position.set(x, h + 0.1, y); g.scale.set((w + 1.6) / mx, 1, (d + 1.6) / mx); world.add(g);
  const roof = new T.Mesh(new T.ConeGeometry(mx * 0.74, h * 0.62, 4), rm); roof.rotation.y = Math.PI / 4; roof.position.y = h * 0.31; g.add(roof);
  roofs.push({ m: rm, x, y, r: mx / 2 + 0.6 });
}
function palm(x, y) {
  const g = new T.Group(); g.position.set(x, 0, y); g.rotation.y = rnd() * 6; world.add(g);
  const h = 3.4 + rnd() * 1.6;
  const tr = cyl(0.14, 0.24, h, 0x9a7446, 0, 0, 0, 6, g); tr.rotation.z = 0.12;
  for (let i = 0; i < 6; i++) { const l = cone(0.5, 2.3, 0x4f9a4a, 0, 0, 0, 4, g); l.position.set(-h * 0.12 + Math.cos(i * 1.05) * 0.9, h - 0.15, Math.sin(i * 1.05) * 0.9); l.rotation.set(Math.sin(i * 1.05) * 1.25, 0, -Math.cos(i * 1.05) * 1.25); }
  ob([x, y], 0.45);
}
function rock(x, y, s, c) { const r = ball(s, c || 0x7e7a86, x, s * 0.45, y); r.rotation.set(rnd() * 3, rnd() * 3, 0); r.scale.y = 0.75; }
function lamp(p, h) {
  cyl(0.08, 0.12, h, 0x23263a, p[0], 0, p[1], 6); ball(0.3, lit(0xffd98a), p[0], h + 0.2, p[1]); ob(p, 0.3);
  const gl = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0xffc070, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
  gl.scale.set(5, 5, 1); gl.position.set(p[0], h + 0.2, p[1]); world.add(gl); flames.push(gl);
}
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const k = c.getContext('2d'), g = k.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); k.fillStyle = g; k.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c); })();
function signpost(p, text, big) {
  cyl(0.09, 0.11, 1.5, 0x7a5a36, p[0], 0, p[1], 6);
  const b = box(big ? 3.2 : 2.3, big ? 1.5 : 1.1, 0.16, 0xfff8e6, p[0], 1.3, p[1]);
  const t = label(text, { fg: '#0b3a44', h: big ? 0.62 : 0.46 }); t.position.set(p[0], big ? 2.05 : 1.85, p[1] + 0.2); world.add(t);
  ob(p, 0.7);
  return { board: b, text: t };
}
const SKIN = 0xe2b58a;
// Peg-doll people: a cone body, a round head
function doll(kind, color, isPlayer) {
  const g = new T.Group(), wide = kind === 'woman' ? 0.56 : kind === 'priest' ? 0.5 : 0.42;
  const sh = new T.Mesh(new T.CircleGeometry(0.55, 12), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03; g.add(sh);
  const b = new T.Group(); g.add(b); g.userData.body = b;
  cyl(0.17, wide, 1.08, mat(new T.Color(color).getHex()), 0, 0, 0, 9, b);
  if (kind === 'priest') cyl(0.2, 0.2, 0.09, 0xf5f1e6, 0, 0.98, 0, 9, b);
  ball(0.28, SKIN, 0, 1.36, 0, b);
  const hairC = kind === 'old' ? 0xd8d4c8 : kind === 'priest' ? 0x6b5a48 : 0x231710;
  const hair = put(new T.SphereGeometry(0.295, 9, 5, 0, Math.PI * 2, 0, Math.PI * (kind === 'priest' ? 0.3 : 0.52)), hairC, 0, 1.37, -0.02, b); hair.rotation.x = -0.25;
  if (kind === 'woman') ball(0.13, hairC, 0, 1.66, -0.12, b);
  [-0.1, 0.1].forEach(ex => put(new T.SphereGeometry(0.035, 6, 5), 0x1a1210, ex, 1.38, 0.26, b));
  if (isPlayer) { cone(0.46, 0.24, 0xd9b36a, 0, 1.56, 0, 10, b); const ring = new T.Mesh(new T.RingGeometry(0.62, 0.74, 20), new T.MeshBasicMaterial({ color: 0xf4a261, transparent: true, opacity: 0.9, side: T.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; g.add(ring); }
  if (kind === 'child') g.scale.setScalar(0.72);
  return g;
}

/* ---------- build the islands ---------- */
Object.keys(ISL).forEach(island);
bridges.forEach(bridge);
// Home island: the statue, the three signs, a large open book
(() => {
  const c = at('home', 0, 0);
  cyl(1.5, 1.8, 0.7, 0xd9d2c0, c[0], 0, c[1], 10); cyl(1.0, 1.2, 1.3, 0xe8e2d2, c[0], 0.7, c[1], 10);
  const st = doll('man', '#8d8a80'); st.position.set(c[0], 2, c[1]); st.scale.setScalar(1.5); st.traverse(o => { if (o.isMesh && o.material.color && o.geometry.type !== 'CircleGeometry') o.material = m(0x8d8a80); }); world.add(st);
  ob(c, 1.9);
  const bk = at('home', -7, 6), g = new T.Group(); g.position.set(bk[0], 0.5, bk[1]); g.rotation.y = 0.5; world.add(g);
  const l = box(2.2, 0.3, 3, 0xfff8e6, -1.12, 0, 0, g); l.rotation.z = -0.13; const r = box(2.2, 0.3, 3, 0xf3e6c8, 1.12, 0, 0, g); r.rotation.z = 0.13; box(0.2, 0.34, 3.1, 0xe76f51, 0, -0.1, 0, g);
  cyl(1.6, 1.9, 0.5, 0xd9d2c0, bk[0], 0, bk[1], 8); ob(bk, 2.1);
})();
// Town plaza: kiosk, the lunch table, fiesta flags
(() => {
  const c = at('plaza', 0, 0);
  cyl(7.5, 7.5, 0.06, 0xead9a6, c[0], 0.0, c[1], 20);
  cyl(3.1, 3.3, 0.5, 0xefe6d2, c[0], 0, c[1], 8);
  for (let i = 0; i < 8; i++) cyl(0.12, 0.12, 2.6, 0xf5efe0, c[0] + Math.cos(i * Math.PI / 4) * 2.8, 0.5, c[1] + Math.sin(i * Math.PI / 4) * 2.8, 6);
  cone(3.7, 1.7, 0xd9573c, c[0], 3.1, c[1], 8); ball(0.25, 0xf4c95d, c[0], 4.9, c[1]);
  ob(c, 3.4);
  const t = at('plaza', 0, 7); box(4.2, 0.12, 1.5, 0xfff8e6, t[0], 0.85, t[1]); [-1.8, 1.8].forEach(sx => box(0.14, 0.85, 1.2, 0x9a7446, t[0] + sx, 0, t[1]));
  [0xe76f51, 0xf4c95d, 0x2a9d8f, 0xe76f51, 0xfff8e6].forEach((cc, i) => cyl(0.22, 0.16, 0.14, cc, t[0] - 1.5 + i * 0.75, 0.97, t[1], 8));
  ob(t, 2.2);
  const poles = [[-11, -9], [11, -9], [11, 11], [-11, 11]].map(q => at('plaza', q[0], q[1]));
  poles.forEach(q => { cyl(0.09, 0.11, 4.4, 0x7a5a36, q[0], 0, q[1], 6); ob(q, 0.3); });
  poles.forEach((a, i) => { const b = poles[(i + 1) % 4]; for (let j = 1; j < 14; j++) { const f = j / 14, fl = cone(0.26, 0.5, [0xe76f51, 0xf4c95d, 0x2a9d8f, 0x457b9d][j % 4], a[0] + (b[0] - a[0]) * f, 4.25 - Math.sin(f * Math.PI) * 0.9 - 0.5, a[1] + (b[1] - a[1]) * f, 3); fl.rotation.x = Math.PI; bob.push({ o: fl, y: fl.position.y, a: 0.05, s: 3, p: j }); } });
  [[-7, -4], [7, 3]].forEach(q => { const b = at('plaza', q[0], q[1]); box(2.2, 0.14, 0.6, 0x9a7446, b[0], 0.42, b[1]); ob(b, 1); });
})();
// Church: an open nave, altar, pews, bell tower, cemetery
(() => {
  const c = at('church', 0, -2);
  pavilion(c, 12, 17, 5, 0xc85f42, 0xe6dfd0);
  box(1.4, 0.04, 14, 0xb23a3a, c[0], 0.17, c[1] + 0.5);
  const al = at('church', 0, -9.3); box(3.6, 1.1, 1.1, 0xf0d9a0, al[0], 0.16, al[1]); box(0.16, 1.9, 0.16, 0xc9973a, al[0], 1.3, al[1]); box(0.9, 0.16, 0.16, 0xc9973a, al[0], 2.5, al[1]); ob(al, 2.1);
  for (let r = 0; r < 4; r++) [-3.3, 3.3].forEach(sx => { const p = at('church', sx, -5.2 + r * 2.5); box(3.9, 0.5, 0.7, 0x8a6240, p[0], 0.16, p[1]); box(3.9, 0.55, 0.12, 0x7a5636, p[0], 0.66, p[1] + 0.3); ob(p, 1.95); });
  const tw = at('church', 10, -2); box(2.6, 8, 2.6, 0xe6dfd0, tw[0], 0, tw[1]); cone(2.3, 2, 0xc85f42, tw[0], 8, tw[1], 4).rotation.y = Math.PI / 4; ball(0.45, 0xd9a441, tw[0], 6.4, tw[1] + 1.35); ob(tw, 2.2);
  [[-12, -6], [-9.5, -6.5], [-12.3, -1], [-8.6, -1.6], [-11, 1]].forEach(q => { const p = at('church', q[0], q[1]); box(0.14, 1.1, 0.14, 0xb9b3a4, p[0], 0, p[1]); box(0.6, 0.14, 0.14, 0xb9b3a4, p[0], 0.7, p[1]); });
  const gr = at('church', -10.5, -3); box(1.3, 0.1, 2.2, 0x3a2c20, gr[0], 0.0, gr[1]); box(1.7, 0.16, 2.6, 0x6b5a48, gr[0], -0.08, gr[1]);
})();
// Classroom, cornerstone
(() => {
  const c = at('school', 0, -1);
  pavilion(c, 9, 9, 3.4, 0xd9a441, 0xd8b98a);
  const bb = at('school', 0, -5.2); box(4.6, 1.5, 0.14, 0x2f4a3c, bb[0], 0.9, bb[1]); box(4.9, 0.12, 0.2, 0x7a5a36, bb[0], 0.8, bb[1]); ob(bb, 1.2); ob([bb[0] - 1.8, bb[1]], 0.8); ob([bb[0] + 1.8, bb[1]], 0.8);
  for (let r = 0; r < 2; r++) for (let q = -1; q <= 1; q++) { const p = at('school', q * 2.6, 0 + r * 2.4); box(1.3, 0.1, 0.8, 0xb98b56, p[0], 0.62, p[1]); box(0.1, 0.62, 0.1, 0x7a5a36, p[0], 0, p[1]); ob(p, 0.75); }
  const cs = at('school', -6, 6); box(1.4, 0.7, 1, 0xd9d2c0, cs[0], 0, cs[1]);
  for (let i = 0; i < 3; i++) { const l = cyl(0.06, 0.06, 4.4, 0x7a5a36, cs[0] + Math.cos(i * 2.1) * 1, 0, cs[1] + Math.sin(i * 2.1) * 1, 5); l.rotation.set(Math.sin(i * 2.1) * 0.24, 0, -Math.cos(i * 2.1) * 0.24); }
  ob(cs, 1.1);
})();
// House by the lake, boat of Elias
(() => {
  const c = at('lake', 0, -3);
  pavilion(c, 10, 7, 3.6, 0xa5482f, 0xe7cfa6);
  box(3.2, 0.12, 1.5, 0x8a6240, c[0], 0.85, c[1]); [-1.3, 1.3].forEach(sx => box(0.14, 0.85, 1.1, 0x6b4f30, c[0] + sx, 0, c[1])); ob(c, 1.7);
  const b = at('lake', 4, 14.2), g = new T.Group(); g.position.set(b[0], -1.0, b[1]); g.rotation.y = 0.5; world.add(g);
  box(3.4, 0.5, 1, 0x8a6240, 0, 0, 0, g); cone(0.5, 1, 0x8a6240, 1.9, 0, 0, 4, g).rotation.z = -Math.PI / 2; box(0.08, 0.08, 2.6, 0xc9a56b, 0.3, 0.55, 0, g).rotation.y = 0.5;
  bob.push({ o: g, y: -1.0, a: 0.12, s: 1.3, p: 0 });
})();
// Story islet: a great open book
(() => {
  const c = at('story', 0, -0.8), g = new T.Group(); g.position.set(c[0], 0.6, c[1]); world.add(g);
  const l = box(2.6, 0.34, 3.4, 0xfff8e6, -1.33, 0, 0, g); l.rotation.z = -0.14; const r = box(2.6, 0.34, 3.4, 0xf0e2c4, 1.33, 0, 0, g); r.rotation.z = 0.14; box(0.22, 0.4, 3.5, 0x0f766e, 0, -0.1, 0, g);
  cyl(2.1, 2.4, 0.6, 0xd9d2c0, c[0], 0, c[1], 8); ob(c, 2.3);
})();
// A street of Manila: house fronts, lamps, and the Scale
(() => {
  const c = at('street', 0, 0);
  cyl(8, 8, 0.06, 0x7d8198, c[0], 0, c[1], 20);
  [[-11, -10], [11, -10]].forEach((q, i) => {
    const p = at('street', q[0], q[1]); box(6, 5.2, 3.4, [0xcbbfa8, 0xb9ad98, 0xc4b59c][i], p[0], 0, p[1]); box(6.6, 0.5, 4, 0x7a3a2e, p[0], 5.2, p[1]);
    for (let w = -1; w <= 1; w++) box(1, 1.2, 0.1, lit(0xffd98a), p[0] + w * 1.8, 2.6, p[1] + 1.72);
    ob(p, 3.3); ob([p[0] - 2.2, p[1]], 2.4); ob([p[0] + 2.2, p[1]], 2.4);
  });
  for (let i = 0; i < 6; i++) lamp(at('street', Math.cos(i * 1.047 + 0.5) * 12.5, Math.sin(i * 1.047 + 0.5) * 12.5), 3.6);
})();
// The wedding house and the lamp
(() => {
  const c = at('wedding', 0, -3);
  pavilion(c, 12, 9, 4.4, 0x7a2238, 0x5a2a3a);
  box(4, 0.12, 1.6, 0xf3ead6, c[0], 0.9, c[1]); [-1.7, 1.7].forEach(sx => box(0.14, 0.9, 1.2, 0x4a3426, c[0] + sx, 0, c[1])); ob(c, 2.1);
  cyl(0.12, 0.22, 0.5, 0xc9973a, c[0], 1.02, c[1], 8); const lp = ball(0.38, lit(0xffe6a0), c[0], 1.85, c[1]); bob.push({ o: lp, y: 1.85, a: 0.03, s: 2, p: 0 });
  const gl = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0xffcf80, transparent: true, depthWrite: false, blending: T.AdditiveBlending })); gl.scale.set(7, 7, 1); gl.position.set(c[0], 1.85, c[1]); world.add(gl); flames.push(gl);
  const pl = new T.PointLight(0xffc880, 1.1, 22); pl.position.set(c[0], 2.6, c[1]); world.add(pl);
  [[-5, 4.5], [5, 4.5]].forEach(q => lamp(at('wedding', q[0], q[1]), 3));
})();
// Underground meeting place: a rock dome with an arch, torches, crates, the map table
(() => {
  const c = at('cave', 0, 0), dm = mat(0x3a3546, { transparent: true, side: T.DoubleSide });
  const dome = put(new T.SphereGeometry(11.4, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), dm, c[0], 0, c[1]); dome.scale.y = 0.62;
  roofs.push({ m: dm, x: c[0], y: c[1], r: 11.6, low: 0.1 });
  const ang = Math.atan2(ISL.street[1] - c[1], ISL.street[0] - c[0]);
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; let d = Math.abs(a - ((ang + Math.PI * 2) % (Math.PI * 2))); d = Math.min(d, Math.PI * 2 - d); if (d < 0.42) continue; const p = at('cave', Math.cos(a) * 10.9, Math.sin(a) * 10.9); cone(1.5, 3.4 + rnd() * 2.4, 0x4a4558, p[0], 0, p[1], 5); ob(p, 1.45); }
  [-0.36, 0.36].forEach(o => { const p = at('cave', Math.cos(ang + o) * 11.2, Math.sin(ang + o) * 11.2); cyl(0.5, 0.7, 4.2, 0x5a5468, p[0], 0, p[1], 6); });
  const t = at('cave', 0, -2); box(2.6, 0.12, 1.6, 0x6b4f30, t[0], 0.85, t[1]); box(2, 0.03, 1.1, 0xe9d9a8, t[0], 0.98, t[1]); [-1, 1].forEach(sx => box(0.14, 0.85, 1.2, 0x4a3426, t[0] + sx, 0, t[1])); ob(t, 1.6);
  [[-6, 3], [-7, 1.6], [6.5, 4]].forEach(q => { const p = at('cave', q[0], q[1]); box(1.1, 1.1, 1.1, 0x6b4f30, p[0], 0, p[1]).rotation.y = rnd(); ob(p, 0.9); });
  [[-5.5, -6.5], [5.5, -6.8], [0, 7.5]].forEach(q => { const p = at('cave', q[0], q[1]); cyl(0.07, 0.09, 1.9, 0x3a2c20, p[0], 0, p[1], 5); ball(0.22, lit(0xff9a3c), p[0], 2.05, p[1]); const gl = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0xff8a3c, transparent: true, depthWrite: false, blending: T.AdditiveBlending })); gl.scale.set(5, 5, 1); gl.position.set(p[0], 2.05, p[1]); world.add(gl); flames.push(gl); ob(p, 0.3); });
  const pl = new T.PointLight(0xff9a50, 1.3, 26); pl.position.set(c[0], 3, c[1]); world.add(pl);
})();
// Pier and the Bapor Tabo
(() => {
  const g = new T.Group(); g.position.set(66, -1.1, 53.4); world.add(g);
  box(17, 1.8, 5.4, 0xf1ece0, 0, 0, 0, g); cone(2.7, 4, 0xf1ece0, 10.4, 0, 0, 4, g).rotation.z = -Math.PI / 2;
  box(13, 1.5, 4.4, 0xd9cfb8, -0.8, 1.8, 0, g); box(13.6, 0.16, 5, 0x7a5a36, -0.8, 3.3, 0, g); box(9, 1.3, 3.4, 0xf1ece0, -1.4, 3.46, 0, g);
  cyl(0.6, 0.7, 3, 0x2a2d3a, -2, 4.76, 0, 10, g); cyl(0.66, 0.66, 0.4, 0xb23a3a, -2, 7.2, 0, 10, g);
  for (let i = -5; i <= 4; i++) box(0.5, 0.5, 0.06, lit(0xffd98a), i * 1.2, 2.3, 2.22, g);
  for (let i = 0; i < 4; i++) { const s = ball(0.5 + i * 0.22, new T.MeshBasicMaterial({ color: 0xc8ccd8, transparent: true, opacity: 0.4 }), -2 - i * 0.7, 8.4 + i * 1.1, 0, g); bob.push({ o: s, y: s.position.y, a: 0.25, s: 0.9, p: i }); }
  bob.push({ o: g, y: -1.1, a: 0.12, s: 0.9, p: 2 });
  [[-4, -4], [5, 4.5]].forEach(q => { const p = at('pier', q[0], q[1]); cyl(0.5, 0.5, 1, 0x7a5a36, p[0], 0, p[1], 8); ob(p, 0.7); });
  lamp(at('pier', 2.2, 8), 3.2);
})();
// Retreat of Padre Florentino, the chest
(() => {
  const h = at('cliff', -2.4, -3.6); box(3.4, 2.3, 3, 0xd8c8a8, h[0], 0, h[1]); cone(3, 1.7, 0x6b4f30, h[0], 2.3, h[1], 4).rotation.y = Math.PI / 4; box(0.8, 1.2, 0.08, lit(0xffd98a), h[0] + 0.6, 0.5, h[1] + 1.52); ob(h, 2.5);
  const c = at('cliff', 4, 5); box(1, 0.6, 0.7, 0x8a6a2a, c[0], 0, c[1]); box(1.06, 0.2, 0.76, 0x6b4f30, c[0], 0.6, c[1]); box(0.16, 0.2, 0.06, 0xf4c95d, c[0], 0.42, c[1] + 0.36); ob(c, 0.8);
  lamp(at('cliff', 0.5, 5.6), 2.8);
})();
// Lighthouse island: the Reflection Zone
const beam = new T.Group();
(() => {
  const c = at('light', 0, 4);
  cyl(2.3, 2.7, 0.8, 0xd9d2c0, c[0], 0, c[1], 10); cyl(1.5, 2.1, 4, 0xfbf7ee, c[0], 0.8, c[1], 10); cyl(1.2, 1.5, 3, 0xe76f51, c[0], 4.8, c[1], 10); cyl(1.0, 1.2, 3, 0xfbf7ee, c[0], 7.8, c[1], 10);
  cyl(1.6, 1.6, 0.2, 0x23263a, c[0], 10.8, c[1], 10); ball(0.7, lit(0xfff2b0), c[0], 11.8, c[1]); cone(1.3, 1.2, 0xe76f51, c[0], 12.6, c[1], 8);
  beam.position.set(c[0], 11.8, c[1]); world.add(beam);
  const bm = new T.Mesh(new T.ConeGeometry(4.5, 60, 10, 1, true), new T.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.1, depthWrite: false, side: T.DoubleSide, fog: false })); bm.rotation.z = Math.PI / 2; bm.position.x = -30; beam.add(bm);
  ob(c, 2.9);
  const t = at('light', -7, -2); box(2.4, 0.12, 1.4, 0xb98b56, t[0], 0.8, t[1]); [-0.9, 0.9].forEach(sx => box(0.12, 0.8, 1, 0x7a5a36, t[0] + sx, 0, t[1])); box(0.8, 0.04, 1, 0xfff8e6, t[0] - 0.5, 0.93, t[1]); box(0.8, 0.04, 1, 0xfff8e6, t[0] + 0.5, 0.93, t[1]); ob(t, 1.5);
  [[6, -3], [7.5, 1.5]].forEach(q => { const b = at('light', q[0], q[1]); box(2, 0.14, 0.6, 0x9a7446, b[0], 0.42, b[1]); ob(b, 0.95); });
})();

/* ---------- things to open ---------- */
const boothSign = {};
BOOTHS.forEach(b => {
  const s = signpost([b.x, b.y], '?');
  s.text.material.color.set(0xe76f51); boothSign[b.id] = s;
  spots.push({ x: b.x, y: b.y, r: 2.9, label: `Answer the question post: ${b.topic}`, act: () => showBooth(b), kind: 'booth', ref: b });
});
SYMBOLS.forEach(s => {
  const d = put(new T.OctahedronGeometry(0.34), lit(0xe63946), s.x, s.id === 's3' ? 9.4 : s.id === 's5' ? 2.6 : s.id === 's7' ? 5.6 : 3, s.y); spin.push(d); s.mark = d;
  spots.push({ x: s.x, y: s.y, r: s.id === 's1' ? 3 : 3.9, label: `Look at: ${s.name}`, act: () => showSymbol(s), kind: 'sym', ref: s });
});
SCENES.forEach(s => {
  const st = put(new T.OctahedronGeometry(0.55), lit(0xf4c95d), s.x, 1.5, s.y); st.scale.y = 1.5; spin.push(st); s.mark = st;
  const ring = new T.Mesh(new T.RingGeometry(1.7, 2, 24), new T.MeshBasicMaterial({ color: 0xf4c95d, transparent: true, opacity: 0.7, side: T.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.set(s.x, 0.09, s.y); world.add(ring);
  spots.push({ x: s.x, y: s.y, r: 2.4, label: `Watch the scene: ${s.title}`, act: () => playScene(s), kind: 'scene', ref: s });
});
const sign = (p, text, lab, act, big) => { signpost(p, text, big); spots.push({ x: p[0], y: p[1], r: 2.9, label: lab, act, kind: 'sign' }); };
sign(at('home', 4.2, -10), 'KAPULUAN NI RIZAL', 'Read the welcome sign', () => showTitle(), true);
sign(at('home', -8, -6), 'THE GROUP', 'Open the list of group roles', () => showRoles());
sign(at('home', 8, -6), 'CRITERIA', 'Read the assessment criteria', () => showRubric());
sign(at('story', -5.4, -1), 'NOLI', 'Read the story of Noli Me Tangere', () => showStory('noli'));
sign(at('story', 0, -5.6), 'THE LINK', 'Read how the two novels connect', () => showStory('link'));
sign(at('story', 5.4, -1), 'FILI', 'Read the story of El Filibusterismo', () => showStory('fili'));
spots.push({ x: at('light', 0, -1.2)[0], y: at('light', 0, -1.2)[1], r: 3, label: 'Light a lantern of reflection', act: () => showWall(), kind: 'wall' });
const lq = put(new T.OctahedronGeometry(0.4), lit(0xfff2b0), at('light', 0, -1.2)[0], 1.6, at('light', 0, -1.2)[1]); spin.push(lq);
spots.push({ x: at('light', -7, -2)[0], y: at('light', -7, -2)[1], r: 3.2, label: 'Open the Then and Now logbook', act: () => showCompare(), kind: 'sign' });
// The Scale: every argument is a weight on the blue pan (reform) or the red pan (revolution)
const scale = { beam: new T.Group(), pans: [], weights: new T.Group(), tilt: 0 };
(() => {
  const c = at('street', 0, 0);
  cyl(1.3, 1.6, 0.4, 0x2a2d3a, c[0], 0, c[1], 10); cyl(0.16, 0.22, 3.6, 0xc9973a, c[0], 0.4, c[1], 8); ball(0.28, 0xf4c95d, c[0], 4.1, c[1]);
  scale.beam.position.set(c[0], 3.8, c[1]); world.add(scale.beam);
  box(5.6, 0.14, 0.22, 0xc9973a, 0, -0.07, 0, scale.beam);
  [[-2.7, 0x457b9d, 'REFORM'], [2.7, 0xe63946, 'REVOLUTION']].forEach(q => {
    const g = new T.Group(); g.position.set(q[0], 0, 0); scale.beam.add(g); scale.pans.push(g);
    [-0.5, 0.5].forEach(sx => box(0.03, 1.6, 0.03, 0xd9d2c0, sx, -1.6, 0, g));
    cyl(1.0, 0.75, 0.16, q[1], 0, -1.76, 0, 10, g);
    const t = label(q[2], { fg: '#ffffff', bg: q[0] < 0 ? 'rgba(69,123,157,.95)' : 'rgba(230,57,70,.95)', h: 0.5 }); t.position.set(0, 0.7, 0); g.add(t);
  });
  world.add(scale.weights);
  ob(c, 1.9);
  spots.push({ x: c[0], y: c[1], r: 4.2, label: 'Add your weight to the Scale: reform or revolution', act: () => showDebate(), kind: 'sign' });
})();
const lanterns = new T.Group(); world.add(lanterns);
// Redraws what the answers of the group change in the world: lanterns on the sea, weights on the Scale, ticks on the posts
function refreshWorld() {
  while (lanterns.children.length) lanterns.remove(lanterns.children[0]);
  (save.posts.wall || []).slice(-40).forEach((n, i) => {
    const a = i * 2.39996, r = 16 + (i % 5) * 2.4, g = new T.Group();
    g.position.set(ISL.light[0] + Math.cos(a) * r, -0.95, ISL.light[1] + Math.sin(a) * r * 0.9 + 3);
    box(0.5, 0.08, 0.5, 0x7a5a36, 0, 0, 0, g); box(0.34, 0.42, 0.34, lit([0xffe6a0, 0xffc9a0, 0xfff2c8][i % 3]), 0, 0.08, 0, g);
    const gl = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0xffd98a, transparent: true, depthWrite: false, blending: T.AdditiveBlending })); gl.scale.set(2.6, 2.6, 1); gl.position.y = 0.3; g.add(gl);
    g.userData.p = i; lanterns.add(g);
  });
  const d = save.posts.debate || [], r = d.filter(p => p.side === 'r').length, v = d.filter(p => p.side === 'v').length;
  scale.target = Math.max(-0.3, Math.min(0.3, (r - v) * 0.07));
  scale.pans.forEach((g, k) => {
    g.children.filter(o => o.userData.w).forEach(o => g.remove(o));
    for (let i = 0; i < Math.min(k ? v : r, 9); i++) { const w = box(0.3, 0.3, 0.3, 0xf4c95d, -0.4 + (i % 3) * 0.4, -1.68 + Math.floor(i / 3) * 0.3, 0, g); w.userData.w = 1; }
  });
  BOOTHS.forEach(b => {
    const n = (save.posts[b.id] || []).length, s = boothSign[b.id];
    world.remove(s.text);
    s.text = label(n ? `✓ ${n}` : '?', { fg: n ? '#0f766e' : '#e76f51', h: 0.5 }); s.text.position.set(b.x, 1.85, b.y + 0.2); world.add(s.text);
  });
}

/* ---------- trees and rocks: around the rim, away from bridges and things to open ---------- */
Object.keys(ISL).forEach(k => {
  const [x, y, r] = ISL[k], night = x > 20, n = Math.round(r * (night ? 0.5 : 0.9));
  for (let i = 0, tries = 0; i < n && tries < 200; tries++) {
    const a = rnd() * Math.PI * 2, d = r * (0.78 + rnd() * 0.16), px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
    if (bridges.some(s => segDist(px, py, s) < 3.2) || spots.some(s => Math.hypot(px - s.x, py - s.y) < s.r + 1.4) || obstacles.some(o => Math.hypot(px - o.x, py - o.y) < o.r + 1.6) || people.some(p => Math.hypot(px - p.x, py - p.y) < 2.4)) continue;
    if (k === 'cave') { i++; continue; }
    if (night) { rock(px, py, 0.6 + rnd() * 0.7, 0x5c5a6c); ob([px, py], 0.8); } else if (rnd() < 0.75) palm(px, py); else { ball(0.7, 0x5fae58, px, 0.45, py).scale.y = 0.7; ob([px, py], 0.7); }
    i++;
  }
});

/* ---------- people in the world ---------- */
people.forEach(p => { p.o = doll(p.kind, p.color); world.add(p.o); p.tag = label(p.name, { bg: 'rgba(255,255,255,.92)', h: 0.34 }); p.tag.position.y = p.kind === 'child' ? 2.9 : 2.15; p.o.add(p.tag); });
player.o = doll('man', save.color, true); world.add(player.o);
function retag() {
  if (player.tag) player.o.remove(player.tag);
  player.tag = label((save.name || 'You') + (actingAs ? ' as ' + actingAs : ''), { bg: 'rgba(11,58,68,.92)', fg: '#ffffff', h: 0.38 });
  player.tag.position.y = 2.35; player.o.add(player.tag);
}

/* ---------- each frame ---------- */
const keys = {}; const joy = { x: 0, y: 0 }; let running = false;
const lerpC = (a, b, t) => new T.Color(a).lerp(new T.Color(b), t);
const SKY = [0x9fd8f0, 0xf2a971, 0x0d1533], SEA = [0x2f9fb5, 0x2c6f8a, 0x0b1f3d];
const tri = (c, t) => (t < 0.5 ? lerpC(c[0], c[1], t * 2) : lerpC(c[1], c[2], t * 2 - 1));
const seaPos = seaGeo.attributes.position, seaBase = seaPos.array.slice();
function turn(o, to, dt) { let d = to - o.face; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; o.face += d * Math.min(1, dt * 10); }
function step(dt) {
  clock += dt;
  people.forEach(p => {
    p.t += dt;
    const dx = (p.tx == null ? p.hx : p.tx) - p.x, dy = (p.ty == null ? p.hy : p.ty) - p.y, d = Math.hypot(dx, dy);
    p.moving = d > 0.05;
    if (p.moving) { const v = Math.min(d, 6 * dt); p.x += dx / d * v; p.y += dy / d * v; turn(p, Math.atan2(dx, dy), dt); }
    else { const sp = scene && scene.speaker, look = scene && p.tx != null ? (sp && sp !== p ? sp : focus) : (Math.hypot(player.x - p.x, player.y - p.y) < 7 ? player : null); if (look) turn(p, Math.atan2(look.x - p.x, look.y - p.y), dt * 0.6); }
    p.o.position.set(p.x, 0, p.y); p.o.rotation.y = p.face;
    p.o.userData.body.position.y = p.moving ? Math.abs(Math.sin(p.t * 9)) * 0.12 : Math.sin(p.t * 1.8) * 0.02;
    p.tag.visible = Math.hypot(player.x - p.x, player.y - p.y) < 26 || (scene && p.tx != null);
  });
  player.t += dt; player.moving = false;
  if (started && !busy) {
    const mx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0) + joy.x, my = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0) + joy.y;
    const mag = Math.hypot(mx, my);
    if (mag > 0.15) {
      // forward is away from the camera
      const fx = -Math.sin(cam.yaw), fy = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), ry = -Math.sin(cam.yaw);
      const sp = (keys.shift || running ? 9.5 : 5.8) * dt / Math.max(1, mag);
      const vx = (rx * mx - fx * my) * sp, vy = (ry * mx - fy * my) * sp;
      if (!blocked(player.x + vx, player.y, 0.4)) player.x += vx;
      if (!blocked(player.x, player.y + vy, 0.4)) player.y += vy;
      turn(player, Math.atan2(vx, vy), dt); player.moving = true;
    }
  }
  player.o.position.set(player.x, 0, player.y); player.o.rotation.y = player.face;
  player.o.userData.body.position.y = player.moving ? Math.abs(Math.sin(player.t * 10)) * 0.14 : Math.sin(player.t * 1.8) * 0.02;
  // camera: follows the visitor, or holds a scene
  const tg = focus || player, e = 1 - Math.pow(0.002, dt);
  cam.x += (tg.x - cam.x) * e; cam.y += (tg.y - cam.y) * e;
  const dist = cam.dist + (focus ? 3 : 0), ch = Math.cos(cam.pitch) * dist;
  camera.position.set(cam.x + Math.sin(cam.yaw) * ch, 1.5 + Math.sin(cam.pitch) * dist, cam.y + Math.cos(cam.yaw) * ch);
  camera.lookAt(cam.x, 1.5, cam.y);
  // the sky turns from day to night across the home island
  const n = Math.max(0, Math.min(1, (cam.x + 14) / 44)), nt = n * n * (3 - 2 * n), sky = tri(SKY, nt);
  world.background = sky; world.fog.color.copy(sky); seaMat.color.copy(tri(SEA, nt));
  hemi.intensity = 0.7 - nt * 0.06; hemi.color.copy(lerpC(0xffffff, 0x8fa4e0, nt)); sun.intensity = 0.6 - nt * 0.3; sun.color.copy(lerpC(0xfff1d0, 0x9fb4ff, nt));
  starMat.opacity = Math.max(0, nt * 1.6 - 0.6); moon.material.opacity = starMat.opacity;
  flames.forEach((f, i) => { f.material.opacity = (0.35 + nt * 0.6) * (0.9 + Math.sin(clock * 7 + i * 1.7) * 0.1); });
  for (let i = 0; i < seaPos.count; i++) { const x = seaBase[i * 3], z = seaBase[i * 3 + 2]; seaPos.array[i * 3 + 1] = Math.sin(x * 0.11 + clock * 1.1) * 0.16 + Math.cos(z * 0.09 + clock * 0.8) * 0.16; }
  seaPos.needsUpdate = true;
  spin.forEach((o, i) => { o.rotation.y = clock * 1.6 + i; o.position.y += Math.sin(clock * 2.4 + i) * 0.003; });
  SCENES.forEach(s => { s.mark.material.opacity = 1; s.mark.scale.setScalar(save.seen[s.id] ? 0.6 : 1); s.mark.scale.y *= 1.5; });
  SYMBOLS.forEach(s => s.mark.scale.setScalar(save.sym[s.id] ? 0.6 : 1));
  bob.forEach(b => { b.o.position.y = b.y + Math.sin(clock * b.s + b.p) * b.a; });
  lanterns.children.forEach(g => { g.position.y = -0.95 + Math.sin(clock * 1.2 + g.userData.p) * 0.09; });
  beam.rotation.y = clock * 0.5; beam.children[0].material.opacity = 0.03 + nt * 0.1;
  scale.tilt += ((scale.target || 0) - scale.tilt) * Math.min(1, dt * 2); scale.beam.rotation.z = scale.tilt; scale.pans.forEach(g => { g.rotation.z = -scale.tilt; });
  roofs.forEach(r => { const inside = Math.hypot(player.x - r.x, player.y - r.y) < r.r || (focus && Math.hypot(focus.x - r.x, focus.y - r.y) < r.r); r.m.opacity += ((inside ? (r.low || 0.2) : 1) - r.m.opacity) * Math.min(1, dt * 6); r.m.depthWrite = r.m.opacity > 0.9; });
  // what can be opened from here
  nearest = null; let best = 1e9;
  if (started && !busy) {
    people.forEach(p => { const d = Math.hypot(p.x - player.x, p.y - player.y); if (d < 2.7 && d < best) { best = d; nearest = { npc: p, label: `Talk to ${p.name}`, act: () => talk(p) }; } });
    spots.forEach(s => { const d = Math.hypot(s.x - player.x, s.y - player.y); if (d < s.r && d * 0.8 < best) { best = d * 0.8; nearest = s; } });
  }
  const pr = $('#prompt');
  if (nearest) { pr.textContent = (document.body.classList.contains('touch') ? '' : 'E · ') + nearest.label; pr.style.display = 'block'; } else pr.style.display = 'none';
  $('#zname').textContent = zoneOf(player.x, player.y);
  bubble($('#bub1'), scene && scene.speaker, scene && scene.line);
  bubble($('#bub2'), player.bubbleUntil > clock ? player : null, player.bubble);
}
const v3 = new T.Vector3();
function bubble(e, p, text) {
  if (!p || !text) { e.style.display = 'none'; return; }
  v3.set(p.x, p.kind === 'child' ? 2.5 : 3.1, p.y).project(camera);
  if (v3.z > 1) { e.style.display = 'none'; return; }
  e.textContent = text; e.style.display = 'block';
  e.style.left = `${Math.max(120, Math.min(innerWidth - 120, (v3.x + 1) / 2 * innerWidth))}px`; e.style.top = `${Math.max(70, (1 - v3.y) / 2 * innerHeight)}px`;
}
function draw() { renderer.render(world, camera); }
function counts() {
  return {
    met: Object.keys(save.met).length, metAll: people.length, seen: Object.keys(save.seen).length, seenAll: SCENES.length,
    booths: BOOTHS.filter(b => (save.posts[b.id] || []).length).length, boothsAll: BOOTHS.length, sym: Object.keys(save.sym).length, symAll: SYMBOLS.length,
    refl: (save.posts.wall || []).length, debate: (save.posts.debate || []).length, cmp: COMPARE.filter((r, i) => (save.compare[i] || '').trim()).length, voices: save.voices.length
  };
}
function progress() {
  const c = counts();
  $('#zprog').textContent = `People ${c.met}/${c.metAll} · Scenes ${c.seen}/${c.seenAll} · Posts ${c.booths}/${c.boothsAll} · Lanterns ${c.refl}`;
}
let last = 0;
function frame(now) {
  // the first frame can carry a timestamp older than the start time, so the step never goes below zero
  const dt = Math.max(0, Math.min((now - last) / 1000, 0.05)); last = now;
  step(dt); draw();
  requestAnimationFrame(frame);
}
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, document.body.classList.contains('touch') ? 1.5 : 2);
  renderer.setPixelRatio(dpr); renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}

/* ---------- dialogue and panels ---------- */
let typing = null;
function say(who, text, btns) {
  busy = true; $('#dlg').style.display = 'block'; $('#dwho').textContent = who || '';
  const out = $('#dtxt'); clearInterval(typing); out.textContent = ''; let i = 0;
  typing = setInterval(() => { i += 3; out.textContent = text.slice(0, i); if (i >= text.length) clearInterval(typing); }, 16);
  out.onclick = () => { clearInterval(typing); out.textContent = text; };
  const row = $('#drow'); row.innerHTML = '';
  (btns || [['Close', closeDlg]]).forEach((b, k) => { const e = el('button', { className: 'btn' + (b[2] ? ' ' + b[2] : k ? ' alt' : ''), textContent: b[0] }); e.onclick = b[1]; row.append(e); });
  const f = row.querySelector('button'); if (f && !document.body.classList.contains('touch')) f.focus();
}
function closeDlg() { clearInterval(typing); $('#dlg').style.display = 'none'; busy = $('#panel').style.display === 'flex'; }
function openPanel(title, build) {
  closeDlg(); busy = true; $('#ptitle').textContent = title; const b = $('#pbody'); b.innerHTML = ''; build(b); b.scrollTop = 0; $('#panel').style.display = 'flex';
}
function closePanel() { $('#panel').style.display = 'none'; busy = $('#dlg').style.display === 'block'; progress(); }
$('#pclose').onclick = closePanel;
$('#panel').addEventListener('pointerdown', e => { if (e.target.id === 'panel') closePanel(); });
let toastT = null;
function toast(t) { const e = $('#toast'); e.textContent = t; e.style.display = 'block'; clearTimeout(toastT); toastT = setTimeout(() => { e.style.display = 'none'; }, 3200); }
const h3 = t => el('h3', { textContent: t }), para = (t, c) => el('p', { textContent: t, className: c || '' });
const btn = (t, fn, c) => { const b = el('button', { className: 'btn' + (c ? ' ' + c : ''), textContent: t }); b.onclick = fn; return b; };
const who = () => (save.name || 'A member') + (actingAs ? ' as ' + actingAs : '');

function talk(p) {
  save.met[p.name] = 1; persist(); progress();
  const menu = () => say(p.name, p.hello, [
    [p.qa[0][0], () => say(p.name, p.qa[0][1], [['Back', menu], ['Goodbye', closeDlg]])],
    [p.qa[1][0], () => say(p.name, p.qa[1][1], [['Back', menu], ['Goodbye', closeDlg]])],
    ['Who is this?', () => say(p.name, p.who, [['Back', menu], ['Goodbye', closeDlg]])],
    actingAs === p.name ? ['Stop acting', () => { actingAs = ''; retag(); closeDlg(); toast('You are yourself again.'); }] : ['Act as this character', () => { actingAs = p.name.replace(' (child)', ''); closeDlg(); retag(); toast(`You now speak as ${actingAs}. Press Enter (TALK on a phone) and type a line.`); }, 'red'],
    ['Goodbye', closeDlg]
  ]);
  menu();
}
function playScene(s) {
  let i = -1;
  const cast = Object.keys(s.cast).map(person);
  cast.forEach(p => { p.tx = s.x + s.cast[p.name][0]; p.ty = s.y + s.cast[p.name][1]; });
  focus = { x: s.x, y: s.y };
  const end = () => { cast.forEach(p => { p.tx = p.ty = null; }); focus = null; scene = null; };
  const next = () => {
    i++;
    if (i >= s.beats.length) {
      scene = null; save.seen[s.id] = 1; persist(); progress();
      say('What this scene shows', s.lesson, [['For discussion', () => say('For discussion', s.ask, [['Finish', () => { end(); closeDlg(); }]])], ['Finish', () => { end(); closeDlg(); }]]);
      return;
    }
    const b = s.beats[i], sp = b[0] && person(b[0]);
    scene = { speaker: sp, line: b[1] };
    say(b[0] || s.title, b[1], [[i === s.beats.length - 1 ? 'End of scene' : 'Next', next], ['Leave', () => { end(); closeDlg(); }]]);
  };
  next();
}
function showSymbol(s) {
  save.sym[s.id] = 1; persist(); progress();
  say(s.name, s.is, [['What it means', () => say(s.name, s.means, [['Close', closeDlg]])], ['Close', closeDlg]]);
}
function postForm(p, id, extra) {
  const n = el('input', { value: who(), maxLength: 50 }), t = el('textarea', { maxLength: 400, placeholder: 'Type the answer here' });
  p.append(el('label', { textContent: 'Name of the member answering', className: 'dim' }), n, el('label', { textContent: 'Answer', className: 'dim' }), t);
  return () => {
    const text = t.value.trim();
    if (!text) { toast('Type an answer first.'); return false; }
    (save.posts[id] = save.posts[id] || []).push(Object.assign({ n: n.value.trim() || 'A member', t: text }, extra ? extra() : {}));
    persist(); toast('Posted.'); return true;
  };
}
const noteList = (p, list, cls) => (list.length ? list.forEach(x => p.append(el('div', { className: 'note ' + (cls ? cls(x) : '') }, [el('b', { textContent: x.n + ': ' }), x.t]))) : p.append(para('Nothing posted yet.', 'dim')));
function showBooth(b) {
  openPanel(`Question post · ${b.topic}`, p => {
    p.append(para(b.where, 'dim'), para(b.ctx), el('p', { className: 'q', textContent: b.q }), h3('Answers of the group'));
    noteList(p, save.posts[b.id] || []);
    p.append(h3('Add an answer'));
    const post = postForm(p, b.id);
    p.append(el('div', { className: 'rowb' }, [btn('Post the answer', () => { if (post()) { refreshWorld(); showBooth(b); } }, 'red')]));
  });
}
function showWall() {
  openPanel('Lanterns of Reflection', p => {
    p.append(para('A quiet place. Each member writes one personal insight. Each insight becomes a lantern on the sea around the lighthouse.', 'dim'), el('p', { className: 'q', textContent: 'What did the novels of Rizal teach me, and what will I do about it?' }));
    p.append(para('More prompts: Which character do I see in myself or in someone I know? What lesson is still true in our country today?', 'dim'), h3('Lanterns already lit'));
    noteList(p, save.posts.wall || []);
    p.append(h3('Write your insight'));
    const post = postForm(p, 'wall');
    p.append(el('div', { className: 'rowb' }, [btn('Light the lantern', () => { if (post()) { refreshWorld(); showWall(); } }, 'red')]));
  });
}
function showCompare() {
  openPanel('Then and Now', p => {
    p.append(para('The logbook of Then and Now. Compare the social issues in the novels with present-day realities. The Scriptwriter types; everyone suggests.', 'dim'));
    const tb = el('table'); tb.append(el('tr', null, [el('th', { textContent: 'Issue' }), el('th', { textContent: 'Then: in the novels' }), el('th', { textContent: 'Now: in our time' })]));
    COMPARE.forEach((r, i) => { const inp = el('input', { value: save.compare[i] || '', maxLength: 200, placeholder: 'Our example today' }); inp.oninput = () => { save.compare[i] = inp.value; persist(); }; tb.append(el('tr', null, [el('td', null, [el('b', { textContent: r[0] })]), el('td', { textContent: r[1] }), el('td', null, [inp])])); });
    p.append(tb, para('Answers are saved as you type.', 'dim'));
  });
}
let timerEnd = 0, timerInt = null;
function startTimer(sec) {
  clearInterval(timerInt); const t = $('#timer');
  if (!sec) { t.style.display = 'none'; return; }
  timerEnd = Date.now() + sec * 1000; t.style.display = 'block';
  const tick = () => { const left = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000)); t.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; if (!left) { clearInterval(timerInt); t.textContent = 'Time!'; setTimeout(() => { t.style.display = 'none'; }, 4000); } };
  tick(); timerInt = setInterval(tick, 250);
}
const timerRow = () => el('div', { className: 'rowb' }, [btn('2:00 opening', () => { startTimer(120); closePanel(); }), btn('1:00 rebuttal', () => { startTimer(60); closePanel(); }), btn('Stop timer', () => startTimer(0), 'alt')]);
function showDebate() {
  let side = 'r';
  openPanel('The Scale · Reform or Revolution', p => {
    p.append(el('p', { className: 'q', textContent: 'Debate the vision of Rizal: reform, or revolution?' }));
    p.append(para('Choose the blue pan for REFORM (Ibarra: schools, patience, peaceful change) or the red pan for REVOLUTION (Simoun: force, because peace was answered with prison). Then give your reason. Each argument puts one weight on the Scale, and the Scale tips.'));
    const lab = para('', 'dim');
    const pick = s => { side = s; lab.textContent = `Your side: ${s === 'r' ? 'REFORM' : 'REVOLUTION'}`; };
    pick(side);
    p.append(el('div', { className: 'rowb' }, [btn('I stand for Reform', () => pick('r')), btn('I stand for Revolution', () => pick('v'), 'red')]), lab);
    const post = postForm(p, 'debate', () => ({ side }));
    p.append(el('div', { className: 'rowb' }, [btn('Give my argument', () => { if (post()) { refreshWorld(); showDebate(); } }, 'red')]), h3('Timer'), timerRow(), h3('Arguments so far'));
    noteList(p, save.posts.debate || [], x => x.side);
    p.append(h3('To close the debate'), para('Padre Florentino says freedom must first be deserved: by education, by honest work, by love of what is just. Ask the group: which way would Rizal tip the Scale, or would he set it level?'));
  });
}
function showRoles() {
  openPanel('The group and its roles', p => {
    p.append(para('Groups of 4 to 6 members. Type the name of the member for each role.', 'dim'));
    ROLES.forEach(r => { const inp = el('input', { value: save.roles[r[0]] || '', maxLength: 40, placeholder: 'Name of the member' }); inp.oninput = () => { save.roles[r[0]] = inp.value; persist(); }; p.append(h3(r[0]), para(r[1], 'dim'), inp); });
  });
}
function showRubric() {
  openPanel('Assessment criteria', p => {
    const c = counts(), tb = el('table'); tb.append(el('tr', null, [el('th', { textContent: 'Criterion' }), el('th', { textContent: 'Weight' }), el('th', { textContent: 'What is asked' }), el('th', { textContent: 'Our evidence in this world' })]));
    const ev = [`Twelve islands on one sea, a day side and a night side; ${c.sym} of ${c.symAll} symbols opened.`, `${c.met} of ${c.metAll} characters met, ${c.seen} of ${c.seenAll} scenes watched.`, `${new Set(Object.values(save.posts).flat().map(x => x.n)).size} different names on the question posts; ${c.voices} lines spoken in character.`, `${c.refl} reflections, ${c.debate} debate arguments, ${c.cmp} of ${COMPARE.length} Then and Now rows.`];
    RUBRIC.forEach((r, i) => tb.append(el('tr', null, [el('td', null, [el('b', { textContent: r[0] })]), el('td', { textContent: r[1] }), el('td', { textContent: r[2] }), el('td', { textContent: ev[i] })])));
    p.append(tb);
  });
}
function showStory(k) { openPanel(STORY[k][0], p => { STORY[k][1].forEach(t => p.append(para(t))); p.append(para('This is a short summary. Check details against your textbook.', 'dim')); }); }
function goTo(x, y) { const f = $('#fade'); f.classList.add('on'); closePanel(); closeDlg(); setTimeout(() => { player.x = x; player.y = y; cam.x = x; cam.y = y; f.classList.remove('on'); }, 240); }
function summaryText() {
  const c = counts(), L = ['KAPULUAN NI RIZAL · GROUP OF ESTREVENCION', 'Rizal in the Metaverse: summary of the group', ''];
  L.push('ROLES'); ROLES.forEach(r => L.push(`  ${r[0]}: ${save.roles[r[0]] || '(not set)'}`));
  L.push('', 'PROGRESS', `  Characters met: ${c.met} of ${c.metAll}`, `  Scenes watched: ${c.seen} of ${c.seenAll}`, `  Symbols opened: ${c.sym} of ${c.symAll}`, `  Question posts answered: ${c.booths} of ${c.boothsAll}`);
  BOOTHS.forEach(b => { L.push('', `QUESTION POST: ${b.topic} (${b.where})`, `  Question: ${b.q}`); (save.posts[b.id] || []).forEach(x => L.push(`  - ${x.n}: ${x.t}`)); if (!(save.posts[b.id] || []).length) L.push('  (no answer yet)'); });
  L.push('', 'DEBATE: REFORM OR REVOLUTION'); (save.posts.debate || []).forEach(x => L.push(`  - [${x.side === 'r' ? 'Reform' : 'Revolution'}] ${x.n}: ${x.t}`)); if (!c.debate) L.push('  (no argument yet)');
  L.push('', 'THEN AND NOW'); COMPARE.forEach((r, i) => L.push(`  ${r[0]}`, `    Then: ${r[1]}`, `    Now: ${save.compare[i] || '(empty)'}`));
  L.push('', 'LINES SPOKEN IN CHARACTER'); save.voices.forEach(v => L.push(`  - ${v.n} as ${v.c}: ${v.t}`)); if (!c.voices) L.push('  (none yet)');
  L.push('', 'LANTERNS OF REFLECTION'); (save.posts.wall || []).forEach(x => L.push(`  - ${x.n}: ${x.t}`)); if (!c.refl) L.push('  (empty)');
  return L.join('\n');
}
function download(name, blob) { const a = el('a', { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
let shots = 0;
function snap() {
  draw();
  const c = el('canvas', { width: cv.width, height: cv.height }), x = c.getContext('2d'), bar = Math.round(34 * dpr);
  x.drawImage(cv, 0, 0); x.fillStyle = 'rgba(11,58,68,.9)'; x.fillRect(0, c.height - bar, c.width, bar);
  x.fillStyle = '#ffffff'; x.font = `600 ${Math.round(15 * dpr)}px "Trebuchet MS",Arial,sans-serif`; x.textBaseline = 'middle';
  x.fillText(`Kapuluan ni Rizal · Group of Estrevencion · ${zoneOf(player.x, player.y)}`, 12 * dpr, c.height - bar / 2);
  c.toBlob(b => { if (b) { download(`kapuluan-ni-rizal-${++shots}.png`, b); toast('Screenshot saved to your downloads.'); } });
}
function showOutput() {
  openPanel('Creative output', p => {
    const c = counts(), all = c.metAll + c.seenAll + c.symAll + c.boothsAll + 3, done = c.met + c.seen + c.sym + c.booths + Math.min(1, c.refl) + Math.min(1, c.debate) + Math.min(1, c.cmp);
    p.append(para('For the walkthrough, the group records the screen with the screen recorder of the phone or computer, or saves screenshots here. This page cannot record video by itself.', 'dim'));
    p.append(el('div', { className: 'bar2' }, [el('i', { style: `width:${Math.round(done / all * 100)}%` })]), para(`${Math.round(done / all * 100)}% of the islands explored.`, 'dim'));
    p.append(el('div', { className: 'rowb' }, [btn('Save a screenshot', () => { closePanel(); setTimeout(snap, 300); }, 'red'), btn('Download the summary (.txt)', () => download('kapuluan-ni-rizal-summary.txt', new Blob([summaryText()], { type: 'text/plain' }))), btn('Copy the summary', () => { navigator.clipboard && navigator.clipboard.writeText(summaryText()).then(() => toast('Copied.'), () => toast('Copy is blocked here. Use Download.')); }, 'alt'), btn('Print', () => window.print(), 'alt')]));
    p.append(h3('Summary of the group'), el('pre', { textContent: summaryText(), style: 'white-space:pre-wrap;font-family:inherit;font-size:15px;margin:0' }));
  });
}
function showMenu() {
  openPanel('Menu', p => {
    const g = el('div', { className: 'grid2' });
    [['Sea chart', showMap], ['Moderator guide', showGuide], ['Creative output', showOutput], ['Save a screenshot', () => { closePanel(); setTimeout(snap, 300); }], ['Group and roles', showRoles], ['Assessment criteria', showRubric], ['About this world', showTitle], ['Then and Now logbook', showCompare]]
      .forEach(m => g.append(btn(m[0], m[1])));
    p.append(g, h3('Controls'), para(document.body.classList.contains('touch') ? 'Move with the round pad. Drag the screen to look around. USE opens what is near you. TALK lets your avatar speak. RUN makes you faster.' : 'Move: W A S D or the arrow keys. Look around: drag with the mouse. Zoom: mouse wheel. Run: Shift. Open what is near: E. Speak: Enter. Map: M. Moderator: G. Output: P. Screenshot: K. Hide the buttons: H. Close: Esc.'));
    if (actingAs) p.append(el('div', { className: 'rowb' }, [btn(`Stop acting as ${actingAs}`, () => { actingAs = ''; retag(); closePanel(); }, 'alt')]));
  });
}
function openSay() { if (busy) return; const s = $('#say'); s.style.display = 'block'; s.value = ''; s.focus(); busy = true; }
function closeSay(send) {
  const s = $('#say'), v = s.value.trim(); s.style.display = 'none'; s.blur(); busy = false;
  if (send && v) { player.bubble = v; player.bubbleUntil = clock + 6; if (actingAs) { save.voices.push({ c: actingAs, n: save.name || 'A member', t: v }); persist(); } }
}


/* ---------- welcome sign, sea chart, moderator ---------- */
const PLACES = [
  ['Home and the Reflection Zone', 'Home island (start)', at('home', 0, 7)], ['Home and the Reflection Zone', 'Story islet', at('story', 0, 5.5)], ['Home and the Reflection Zone', 'Lighthouse island (Reflection Zone)', at('light', 0, -5)],
  ['Noli Me Tangere · the day islands', 'Town plaza of San Diego', at('plaza', 7, -1)], ['Noli Me Tangere · the day islands', 'Church', at('church', 0, 9)], ['Noli Me Tangere · the day islands', 'Classroom', at('school', 4.5, 6.5)], ['Noli Me Tangere · the day islands', 'House by the lake', at('lake', 0, 4)],
  ['El Filibusterismo · the night islands', 'A street of Manila and the Scale', at('street', 0, 5)], ['El Filibusterismo · the night islands', 'The wedding house (revolutionary setting)', at('wedding', 0, 8)], ['El Filibusterismo · the night islands', 'Underground meeting place', at('cave', -3, 2)], ['El Filibusterismo · the night islands', 'Pier of the Bapor Tabo', at('pier', 0, 6)], ['El Filibusterismo · the night islands', 'Retreat of Padre Florentino', at('cliff', -1, 3)]
];
function showTitle() {
  openPanel('Kapuluan ni Rizal', p => {
    p.append(para('Rizal in the Metaverse · Group of Estrevencion', 'dim'),
      para('Kapuluan means archipelago. Our country is made of islands, so we built the two novels as islands on one sea.'),
      para('The islands in the west stand in daylight. They are Noli Me Tangere: the town plaza of San Diego, the church, the classroom, and the house by the lake. The first novel still has hope.'),
      para('The islands in the east stand in the night. They are El Filibusterismo: a street of Manila, the wedding house, the underground meeting place, the pier of the Bapor Tabo, and the retreat of Padre Florentino. The second novel is darker.'),
      para('South of the home island is the lighthouse. It is the Reflection Zone. Every reflection becomes a lantern on the water, because Rizal asked the youth to be the light of the country.'), h3('What to do'));
    const ol = el('ol'); ['Read the three story signs on the islet to the north.', 'Meet the people of the novels. Talk to them and ask questions.', 'Watch a scene wherever a gold star is turning.', 'Look for the red diamonds: they mark symbols.', 'Answer the question posts.', 'Add your weight to the Scale: reform or revolution.', 'Light a lantern at the lighthouse.', 'Open Output for the summary and screenshots.'].forEach(t => ol.append(el('li', { textContent: t })));
    p.append(ol);
  });
}
function showMap() {
  openPanel('Sea chart', p => {
    const c = el('canvas', { id: 'mini', width: 700, height: 420 }), k = c.getContext('2d'), s = 700 / 232, X = x => (x + 108) * s, Y = y => (y + 64) * s;
    const g = k.createLinearGradient(X(-14), 0, X(30), 0); g.addColorStop(0, '#7fcfe0'); g.addColorStop(0.5, '#e8a877'); g.addColorStop(1, '#14264a');
    k.fillStyle = g; k.fillRect(0, 0, 700, 420);
    k.strokeStyle = '#b98b56'; k.lineWidth = 4; bridges.forEach(b => { k.beginPath(); k.moveTo(X(b.x1), Y(b.y1)); k.lineTo(X(b.x2), Y(b.y2)); k.stroke(); });
    Object.keys(ISL).forEach(n => { const [x, y, r] = ISL[n]; k.fillStyle = '#f2e3b3'; k.beginPath(); k.arc(X(x), Y(y), (r + 2) * s, 0, 7); k.fill(); k.fillStyle = '#' + GRASS[n].toString(16).padStart(6, '0'); k.beginPath(); k.arc(X(x), Y(y), r * s, 0, 7); k.fill(); });
    k.font = '600 12px "Trebuchet MS",Arial,sans-serif'; k.textAlign = 'center';
    Object.keys(ISL).forEach(n => { const [x, y] = ISL[n]; k.fillStyle = x > 20 ? '#ffffff' : '#12303a'; k.fillText(ZONE[n].split(' · ').pop().replace('Underground meeting place', 'Underground').replace('Retreat of Padre Florentino', 'Padre Florentino').replace('Pier of the Bapor Tabo', 'Bapor Tabo'), X(x), Y(y) + 4); });
    SCENES.forEach(sc => { k.fillStyle = '#f4c95d'; k.beginPath(); k.arc(X(sc.x), Y(sc.y), 4, 0, 7); k.fill(); });
    k.fillStyle = '#e63946'; k.beginPath(); k.arc(X(player.x), Y(player.y), 6, 0, 7); k.fill(); k.strokeStyle = '#fff'; k.lineWidth = 2; k.stroke();
    p.append(c, para('Red dot: you. Gold dots: scenes. Pick an island to sail there at once.', 'dim'));
    let grp = '';
    PLACES.forEach(pl => { if (pl[0] !== grp) { grp = pl[0]; p.append(h3(grp)); } p.append(el('div', { className: 'place' }, [el('span', { textContent: pl[1] }), btn('Sail', () => goTo(pl[2][0], pl[2][1]))])); });
  });
}
function showGuide() {
  openPanel('Moderator guide · discussion flow', p => {
    p.append(para('The Moderator leads the group from island to island. "Sail" brings the avatar there at once.', 'dim'), h3('The voyage'));
    [
      ['Home island. Introduce the group and the five roles at the sign "The Group".', 0], ['Story islet. Read the three signs so everyone remembers both novels.', 1],
      ['Town plaza. Meet Ibarra and Padre Damaso. Watch the fiesta luncheon. Answer the question post.', 3], ['Church. Meet Padre Salvi and the two boys. Watch the scene of Sisa. Answer the post.', 4],
      ['Classroom. Talk to the Schoolmaster. Answer the post about education.', 5], ['Night side: underground meeting place. Meet Simoun. Watch his plan.', 9],
      ['The wedding house. Look at the lamp. Watch the scene.', 8], ['A street of Manila. Hold the debate at the Scale.', 7],
      ['Lighthouse. Fill the Then and Now logbook, then every member lights a lantern.', 2]
    ].forEach((s, i) => p.append(el('div', { className: 'place' }, [el('span', { textContent: `${i + 1}. ${s[0]}` }), btn('Sail', () => goTo(PLACES[s[1]][2][0], PLACES[s[1]][2][1]))])));
    const list = (title, items) => { p.append(h3(title)); const u = el('ul'); items.forEach(t => u.append(el('li', { textContent: t }))); p.append(u); };
    list('1. Compare the social issues with present-day realities', ['In San Diego, who decided things and who had no voice? Is it different now?', 'Sisa found no one to help her. Who is in her place today?', 'A school frightened the friars. What keeps young people from a good education now?', 'Open the Then and Now logbook at the lighthouse and fill one row together.']);
    list('2. Debate the vision of Rizal: reform or revolution', ['Motion A: Isagani should not have thrown the lamp into the river.', 'Motion B: A school can free a nation without any fighting.', 'Motion C: Simoun deserves to be called a hero.', 'Two minutes for each side, then one minute to answer back. Each speaker names a character or a scene, then adds a weight to the Scale.']);
    p.append(timerRow());
    list('3. Share creative interpretations', ['Each member talks to a person of the novels and chooses "Act as this character".', 'Press Enter (TALK on a phone) and say one line in that voice. The name over the avatar changes.', 'The group asks the actor: why did your character do it?']);
    list('Reminders', ['Each member answers at least one question post under their own name.', 'Pass the device around so everyone steers the avatar once.', 'Tech Support: start the screen recorder before the first island. Press H to hide the buttons for a clean picture.', 'Before ending, open Output and see what is still empty.']);
  });
}

/* ---------- input ---------- */
const ACT = { menu: showMenu, map: showMap, guide: showGuide, output: showOutput, shot: snap };
$('#bar').addEventListener('click', e => { const b = e.target.closest('button'); if (b) ACT[b.dataset.a](); });
const use = () => { if (nearest && !busy) nearest.act(); };
$('#prompt').onclick = use; $('#bUse').onclick = use; $('#bTalk').onclick = openSay;
const bRun = $('#bRun'); bRun.onclick = () => { running = !running; bRun.classList.toggle('on', running); };
$('#say').addEventListener('keydown', e => { if (e.key === 'Enter') closeSay(true); else if (e.key === 'Escape') closeSay(false); e.stopPropagation(); });
$('#say').addEventListener('blur', () => { if ($('#say').style.display === 'block') closeSay(true); });
function leaveScene() { people.forEach(p => { p.tx = p.ty = null; }); focus = null; scene = null; }
addEventListener('keydown', e => {
  if (!started || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  const k = e.key.toLowerCase();
  if (k === 'escape') { if ($('#panel').style.display === 'flex') closePanel(); else if ($('#dlg').style.display === 'block') { leaveScene(); closeDlg(); } return; }
  if (busy) return;
  keys[k] = true;
  if (k === 'e') use(); else if (k === 'enter') { e.preventDefault(); openSay(); } else if (k === 'm') showMap(); else if (k === 'g') showGuide(); else if (k === 'p') showOutput(); else if (k === 'k') snap(); else if (k === 'h') document.body.classList.toggle('clean');
  if (k.startsWith('arrow') || k === ' ') e.preventDefault();
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
// Drag to look around: dragging left turns the view left, dragging up looks up
(() => {
  let id = null, lx = 0, ly = 0;
  cv.addEventListener('pointerdown', e => { if (id !== null) return; id = e.pointerId; lx = e.clientX; ly = e.clientY; cv.setPointerCapture(id); });
  cv.addEventListener('pointermove', e => { if (e.pointerId !== id) return; cam.yaw -= (e.clientX - lx) * 0.006; cam.pitch = Math.max(0.16, Math.min(1.25, cam.pitch + (e.clientY - ly) * 0.005)); lx = e.clientX; ly = e.clientY; });
  const up = e => { if (e.pointerId === id) id = null; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => { e.preventDefault(); cam.dist = Math.max(6, Math.min(26, cam.dist + Math.sign(e.deltaY) * 1.2)); }, { passive: false });
})();
(() => {
  const j = $('#joy'), kn = $('#knob'); let id = null;
  const move = t => { const r = j.getBoundingClientRect(), R = r.width / 2; let x = (t.clientX - r.left - R) / R, y = (t.clientY - r.top - R) / R; const d = Math.hypot(x, y); if (d > 1) { x /= d; y /= d; } joy.x = x; joy.y = y; kn.style.transform = `translate(${x * R * 0.6}px,${y * R * 0.6}px)`; };
  j.addEventListener('touchstart', e => { e.preventDefault(); const t = e.changedTouches[0]; id = t.identifier; move(t); }, { passive: false });
  j.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === id) move(t); }, { passive: false });
  const end = e => { for (const t of e.changedTouches) if (t.identifier === id) { id = null; joy.x = joy.y = 0; kn.style.transform = ''; } };
  j.addEventListener('touchend', end); j.addEventListener('touchcancel', end);
})();

/* ---------- start ---------- */
const qs = new URLSearchParams(location.search);
const isTouch = qs.get('device') === 'mobile' || (qs.get('device') !== 'pc' && matchMedia('(pointer: coarse)').matches);
document.body.classList.toggle('touch', isTouch);
if (isTouch) cam.dist = 10.5;
$('#how').textContent = isTouch ? 'On a phone: hold it sideways. Drag the screen to look around.' : 'Move: W A S D. Look: drag the mouse. Open things: E.';
function checkOrient() { document.body.classList.toggle('portrait', isTouch && innerHeight > innerWidth); resize(); }
addEventListener('resize', checkOrient); addEventListener('orientationchange', () => setTimeout(checkOrient, 200)); checkOrient();
ROLES.forEach(r => $('#roles').append(el('input', { placeholder: r[0], maxLength: 40, value: save.roles[r[0]] || '', title: r[0] })));
['#e76f51', '#2a9d8f', '#457b9d', '#8e5ea2', '#f4a261', '#3d405b'].forEach(c => { const b = el('button', { type: 'button', style: `background:${c}`, title: 'Avatar colour' }); b.setAttribute('aria-pressed', String(c === save.color)); b.onclick = () => { save.color = c; document.querySelectorAll('#swatches button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); }; $('#swatches').append(b); });
$('#inName').value = save.name;
refreshWorld(); retag();
function begin() {
  save.name = $('#inName').value.trim().slice(0, 24);
  document.querySelectorAll('#roles input').forEach((inp, i) => { save.roles[ROLES[i][0]] = inp.value.trim(); });
  persist();
  world.remove(player.o); player.o = doll('man', save.color, true); world.add(player.o); player.tag = null; retag();
  $('#start').style.display = 'none'; $('#hud').hidden = false; started = true; progress();
  if (isTouch) { try { const d = document.documentElement; (d.requestFullscreen || d.webkitRequestFullscreen || (() => {})).call(d).then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {}); } catch (e) { /* not allowed in this browser */ } }
  if (!Object.keys(save.met).length && !qs.get('go')) setTimeout(() => toast('Walk to The Guide and press ' + (isTouch ? 'USE' : 'E') + ' to begin.'), 600);
}
$('#btnStart').onclick = begin;
$('#inName').addEventListener('keydown', e => { if (e.key === 'Enter') begin(); });
// ?go=x,y,yaw opens the world at a spot (links to a place, and checking the page)
if (qs.get('go')) { const g = qs.get('go').split(',').map(Number); if (g.length >= 2 && !g.some(isNaN)) { player.x = g[0]; player.y = g[1]; cam.x = g[0]; cam.y = g[1]; if (g.length > 2) cam.yaw = g[2]; begin(); } }
requestAnimationFrame(frame);

'use strict';
/* Interface of The Rizal Legacy Experience: navigation, cards, dialogue, stations, moderator console, catalogue. */
const App = (function () {
  const $ = id => document.getElementById(id);
  const el = (tag, props, kids) => { const e = document.createElement(tag); Object.assign(e, props || {}); (kids || []).forEach(k => e.append(k)); return e; };
  const btn = (text, fn, cls) => el('button', { className: cls || '', textContent: text, onclick: fn });

  /* ---------- state, kept in this browser only ---------- */
  const KEY = 'rizalLegacyG2';
  const S = { visitor: '', roles: {}, visited: {}, met: {}, seen: {}, scenes: {}, answers: {}, reflections: [], voices: [], compare: {}, steps: {} };
  try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} refreshHud(); };
  const ROOM_ORDER = ['rotunda', 'n_gallery', 'n_church', 'n_rooms', 'n_theatre', 'f_street', 'f_archive', 'f_chamber', 'f_theatre', 'hall'];
  const EXH_IDS = Object.keys(EXHIBITS);
  let started = false, tags = [], cardClose = null, sheetOpen = false, playing = false, tourI = -1, tourTimer = null, tourAuto = true;
  const wide = () => innerWidth > 760 && innerWidth > innerHeight * 0.9;
  const who = () => S.visitor || 'Visitor';
  const short = id => id.replace(' (child)', '');

  function counts() {
    const names = {};
    Object.keys(S.answers).forEach(k => S.answers[k].forEach(a => { names[a.n] = 1; })); S.reflections.forEach(r => { names[r.n] = 1; }); S.voices.forEach(v => { names[v.n] = 1; });
    const c = {
      rooms: ROOM_ORDER.filter(r => S.visited[r]).length, roomsAll: ROOM_ORDER.length,
      chars: CHARS.filter(c => S.met[c.id]).length, charsAll: CHARS.length,
      exh: EXH_IDS.filter(e => S.seen[e]).length, exhAll: EXH_IDS.length,
      scenes: SCENES.filter(s => S.scenes[s.id]).length, scenesAll: SCENES.length,
      stations: STATIONS.filter(s => (S.answers[s.id] || []).length).length, stationsAll: STATIONS.length,
      compare: COMPARE.filter(r => (S.compare[r.id] || '').trim()).length, compareAll: COMPARE.length,
      refl: S.reflections.length, voices: S.voices.length, people: Object.keys(names).length,
      roles: ROLES.filter(r => (S.roles[r.id] || '').trim()).length
    };
    c.pct = Math.round(100 * (c.rooms + c.chars + c.scenes + c.stations + Math.min(c.refl, 1) + Math.min(c.voices, 1) + Math.min(c.compare, 3)) / (c.roomsAll + c.charsAll + c.scenesAll + c.stationsAll + 5));
    return c;
  }

  /* ---------- HUD, tags, navigation ---------- */
  function refreshHud() {
    if (!started) return;
    const R = W.room, v = R.views[W.viewIndex];
    $('wing').textContent = W.WINGS[R.wing]; $('roomName').textContent = R.title;
    $('viewName').textContent = v.name + '  ·  ' + (W.viewIndex + 1) + ' / ' + R.views.length;
    $('pct').textContent = counts().pct + '%';
    tags.forEach(t => t.node.classList.toggle('done', isDone(t.hot)));
  }
  function isDone(h) {
    return h.kind === 'char' ? !!S.met[h.id] : h.kind === 'exhibit' ? !!S.seen[h.id] : h.kind === 'station' ? (S.answers[h.id] || []).length > 0
      : h.kind === 'door' ? !!S.visited[h.id] : h.kind === 'theatre' ? SCENES.some(s => s.novel === h.id && S.scenes[s.id]) : h.kind === 'reflect' ? S.reflections.length > 0
      : h.kind === 'compare' ? counts().compare > 0 : h.kind === 'voices' ? S.voices.length > 0 : false;
  }
  function buildTags() {
    const box = $('tags'); box.innerHTML = '';
    tags = W.room.hots.map(h => {
      const node = el('button', { className: 'tag k-' + h.kind, onclick: () => act(h) }, [el('i'), el('span', { textContent: h.label })]);
      box.append(node); return { hot: h, node: node };
    });
    refreshHud();
  }
  // the player may walk only when nothing is open; the nearest marker within reach can be used with E
  const free = () => started && !sheetOpen && !playing && !document.body.classList.contains('card-open') && tourI < 0;
  W.setGate(free);
  let near = null;
  function useNear() { if (free() && near) act(near.hot); }
  W.tickers.push(() => {
    let best = null, bd = 2.9 * 2.9;
    if (free()) tags.forEach(t => { const dx = t.hot.pos.x - W.player.x, dz = t.hot.pos.z - W.player.z, d = dx * dx + dz * dz; if (d < bd) { bd = d; best = t; } });
    if (best !== near) { if (near) near.node.classList.remove('near'); near = best; if (near) near.node.classList.add('near'); $('use').textContent = near ? 'E  ·  ' + near.hot.label : ''; $('use').classList.toggle('on', !!near); }
  });
  W.tickers.push(() => {
    const hide = !started || sheetOpen || playing || document.body.classList.contains('card-open') || tourI >= 0;
    tags.forEach(t => {
      const p = hide ? null : W.project(t.hot.pos);
      if (!p || !p.vis) { t.node.style.display = 'none'; return; }
      t.node.style.display = ''; t.node.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px)';
      t.node.classList.toggle('far', p.dist > 9.5 && t.hot.kind !== 'door');
    });
  });
  function curtain(kicker, title, mid) {
    const c = $('curtain'); $('curKicker').textContent = kicker; $('curTitle').textContent = title; c.classList.add('on');
    setTimeout(() => { mid(); setTimeout(() => c.classList.remove('on'), 650); }, 620);
  }
  function arrive() { S.visited[W.room.id] = 1; buildTags(); save(); }
  function travel(roomId, view, then) {
    closeCard(); closeSheet(); stopScene();
    if (W.room.id === roomId) { W.setView(view || 0); refreshHud(); if (then) then(); return; }
    const R = W.rooms[roomId];
    curtain(W.WINGS[R.wing], R.title, () => { W.setRoom(roomId, view || 0); arrive(); if (then) then(); });
  }
  function stepView(d) { if (!started || playing) return; closeCard(); W.setView(W.viewIndex + d); refreshHud(); }
  function act(h) {
    ({ door: () => travel(h.id, h.view), char: () => openChar(h.id), exhibit: () => openExhibit(h.id), station: () => openStation(h.id), theatre: () => openProgramme(h.id),
       reflect: openReflect, compare: openCompare, voices: openVoices, moderator: openModerator, catalogue: openCatalogue, registry: openRegistry, rubric: openRubric })[h.kind]();
  }

  /* ---------- side card ---------- */
  function openCard(kicker, title, build, onClose) {
    closeCard(); closeSheet();
    const body = $('cardBody'); body.innerHTML = ''; $('cardKicker').textContent = kicker; $('cardTitle').textContent = title;
    build(body); cardClose = onClose || null;
    $('card').classList.add('on'); document.body.classList.add('card-open'); $('card').scrollTop = 0;
  }
  function closeCard() {
    if (!document.body.classList.contains('card-open')) return;
    $('card').classList.remove('on'); document.body.classList.remove('card-open'); hideDlg();
    const f = cardClose; cardClose = null; if (f) f();
  }
  const para = (b, text, cls) => b.append(el('p', { className: cls || '', textContent: text }));
  const head = (b, text) => b.append(el('h3', { textContent: text }));
  function tabs(b, defs) {
    const bar = el('div', { className: 'tabs' }), pane = el('div', { className: 'pane' });
    defs.forEach((d, i) => { const t = btn(d[0], () => { bar.querySelectorAll('button').forEach(x => x.classList.remove('on')); t.classList.add('on'); pane.innerHTML = ''; d[1](pane); }); bar.append(t); if (!i) setTimeout(() => t.click(), 0); });
    b.append(bar, pane);
  }
  function nameField(val) { return el('input', { value: val || who(), placeholder: 'Name of the member', maxLength: 40 }); }

  /* ---------- characters ---------- */
  function openChar(id) {
    const c = CHARS.find(x => x.id === id), f = W.figures[id];
    S.met[id] = 1; save();
    W.wake(id, true, false); W.focusFigure(f, wide() ? 0.85 : 0);
    openCard((c.novel === 'noli' ? 'Noli Me Tangere' : 'El Filibusterismo') + '  ·  ' + c.epithet, short(id), b => {
      b.append(el('img', { className: 'portrait', src: W.portraitCanvas(id).toDataURL(), alt: '' }));
      tabs(b, [
        ['Biography', p => para(p, c.bio)],
        ['Role', p => para(p, c.role)],
        ['Traits', p => { const u = el('div', { className: 'chips' }); c.traits.forEach(t => u.append(el('span', { textContent: t }))); p.append(u); }],
        ['Context', p => para(p, c.context)],
        ['Converse', p => {
          para(p, 'Ask a question. The figure answers in lines written by the group from the events of the novel.', 'note');
          c.ask.forEach(qa => p.append(btn(qa[0], () => { W.wake(id, true, true); showDlg(short(id), qa[1], 'In answer to: ' + qa[0], [], () => W.wake(id, true, false)); }, 'ask')));
        }],
        ['Perform', p => {
          para(p, 'Character Voice: speak as ' + short(id) + '. What would this character say to Filipinos today? The line is kept in the Character Voices table of the Reflection Hall.', 'note');
          const n = nameField(S.roles.voice), t = el('textarea', { placeholder: 'Write the line in the voice of the character…', maxLength: 300 });
          p.append(n, t, btn('Perform the line', () => {
            const v = t.value.trim(); if (!v) return;
            const nm = n.value.trim() || who(); S.voices.push({ c: short(id), n: nm, t: v }); save(); t.value = '';
            W.wake(id, true, true); showDlg(nm + ' as ' + short(id), v, 'A creative interpretation by the group', [], () => W.wake(id, true, false));
          }, 'primary'));
        }]
      ]);
    }, () => { W.wake(id, false, false); W.release(); });
  }

  /* ---------- dialogue bar with typed text ---------- */
  let typing = null;
  function showDlg(speaker, text, meta, buttons, onTyped) {
    const d = $('dlg'), t = $('dlgText'); d.classList.add('on'); $('dlgWho').textContent = speaker; $('dlgMeta').textContent = meta || '';
    const bb = $('dlgBtns'); bb.innerHTML = ''; (buttons || []).forEach(x => bb.append(btn(x[0], x[1], x[2])));
    clearInterval(typing); let i = 0; t.textContent = '';
    const end = () => { clearInterval(typing); typing = null; t.textContent = text; if (onTyped) onTyped(); };
    typing = setInterval(() => { i += 2; t.textContent = text.slice(0, i); if (i >= text.length) end(); }, 24);
    t.onclick = () => { if (typing) end(); };
  }
  function hideDlg() { clearInterval(typing); typing = null; $('dlg').classList.remove('on'); }

  /* ---------- exhibits ---------- */
  function openExhibit(id) {
    const e = EXHIBITS[id]; S.seen[id] = 1; save();
    openCard(e.k, e.t, b => { e.b.forEach(t => para(b, t)); head(b, 'Why it matters'); para(b, e.w, 'lead'); });
  }

  /* ---------- key scenes ---------- */
  function openProgramme(novel) {
    openCard(novel === 'noli' ? 'Noli Me Tangere' : 'El Filibusterismo', 'Programme of key scenes', b => {
      para(b, 'Choose a scene. The cast takes the stage, and the group reads it line by line. Each scene ends with its key lesson and a question for discussion.', 'note');
      SCENES.filter(s => s.novel === novel).forEach(s => {
        b.append(el('div', { className: 'item' + (S.scenes[s.id] ? ' done' : '') }, [
          el('div', {}, [el('b', { textContent: s.title }), el('small', { textContent: s.ref + '  ·  ' + s.cast.length + ' on stage' })]), btn('Play', () => playScene(s), 'primary')]));
      });
    });
  }
  function playScene(s) {
    closeCard(); playing = true; document.body.classList.add('playing');
    W.fixView(1); W.stage(s); refreshHud();
    const pages = [['Context', s.setting + '\n\n' + s.context + '\n\nOn stage: ' + s.cast.map(short).join(', ') + '.', null]]
      .concat(s.lines.map(l => [short(l[0]), l[1], l[0]]), [['Key lesson', s.lesson, null], ['For discussion', s.q, null]]);
    let i = 0;
    const show = () => {
      const p = pages[i]; W.stageSpeak(p[2]);
      if (i === pages.length - 1) { S.scenes[s.id] = 1; save(); }
      showDlg(p[0], p[1], s.title + '  ·  ' + s.ref + '  ·  ' + (i + 1) + ' / ' + pages.length + '  ·  lines adapted by the group', [
        ['Back', () => { if (i > 0) { i--; show(); } }, ''], [i === pages.length - 1 ? 'Close the scene' : 'Next', () => { if (i < pages.length - 1) { i++; show(); } else stopScene(); }, 'primary'], ['Exit', stopScene, '']]);
    };
    show();
  }
  function stopScene() {
    if (!playing) return;
    playing = false; document.body.classList.remove('playing'); hideDlg(); W.stageClear(); W.setBackdrop(W.room, null); W.release(); refreshHud();
  }

  /* ---------- lists of submitted text ---------- */
  function entries(b, list, fmt, onChange) {
    const box = el('div', { className: 'entries' }); b.append(box);
    const draw = () => {
      box.innerHTML = '';
      if (!list.length) box.append(el('p', { className: 'note', textContent: 'Nothing submitted yet.' }));
      list.forEach((it, i) => box.append(el('div', { className: 'entry' }, [el('p', { textContent: fmt(it)[1] }), el('small', { textContent: fmt(it)[0] }),
        el('button', { className: 'x', textContent: '×', title: 'Remove', onclick: () => { list.splice(i, 1); save(); draw(); if (onChange) onChange(); } })])));
    };
    draw(); return draw;
  }
  const localNote = b => para(b, 'Saved in this browser on this device only. There is no shared server: the group contributes from one screen.', 'note');

  function openStation(id) {
    const s = STATIONS.find(x => x.id === id), list = S.answers[id] = S.answers[id] || [];
    openCard('Discussion station ' + s.no, s.topic, b => {
      para(b, s.context);
      const ch = el('div', { className: 'chips' }); s.chars.forEach(c => ch.append(el('span', { textContent: c }))); b.append(ch);
      head(b, 'Question'); para(b, s.q, 'lead');
      head(b, 'Responses of the group');
      const draw = entries(b, list, a => ['— ' + a.n, a.t]);
      const n = nameField(), t = el('textarea', { placeholder: 'Type the response…', maxLength: 600 });
      b.append(n, t, btn('Submit response', () => { const v = t.value.trim(); if (!v) return; list.push({ n: n.value.trim() || who(), t: v }); t.value = ''; save(); draw(); }, 'primary'));
      localNote(b);
    });
  }
  function openReflect() {
    openCard('Reflection zone', 'Wall of Reflections', b => {
      para(b, 'Choose a prompt, or write freely. Each reflection is placed on the wall of the library.', 'note');
      let pick = REFLECT[0];
      const ps = el('div', { className: 'prompts' });
      REFLECT.forEach((p, i) => { const x = btn(p, () => { pick = p; ps.querySelectorAll('button').forEach(y => y.classList.remove('on')); x.classList.add('on'); }, i ? '' : 'on'); ps.append(x); });
      const n = nameField(), t = el('textarea', { placeholder: 'My reflection…', maxLength: 420 });
      b.append(ps, n, t, btn('Place on the wall', () => { const v = t.value.trim(); if (!v) return; S.reflections.push({ n: n.value.trim() || who(), p: pick, t: v }); t.value = ''; save(); W.drawWall(S.reflections); draw(); }, 'primary'));
      head(b, 'On the wall');
      const draw = entries(b, S.reflections, r => ['— ' + r.n + '  ·  ' + r.p, r.t], () => W.drawWall(S.reflections));
      localNote(b);
    });
  }
  function openCompare() {
    openCard('Collaboration table', 'Then and Now', b => {
      para(b, 'For each social issue in the novels, the group writes a present-day reality that matches it. Be specific: a place, a practice, a recent event.', 'note');
      COMPARE.forEach(r => {
        const t = el('textarea', { value: S.compare[r.id] || '', placeholder: 'Today: …', maxLength: 300 });
        t.onchange = () => { S.compare[r.id] = t.value; save(); };
        b.append(el('div', { className: 'cmp' }, [el('b', { textContent: r.issue }), el('p', { textContent: 'In the novels: ' + r.novel }), t]));
      });
      b.append(btn('Save the table', () => { b.querySelectorAll('textarea').forEach(t => t.onchange()); toast('Table saved'); }, 'primary'));
      localNote(b);
    });
  }
  function openVoices() {
    openCard('Collaboration table', 'Character Voices', b => {
      para(b, 'Lines the group has performed in character. To add one, select any figure in the museum and choose Perform.', 'note');
      entries(b, S.voices, v => ['— ' + v.n + ', speaking as ' + v.c, v.t]);
    });
  }
  function openRegistry() {
    openCard('The group', 'Members and roles', b => {
      const v = el('input', { value: S.visitor, placeholder: 'Name shown on this device', maxLength: 40 }); b.append(el('label', { textContent: 'Visitor' }), v);
      const ins = ROLES.map(r => { const i = el('input', { value: S.roles[r.id] || '', placeholder: 'Name', maxLength: 40 }); b.append(el('label', { textContent: r.name }), i, el('p', { className: 'note', textContent: r.duty })); return [r.id, i]; });
      b.append(btn('Save', () => { S.visitor = v.value.trim(); ins.forEach(x => { S.roles[x[0]] = x[1].value.trim(); }); save(); roster(); toast('The plaque has been updated'); }, 'primary'));
    });
  }
  const roster = () => W.drawRoster(ROLES.map(r => r.name + ':  ' + (S.roles[r.id] || '—')));
  function evidence() {
    const c = counts();
    return [
      c.rooms + ' of ' + c.roomsAll + ' rooms visited across three wings; ' + c.exh + ' of ' + c.exhAll + ' displays read, including the symbols (lamp, Bapor Tabo, chest of jewels).',
      c.chars + ' of ' + c.charsAll + ' characters consulted; ' + c.scenes + ' of ' + c.scenesAll + ' key scenes played, each with its chapter reference.',
      c.roles + ' of 5 roles assigned; ' + c.people + ' different members have contributed text; ' + c.voices + ' lines performed in character.',
      c.refl + ' reflections on the wall; ' + c.stations + ' of ' + c.stationsAll + ' stations answered; ' + c.compare + ' of ' + c.compareAll + ' rows of Then and Now completed.'
    ];
  }
  function rubricBlock(b) {
    const ev = evidence();
    RUBRIC.forEach((r, i) => b.append(el('div', { className: 'rub' }, [el('b', { textContent: r.name + '  (' + r.pct + '%)' }), el('p', { textContent: r.ask }), el('small', { textContent: 'Evidence so far: ' + ev[i] })])));
  }
  function openRubric() { openCard('Assessment criteria', 'How the work is judged', b => { rubricBlock(b); para(b, 'The percentages are those set by the teacher. The evidence lines only count what the group has done here; they are not a grade.', 'note'); }); }

  /* ---------- full-screen sheets: map, moderator, catalogue ---------- */
  function openSheet(kicker, title, build) {
    closeCard(); stopScene(); sheetOpen = true;
    const b = $('sheetBody'); b.innerHTML = ''; $('sheetKicker').textContent = kicker; $('sheetTitle').textContent = title; build(b);
    $('sheet').classList.add('on'); $('sheet').scrollTop = 0;
  }
  function closeSheet() { sheetOpen = false; $('sheet').classList.remove('on'); }
  function openMap() {
    openSheet('Plan of the museum', 'Where would you like to go?', b => {
      const c = counts();
      para(b, c.pct + '% of the visit completed  ·  ' + c.rooms + '/' + c.roomsAll + ' rooms  ·  ' + c.chars + '/' + c.charsAll + ' characters  ·  ' + c.scenes + '/' + c.scenesAll + ' scenes  ·  ' + c.stations + '/' + c.stationsAll + ' stations  ·  ' + c.refl + ' reflections', 'lead');
      const wing = (cls, name, ids) => {
        const row = el('div', { className: 'wing ' + cls }, [el('h3', { textContent: name })]), line = el('div', { className: 'nodes' });
        ids.forEach(id => {
          const R = W.rooms[id], chars = R.hots.filter(h => h.kind === 'char'), ex = R.hots.filter(h => h.kind === 'exhibit');
          const bits = []; if (chars.length) bits.push(chars.filter(h => S.met[h.id]).length + '/' + chars.length + ' figures'); if (ex.length) bits.push(ex.filter(h => S.seen[h.id]).length + '/' + ex.length + ' displays');
          line.append(el('button', { className: 'node' + (S.visited[id] ? ' seen' : '') + (W.room.id === id ? ' here' : ''), onclick: () => travel(id, 0) },
            [el('b', { textContent: R.title }), el('small', { textContent: (W.room.id === id ? 'You are here' : S.visited[id] ? 'Visited' : 'Not yet visited') + (bits.length ? '  ·  ' + bits.join(', ') : '') })]));
        });
        row.append(line); b.append(row);
      };
      wing('hub', 'Entrance', ['rotunda']);
      wing('noli', 'Wing I  ·  Historical Gallery  ·  Noli Me Tangere', ['n_gallery', 'n_church', 'n_rooms', 'n_theatre']);
      wing('fili', 'Wing II  ·  Revolutionary Archives  ·  El Filibusterismo', ['f_street', 'f_archive', 'f_chamber', 'f_theatre']);
      wing('hallw', 'Wing III  ·  Reflection and Collaboration Hall', ['hall']);
    });
  }

  let timerEnd = 0, timerInt = null;
  function startTimer(sec) {
    clearInterval(timerInt); const chip = $('timer');
    if (!sec) { chip.classList.remove('on'); return; }
    timerEnd = Date.now() + sec * 1000; chip.classList.add('on');
    const tick = () => { const r = Math.max(0, Math.round((timerEnd - Date.now()) / 1000)); chip.textContent = 'Debate  ' + Math.floor(r / 60) + ':' + ('0' + r % 60).slice(-2); chip.classList.toggle('over', r === 0); if (!r) clearInterval(timerInt); };
    tick(); timerInt = setInterval(tick, 500);
  }
  function openModerator() {
    openSheet('For the Moderator', 'Moderator Console', b => {
      const list = (p, arr) => { const u = el('ul'); arr.forEach(t => u.append(el('li', { textContent: t }))); p.append(u); };
      tabs(b, [
        ['Sequence', p => {
          para(p, 'Seven stops. Tick each one as the group completes it.', 'note');
          MOD.sequence.forEach((s, i) => {
            const cb = el('input', { type: 'checkbox', checked: !!S.steps[i] }); cb.onchange = () => { S.steps[i] = cb.checked ? 1 : 0; save(); };
            p.append(el('div', { className: 'item' }, [el('label', { className: 'step' }, [cb, el('div', {}, [el('b', { textContent: (i + 1) + '. ' + s.t }), el('small', { textContent: s.d })])]), btn('Take the group there', () => travel(s.room, s.view), 'primary')]));
          });
        }],
        ['Questions', p => MOD.questions.forEach(q => { head(p, q[0]); list(p, q[1]); })],
        ['Debate', p => {
          head(p, 'Reform versus revolution: motions'); list(p, MOD.debate.motions); head(p, 'Format'); list(p, MOD.debate.format); head(p, 'Timer');
          para(p, 'The timer stays on screen after this console is closed.', 'note');
          p.append(el('div', { className: 'row' }, [btn('2:00 opening', () => startTimer(120), 'primary'), btn('1:00 rebuttal', () => startTimer(60), 'primary'), btn('Stop', () => startTimer(0))]));
        }],
        ['Compare the novels', p => {
          const t = el('table'); t.append(el('tr', {}, [el('th'), el('th', { textContent: 'Noli Me Tangere' }), el('th', { textContent: 'El Filibusterismo' })]));
          MOD.compare.forEach(r => t.append(el('tr', {}, r.map((c, i) => el(i ? 'td' : 'th', { textContent: c })))));
          p.append(t); para(p, 'Ask the group: which single difference explains all the others? Then open the Then and Now table in the Reflection Hall.', 'lead');
          p.append(btn('Go to the Then and Now table', () => travel('hall', 4, openCompare), 'primary'));
        }],
        ['Reminders', p => { head(p, 'Participation'); list(p, MOD.reminders); head(p, 'Roles'); ROLES.forEach(r => para(p, r.name + (S.roles[r.id] ? ' (' + S.roles[r.id] + ')' : '') + ': ' + r.duty)); }],
        ['Reflection prompts', p => { list(p, MOD.prompts); p.append(btn('Go to the Wall of Reflections', () => travel('hall', 1, openReflect), 'primary')); }]
      ]);
    });
  }

  function catalogueText() {
    const c = counts(), L = [], ev = evidence();
    L.push('THE RIZAL LEGACY EXPERIENCE', 'Rizal in the Metaverse: exhibition catalogue of the group', '');
    L.push('THE GROUP'); ROLES.forEach(r => L.push('  ' + r.name + ': ' + (S.roles[r.id] || '-'))); L.push('');
    L.push('THE VIRTUAL ENVIRONMENT', '  A museum with a central rotunda and three wings.',
      '  Wing I, Historical Gallery (Noli Me Tangere): gallery with a scale model of the San Diego plaza, church interior, classroom and ancestral sala, scene theatre.',
      '  Wing II, Revolutionary Archives (El Filibusterismo): colonial street by night, archive room, underground chamber with planning room, scene theatre.',
      '  Wing III, Reflection and Collaboration Hall: discussion tables, Wall of Reflections, moderator lectern, catalogue desk.', '');
    L.push('ACTIVITIES COMPLETED (' + c.pct + '%)', '  Rooms visited: ' + ROOM_ORDER.filter(r => S.visited[r]).map(r => W.rooms[r].title).join('; '),
      '  Characters consulted (' + c.chars + '/' + c.charsAll + '): ' + CHARS.filter(x => S.met[x.id]).map(x => x.id).join(', '), '  Displays read: ' + c.exh + '/' + c.exhAll, '');
    L.push('KEY SCENES'); SCENES.forEach(s => L.push('  [' + (S.scenes[s.id] ? 'x' : ' ') + '] ' + s.title + ' (' + s.ref + ')')); L.push('');
    L.push('DISCUSSION STATIONS'); STATIONS.forEach(s => { L.push('  ' + s.no + '. ' + s.topic, '     Q: ' + s.q); const a = S.answers[s.id] || []; if (!a.length) L.push('     (no response yet)'); a.forEach(x => L.push('     - ' + x.n + ': ' + x.t)); }); L.push('');
    L.push('THEN AND NOW'); COMPARE.forEach(r => L.push('  ' + r.issue, '     In the novels: ' + r.novel, '     Today: ' + ((S.compare[r.id] || '').trim() || '(not yet written)'))); L.push('');
    L.push('CHARACTER VOICES'); if (!S.voices.length) L.push('  (none yet)'); S.voices.forEach(v => L.push('  - ' + v.n + ' as ' + v.c + ': ' + v.t)); L.push('');
    L.push('REFLECTIONS'); if (!S.reflections.length) L.push('  (none yet)'); S.reflections.forEach(r => L.push('  - ' + r.n + ': ' + r.t, '    (prompt: ' + r.p + ')')); L.push('');
    L.push('ASSESSMENT CRITERIA AND EVIDENCE'); RUBRIC.forEach((r, i) => L.push('  ' + r.name + ' (' + r.pct + '%): ' + r.ask, '     ' + ev[i]));
    return L.join('\n');
  }
  function download(name, blob) { const a = el('a', { href: URL.createObjectURL(blob), download: name }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000); }
  function shot() { W.snapshot(b => { download('rizal-legacy-' + Date.now() + '.png', b); toast('Image saved to Downloads (3D view, without on-screen text)'); }); }
  function openCatalogue() {
    openSheet('Creative output', 'Exhibition Catalogue', b => {
      const c = counts();
      para(b, 'A record of what the group built, visited, discussed and wrote. ' + c.pct + '% of the visit is complete.', 'lead');
      b.append(el('div', { className: 'row' }, [btn('Start the guided walkthrough', startTour, 'primary'), btn('Capture a screenshot', () => { closeSheet(); setTimeout(shot, 500); }, 'primary'),
        btn('Download the catalogue (.txt)', () => download('rizal-legacy-catalogue.txt', new Blob([catalogueText()], { type: 'text/plain' }))), btn('Print', () => window.print())]));
      head(b, 'Recording the walkthrough');
      para(b, 'This museum does not record video itself. Start a screen recorder first (Windows: Win + Alt + R; Android and iPhone: the screen-record button in quick settings), then start the guided walkthrough. It moves through all three wings with captions, pausing at each stop while the group speaks. Use Pause, Next and Back to keep pace.');
      head(b, 'Summary for presentation'); b.append(el('pre', { id: 'catText', textContent: catalogueText() }));
      head(b, 'Assessment criteria'); rubricBlock(b);
    });
  }

  /* ---------- guided walkthrough ---------- */
  function startTour() { closeSheet(); closeCard(); stopScene(); document.body.classList.add('touring'); tourAuto = true; tourGo(0); }
  function tourGo(i) {
    clearTimeout(tourTimer);
    if (i < 0 || i >= TOUR.length) { tourI = -1; document.body.classList.remove('touring'); if (i >= TOUR.length) openCatalogue(); return; }
    tourI = i; const s = TOUR[i];
    $('tourCap').textContent = s[2]; $('tourN').textContent = (i + 1) + ' / ' + TOUR.length; $('tourAuto').textContent = tourAuto ? 'Pause' : 'Resume';
    travel(s[0], s[1]);
    if (tourAuto) tourTimer = setTimeout(() => tourGo(tourI + 1), 9000);
  }

  function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 3200); }

  /* ---------- start ---------- */
  function enter() {
    S.visitor = $('inVisitor').value.trim() || S.visitor || 'Visitor';
    ROLES.forEach(r => { S.roles[r.id] = $('in_' + r.id).value.trim(); });
    started = true; W.cam.attract = false; document.body.classList.add('started');
    roster(); W.setView(0, true); arrive();
    // phones: full screen hides the address bar; the landscape lock works only where the browser allows it
    const root = document.documentElement;
    if (document.body.classList.contains('touch') && root.requestFullscreen) root.requestFullscreen().then(() => screen.orientation.lock('landscape')).catch(() => {});
    setTimeout(() => toast(document.body.classList.contains('touch') ? 'Walk with the stick. Drag to look. Tap a gold marker to open it.' : 'Walk with W A S D or the arrow keys. Drag to look. Press E at a gold marker.'), 900);
  }
  function boot() {
    // touch layout: detected from the device, or forced with ?device=mobile / ?device=pc
    const q = new URLSearchParams(location.search), dev = q.get('device');
    document.body.classList.toggle('touch', dev ? dev === 'mobile' : matchMedia('(pointer: coarse)').matches);
    const orient = () => document.body.classList.toggle('portrait', innerHeight > innerWidth);
    addEventListener('resize', orient); addEventListener('orientationchange', orient); orient();
    $('notPhone').onclick = () => document.body.classList.remove('touch');
    W.init($('gl')); W.drawWall(S.reflections); roster();
    const form = $('roleFields'); ROLES.forEach(r => form.append(el('label', { textContent: r.name }), el('input', { id: 'in_' + r.id, value: S.roles[r.id] || '', placeholder: 'Name of the member', maxLength: 40 })));
    $('inVisitor').value = S.visitor;
    $('btnBegin').onclick = () => $('intro').classList.add('step2');
    $('btnEnter').onclick = enter;
    $('cardClose').onclick = closeCard; $('sheetClose').onclick = closeSheet;
    $('navPrev').onclick = () => stepView(-1); $('navNext').onclick = () => stepView(1);
    $('btnMap').onclick = openMap; $('btnMod').onclick = openModerator; $('btnCat').onclick = openCatalogue;
    $('tourPrev').onclick = () => tourGo(Math.max(0, tourI - 1)); $('tourNext').onclick = () => tourGo(tourI + 1); $('tourEnd').onclick = () => tourGo(-1);
    $('tourAuto').onclick = () => { tourAuto = !tourAuto; tourGo(tourI); };
    addEventListener('keydown', e => {
      if (!started || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) { if (e.key === 'Escape') document.activeElement.blur(); return; }
      if (e.key === 'Escape') { if (sheetOpen) closeSheet(); else if (playing) stopScene(); else closeCard(); }
      else if (e.key.toLowerCase() === 'e') useNear();
      else if (e.key.toLowerCase() === 'm') openMap();
    });
    $('use').onclick = useNear;
    // touch stick: up and down walk, left and right turn
    const stick = $('stick'), knob = $('knob'), opt = { passive: false };
    const move = e => {
      const t = e.targetTouches[0], r = stick.getBoundingClientRect();
      let dx = (t.clientX - r.left - r.width / 2) / 44, dy = (t.clientY - r.top - r.height / 2) / 44;
      const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
      W.input.t = Math.abs(dx) > 0.2 ? -dx : 0; W.input.f = -dy; W.input.run = l > 0.92;
      knob.style.transform = 'translate(' + dx * 34 + 'px,' + dy * 34 + 'px)'; e.preventDefault();
    };
    const rest = () => { W.input.f = W.input.t = 0; W.input.run = false; knob.style.transform = ''; };
    stick.addEventListener('touchstart', move, opt); stick.addEventListener('touchmove', move, opt); stick.addEventListener('touchend', rest); stick.addEventListener('touchcancel', rest);
    // a link ending in ?room=<id>&view=<n> opens the museum directly in that room
    const r = q.get('room');
    if (r && W.rooms[r]) { enter(); W.setRoom(r, +q.get('view') || 0); arrive(); }
  }
  boot();
  return { S: S, counts: counts, travel: travel, act: act, openMap: openMap, openModerator: openModerator, openCatalogue: openCatalogue, catalogueText: catalogueText, playScene: playScene, stopScene: stopScene, startTour: startTour, tourGo: tourGo };
})();

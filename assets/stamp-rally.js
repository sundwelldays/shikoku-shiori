/* ===== 旅のしおり 共通スタンプラリー モジュール =====
 * 2モード:
 *   mode:'select' … 各旅程タブ。行きたいスポットを選ぶUI。選択は共有ストアに保存され「マイスタンプ帳」へ集約。
 *   mode:'master' … 専用タブ。選ばれた全スポットを集約表示し、現地で位置情報/タップでスタンプ取得。地図ピン・称号・シェア。
 *
 * 共有ストア(localStorage, 同一オリジンで全タブ共有):
 *   sr_sel = { "tab:id": {tab,tabLabel,id,name,short,icon,cat,lat,lng} }   // 選択中スポット
 *   sr_got = { "tab:id": ISO日時 }                                          // 取得済みスタンプ
 *
 * select設定: { mode:'select', key(tab), tabLabel, accent, accentDeep, spots:[{id,name,short,icon,cat,lat,lng}] }
 * master設定: { mode:'master', title, subtitle, accent, accentDeep, radius, completeTitle, shareText }
 */
(function () {
  var cfg = window.STAMP_RALLY_CONFIG;
  var mount = document.getElementById('stamp-rally');
  if (!cfg || !mount) return;

  var MODE = cfg.mode || 'select';
  var ACCENT = cfg.accent || '#7E9A82';
  var ACCENT_DEEP = cfg.accentDeep || '#2A4D66';
  var RADIUS = cfg.radius || 700;
  var SEL = 'sr_sel', GOT = 'sr_got';

  function rd(k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } }
  function wr(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function gid(tab, id) { return tab + ':' + id; }
  function fmtDate(iso) { try { var d = new Date(iso); return (d.getMonth() + 1) + '/' + d.getDate(); } catch (e) { return ''; } }
  function fmtKm(m) { return m >= 1000 ? (m / 1000).toFixed(1) + 'km' : Math.round(m) + 'm'; }
  function dist(la1, lo1, la2, lo2) {
    var R = 6371000, t = Math.PI / 180;
    var dla = (la2 - la1) * t, dlo = (lo2 - lo1) * t;
    var a = Math.sin(dla / 2) * Math.sin(dla / 2) + Math.cos(la1 * t) * Math.cos(la2 * t) * Math.sin(dlo / 2) * Math.sin(dlo / 2);
    return 2 * R * Math.asin(Math.sqrt(a));
  }
  /* Shikoku-only map projection (matches shikoku_shiori_stamp.html の SVG viewBox 0 0 340 257.7) */
  function projX(lng) { return Math.max(8, Math.min(332, (lng - 132.0) * 119.30)); }
  function projY(lat) { return Math.max(8, Math.min(250, (34.45 - lat) * 143.13)); }

  /* ---------- CSS (一度だけ) ---------- */
  if (!document.getElementById('srally-css')) {
    var st = document.createElement('style');
    st.id = 'srally-css';
    st.textContent = [
      '.srally{--sr-a:#7E9A82;--sr-d:#2A4D66;max-width:480px;margin:0 auto;padding:0 22px;font-family:inherit;}',
      '.sr-label{font-size:11px;letter-spacing:4px;color:var(--sr-d);margin-bottom:6px;opacity:.85;}',
      '.sr-title{font-family:"Shippori Mincho",serif;font-size:23px;font-weight:600;letter-spacing:.05em;line-height:1.35;}',
      '.sr-title span{display:block;font-family:"Caveat",cursive;font-size:18px;color:var(--sr-a);font-weight:500;letter-spacing:0;margin-top:1px;}',
      '.sr-progress{display:flex;align-items:center;gap:16px;margin:18px 0 14px;background:#fff;border:1px solid rgba(0,0,0,.06);border-radius:16px;padding:16px;box-shadow:0 2px 12px rgba(40,55,50,.06);}',
      '.sr-ring{width:64px;height:64px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:conic-gradient(var(--sr-a) calc(var(--p)*1%),#EDEAE2 0);}',
      '.sr-ring i{width:50px;height:50px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-family:"Shippori Mincho",serif;font-weight:700;font-size:15px;color:var(--sr-d);font-style:normal;}',
      '.sr-pinfo{flex:1;}',
      '.sr-pinfo b{font-size:15px;color:var(--sr-d);}',
      '.sr-pinfo .sub{font-size:11.5px;color:#8a8a82;margin-left:4px;}',
      '.sr-bar{height:8px;border-radius:6px;background:#EDEAE2;margin-top:8px;overflow:hidden;}',
      '.sr-bar i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,var(--sr-a),var(--sr-d));transition:width .5s ease;}',
      '.sr-btn{width:100%;border:0;border-radius:14px;padding:13px;font-size:14px;font-weight:700;letter-spacing:.04em;color:#fff;background:var(--sr-d);box-shadow:0 4px 14px rgba(40,55,50,.18);cursor:pointer;margin-bottom:8px;font-family:inherit;}',
      '.sr-btn.alt{background:#fff;color:var(--sr-d);border:1.5px solid var(--sr-a);box-shadow:none;}',
      '.sr-btn:active{opacity:.8;}',
      '.sr-btn[disabled]{opacity:.6;}',
      '.sr-hint{font-size:11px;color:#9a988e;text-align:center;margin:2px 0 16px;line-height:1.7;}',
      '.sr-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px;}',
      '.sr-tile{position:relative;border:1.5px dashed #DCD8CE;background:#fff;border-radius:14px;padding:12px 6px 10px;box-shadow:0 2px 10px rgba(40,55,50,.06);cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:5px;font-family:inherit;min-height:104px;justify-content:center;}',
      '.sr-stamp{width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;background:#F1EEE7;color:#B9B4A8;border:2px dashed #CFC9BC;filter:grayscale(1);opacity:.6;transition:transform .35s cubic-bezier(.3,1.4,.5,1),filter .3s,opacity .3s;}',
      '.sr-tile{opacity:.92;}',
      '.sr-tile.on{border:1.5px solid var(--sr-a);opacity:1;background:#fff;}',
      '.sr-tile.on .sr-stamp{background:var(--sr-a);color:#fff;border:2px solid #fff;box-shadow:0 0 0 2px var(--sr-a);filter:none;opacity:1;}',
      '.sr-tile.pop .sr-stamp{animation:srpop .5s cubic-bezier(.3,1.4,.5,1);}',
      '@keyframes srpop{0%{transform:scale(0) rotate(-25deg);}60%{transform:scale(1.25) rotate(8deg);}100%{transform:scale(1) rotate(0);}}',
      '.sr-name{font-size:11px;font-weight:600;color:#3c3c36;line-height:1.3;text-align:center;}',
      '.sr-sub{font-size:10px;font-weight:700;color:#b3afa4;min-height:12px;}',
      '.sr-tile.on .sr-sub{color:var(--sr-d);}',
      '.sr-cat{position:absolute;top:6px;left:6px;font-size:8.5px;font-weight:700;color:var(--sr-d);background:rgba(255,255,255,.85);border-radius:5px;padding:1px 5px;}',
      '.sr-chk{position:absolute;top:6px;right:6px;width:18px;height:18px;border-radius:50%;background:var(--sr-a);color:#fff;font-size:11px;font-weight:700;display:none;align-items:center;justify-content:center;}',
      '.sr-tile.on .sr-chk{display:flex;}',
      '.sr-group{margin-bottom:6px;}',
      '.sr-group h4{font-size:12px;color:var(--sr-d);font-weight:700;letter-spacing:.04em;margin:14px 0 8px;display:flex;align-items:center;gap:6px;}',
      '.sr-group h4 .ln{flex:1;height:1px;background:#E4E0D6;}',
      '.sr-badges{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 16px;}',
      '.sr-badge{flex:1;min-width:90px;border:1px solid #E6E2D8;border-radius:12px;padding:10px 8px;text-align:center;background:#FBFAF6;opacity:.5;filter:grayscale(.6);}',
      '.sr-badge.on{opacity:1;filter:none;border-color:var(--sr-a);background:#fff;box-shadow:0 2px 10px rgba(40,55,50,.07);}',
      '.sr-badge .ic{font-size:22px;}',
      '.sr-badge .nm{font-size:10.5px;font-weight:700;color:#3c3c36;margin-top:2px;line-height:1.3;}',
      '.sr-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px;}',
      '.sr-share{border:0;background:var(--sr-a);color:#fff;font-weight:700;font-size:13px;border-radius:12px;padding:11px 18px;cursor:pointer;font-family:inherit;letter-spacing:.03em;}',
      '.sr-share:active{opacity:.8;}',
      '.sr-reset{font-size:11px;color:#aaa69c;background:none;border:0;cursor:pointer;text-decoration:underline;font-family:inherit;}',
      '.sr-empty{text-align:center;padding:30px 18px;border:1.5px dashed #DCD8CE;border-radius:16px;background:#fff;color:#8a887e;font-size:13px;line-height:1.9;}',
      '.sr-empty .big{font-size:34px;display:block;margin-bottom:8px;}',
      /* toast */
      '.sr-toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%) translateY(20px);background:rgba(44,58,54,.96);color:#fff;font-size:13px;font-weight:600;padding:12px 20px;border-radius:24px;z-index:9999;opacity:0;transition:opacity .25s,transform .25s;max-width:88%;text-align:center;line-height:1.6;box-shadow:0 6px 24px rgba(0,0,0,.25);pointer-events:none;}',
      '.sr-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}',
      /* sheet / modal */
      '.sr-ov{position:fixed;inset:0;background:rgba(30,38,35,.5);z-index:9998;display:flex;align-items:flex-end;justify-content:center;opacity:0;transition:opacity .25s;}',
      '.sr-ov.show{opacity:1;}',
      '.sr-ov.center{align-items:center;padding:22px;}',
      '.sr-sheet{background:#fff;width:100%;max-width:480px;border-radius:22px 22px 0 0;padding:22px 22px calc(22px + env(safe-area-inset-bottom));transform:translateY(30px);transition:transform .28s;}',
      '.sr-ov.show .sr-sheet{transform:translateY(0);}',
      '.sr-sheet h3{font-family:"Shippori Mincho",serif;font-size:17px;margin-bottom:3px;}',
      '.sr-sheet p{font-size:12px;color:#8a887e;margin-bottom:16px;line-height:1.7;}',
      '.sr-sheet .b,.sr-card .b{display:block;width:100%;border:0;border-radius:13px;padding:13px;font-size:14px;font-weight:700;margin-bottom:9px;cursor:pointer;font-family:inherit;}',
      '.sr-sheet .b.primary{background:var(--sr-d);color:#fff;}',
      '.sr-sheet .b.sub{background:#F1EEE7;color:#4a4a44;}',
      '.sr-sheet .b.danger{background:#fff;color:#c0584b;border:1px solid #e6c2bd;}',
      '.sr-sheet .b.ghost,.sr-card .b.ghost{background:none;color:#a8a49a;font-weight:600;}',
      '.sr-card{background:linear-gradient(160deg,#fff 0%,#FBF7EC 100%);width:100%;max-width:380px;border-radius:24px;padding:30px 24px;text-align:center;transform:scale(.85);transition:transform .3s cubic-bezier(.3,1.4,.5,1);border:2px solid var(--sr-a);box-shadow:0 20px 60px rgba(0,0,0,.3);}',
      '.sr-ov.show .sr-card{transform:scale(1);}',
      '.sr-card .crown{font-size:40px;}',
      '.sr-card .ttl{font-family:"Shippori Mincho",serif;font-size:13px;letter-spacing:3px;color:var(--sr-a);margin:8px 0 4px;}',
      '.sr-card .title{font-family:"Shippori Mincho",serif;font-size:22px;font-weight:700;color:var(--sr-d);line-height:1.4;margin-bottom:8px;}',
      '.sr-card .msg{font-size:12.5px;color:#7a786e;line-height:1.8;margin-bottom:20px;}',
      '.sr-card .b.primary{background:var(--sr-a);color:#fff;}',
      /* confetti */
      '.sr-confetti{position:fixed;inset:0;z-index:10000;pointer-events:none;overflow:hidden;}',
      '.sr-confetti i{position:absolute;top:-12px;width:9px;height:14px;border-radius:2px;opacity:.95;animation:srfall linear forwards;font-style:normal;display:flex;align-items:center;justify-content:center;}',
      '@keyframes srfall{to{transform:translateY(108vh) rotate(720deg);opacity:.9;}}',
      /* スタンプ押下時の花吹雪バースト */
      '.sr-burst{position:fixed;inset:0;z-index:10001;pointer-events:none;overflow:hidden;}',
      '.sr-burst i{position:absolute;font-style:normal;line-height:1;will-change:transform,opacity;animation:srburst cubic-bezier(.15,.6,.3,1) forwards;}',
      '@keyframes srburst{0%{transform:translate(-50%,-50%) scale(.3) rotate(0);opacity:0;}12%{opacity:1;}100%{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(1) rotate(var(--rot));opacity:0;}}'
    ].join('');
    document.head.appendChild(st);
  }
  mount.className = 'srally';
  mount.style.setProperty('--sr-a', ACCENT);
  mount.style.setProperty('--sr-d', ACCENT_DEEP);

  /* ---------- toast ---------- */
  var toastEl;
  function toast(msg, ms) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'sr-toast'; document.body.appendChild(toastEl); }
    toastEl.innerHTML = msg; toastEl.classList.add('show');
    clearTimeout(toastEl._t); toastEl._t = setTimeout(function () { toastEl.classList.remove('show'); }, ms || 2600);
  }

  /* ========================================================= SELECT MODE */
  function renderSelect() {
    var sel = rd(SEL), tab = cfg.key, tabLabel = cfg.tabLabel || cfg.title || tab;
    var spots = cfg.spots || [];
    var chosen = spots.filter(function (s) { return sel[gid(tab, s.id)]; }).length;
    var pct = spots.length ? Math.round(chosen / spots.length * 100) : 0;
    var allSel = chosen === spots.length && spots.length > 0;
    var h = '';
    h += '<div class="sr-label">S T A M P &nbsp; R A L L Y</div>';
    h += '<h2 class="sr-title">' + (cfg.title || 'スタンプを集めよう') + '<span>' + (cfg.subtitle || 'pick your spots') + '</span></h2>';
    h += '<div class="sr-progress"><div class="sr-ring" style="--p:' + pct + '"><i>' + chosen + '/' + spots.length + '</i></div>'
      + '<div class="sr-pinfo"><b>' + chosen + ' か所えらび中</b><span class="sub">/ 候補' + spots.length + '</span>'
      + '<div class="sr-bar"><i style="width:' + pct + '%"></i></div></div></div>';
    h += '<button class="sr-btn" data-act="open-master">🗺 マイスタンプ帳を見る</button>';
    h += '<button class="sr-btn alt" data-act="' + (allSel ? 'none' : 'all') + '">' + (allSel ? '✓ ぜんぶ選択中（タップで個別調整）' : '＋ このタブをぜんぶ追加') + '</button>';
    h += '<div class="sr-hint">行きたいスポットをタップで選ぶと、<br>「マイスタンプ」タブに集まって現地でスタンプを集められます。</div>';
    h += '<div class="sr-grid">';
    spots.forEach(function (s) {
      var on = !!sel[gid(tab, s.id)];
      h += '<button class="sr-tile' + (on ? ' on' : '') + '" data-id="' + s.id + '">'
        + (s.cat ? '<span class="sr-cat">' + s.cat + '</span>' : '')
        + '<span class="sr-chk">✓</span>'
        + '<span class="sr-stamp">' + (s.icon || '📍') + '</span>'
        + '<span class="sr-name">' + (s.short || s.name) + '</span>'
        + '<span class="sr-sub">' + (on ? '✓ 行く' : '＋ 追加') + '</span></button>';
    });
    h += '</div>';
    mount.innerHTML = h;
  }
  function toggleSelect(id) {
    var sel = rd(SEL), tab = cfg.key, tabLabel = cfg.tabLabel || cfg.title || tab;
    var s = (cfg.spots || []).filter(function (x) { return x.id === id; })[0];
    if (!s) return;
    var key = gid(tab, id);
    if (sel[key]) { delete sel[key]; toast('「' + s.name + '」を外しました'); }
    else { sel[key] = { tab: tab, tabLabel: tabLabel, id: id, name: s.name, short: s.short || s.name, icon: s.icon || '📍', cat: s.cat || '', lat: s.lat, lng: s.lng }; toast('🗺 「' + s.name + '」をマイスタンプ帳に追加！'); }
    wr(SEL, sel); renderSelect();
  }

  /* ========================================================= MASTER MODE */
  function selectedList() {
    var sel = rd(SEL); return Object.keys(sel).map(function (k) { var o = sel[k]; o.gid = k; return o; });
  }
  function gotCount(list, got) { return list.filter(function (s) { return got[s.gid]; }).length; }

  function renderMaster() {
    var list = selectedList(), got = rd(GOT);
    var n = gotCount(list, got), total = list.length;
    var mapWrap = document.getElementById('sr-map-wrap');
    var h = '';
    h += '<div class="sr-label">M Y &nbsp; S T A M P &nbsp; B O O K</div>';
    h += '<h2 class="sr-title">' + (cfg.title || 'マイ スタンプ帳') + '<span>' + (cfg.subtitle || 'your journey stamps') + '</span></h2>';
    if (!total) {
      if (mapWrap) mapWrap.style.display = 'none';
      h += '<div class="sr-empty"><span class="big">🗺️</span>まだスポットが選ばれていません。<br>各旅程タブの「スタンプ」セクションで<br><b>行きたい場所をタップ</b>して追加してね。</div>';
      mount.innerHTML = h; return;
    }
    if (mapWrap) mapWrap.style.display = '';
    var pct = Math.round(n / total * 100);
    h += '<div class="sr-progress"><div class="sr-ring" style="--p:' + pct + '"><i>' + n + '/' + total + '</i></div>'
      + '<div class="sr-pinfo"><b>' + n + ' スタンプ</b><span class="sub">/ 選択 ' + total + '</span>'
      + '<div class="sr-bar"><i style="width:' + pct + '%"></i></div></div></div>';
    h += '<button class="sr-btn" data-act="geoall">📍 現在地でスタンプを集める</button>';
    h += '<div class="sr-hint">スポットの近く（約' + (RADIUS >= 1000 ? RADIUS / 1000 + 'km' : RADIUS + 'm') + '以内）でGET。<br>うまくいかない時はマスをタップして手動でもOK。</div>';
    // group by tabLabel
    var order = [], groups = {};
    list.forEach(function (s) { if (!groups[s.tabLabel]) { groups[s.tabLabel] = []; order.push(s.tabLabel); } groups[s.tabLabel].push(s); });
    order.forEach(function (lab) {
      h += '<div class="sr-group"><h4>' + lab + ' <span class="ln"></span></h4><div class="sr-grid">';
      groups[lab].forEach(function (s) {
        var on = !!got[s.gid];
        h += '<button class="sr-tile' + (on ? ' on' : '') + '" data-gid="' + s.gid + '">'
          + (s.cat ? '<span class="sr-cat">' + s.cat + '</span>' : '')
          + '<span class="sr-stamp">' + (on ? '✓' : (s.icon || '📍')) + '</span>'
          + '<span class="sr-name">' + (s.short || s.name) + '</span>'
          + '<span class="sr-sub">' + (on ? fmtDate(got[s.gid]) : '未取得') + '</span></button>';
      });
      h += '</div></div>';
    });
    // badges (dynamic)
    var half = Math.ceil(total / 2);
    var b1 = n >= half, b2 = n === total;
    h += '<div class="sr-badges">'
      + '<div class="sr-badge' + (b1 ? ' on' : '') + '"><div class="ic">🔰</div><div class="nm">半分達成</div></div>'
      + '<div class="sr-badge' + (b2 ? ' on' : '') + '"><div class="ic">👑</div><div class="nm">満願</div></div>'
      + '</div>';
    h += '<div class="sr-foot"><button class="sr-share" data-act="share">🎉 結果をシェア</button>'
      + '<button class="sr-reset" data-act="reset">記録リセット</button></div>';
    mount.innerHTML = h;
    drawPins(list, got);
  }

  function drawPins(list, got) {
    var g = document.getElementById('sr-pins'); if (!g) return;
    var s = '';
    list.forEach(function (sp, i) {
      if (sp.lat == null) return;
      var x = projX(sp.lng), y = projY(sp.lat), on = !!got[sp.gid];
      s += '<g><circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="8.5" fill="' + (on ? ACCENT : '#fff') + '" stroke="' + ACCENT_DEEP + '" stroke-width="' + (on ? 1.5 : 2) + '"/>'
        + '<text x="' + x.toFixed(1) + '" y="' + (y + 3.2).toFixed(1) + '" text-anchor="middle" font-size="10" font-weight="700" fill="' + (on ? '#fff' : ACCENT_DEEP) + '" font-family="serif">' + (on ? '✓' : (i + 1)) + '</text></g>';
    });
    g.innerHTML = s;
  }

  /* ---------- collect (master) ---------- */
  function collect(g, silent) {
    var got = rd(GOT); if (got[g]) return false;
    got[g] = new Date().toISOString(); wr(GOT, got);
    renderMaster();
    var tile = mount.querySelector('.sr-tile[data-gid="' + g + '"]');
    if (tile) {
      tile.classList.add('pop');
      var r = tile.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (cx < 10 || cx > window.innerWidth - 10 || cy < 10 || cy > window.innerHeight - 10) { cx = window.innerWidth / 2; cy = window.innerHeight / 2; }
      burst(cx, cy);
    } else { burst(window.innerWidth / 2, window.innerHeight / 2); }
    if (!silent) { var sel = rd(SEL); toast('🎯 「' + (sel[g] ? sel[g].name : '') + '」のスタンプGET！'); }
    return true;
  }
  /* 花吹雪バースト（スタンプ押下時） */
  function burst(x, y) {
    var box = document.createElement('div'); box.className = 'sr-burst';
    var petals = ['🌸', '🌸', '💮', '🌸', '❀', '✿'];
    var n = 24;
    for (var i = 0; i < n; i++) {
      var p = document.createElement('i');
      var ang = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      var d = 45 + Math.random() * 130;
      p.style.left = x + 'px'; p.style.top = y + 'px';
      p.style.setProperty('--dx', (Math.cos(ang) * d).toFixed(0) + 'px');
      p.style.setProperty('--dy', (Math.sin(ang) * d * 0.5 + 90 + Math.random() * 150).toFixed(0) + 'px');
      p.style.setProperty('--rot', (Math.random() * 760 - 380).toFixed(0) + 'deg');
      p.style.fontSize = (13 + Math.random() * 12).toFixed(0) + 'px';
      p.style.animationDelay = (Math.random() * 0.08).toFixed(2) + 's';
      p.style.animationDuration = (1.1 + Math.random() * 0.9).toFixed(2) + 's';
      if (i % 5 === 0) { p.textContent = ''; p.style.width = '8px'; p.style.height = '12px'; p.style.borderRadius = '2px'; p.style.background = [ACCENT, '#E4C04A', '#E08AA0'][i % 3]; }
      else p.textContent = petals[i % petals.length];
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 2300);
  }
  function checkComplete() {
    var list = selectedList(), got = rd(GOT);
    if (list.length && gotCount(list, got) === list.length) setTimeout(showComplete, 500);
  }
  function geoErr(e) {
    var m = '位置情報を取得できませんでした。';
    if (e && e.code === 1) m = '位置情報がブロックされています。設定で許可するか、マスをタップして手動でどうぞ。';
    else if (e && e.code === 3) m = '位置情報がタイムアウトしました。電波の良い場所で再度お試しを。';
    toast(m, 3600);
  }
  function geoAll(btn) {
    if (!navigator.geolocation) { toast('この端末では位置情報が使えません。手動でどうぞ。'); return; }
    if (btn) { btn.disabled = true; btn.textContent = '📡 現在地を確認中…'; }
    navigator.geolocation.getCurrentPosition(function (pos) {
      var la = pos.coords.latitude, lo = pos.coords.longitude;
      var list = selectedList(), got = rd(GOT), names = [], near = null, nd = Infinity;
      list.forEach(function (s) {
        if (s.lat == null) return;
        var d = dist(la, lo, s.lat, s.lng);
        if (d < nd) { nd = d; near = s; }
        if (d <= RADIUS && !got[s.gid]) { collect(s.gid, true); names.push(s.name); }
      });
      if (names.length) { toast('🎯 ' + names.length + '個GET！<br>' + names.join('・')); checkComplete(); }
      else if (near) toast('近くに対象がありません。<br>最寄り「' + near.name + '」まで約' + fmtKm(nd) + '。');
      else toast('対象スポットが見つかりませんでした。');
      restoreGeo();
    }, function (e) { geoErr(e); restoreGeo(); }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  }
  function geoOne(s) {
    if (!navigator.geolocation) { toast('この端末では位置情報が使えません。'); return; }
    toast('📡 現在地を確認中…', 8000);
    navigator.geolocation.getCurrentPosition(function (pos) {
      var d = dist(pos.coords.latitude, pos.coords.longitude, s.lat, s.lng);
      if (d <= RADIUS) { collect(s.gid); checkComplete(); }
      else toast('まだ「' + s.name + '」の近くにいないようです（約' + fmtKm(d) + '）。', 3600);
    }, geoErr, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  }
  function restoreGeo() { var b = mount.querySelector('[data-act="geoall"]'); if (b) { b.disabled = false; b.textContent = '📍 現在地でスタンプを集める'; } }

  function openSheet(s) {
    var got = rd(GOT), on = !!got[s.gid];
    var ov = document.createElement('div'); ov.className = 'sr-ov';
    ov.style.setProperty('--sr-a', ACCENT); ov.style.setProperty('--sr-d', ACCENT_DEEP);
    ov.innerHTML = '<div class="sr-sheet"><h3>' + s.name + '</h3>'
      + '<p>' + (on ? '取得済み（' + fmtDate(got[s.gid]) + '）' : '現地にいますか？ GPSで確認すると確実です。電波が悪い時は手動でも押せます。') + '</p>'
      + (on ? '' : '<button class="b primary" data-s="gps">📍 現在地で確認してGET</button><button class="b sub" data-s="manual">✋ 手動で押す</button>')
      + (s.lat != null ? '<button class="b sub" data-s="map">🗺 地図でこの場所を見る</button>' : '')
      + '<button class="b danger" data-s="remove">マイスタンプ帳から外す</button>'
      + '<button class="b ghost" data-s="cancel">とじる</button></div>';
    document.body.appendChild(ov);
    requestAnimationFrame(function () { ov.classList.add('show'); });
    function close() { ov.classList.remove('show'); setTimeout(function () { ov.remove(); }, 280); }
    ov.addEventListener('click', function (e) {
      if (e.target === ov) return close();
      var a = e.target.getAttribute('data-s'); if (!a) return;
      if (a === 'gps') { close(); geoOne(s); }
      else if (a === 'manual') { close(); collect(s.gid); checkComplete(); }
      else if (a === 'map') window.open('https://www.google.com/maps/search/?api=1&query=' + s.lat + ',' + s.lng, '_blank');
      else if (a === 'remove') { close(); removeSpot(s.gid); }
      else close();
    });
  }
  function removeSpot(g) {
    var sel = rd(SEL); if (sel[g]) { var nm = sel[g].name; delete sel[g]; wr(SEL, sel); renderMaster(); toast('「' + nm + '」を外しました'); }
  }

  /* ---------- completion / confetti / share ---------- */
  function showComplete() {
    confetti();
    var ov = document.createElement('div'); ov.className = 'sr-ov center';
    ov.style.setProperty('--sr-a', ACCENT); ov.style.setProperty('--sr-d', ACCENT_DEEP);
    var total = selectedList().length;
    ov.innerHTML = '<div class="sr-card"><div class="crown">👑</div><div class="ttl">C O M P L E T E</div>'
      + '<div class="title">' + (cfg.completeTitle || 'コンプリート！') + '</div>'
      + '<div class="msg">選んだ' + total + 'スポット、ぜんぶ制覇！<br>おめでとう、満願達成です。</div>'
      + '<button class="b primary" data-s="share">🎉 結果をシェアする</button>'
      + '<button class="b ghost" data-s="close">とじる</button></div>';
    document.body.appendChild(ov);
    requestAnimationFrame(function () { ov.classList.add('show'); });
    ov.addEventListener('click', function (e) {
      var a = e.target.getAttribute('data-s');
      if (e.target === ov || a === 'close') { ov.classList.remove('show'); setTimeout(function () { ov.remove(); }, 280); }
      else if (a === 'share') doShare();
    });
  }
  function confetti() {
    var box = document.createElement('div'); box.className = 'sr-confetti';
    var colors = [ACCENT, ACCENT_DEEP, '#E4C04A', '#E08A8A', '#fff'];
    var petals = ['🌸', '💮', '❀', '✿'];
    for (var i = 0; i < 100; i++) {
      var p = document.createElement('i');
      p.style.left = Math.round(Math.random() * 100) + 'vw';
      p.style.animationDuration = (1.8 + Math.random() * 1.8) + 's';
      p.style.animationDelay = (Math.random() * 0.8) + 's';
      p.style.transform = 'rotate(' + Math.round(Math.random() * 360) + 'deg)';
      if (i % 3 === 0) { p.textContent = petals[i % petals.length]; p.style.fontSize = (13 + Math.random() * 9) + 'px'; p.style.width = 'auto'; p.style.height = 'auto'; }
      else p.style.background = colors[i % colors.length];
      box.appendChild(p);
    }
    document.body.appendChild(box); setTimeout(function () { box.remove(); }, 4200);
  }
  function buildCanvas() {
    var list = selectedList(), got = rd(GOT), n = gotCount(list, got), total = list.length, done = n === total && total > 0;
    var S = 800, c = document.createElement('canvas'); c.width = S; c.height = S; var g = c.getContext('2d');
    var grd = g.createLinearGradient(0, 0, 0, S); grd.addColorStop(0, '#FBF7EC'); grd.addColorStop(1, '#EFEADD');
    g.fillStyle = grd; g.fillRect(0, 0, S, S); g.fillStyle = ACCENT_DEEP; g.fillRect(0, 0, S, 10);
    g.textAlign = 'center';
    g.fillStyle = ACCENT_DEEP; g.font = '600 34px "Shippori Mincho",serif';
    g.fillText(cfg.shareTitle || cfg.title || 'マイ スタンプ帳', S / 2, 84);
    g.fillStyle = ACCENT; g.font = 'bold 20px sans-serif';
    g.fillText(done ? '★ ALL CLEAR ★' : n + ' / ' + total + ' 達成', S / 2, 122);
    var cols = Math.min(4, Math.max(1, total)), gy0 = 200, cellH = 150, r = 48;
    var cellW = Math.min(190, (S - 80) / cols), startX = S / 2 - (cols - 1) * cellW / 2;
    list.slice(0, 16).forEach(function (s, i) {
      var col = i % cols, row = Math.floor(i / cols), x = startX + col * cellW, y = gy0 + row * cellH;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2);
      if (got[s.gid]) { g.fillStyle = ACCENT; g.fill(); g.fillStyle = '#fff'; g.font = '34px sans-serif'; g.fillText('✓', x, y + 12); }
      else { g.fillStyle = '#E5E0D4'; g.fill(); g.fillStyle = '#fff'; g.font = '28px sans-serif'; g.fillText(s.icon || '?', x, y + 10); }
      g.fillStyle = '#5a5850'; g.font = '600 14px sans-serif'; g.fillText((s.short || s.name).slice(0, 6), x, y + r + 22);
    });
    g.fillStyle = ACCENT_DEEP; g.font = '600 20px "Shippori Mincho",serif';
    if (done) g.fillText('👑 ' + (cfg.completeTitle || ''), S / 2, S - 60);
    g.fillStyle = '#9a988e'; g.font = '15px sans-serif'; g.fillText('四国・瀬戸内 旅のしおり', S / 2, S - 28);
    return c;
  }
  function doShare() {
    var list = selectedList(), got = rd(GOT), n = gotCount(list, got), total = list.length;
    var text = (n === total && total ? (cfg.shareText || '旅のスタンプ コンプリート！') : '旅のスタンプ ' + n + '/' + total + ' 達成');
    var url = cfg.shareUrl || location.href.split('#')[0];
    buildCanvas().toBlob(function (blob) {
      var file = blob ? new File([blob], 'stamp.png', { type: 'image/png' }) : null;
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], text: text + ' #四国旅のしおり', title: cfg.title }).catch(function () {});
      } else {
        if (blob) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'stamp.png'; document.body.appendChild(a); a.click(); a.remove(); }
        window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(text + ' #四国旅のしおり') + '&url=' + encodeURIComponent(url), '_blank');
        toast('画像を保存しました。投稿画面に添付してね。', 3600);
      }
    }, 'image/png');
  }

  /* ---------- events ---------- */
  mount.addEventListener('click', function (e) {
    var actEl = e.target.closest('[data-act]');
    if (actEl) {
      var a = actEl.getAttribute('data-act');
      if (a === 'open-master') { try { window.parent.postMessage({ type: 'sr-goto', target: 'stamp' }, '*'); } catch (x) {} toast('「マイスタンプ」タブを開いてね'); return; }
      if (a === 'all') { var sel = rd(SEL), tab = cfg.key, lab = cfg.tabLabel || cfg.title; (cfg.spots || []).forEach(function (s) { sel[gid(tab, s.id)] = { tab: tab, tabLabel: lab, id: s.id, name: s.name, short: s.short || s.name, icon: s.icon || '📍', cat: s.cat || '', lat: s.lat, lng: s.lng }; }); wr(SEL, sel); renderSelect(); toast('このタブを全部追加しました'); return; }
      if (a === 'geoall') return geoAll(actEl);
      if (a === 'share') return doShare();
      if (a === 'reset') { if (confirm('取得したスタンプ記録を消しますか？（選択スポットは残ります）')) { wr(GOT, {}); renderMaster(); toast('スタンプ記録をリセットしました。'); } return; }
    }
    if (MODE === 'select') { var t = e.target.closest('.sr-tile'); if (t) toggleSelect(t.getAttribute('data-id')); return; }
    // master
    var tile = e.target.closest('.sr-tile'); if (!tile) return;
    var g = tile.getAttribute('data-gid'); var sel = rd(SEL); var s = sel[g]; if (!s) return; s.gid = g;
    openSheet(s);
  });

  /* ---------- live sync (master reflects selections made in other tabs) ---------- */
  if (MODE === 'master') {
    window.addEventListener('storage', function (e) { if (e.key === SEL || e.key === GOT || e.key === null) renderMaster(); });
    window.addEventListener('focus', function () { renderMaster(); });
    window.addEventListener('pageshow', function () { renderMaster(); });
    renderMaster();
  } else {
    renderSelect();
  }
})();

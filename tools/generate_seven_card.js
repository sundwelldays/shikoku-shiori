// Generates card_seven.html — an L判 (89×127mm) glossy photo-print sheet
// holding two QR business cards (front face only) with trim guides, sized so
// the printed L判 can be cut down to name-card size.
// Reuses the QR + card design from card.html (single source of truth).
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'card.html'), 'utf8');

const svg = (src.match(/<svg class="qrsvg"[\s\S]*?<\/svg>/) || [])[0];
if (!svg) throw new Error('QR SVG not found in card.html');

// One card face (same markup as card.html .card inner), scaled via CSS to fit
// the trim box. {{SVG}} is injected per copy.
const cardFace = `
  <div class="card">
    <div class="left">
      <div>
        <div class="brandlabel">S H I K O K U &nbsp; T R A V E L &nbsp; G U I D E</div>
        <div class="title">四国 旅のしおり<small>onsen &middot; gourmet &middot; art</small></div>
        <div class="tagline">下関発・女子旅・車でめぐる、<br>四国＆瀬戸内の5コース。湯と美味と絶景を一冊に。</div>
        <div class="chips"><span class="chip">四国一周</span><span class="chip">松山・道後</span><span class="chip">高知</span><span class="chip">小豆島</span></div>
      </div>
      <div class="url">&#9658; <b>sundwelldays.github.io/shikoku-shiori</b></div>
    </div>
    <div class="right">
      <div class="qrbox">${svg}</div>
      <div class="scan">scan me &hearts;</div>
    </div>
  </div>`;

const slot = `<div class="slot"><span class="cut">&#9986; この線で切る</span>${cardFace}</div>`;

const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>四国 旅のしおり ・ L判カード（セブン写真プリント用）</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Shippori+Mincho:wght@600&family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Caveat+Brush&display=swap" rel="stylesheet">
<style>
:root{--ink:#2A2620;--soft:#7E7264;--terra:#C4775A;--terra-d:#95573D;--aqua:#4A776D;--olive:#6B7849;--sand:#E5C896;--guide:#b8ab97;}
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
html,body{background:#fff;}
/* L判 photo paper = 89mm x 127mm (portrait). The image fills it edge to edge. */
.sheet{width:89mm;height:127mm;background:#fff;position:relative;font-family:'Zen Kaku Gothic New',sans-serif;color:var(--ink);}
/* Trim box: cut along this rounded rectangle to get a name-card-sized glossy card. */
.slot{position:absolute;left:2mm;width:85mm;height:51.4mm;border:.2mm dashed var(--guide);border-radius:2mm;}
.slot.top{top:8.6mm;}
.slot.bottom{top:67mm;}
.cut{position:absolute;top:-4.4mm;left:0;font-size:5.4pt;letter-spacing:.3pt;color:var(--guide);font-family:'Zen Kaku Gothic New',sans-serif;}

/* Card face — same look as card.html, centered inside the trim box with a hair of gutter. */
.card{position:absolute;top:50%;left:50%;width:91mm;height:55mm;
  /* center in the trim box and visually scale to ~82.5mm wide so a ~1.2mm white gutter sits inside the cut line.
     translate + scale MUST be one transform (a separate scale property composes in a different order and offsets the card). */
  transform:translate(-50%,-50%) scale(.906);transform-origin:center;
  overflow:hidden;border-radius:3.4mm;display:flex;align-items:stretch;
  background:
    radial-gradient(circle at 86% 16%, rgba(196,119,90,.12), transparent 42%),
    radial-gradient(circle at 10% 92%, rgba(74,119,109,.12), transparent 42%),
    linear-gradient(135deg,#FCF9F3 0%,#F3EADF 100%);}
.card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:2.4mm;
  background:linear-gradient(180deg,var(--terra),var(--sand),var(--olive),var(--aqua));}
.card::after{content:"";position:absolute;right:-14mm;top:-14mm;width:34mm;height:34mm;border-radius:50%;
  background:rgba(229,200,150,.16);}
.left{flex:1;padding:5mm 3mm 4.2mm 6.2mm;display:flex;flex-direction:column;justify-content:space-between;position:relative;z-index:1;}
.brandlabel{font-family:'DM Serif Display',serif;font-size:5pt;letter-spacing:2pt;color:var(--terra-d);white-space:nowrap;}
.title{font-family:'Shippori Mincho',serif;font-weight:600;font-size:16.5pt;line-height:1.18;margin-top:1.6mm;letter-spacing:.03em;}
.title small{display:block;font-family:'DM Serif Display',serif;font-style:italic;font-size:8pt;color:var(--aqua);letter-spacing:.4pt;margin-top:.8mm;font-weight:400;}
.tagline{font-size:6.2pt;color:var(--soft);line-height:1.65;margin-top:2.2mm;}
.chips{display:flex;flex-wrap:wrap;gap:1mm;margin-top:1.8mm;}
.chip{font-size:5pt;font-weight:700;color:var(--terra-d);background:rgba(196,119,90,.13);border-radius:10pt;padding:.5mm 1.7mm;letter-spacing:.2pt;}
.url{font-family:'DM Serif Display',serif;font-size:6.6pt;letter-spacing:.2pt;color:var(--ink);margin-top:2mm;}
.url b{color:var(--terra-d);}
.right{width:31mm;display:flex;flex-direction:column;align-items:center;justify-content:center;padding-right:3.4mm;position:relative;z-index:1;}
.qrbox{background:#fff;border-radius:2mm;padding:1.7mm;box-shadow:0 1mm 3mm rgba(60,45,35,.14);}
.qrsvg{width:21mm;height:21mm;display:block;shape-rendering:crispEdges;}
.qrbox rect{fill:#fff;}
.qrbox path{fill:#221b16;}
.scan{font-family:'Caveat Brush',cursive;font-size:9pt;color:var(--terra-d);margin-top:1.3mm;letter-spacing:.4pt;}
</style>
</head>
<body>
<div class="sheet">
  ${slot.replace('class="slot"', 'class="slot top"')}
  ${slot.replace('class="slot"', 'class="slot bottom"')}
</div>
</body>
</html>`;

fs.writeFileSync(path.join(root, 'card_seven.html'), html);
console.log('wrote card_seven.html (' + html.length + ' bytes)');

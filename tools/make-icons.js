// Sinh logo "Cẩm nang Dược lâm sàng" (SVG + PNG cho PWA), không cần thư viện ngoài.
// Chạy: node tools/make-icons.js
// Ý nghĩa: cuốn sách mở = cẩm nang, kiến thức có nguồn; viên nang nghiêng phía trên = dược,
// thuốc được dùng dựa trên tri thức; nền xanh dương -> xanh ngọc = tin cậy và chăm sóc.
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'icons');
const C = {
  bgA: [0x16, 0x4a, 0xa2],   // --blue ClinPharmAI (góc trên trái)
  bgB: [0x0a, 0x8f, 0x9b],   // xanh ngọc lâm sàng (góc dưới phải)
  page: [0xff, 0xff, 0xff],
  page2: [0xe6, 0xf4, 0xf6], // trang phải hơi ngả để có chiều sâu
  capTop: [0x8e, 0xf0, 0xdf], // nửa trên viên nang
  capBot: [0xff, 0xff, 0xff]
};

// Hình học trong hệ toạ độ 0..100 (dùng chung cho SVG và PNG).
const LEFT = [[14, 50], [49, 57], [49, 85], [14, 78]];
const RIGHT = [[51, 57], [86, 50], [86, 78], [51, 85]];
// Viên nang: tâm (cx, cy), nửa thân dài h (không kể hai đầu tròn), bán kính r, nghiêng a độ lên phải.
const CAP = { cx: 50, cy: 31, h: 16, r: 9, a: 35 };
const GAP = 3;                                     // khe tách viên nang khỏi trang sách
const DIR = [Math.cos(CAP.a * Math.PI / 180), -Math.sin(CAP.a * Math.PI / 180)];

function inPoly(x, y, p) {
  let ins = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}
// Toạ độ dọc trục viên nang (t > 0: nửa trên phải) và khoảng cách tới viên nang.
function capAxis(x, y) { return (x - CAP.cx) * DIR[0] + (y - CAP.cy) * DIR[1]; }
function capDist(x, y) {
  const t = Math.min(Math.max(capAxis(x, y), -CAP.h), CAP.h);
  return Math.hypot(x - (CAP.cx + t * DIR[0]), y - (CAP.cy + t * DIR[1])) - CAP.r;
}
function inRoundRect(x, y, r) {
  const dx = Math.max(Math.abs(x - 50) - (50 - r), 0), dy = Math.max(Math.abs(y - 50) - (50 - r), 0);
  return dx * dx + dy * dy <= r * r;
}
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

// Màu tại điểm (x, y) trong hệ 0..100; null = trong suốt.
function color(x, y, maskable) {
  if (!maskable && !inRoundRect(x, y, 22)) return null;
  const bg = mix(C.bgA, C.bgB, Math.min(Math.max((x + y) / 200, 0), 1));
  // Maskable: thu nhỏ hình vào vùng an toàn 80%.
  const s = maskable ? 0.78 : 1;
  const u = 50 + (x - 50) / s, v = 50 + (y - 50) / s;
  const d = capDist(u, v);
  if (d <= 0) return capAxis(u, v) > 0 ? C.capTop : C.capBot;
  if (d <= GAP) return bg;
  if (inPoly(u, v, LEFT)) return C.page;
  if (inPoly(u, v, RIGHT)) return C.page2;
  return bg;
}

function png(size, maskable) {
  const SS = 4, row = size * 4 + 1;
  const raw = Buffer.alloc(row * size);
  for (let py = 0; py < size; py++) {
    raw[py * row] = 0;
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const c = color((px + (sx + 0.5) / SS) / size * 100, (py + (sy + 0.5) / SS) / size * 100, maskable);
        if (c) { r += c[0]; g += c[1]; b += c[2]; a++; }
      }
      const o = py * row + 1 + px * 4;
      if (a) { raw[o] = Math.round(r / a); raw[o + 1] = Math.round(g / a); raw[o + 2] = Math.round(b / a); }
      raw[o + 3] = Math.round(255 * a / (SS * SS));
    }
  }
  const tbl = [];
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; tbl[n] = c >>> 0; }
  const crc = buf => { let c = 0xffffffff; for (const x of buf) c = tbl[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))
  ]);
}

const hex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
const pts = p => p.map(q => q.join(',')).join(' ');
// Viên nang vẽ nằm ngang quanh tâm rồi xoay; nửa trên phải cắt bằng clipPath trong cùng hệ xoay.
const capRect = (r) => `<rect x="${CAP.cx - CAP.h - r}" y="${CAP.cy - r}" width="${2 * (CAP.h + r)}" height="${2 * r}" rx="${r}"`;
const svg =
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="Cẩm nang Dược lâm sàng">
<defs>
<linearGradient id="cn-bg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="100"><stop offset="0" stop-color="${hex(C.bgA)}"/><stop offset="1" stop-color="${hex(C.bgB)}"/></linearGradient>
<clipPath id="cn-top"><rect x="${CAP.cx}" y="0" width="100" height="100"/></clipPath>
</defs>
<rect width="100" height="100" rx="22" fill="url(#cn-bg)"/>
<polygon points="${pts(LEFT)}" fill="${hex(C.page)}"/>
<polygon points="${pts(RIGHT)}" fill="${hex(C.page2)}"/>
<g transform="rotate(${-CAP.a} ${CAP.cx} ${CAP.cy})">
${capRect(CAP.r + GAP)} fill="url(#cn-bg)"/>
${capRect(CAP.r)} fill="${hex(C.capBot)}"/>
${capRect(CAP.r)} fill="${hex(C.capTop)}" clip-path="url(#cn-top)"/>
</g>
</svg>
`;

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'icon.svg'), svg);
fs.writeFileSync(path.join(OUT, 'icon-192.png'), png(192, false));
fs.writeFileSync(path.join(OUT, 'icon-512.png'), png(512, false));
fs.writeFileSync(path.join(OUT, 'icon-maskable-512.png'), png(512, true));
fs.writeFileSync(path.join(OUT, 'apple-touch-icon.png'), png(180, true));
console.log('Đã tạo logo trong icons/');

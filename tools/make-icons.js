// Sinh biểu tượng PNG cho PWA (không cần thư viện ngoài). Chạy: node tools/make-icons.js
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BG = [0x16, 0x4a, 0xa2];   // --blue của ClinPharmAI
const FG = [0xff, 0xff, 0xff];
const OUT = path.join(__dirname, '..', 'icons');

// Hình: nền bo góc (hoặc tràn viền nếu maskable) + dấu cộng y tế bo tròn.
function shape(u, v, maskable) {
  // u, v trong [0,1]
  let inBg;
  if (maskable) inBg = true;
  else {
    const r = 0.22, x = Math.abs(u - 0.5), y = Math.abs(v - 0.5);
    const dx = Math.max(x - (0.5 - r), 0), dy = Math.max(y - (0.5 - r), 0);
    inBg = dx * dx + dy * dy <= r * r;
  }
  if (!inBg) return 0;
  const s = maskable ? 0.72 : 1;              // thu nhỏ vào vùng an toàn
  const cu = (u - 0.5) / s, cv = (v - 0.5) / s;
  const arm = 0.29, half = 0.095, rr = 0.05;
  function roundedRect(px, py, hw, hh) {
    const dx = Math.max(Math.abs(px) - (hw - rr), 0), dy = Math.max(Math.abs(py) - (hh - rr), 0);
    return dx * dx + dy * dy <= rr * rr;
  }
  if (roundedRect(cu, cv, half, arm) || roundedRect(cu, cv, arm, half)) return 2;
  return 1;
}

function png(size, maskable) {
  const SS = 4;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let a = 0, fg = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const k = shape((x + (sx + 0.5) / SS) / size, (y + (sy + 0.5) / SS) / size, maskable);
        if (k) a++;
        if (k === 2) fg++;
      }
      const o = y * (size * 4 + 1) + 1 + x * 4;
      const t = a ? fg / a : 0;
      for (let c = 0; c < 3; c++) raw[o + c] = Math.round(BG[c] * (1 - t) + FG[c] * t);
      raw[o + 3] = Math.round(255 * a / (SS * SS));
    }
  }
  const crcTable = [];
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0; }
  const crc = b => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))
  ]);
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'icon-192.png'), png(192, false));
fs.writeFileSync(path.join(OUT, 'icon-512.png'), png(512, false));
fs.writeFileSync(path.join(OUT, 'icon-maskable-512.png'), png(512, true));
fs.writeFileSync(path.join(OUT, 'apple-touch-icon.png'), png(180, true));
fs.writeFileSync(path.join(OUT, 'icon.svg'),
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
  '<rect width="100" height="100" rx="22" fill="#164aa2"/>' +
  '<rect x="40.5" y="21" width="19" height="58" rx="5" fill="#fff"/>' +
  '<rect x="21" y="40.5" width="58" height="19" rx="5" fill="#fff"/></svg>\n');
console.log('Đã tạo biểu tượng trong icons/');

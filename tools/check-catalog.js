// Đối chiếu data/catalog.json với thư mục pages/. Chạy: node tools/check-catalog.js
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'catalog.json'), 'utf8'));
const pageFiles = fs.readdirSync(path.join(ROOT, 'pages')).filter(f => f.endsWith('.html'));
const errors = [];

const groupIds = new Set(cat.groups.map(g => g.id));
const ids = new Set();
const files = new Set();

for (const r of cat.records) {
  for (const k of ['id', 'group', 'label', 'title', 'file', 'specialty']) {
    if (!r[k]) errors.push(`${r.id || '?'}: thiếu "${k}"`);
  }
  if (ids.has(r.id)) errors.push(`id trùng: ${r.id}`);
  ids.add(r.id);
  if (files.has(r.file)) errors.push(`tệp bị khai báo 2 lần: ${r.file}`);
  files.add(r.file);
  if (!groupIds.has(r.group)) errors.push(`${r.id}: nhóm không tồn tại "${r.group}"`);
  if (!/^[a-z0-9-]+$/.test(r.id)) errors.push(`${r.id}: id chỉ dùng a-z, 0-9, "-"`);

  const p = path.join(ROOT, 'pages', r.file);
  if (!fs.existsSync(p)) { errors.push(`${r.id}: không có tệp pages/${r.file}`); continue; }
  const m = fs.readFileSync(p, 'utf8').match(/<title>([\s\S]*?)<\/title>/i);
  const real = m ? m[1].trim() : '';
  if (real !== r.title) errors.push(`${r.id}: title lệch với <title> của trang\n    danh mục: ${r.title}\n    trang   : ${real}`);
}

for (const f of pageFiles) if (!files.has(f)) errors.push(`pages/${f} chưa có trong danh mục`);

console.log(`[catalog] ${cat.records.length} bản ghi, ${pageFiles.length} tệp trong pages/, ${cat.groups.length} nhóm`);
errors.forEach(e => console.log('LỖI: ' + e));
console.log('KẾT QUẢ: ' + (errors.length ? errors.length + ' LỖI' : 'ĐẠT'));
process.exit(errors.length ? 1 : 0);

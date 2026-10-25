// Chạy: node tests/lib.test.js
'use strict';
const assert = require('assert');
const L = require('../js/lib.js');
const catalog = require('../data/catalog.json');

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('  ĐẠT  ' + name); }
  catch (e) { fail++; console.log('  LỖI  ' + name + '\n        ' + e.message); }
}

const R = catalog.records;

console.log('norm()');
t('bỏ dấu tiếng Việt và đ/Đ', () => assert.strictEqual(L.norm('Đái Tháo Đường'), 'dai thao duong'));
t('gộp khoảng trắng, cắt hai đầu', () => assert.strictEqual(L.norm('  Suy   tim '), 'suy tim'));
t('null/undefined/số', () => {
  assert.strictEqual(L.norm(null), '');
  assert.strictEqual(L.norm(undefined), '');
  assert.strictEqual(L.norm(2026), '2026');
});
t('dạng tổ hợp (NFD) và dựng sẵn (NFC) cho cùng kết quả', () =>
  assert.strictEqual(L.norm('xơ gan'.normalize('NFD')), L.norm('xơ gan'.normalize('NFC'))));

console.log('search()');
t('chuỗi rỗng trả về toàn bộ', () => assert.strictEqual(L.search(R, '').length, R.length));
t('chỉ khoảng trắng trả về toàn bộ', () => assert.strictEqual(L.search(R, '   ').length, R.length));
t('"xo gan" (không dấu) tìm thấy ACG', () =>
  assert.deepStrictEqual(L.search(R, 'xo gan').map(r => r.id), ['acg-2026-xo-gan']));
t('"ĐÁI THÁO" (hoa, có dấu) tìm thấy 2 trang đái tháo đường', () =>
  assert.deepStrictEqual(L.search(R, 'ĐÁI THÁO').map(r => r.id).sort(), ['ada-easd-2026-dtd2', 'dtd-2023-2026']));
t('nhiều từ khoá phải cùng khớp ("statin tim mach")', () =>
  assert.deepStrictEqual(L.search(R, 'statin tim mach').map(r => r.id), ['ss-statin']));
t('khớp theo tổ chức ("idsa")', () =>
  assert.deepStrictEqual(L.search(R, 'idsa').map(r => r.id), ['idsa-2026-gram-am']));
t('không khớp trả mảng rỗng', () => assert.strictEqual(L.search(R, 'zzzz khong co').length, 0));
t('records rỗng/undefined không lỗi', () => {
  assert.deepStrictEqual(L.search([], 'a'), []);
  assert.deepStrictEqual(L.search(undefined, 'a'), []);
});

console.log('groupBy()');
t('đủ 4 nhóm theo thứ tự khai báo, tổng = số bản ghi', () => {
  const g = L.groupBy(R, catalog.groups);
  assert.deepStrictEqual(g.map(x => x.group.id), ['guideline', 'thuoc', 'so-sanh', 'ebm']);
  assert.strictEqual(g.reduce((s, x) => s + x.items.length, 0), R.length);
});
t('bản ghi nhóm lạ bị bỏ qua', () => {
  const g = L.groupBy([{ id: 'x', group: 'khac' }], catalog.groups);
  assert.strictEqual(g.reduce((s, x) => s + x.items.length, 0), 0);
});

console.log('parseRoute()');
t('rỗng / "#" / "#/" là trang chủ', () => {
  ['', '#', '#/', undefined].forEach(h => assert.deepStrictEqual(L.parseRoute(h), { name: 'home' }));
});
t('#/doc/<id>', () => assert.deepStrictEqual(L.parseRoute('#/doc/ss-ppi'), { name: 'doc', id: 'ss-ppi' }));
t('#/nhom/<id>', () => assert.deepStrictEqual(L.parseRoute('#/nhom/ebm'), { name: 'group', id: 'ebm' }));
t('#/yeu-thich và #/gioi-thieu', () => {
  assert.strictEqual(L.parseRoute('#/yeu-thich').name, 'favorites');
  assert.strictEqual(L.parseRoute('#/gioi-thieu').name, 'about');
});
t('#/doc thiếu id là notfound', () => assert.strictEqual(L.parseRoute('#/doc').name, 'notfound'));
t('mã hoá % hỏng không làm sập', () => assert.deepStrictEqual(L.parseRoute('#/doc/%E0%A4'), { name: 'doc', id: '%E0%A4' }));

console.log('neighbors()');
t('đầu nhóm: prev null', () => {
  const n = L.neighbors(R, 'acg-2026-xo-gan');
  assert.strictEqual(n.prev, null); assert.strictEqual(n.next.id, 'acr-2026-oa');
});
t('cuối nhóm: next null, không nhảy sang nhóm khác', () => {
  const n = L.neighbors(R, 'meronem-iv');
  assert.strictEqual(n.next, null); assert.strictEqual(n.prev.id, 'lipitor');
});
t('id không tồn tại', () => assert.deepStrictEqual(L.neighbors(R, 'khong-co'), { prev: null, next: null }));

console.log('pushRecent() / toggleFav()');
t('đưa lên đầu, bỏ trùng, giới hạn', () =>
  assert.deepStrictEqual(L.pushRecent(['a', 'b', 'c'], 'b', 3), ['b', 'a', 'c']));
t('cắt theo max', () => assert.deepStrictEqual(L.pushRecent(['a', 'b', 'c'], 'd', 2), ['d', 'a']));
t('dữ liệu hỏng (không phải mảng) không lỗi', () => assert.deepStrictEqual(L.pushRecent('rac', 'a', 3), ['a']));
t('loại id không còn trong danh mục', () =>
  assert.deepStrictEqual(L.pushRecent(['cu', 'a'], 'b', 5, ['a', 'b']), ['b', 'a']));
t('toggleFav thêm rồi bỏ, không đột biến mảng gốc', () => {
  const src = ['a'];
  const added = L.toggleFav(src, 'b');
  assert.deepStrictEqual(added, ['a', 'b']);
  assert.deepStrictEqual(L.toggleFav(added, 'a'), ['b']);
  assert.deepStrictEqual(src, ['a']);
});

console.log('safePagePath()');
t('tên tệp hợp lệ', () => assert.strictEqual(L.safePagePath('so-sanh-ppi-duoc-ly-lam-sang.html'), 'pages/so-sanh-ppi-duoc-ly-lam-sang.html'));
t('chặn ../, thư mục con, URL ngoài, javascript:, rỗng', () => {
  ['../index.html', 'a/b.html', 'https://x.com/a.html', 'javascript:alert(1)', '', null, 'a.htm', '..html']
    .forEach(f => assert.strictEqual(L.safePagePath(f), null, String(f)));
});
t('mọi tệp trong danh mục đều qua được safePagePath', () =>
  R.forEach(r => assert.ok(L.safePagePath(r.file), r.file)));

console.log(`\nKết quả: ${pass} đạt, ${fail} lỗi`);
process.exit(fail ? 1 : 0);

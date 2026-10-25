/* Cẩm nang Dược lâm sàng – hàm thuần (không đụng DOM), dùng chung cho trình duyệt và Node test. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PortalLib = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Chuẩn hoá chuỗi để tìm kiếm không phân biệt dấu tiếng Việt, hoa/thường.
  function norm(s) {
    return String(s == null ? '' : s)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function haystack(rec) {
    return norm([rec.label, rec.title, rec.org, rec.specialty, rec.year, rec.file].join(' '));
  }

  // Mọi từ khoá (tách theo khoảng trắng) đều phải xuất hiện.
  function matches(rec, query) {
    var q = norm(query);
    if (!q) return true;
    var h = haystack(rec);
    return q.split(' ').every(function (t) { return h.indexOf(t) !== -1; });
  }

  function search(records, query) {
    return (records || []).filter(function (r) { return matches(r, query); });
  }

  // Gom theo nhóm, giữ đúng thứ tự nhóm khai báo; bản ghi có nhóm lạ được bỏ qua.
  function groupBy(records, groups) {
    var out = (groups || []).map(function (g) { return { group: g, items: [] }; });
    var idx = {};
    out.forEach(function (o, i) { idx[o.group.id] = i; });
    (records || []).forEach(function (r) {
      if (Object.prototype.hasOwnProperty.call(idx, r.group)) out[idx[r.group]].items.push(r);
    });
    return out;
  }

  // Định tuyến theo hash: '#/', '#/doc/<id>', '#/nhom/<id>', '#/thu-vien', '#/gan-day', '#/yeu-thich', '#/gioi-thieu'.
  function parseRoute(hash) {
    var h = String(hash || '').replace(/^#\/?/, '');
    var parts = h.split('/').filter(Boolean).map(function (p) {
      try { return decodeURIComponent(p); } catch (e) { return p; }
    });
    if (!parts.length) return { name: 'home' };
    if (parts[0] === 'doc' && parts[1]) return { name: 'doc', id: parts[1] };
    if (parts[0] === 'nhom' && parts[1]) return { name: 'group', id: parts[1] };
    if (parts[0] === 'thu-vien') return { name: 'library' };
    if (parts[0] === 'gan-day') return { name: 'recent' };
    if (parts[0] === 'yeu-thich') return { name: 'favorites' };
    if (parts[0] === 'gioi-thieu') return { name: 'about' };
    return { name: 'notfound', raw: h };
  }

  function findById(records, id) {
    for (var i = 0; i < (records || []).length; i++) if (records[i].id === id) return records[i];
    return null;
  }

  // Tài liệu trước/sau trong cùng nhóm (để chuyển nhanh).
  function neighbors(records, id) {
    var cur = findById(records, id);
    if (!cur) return { prev: null, next: null };
    var same = records.filter(function (r) { return r.group === cur.group; });
    var i = same.indexOf(cur);
    return { prev: i > 0 ? same[i - 1] : null, next: i < same.length - 1 ? same[i + 1] : null };
  }

  // Danh sách "gần đây": đưa id lên đầu, bỏ trùng, giới hạn độ dài, bỏ id không còn trong danh mục.
  function pushRecent(list, id, max, validIds) {
    var arr = (Array.isArray(list) ? list : []).filter(function (x) { return x !== id; });
    arr.unshift(id);
    if (validIds) arr = arr.filter(function (x) { return validIds.indexOf(x) !== -1; });
    return arr.slice(0, max || 6);
  }

  function toggleFav(list, id) {
    var arr = Array.isArray(list) ? list.slice() : [];
    var i = arr.indexOf(id);
    if (i === -1) arr.push(id); else arr.splice(i, 1);
    return arr;
  }

  // Chỉ chấp nhận tên tệp phẳng .html trong pages/ (chặn ../, URL ngoài, javascript:).
  function safePagePath(file) {
    var f = String(file || '');
    if (!/^[A-Za-z0-9._-]+\.html$/.test(f) || f.indexOf('..') !== -1) return null;
    return 'pages/' + f;
  }

  return {
    norm: norm, matches: matches, search: search, groupBy: groupBy,
    parseRoute: parseRoute, findById: findById, neighbors: neighbors,
    pushRecent: pushRecent, toggleFav: toggleFav, safePagePath: safePagePath
  };
});

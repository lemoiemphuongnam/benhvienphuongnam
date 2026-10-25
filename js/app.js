/* Cẩm nang Dược lâm sàng – giao diện mẫu A: sidebar dạng cây, trang chủ tìm trước, thư viện dạng bảng,
   Tìm nhanh (Ctrl K), thanh dưới cho điện thoại, khung đọc có nhãn trạng thái. Logic thuần ở js/lib.js. */
(function () {
  'use strict';
  var L = window.PortalLib;
  var $ = function (id) { return document.getElementById(id); };
  var root = document.documentElement;
  var app = $('app');
  var DESKTOP = window.matchMedia('(min-width: 900px)');

  var APP_NAME = 'Cẩm nang Dược lâm sàng';
  var GROUP_ICON = { book: 'i-book', pill: 'i-pill', scale: 'i-scale', flask: 'i-flask' };
  var GROUP_SHORT = { guideline: 'Guideline', thuoc: 'Thông tin thuốc', 'so-sanh': 'So sánh', ebm: 'EBM' };
  var SUGGEST = ['Suy tim', 'Gram âm', 'Đái tháo đường', 'AKI', 'Statin'];
  var THEMES = ['auto', 'light', 'dark'];
  var THEME_LABEL = { auto: 'theo hệ thống', light: 'sáng', dark: 'tối' };
  var THEME_ICON = { auto: 'i-auto', light: 'i-sun', dark: 'i-moon' };

  var state = {
    cat: null, records: [], groups: [], ids: [], route: { name: 'home' },
    fav: [], recent: [], open: {}, hq: '', libGroup: '', palSel: 0
  };

  /* ---------- Lưu trữ cục bộ: chỉ tuỳ chọn hiển thị, không có dữ liệu bệnh nhân ---------- */
  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* chế độ riêng tư: bỏ qua */ }
  }
  function saveRaw(key, val) {
    try { if (val == null) localStorage.removeItem(key); else localStorage.setItem(key, val); } catch (e) {}
  }

  /* ---------- Tiện ích ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function icon(id, cls) { return '<svg class="ico' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#' + id + '"/></svg>'; }
  function groupOf(rec) { for (var i = 0; i < state.groups.length; i++) if (state.groups[i].id === rec.group) return state.groups[i]; return null; }
  function groupById(id) { for (var i = 0; i < state.groups.length; i++) if (state.groups[i].id === id) return state.groups[i]; return null; }
  function groupIcon(g) { return GROUP_ICON[g && g.icon] || 'i-book'; }
  function docHref(rec) { return '#/doc/' + encodeURIComponent(rec.id); }
  function source(rec) { return [rec.org, rec.year].filter(Boolean).join(' · '); }
  function byGroup(id) { return state.records.filter(function (r) { return r.group === id; }); }
  function idsToRecs(ids) { return ids.map(function (id) { return L.findById(state.records, id); }).filter(Boolean); }
  function isFav(id) { return state.fav.indexOf(id) !== -1; }
  // Tiêu đề đầy đủ chỉ hiện khi bổ sung thông tin so với nhãn (tránh lặp "Lipitor / Lipitor – …").
  function extraTitle(rec) { return L.norm(rec.title).indexOf(L.norm(rec.label)) === 0 ? '' : rec.title; }

  // Tô đậm từ khoá tìm thấy (so khớp không dấu, giữ nguyên chữ gốc).
  function highlight(text, q) {
    var terms = L.norm(q).split(' ').filter(Boolean);
    if (!terms.length) return esc(text);
    var src = String(text), n = '', map = [];
    for (var i = 0; i < src.length; i++) {
      var c = L.norm(src[i]) || (src[i] === ' ' ? ' ' : '');
      for (var k = 0; k < c.length; k++) { n += c[k]; map.push(i); }
    }
    var mark = new Array(src.length).fill(false);
    terms.forEach(function (t) {
      var from = 0, at;
      while ((at = n.indexOf(t, from)) !== -1) {
        for (var j = at; j < at + t.length; j++) mark[map[j]] = true;
        from = at + t.length;
      }
    });
    var out = '', open = false;
    for (var x = 0; x < src.length; x++) {
      if (mark[x] && !open) { out += '<mark>'; open = true; }
      if (!mark[x] && open) { out += '</mark>'; open = false; }
      out += esc(src[x]);
    }
    return out + (open ? '</mark>' : '');
  }

  /* ---------- Sidebar ---------- */
  function cur(on) { return on ? ' aria-current="page"' : ''; }

  function renderNav() {
    var r = state.route;
    var activeGroup = r.name === 'group' ? r.id : (r.name === 'doc' ? ((L.findById(state.records, r.id) || {}).group) : null);
    var html = '<ul class="nav-list">' +
      '<li><a class="it" href="#/"' + cur(r.name === 'home') + '>' + icon('i-home') + '<span class="lbl">Trang chủ</span></a></li>' +
      '<li><a class="it" href="#/gan-day"' + cur(r.name === 'recent') + '>' + icon('i-clock') + '<span class="lbl">Gần đây</span><span class="n">' + state.recent.length + '</span></a></li>' +
      '<li><a class="it" href="#/yeu-thich"' + cur(r.name === 'favorites') + '>' + icon('i-star') + '<span class="lbl">Yêu thích</span><span class="n">' + state.fav.length + '</span></a></li>' +
      '</ul><div class="sec">Thư viện</div><ul class="nav-list">';
    state.groups.forEach(function (g) {
      var items = byGroup(g.id);
      var active = activeGroup === g.id;
      var expanded = Object.prototype.hasOwnProperty.call(state.open, g.id) ? !!state.open[g.id] : active;
      html += '<li><div class="grp" data-g="' + esc(g.id) + '">' +
        '<a class="it" href="#/nhom/' + esc(g.id) + '"' + cur(r.name === 'group' && r.id === g.id) + ' title="' + esc(g.label) + '">' +
          '<span class="dot" aria-hidden="true"></span><span class="lbl">' + esc(g.label) + '</span><span class="n">' + items.length + '</span></a>' +
        '<button type="button" class="icon-btn tg" data-toggle="' + esc(g.id) + '" aria-expanded="' + expanded + '" aria-controls="tr-' + esc(g.id) + '" aria-label="Danh sách ' + esc(g.label) + '">' + icon('i-chev') + '</button>' +
        '</div><ul class="tree" id="tr-' + esc(g.id) + '"' + (expanded ? '' : ' hidden') + '>' +
        items.map(function (rec) {
          return '<li><a href="' + docHref(rec) + '"' + cur(r.name === 'doc' && r.id === rec.id) + ' title="' + esc(rec.title) + '">' + esc(rec.label) + '</a></li>';
        }).join('') + '</ul></li>';
    });
    html += '</ul>';
    $('nav').innerHTML = html;
    document.querySelectorAll('.sb-foot [data-route]').forEach(function (a) {
      if (a.getAttribute('data-route') === r.name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var c = $('nav').querySelector('.tree [aria-current="page"]');
    if (c && c.scrollIntoView) c.scrollIntoView({ block: 'nearest' });
  }

  /* ---------- Thanh dưới (điện thoại) ---------- */
  function renderTabbar() {
    var n = state.route.name;
    var tab = n === 'home' ? 'home' : (n === 'library' || n === 'group') ? 'library' : n === 'favorites' ? 'favorites' : '';
    document.querySelectorAll('#tabbar a').forEach(function (a) {
      if (a.getAttribute('data-tab') === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  /* ---------- Danh sách tài liệu ---------- */
  function row(rec, q) {
    var g = groupOf(rec);
    var on = isFav(rec.id);
    var extra = extraTitle(rec);
    return '<div class="row" role="listitem" data-g="' + esc(rec.group) + '">' +
      '<a class="row-main" href="' + docHref(rec) + '">' +
        '<span class="gi">' + icon(groupIcon(g)) + '</span>' +
        '<span class="rt"><b>' + highlight(rec.label, q) + (rec.draft ? ' <span class="pill draft">Dự thảo</span>' : '') + '</b>' +
          (extra ? '<small class="t-full">' + highlight(extra, q) + '</small>' : '') +
          '<small class="m-meta">' + esc([GROUP_SHORT[rec.group], rec.specialty].filter(Boolean).join(' · ')) + '</small></span>' +
      '</a>' +
      '<span class="c-grp"><span class="pill">' + esc(GROUP_SHORT[rec.group] || (g && g.label) || '') + '</span></span>' +
      '<span class="c-spec">' + highlight(rec.specialty, q) + '</span>' +
      '<span class="c-src">' + highlight(source(rec), q) + '</span>' +
      '<button type="button" class="icon-btn fav" data-fav="' + esc(rec.id) + '" aria-pressed="' + on + '" aria-label="' + (on ? 'Bỏ khỏi' : 'Thêm vào') + ' yêu thích: ' + esc(rec.label) + '">' + icon('i-star') + '</button>' +
    '</div>';
  }
  function libList(list, q, emptyHtml) {
    if (!list.length) return emptyHtml || emptyBox('i-search', 'Không tìm thấy tài liệu', 'Thử từ khoá khác, ví dụ tên hoạt chất, bệnh hoặc tổ chức ban hành.');
    return '<div class="lib" role="list" aria-label="Danh sách tài liệu">' +
      '<div class="lib-h" aria-hidden="true"><span>Tài liệu</span><span>Nhóm</span><span>Chuyên khoa</span><span>Nguồn</span><span></span></div>' +
      list.map(function (rec) { return row(rec, q); }).join('') + '</div>';
  }
  function emptyBox(ic, title, text) {
    return '<div class="empty">' + icon(ic) + '<h2>' + esc(title) + '</h2><p>' + text + '</p></div>';
  }
  function noteLine() {
    return '<p class="note">' + icon('i-alert') + '<span>Nội dung các trang chưa được thẩm định lại · Không nhập, không lưu dữ liệu người bệnh (NĐ 13/2023/NĐ-CP) · <a href="#/gioi-thieu">Chi tiết</a></span></p>';
  }

  /* ---------- Các trang ---------- */
  function pageHome() {
    var recent = idsToRecs(state.recent).slice(0, 3);
    var list = L.search(state.records, state.hq);
    var html = '<div class="wrap">' +
      '<h1 class="hello" id="page-h">Hôm nay cần tra cứu gì?</h1>' +
      '<p class="sub">' + state.records.length + ' tài liệu · tìm theo tên thuốc, bệnh, tổ chức hoặc chuyên khoa, không cần gõ dấu.</p>' +
      '<div class="hsearch' + (state.hq ? ' has-q' : '') + '" id="hs" role="search">' + icon('i-search') +
        '<label class="sr-only" for="home-q">Tìm trong thư viện</label>' +
        '<input id="home-q" type="search" placeholder="Ví dụ: suy tim, meropenem, KDIGO…" autocomplete="off" spellcheck="false" enterkeyhint="go" value="' + esc(state.hq) + '">' +
        '<kbd aria-hidden="true">/</kbd><button type="button" class="icon-btn clear" id="home-clear" aria-label="Xoá từ khoá">' + icon('i-x') + '</button></div>' +
      '<div class="sugg" role="group" aria-label="Gợi ý tìm kiếm">' + SUGGEST.map(function (s) {
        return '<button type="button" data-sugg="' + esc(s) + '">' + esc(s) + '</button>';
      }).join('') + '</div>';
    if (recent.length) {
      html += '<div class="h2"><h2>Đọc tiếp</h2><span class="count">' + recent.length + ' tài liệu gần nhất</span><a href="#/gan-day">Xem tất cả</a></div><div class="cont">' +
        recent.map(function (rec) {
          var g = groupOf(rec);
          return '<a class="cc" href="' + docHref(rec) + '" data-g="' + esc(rec.group) + '"><span class="t"><span class="dot"></span>' + esc(g ? g.label : '') + '</span>' +
            '<b>' + esc(rec.label) + '</b><span class="t">' + esc([rec.specialty, rec.org].filter(Boolean).join(' · ')) + '</span></a>';
        }).join('') + '</div>';
    }
    html += '<div class="h2"><h2>Thư viện</h2><span class="count" id="lib-count" aria-live="polite">' + libCount(list.length) + '</span><a href="#/thu-vien">Xem theo nhóm</a></div>' +
      '<div id="home-lib">' + libList(list, state.hq) + '</div>' + noteLine() + '</div>';
    return html;
  }
  function libCount(n) { return state.hq ? n + ' kết quả cho “' + esc(state.hq) + '”' : n + ' tài liệu'; }

  function pageLibrary() {
    var list = state.libGroup ? byGroup(state.libGroup) : state.records;
    return '<div class="wrap"><h1 class="page-h" id="page-h">Thư viện</h1><p class="sub">' + state.records.length + ' tài liệu trong ' + state.groups.length + ' nhóm.</p>' +
      '<div class="chips" role="group" aria-label="Lọc theo nhóm">' +
        '<button type="button" class="chip" data-libg="" aria-pressed="' + (!state.libGroup) + '">Tất cả · ' + state.records.length + '</button>' +
        state.groups.map(function (g) {
          return '<button type="button" class="chip" data-libg="' + esc(g.id) + '" data-g="' + esc(g.id) + '" aria-pressed="' + (state.libGroup === g.id) + '"><span class="dot" aria-hidden="true"></span>' + esc(g.label) + ' · ' + byGroup(g.id).length + '</button>';
        }).join('') + '</div>' + libList(list, '') + noteLine() + '</div>';
  }

  function pageGroup(id) {
    var g = groupById(id);
    if (!g) return pageNotFound();
    var items = byGroup(id);
    return '<div class="wrap" data-g="' + esc(id) + '"><h1 class="page-h" id="page-h">' + esc(g.label) + '</h1><p class="sub">' + items.length + ' tài liệu.</p>' +
      libList(items, '') + noteLine() + '</div>';
  }

  function pageRecent() {
    var items = idsToRecs(state.recent);
    return '<div class="wrap"><h1 class="page-h" id="page-h">Gần đây</h1><p class="sub">Tài liệu đã mở gần nhất trên máy này.</p>' +
      libList(items, '', emptyBox('i-clock', 'Chưa mở tài liệu nào', 'Tài liệu bạn mở sẽ hiện ở đây để quay lại nhanh.')) + '</div>';
  }

  function pageFav() {
    var items = idsToRecs(state.fav);
    return '<div class="wrap"><h1 class="page-h" id="page-h">Yêu thích</h1><p class="sub">Tài liệu đã ghim trên máy này.</p>' +
      libList(items, '', emptyBox('i-star', 'Chưa có tài liệu yêu thích', 'Bấm biểu tượng ngôi sao ở cuối mỗi dòng, hoặc trên thanh trên khi đang đọc, để ghim vào đây.')) + '</div>';
  }

  function pageAbout() {
    var c = state.cat;
    return '<div class="wrap prose"><h1 class="page-h" id="page-h">Giới thiệu &amp; lưu ý</h1>' +
      '<p><b>Cẩm nang Dược lâm sàng</b> (Khoa Dược – BV X) gom các trang tài liệu HTML của Khoa Dược vào một ứng dụng có thanh điều hướng bên trái, tìm kiếm không dấu và dùng được ngoại tuyến sau lần mở đầu tiên (PWA).</p>' +
      '<h2>Lưu ý chuyên môn</h2>' +
      '<div class="callout">' + icon('i-alert') + '<span>Cổng không sửa nội dung các trang gốc. Nội dung chuyên môn trong từng trang <b>chưa được thẩm định lại</b> khi đưa vào cổng; mỗi trang có nguồn riêng ở cuối trang. Tài liệu gắn nhãn <b>Dự thảo</b> tóm tắt bản lấy ý kiến, chưa phải bản chính thức. Khi áp dụng cho người bệnh cần đối chiếu nguồn gốc và nên có thêm một dược sĩ hoặc bác sĩ khác rà soát.</span></div>' +
      '<h2>Dữ liệu cá nhân</h2>' +
      '<p>Cổng chỉ hiển thị tài liệu tham khảo, không nhập và không lưu dữ liệu người bệnh. Dữ liệu sức khỏe là dữ liệu cá nhân nhạy cảm (Nghị định 13/2023/NĐ-CP); đơn vị triển khai chịu trách nhiệm pháp lý và nên đối chiếu với bộ phận pháp chế.</p>' +
      '<h2>Dữ liệu</h2><table><tbody>' +
        '<tr><th>Phiên bản danh mục</th><td>' + esc(c.version) + '</td></tr>' +
        '<tr><th>Ngày cập nhật</th><td>' + esc(c.updated) + '</td></tr>' +
        '<tr><th>Trạng thái</th><td>' + (c.status === 'verified' ? 'Đã đối chiếu nguồn' : 'Chưa kiểm chứng') + '</td></tr>' +
        '<tr><th>Nguồn</th><td>' + esc(c.source) + '</td></tr>' +
        '<tr><th>Lưu trên máy</th><td>Chỉ tuỳ chọn hiển thị (giao diện, yêu thích, gần đây, nhóm đang mở) trong trình duyệt này. Không gửi dữ liệu lên máy chủ.</td></tr>' +
      '</tbody></table>' +
      '<h2>Phím tắt</h2><table><tbody>' +
        '<tr><th><kbd>Ctrl</kbd> + <kbd>K</kbd></th><td>Tìm nhanh ở mọi màn hình</td></tr>' +
        '<tr><th><kbd>/</kbd></th><td>Tìm trong thư viện (trang chủ) hoặc mở Tìm nhanh</td></tr>' +
        '<tr><th><kbd>↑</kbd> <kbd>↓</kbd> <kbd>Enter</kbd></th><td>Chọn và mở kết quả trong Tìm nhanh</td></tr>' +
        '<tr><th><kbd>Esc</kbd></th><td>Đóng Tìm nhanh / thanh bên trên điện thoại</td></tr>' +
        '<tr><th><kbd>Ctrl</kbd> + <kbd>B</kbd></th><td>Thu gọn / mở rộng thanh bên</td></tr>' +
        '<tr><th><kbd>Alt</kbd> + <kbd>←</kbd> / <kbd>→</kbd></th><td>Tài liệu trước / sau trong nhóm</td></tr>' +
      '</tbody></table>' +
      '<h2>Cài như ứng dụng</h2>' +
      '<p>Android/Chrome: menu ⋮ → <i>Cài đặt ứng dụng</i>. iPhone/Safari: nút Chia sẻ → <i>Thêm vào MH chính</i>. Mở mỗi tài liệu một lần khi có mạng để lưu bản ngoại tuyến; một số trang tải phông chữ và thư viện biểu đồ từ CDN nên lần đầu cần mạng.</p>' +
      '</div>';
  }

  function pageNotFound() {
    return '<div class="wrap">' + emptyBox('i-search', 'Không tìm thấy trang', 'Đường dẫn không đúng hoặc tài liệu đã được gỡ khỏi danh mục. <a href="#/">Về trang chủ</a>.') + '</div>';
  }

  /* ---------- Khung đọc tài liệu ---------- */
  var frame = $('frame');
  var viewDoc = $('view-doc');
  var currentSrc = '';
  frame.addEventListener('load', function () {
    viewDoc.classList.remove('loading'); viewDoc.classList.add('loaded');
  });

  function showDoc(rec) {
    var src = L.safePagePath(rec.file);
    if (!src) return false;
    $('view-page').hidden = true;
    viewDoc.hidden = false;
    // Nạp lại nếu khung đang ở trang khác (vd. người dùng đã bấm liên kết ngoài bên trong tài liệu).
    var actual = '';
    try { actual = frame.contentWindow.location.pathname; } catch (e) { /* khác nguồn gốc */ }
    if (currentSrc !== src || actual.slice(-src.length) !== src) {
      currentSrc = src;
      viewDoc.classList.remove('loaded'); viewDoc.classList.add('loading');
      frame.title = rec.title;
      // replace() để không chồng lịch sử của iframe lên nút Back của ứng dụng.
      try { frame.contentWindow.location.replace(src); } catch (e) { frame.src = src; }
    }
    var g = groupOf(rec);
    $('docbar').innerHTML =
      (state.cat.status !== 'verified' ? '<span class="st unv">' + icon('i-alert') + 'Chưa thẩm định lại</span>' : '') +
      (rec.draft ? '<span class="st draft">Dự thảo</span>' : '') +
      '<span class="src" title="' + esc(rec.title) + '">' + esc([g && g.label, rec.specialty, source(rec)].filter(Boolean).join(' · ')) + '</span>';
    var on = isFav(rec.id);
    var fb = $('btn-fav');
    fb.setAttribute('aria-pressed', on);
    fb.setAttribute('aria-label', on ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích');
    $('btn-open').href = src;
    var nb = L.neighbors(state.records, rec.id);
    $('btn-prev').disabled = !nb.prev; $('btn-prev').title = nb.prev ? 'Trước: ' + nb.prev.label : '';
    $('btn-next').disabled = !nb.next; $('btn-next').title = nb.next ? 'Sau: ' + nb.next.label : '';
    state.recent = L.pushRecent(state.recent, rec.id, 8, state.ids);
    save('cpai.recent', state.recent);
    return true;
  }

  /* ---------- Định tuyến ---------- */
  // parts: [{label, href}], phần tử cuối là trang hiện tại.
  function setCrumb(parts) {
    var all = [{ label: APP_NAME, href: '#/', cls: 'c-root' }].concat(parts);
    $('crumb').innerHTML = all.map(function (p, i) {
      var last = i === all.length - 1;
      var el = last ? '<b aria-current="page">' + esc(p.label) + '</b>' : '<a href="' + p.href + '" class="' + (p.cls || '') + '">' + esc(p.label) + '</a>';
      return el + (last ? '' : '<span class="sep" aria-hidden="true">/</span>');
    }).join('');
    var title = parts.length ? parts[parts.length - 1].label : '';
    document.title = (title && title !== 'Trang chủ' ? title + ' · ' : '') + APP_NAME;
  }

  function render() {
    if (!state.cat) return;
    var r = state.route = L.parseRoute(location.hash);
    var page = $('view-page');
    $('doc-actions').hidden = r.name !== 'doc';

    if (r.name === 'doc') {
      var rec = L.findById(state.records, r.id);
      if (rec && showDoc(rec)) {
        var g = groupOf(rec);
        setCrumb([{ label: g ? g.label : '', href: '#/nhom/' + rec.group }, { label: rec.label }]);
        renderNav(); renderTabbar(); closeDrawer();
        return;
      }
      r = state.route = { name: 'notfound' };
      $('doc-actions').hidden = true;
    }

    viewDoc.hidden = true;
    page.hidden = false;
    var crumb = [];
    if (r.name === 'home') { page.innerHTML = pageHome(); crumb = [{ label: 'Trang chủ' }]; }
    else if (r.name === 'library') { page.innerHTML = pageLibrary(); crumb = [{ label: 'Thư viện' }]; }
    else if (r.name === 'group') {
      page.innerHTML = pageGroup(r.id);
      var gg = groupById(r.id);
      crumb = gg ? [{ label: 'Thư viện', href: '#/thu-vien' }, { label: gg.label }] : [{ label: 'Không tìm thấy' }];
    }
    else if (r.name === 'recent') { page.innerHTML = pageRecent(); crumb = [{ label: 'Gần đây' }]; }
    else if (r.name === 'favorites') { page.innerHTML = pageFav(); crumb = [{ label: 'Yêu thích' }]; }
    else if (r.name === 'about') { page.innerHTML = pageAbout(); crumb = [{ label: 'Giới thiệu & lưu ý' }]; }
    else { page.innerHTML = pageNotFound(); crumb = [{ label: 'Không tìm thấy' }]; }
    page.scrollTop = 0;
    setCrumb(crumb);
    renderNav(); renderTabbar(); closeDrawer();
  }

  // Vẽ lại trang hiện tại nhưng giữ vị trí cuộn và đưa tiêu điểm về phần tử tương ứng.
  function rerenderKeep(selector) {
    var page = $('view-page'), y = page.scrollTop;
    render();
    page.scrollTop = y;
    var el = selector && page.querySelector(selector);
    if (el) el.focus();
  }

  /* ---------- Tìm trong trang chủ ---------- */
  function updateHomeList() {
    var list = L.search(state.records, state.hq);
    var box = $('home-lib'); if (!box) return;
    box.innerHTML = libList(list, state.hq);
    $('lib-count').innerHTML = libCount(list.length);
    $('hs').classList.toggle('has-q', !!state.hq);
  }

  /* ---------- Tìm nhanh (Ctrl K) ---------- */
  var pal = $('pal'), palQ = $('pal-q'), palList = $('pal-list');
  var lastFocus = null;
  function palOptions() { return palList.querySelectorAll('[role="option"]'); }
  function renderPal() {
    var q = palQ.value;
    var html = '';
    function opt(rec, i) {
      var g = groupOf(rec);
      return '<li role="option" id="po-' + i + '" data-id="' + esc(rec.id) + '" aria-selected="false" data-g="' + esc(rec.group) + '">' +
        '<span class="gi">' + icon(groupIcon(g)) + '</span><span><b>' + highlight(rec.label, q) + '</b>' +
        '<small>' + esc([GROUP_SHORT[rec.group], rec.specialty, source(rec)].filter(Boolean).join(' · ')) + '</small></span></li>';
    }
    var i = 0;
    if (L.norm(q)) {
      var res = L.search(state.records, q);
      html = res.length ? '<li class="grp-h" role="presentation">Kết quả · ' + res.length + '</li>' + res.map(function (r) { return opt(r, i++); }).join('')
        : '<li class="empty" role="presentation">' + icon('i-search') + '<h2>Không tìm thấy</h2><p>Thử tên hoạt chất, bệnh hoặc tổ chức khác.</p></li>';
    } else {
      var rec = idsToRecs(state.recent).slice(0, 5);
      var rest = state.records.filter(function (r) { return rec.indexOf(r) === -1; });
      if (rec.length) html += '<li class="grp-h" role="presentation">Gần đây</li>' + rec.map(function (r) { return opt(r, i++); }).join('');
      html += '<li class="grp-h" role="presentation">Tất cả tài liệu</li>' + rest.map(function (r) { return opt(r, i++); }).join('');
    }
    palList.innerHTML = html;
    selectPal(0);
  }
  function selectPal(n) {
    var opts = palOptions();
    if (!opts.length) { palQ.removeAttribute('aria-activedescendant'); return; }
    state.palSel = (n + opts.length) % opts.length;
    opts.forEach(function (o, k) { o.setAttribute('aria-selected', String(k === state.palSel)); });
    var el = opts[state.palSel];
    palQ.setAttribute('aria-activedescendant', el.id);
    if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }
  function openPal() {
    if (!state.cat || !pal.hidden) return;
    lastFocus = document.activeElement;
    closeDrawer();
    pal.hidden = false;
    app.setAttribute('inert', '');
    palQ.value = '';
    renderPal();
    palQ.focus();
  }
  function closePal() {
    if (pal.hidden) return;
    pal.hidden = true;
    app.removeAttribute('inert');
    if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus();
  }
  function goPal(el) {
    if (!el) return;
    var id = el.getAttribute('data-id');
    closePal();
    location.hash = '#/doc/' + encodeURIComponent(id);
  }
  palQ.addEventListener('input', renderPal);
  pal.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePal(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); selectPal(state.palSel + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); selectPal(state.palSel - 1); }
    else if (e.key === 'Enter' && e.target === palQ) { e.preventDefault(); goPal(palOptions()[state.palSel]); }
    else if (e.key === 'Tab') {
      // Giữ tiêu điểm trong hộp thoại: chỉ có ô tìm và nút đóng.
      e.preventDefault();
      var closeBtn = pal.querySelector('.pal-in [data-close]');
      (document.activeElement === palQ ? closeBtn : palQ).focus();
    }
  });
  palList.addEventListener('click', function (e) { goPal(e.target.closest('[role="option"]')); });
  palList.addEventListener('mousemove', function (e) {
    var o = e.target.closest('[role="option"]');
    if (!o) return;
    var opts = Array.prototype.slice.call(palOptions());
    var k = opts.indexOf(o);
    if (k !== -1 && k !== state.palSel) selectPal(k);
  });
  pal.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) closePal(); });

  /* ---------- Ngăn kéo (điện thoại) và thu gọn (máy tính) ---------- */
  function openDrawer() {
    app.setAttribute('data-drawer', 'open');
    $('btn-menu').setAttribute('aria-expanded', 'true');
  }
  function closeDrawer(returnFocus) {
    if (app.getAttribute('data-drawer') !== 'open') return;
    app.removeAttribute('data-drawer');
    $('btn-menu').setAttribute('aria-expanded', 'false');
    if (returnFocus) $('btn-menu').focus();
  }
  function setRail(on) {
    if (on) app.setAttribute('data-sb', 'rail'); else app.removeAttribute('data-sb');
    $('btn-collapse').setAttribute('aria-label', on ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên');
    save('cpai.rail', !!on);
  }
  // Sidebar ẩn khỏi trình đọc màn hình khi là ngăn kéo đang đóng.
  function syncInert() {
    var hide = !DESKTOP.matches && app.getAttribute('data-drawer') !== 'open';
    if (hide) $('sidebar').setAttribute('inert', ''); else $('sidebar').removeAttribute('inert');
  }
  new MutationObserver(syncInert).observe(app, { attributes: true, attributeFilter: ['data-drawer'] });
  if (DESKTOP.addEventListener) DESKTOP.addEventListener('change', function () { closeDrawer(); syncInert(); });

  /* ---------- Giao diện sáng/tối ---------- */
  function applyTheme(t) {
    if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t); else root.removeAttribute('data-theme');
    var b = $('btn-theme');
    b.querySelector('use').setAttribute('href', '#' + THEME_ICON[t]);
    b.title = 'Giao diện: ' + THEME_LABEL[t];
    b.setAttribute('aria-label', 'Đổi giao diện (hiện tại: ' + THEME_LABEL[t] + ')');
    $('theme-lbl').textContent = 'Giao diện: ' + THEME_LABEL[t];
  }

  /* ---------- Sự kiện ---------- */
  $('nav').addEventListener('click', function (e) {
    var t = e.target.closest('[data-toggle]');
    if (!t) return;
    var id = t.getAttribute('data-toggle');
    var open = t.getAttribute('aria-expanded') !== 'true';
    state.open[id] = open;
    save('cpai.open', state.open);
    t.setAttribute('aria-expanded', String(open));
    var ul = $('tr-' + id); if (ul) ul.hidden = !open;
  });

  function toggleFav(id) {
    state.fav = L.toggleFav(state.fav, id);
    save('cpai.fav', state.fav);
  }
  var page = $('view-page');
  page.addEventListener('click', function (e) {
    var f = e.target.closest('[data-fav]');
    if (f) {
      var id = f.getAttribute('data-fav');
      toggleFav(id);
      rerenderKeep('[data-fav="' + id + '"]');
      return;
    }
    var chip = e.target.closest('[data-libg]');
    if (chip) {
      state.libGroup = chip.getAttribute('data-libg');
      rerenderKeep('[data-libg="' + state.libGroup + '"]');
      return;
    }
    var s = e.target.closest('[data-sugg]');
    if (s) {
      state.hq = s.getAttribute('data-sugg');
      $('home-q').value = state.hq;
      updateHomeList();
      $('home-q').focus();
      return;
    }
    if (e.target.closest('#home-clear')) {
      state.hq = ''; $('home-q').value = ''; updateHomeList(); $('home-q').focus();
    }
  });
  page.addEventListener('input', function (e) {
    if (e.target.id === 'home-q') { state.hq = e.target.value; updateHomeList(); }
  });
  page.addEventListener('keydown', function (e) {
    if (e.target.id !== 'home-q') return;
    if (e.key === 'Enter') {
      var first = L.search(state.records, state.hq)[0];
      if (first && L.norm(state.hq)) location.hash = docHref(first);
    } else if (e.key === 'Escape' && state.hq) {
      e.stopPropagation(); state.hq = ''; e.target.value = ''; updateHomeList();
    }
  });

  $('btn-fav').addEventListener('click', function () {
    if (state.route.name !== 'doc') return;
    toggleFav(state.route.id);
    render();
  });
  function go(dir) {
    if (state.route.name !== 'doc') return;
    var nb = L.neighbors(state.records, state.route.id)[dir];
    if (nb) location.hash = docHref(nb);
  }
  $('btn-prev').addEventListener('click', function () { go('prev'); });
  $('btn-next').addEventListener('click', function () { go('next'); });

  $('btn-quick').addEventListener('click', openPal);
  $('tab-search').addEventListener('click', openPal);
  $('btn-menu').addEventListener('click', openDrawer);
  $('btn-close').addEventListener('click', function () { closeDrawer(true); });
  $('scrim').addEventListener('click', function () { closeDrawer(true); });
  $('btn-collapse').addEventListener('click', function () { setRail(app.getAttribute('data-sb') !== 'rail'); });

  $('btn-theme').addEventListener('click', function () {
    var curT = root.getAttribute('data-theme') || 'auto';
    var next = THEMES[(THEMES.indexOf(curT) + 1) % THEMES.length];
    applyTheme(next);
    saveRaw('cpai.theme', next === 'auto' ? null : next);
  });

  document.addEventListener('keydown', function (e) {
    if (!pal.hidden) return;   // hộp Tìm nhanh tự xử lý phím
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '') || (e.target && e.target.isContentEditable);
    var k = (e.key || '').toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 'k') { e.preventDefault(); openPal(); }
    else if (e.key === '/' && !typing) {
      e.preventDefault();
      if ($('home-q')) { $('home-q').focus(); $('home-q').select(); } else openPal();
    }
    else if ((e.ctrlKey || e.metaKey) && k === 'b') {
      e.preventDefault();
      if (DESKTOP.matches) setRail(app.getAttribute('data-sb') !== 'rail');
      else if (app.getAttribute('data-drawer') === 'open') closeDrawer(true); else openDrawer();
    }
    else if (e.key === 'Escape' && app.getAttribute('data-drawer') === 'open') closeDrawer(true);
    else if (e.altKey && e.key === 'ArrowLeft' && state.route.name === 'doc') { e.preventDefault(); go('prev'); }
    else if (e.altKey && e.key === 'ArrowRight' && state.route.name === 'doc') { e.preventDefault(); go('next'); }
  });

  window.addEventListener('hashchange', function () { closePal(); render(); });

  function syncOnline() { $('pill-off').hidden = navigator.onLine !== false; }
  window.addEventListener('online', syncOnline);
  window.addEventListener('offline', syncOnline);

  /* ---------- Service worker (ngoại tuyến + báo cập nhật) ---------- */
  function registerSW() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    // Chỉ tải lại khi người dùng chủ động bấm "Tải lại"; lần cài đầu (clients.claim) không tải lại.
    var userAsked = false, reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!userAsked || reloading) return; reloading = true; location.reload();
    });
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      function offer(w) {
        $('toast').hidden = false;
        $('btn-update').onclick = function () { userAsked = true; w.postMessage('SKIP_WAITING'); };
      }
      if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
      reg.addEventListener('updatefound', function () {
        var w = reg.installing;
        if (!w) return;
        w.addEventListener('statechange', function () {
          if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w);
        });
      });
    }).catch(function () { /* không chặn ứng dụng nếu SW lỗi */ });
  }

  /* ---------- Khởi động ---------- */
  function init(cat) {
    state.cat = cat;
    state.groups = cat.groups || [];
    state.records = cat.records || [];
    state.ids = state.records.map(function (r) { return r.id; });
    state.fav = (load('cpai.fav', []) || []).filter(function (id) { return state.ids.indexOf(id) !== -1; });
    state.recent = (load('cpai.recent', []) || []).filter(function (id) { return state.ids.indexOf(id) !== -1; });
    var open = load('cpai.open', {});
    state.open = open && typeof open === 'object' && !Array.isArray(open) ? open : {};
    $('data-meta').innerHTML = 'Danh mục v' + esc(cat.version) + ' · ' + esc(cat.updated) +
      (cat.status === 'unverified' ? ' · <span class="badge-unv">Chưa kiểm chứng</span>' : '');
    render();
  }

  var savedTheme = null;
  try { savedTheme = localStorage.getItem('cpai.theme'); } catch (e) {}
  applyTheme(savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'auto');
  saveRaw('cpai.unit', null);     // khoá của bản 1.0 (bộ chọn đơn vị đã bỏ)
  saveRaw('cpai.closed', null);   // khoá của bản 1.1 (thay bằng cpai.open)
  if (DESKTOP.matches && load('cpai.rail', false) === true) setRail(true);
  syncInert();
  syncOnline();

  fetch('data/catalog.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(init)
    .catch(function (err) {
      $('data-meta').textContent = 'Không tải được danh mục';
      $('view-page').innerHTML = '<div class="wrap">' + emptyBox('i-alert', 'Không tải được danh mục tài liệu',
        'Lỗi: ' + esc(err.message) + '. Nếu đang mở tệp trực tiếp (file://), hãy mở qua máy chủ web (GitHub Pages, hoặc chạy <code>npx serve .</code>). ' +
        'Các tài liệu vẫn mở được trực tiếp trong thư mục <code>pages/</code>.') + '</div>';
    });

  registerSW();
})();

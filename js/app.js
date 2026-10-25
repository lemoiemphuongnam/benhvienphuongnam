/* Cẩm nang Dược lâm sàng – giao diện: sidebar, định tuyến, khung xem tài liệu. Logic thuần ở js/lib.js. */
(function () {
  'use strict';
  var L = window.PortalLib;
  var $ = function (id) { return document.getElementById(id); };
  var root = document.documentElement;
  var app = $('app');
  var DESKTOP = window.matchMedia('(min-width: 900px)');

  var APP_NAME = 'Cẩm nang Dược lâm sàng';
  var GROUP_ICON = { book: 'i-book', pill: 'i-pill', scale: 'i-scale', flask: 'i-flask' };
  var THEMES = ['auto', 'light', 'dark'];
  var THEME_LABEL = { auto: 'theo hệ thống', light: 'sáng', dark: 'tối' };
  var THEME_ICON = { auto: 'i-auto', light: 'i-sun', dark: 'i-moon' };

  var state = {
    cat: null, records: [], groups: [], ids: [],
    q: '', specialty: '', route: { name: 'home' },
    fav: [], recent: [], closed: {}
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

  /* ---------- Tiện ích DOM ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function icon(id, cls) { return '<svg class="ico' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#' + id + '"/></svg>'; }
  function groupOf(rec) { for (var i = 0; i < state.groups.length; i++) if (state.groups[i].id === rec.group) return state.groups[i]; return null; }
  function groupIcon(g) { return GROUP_ICON[g && g.icon] || 'i-book'; }
  function docHref(rec) { return '#/doc/' + encodeURIComponent(rec.id); }
  function meta(rec) { return [rec.org, rec.year].filter(Boolean).join(' · '); }

  // Tô đậm từ khoá tìm thấy trong nhãn (so khớp không dấu, giữ nguyên chữ gốc).
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
  function navItem(rec, opts) {
    var cur = state.route.name === 'doc' && state.route.id === rec.id;
    return '<li><a class="nav-item" href="' + docHref(rec) + '"' + (cur ? ' aria-current="page"' : '') + ' title="' + esc(rec.title) + '">' +
      (opts && opts.icon ? icon(opts.icon) : '') +
      '<span class="lbl">' + highlight(rec.label, state.q) + (opts && opts.sub ? '<span class="sub">' + esc(opts.sub) + '</span>' : '') + '</span></a></li>';
  }

  function renderNav() {
    var nav = $('nav');
    var r = state.route;
    var html = '<ul class="nav-list">' +
      '<li><a class="nav-item" href="#/"' + (r.name === 'home' ? ' aria-current="page"' : '') + '>' + icon('i-home') + '<span class="lbl">Trang chủ</span></a></li>' +
      '<li><a class="nav-item" href="#/yeu-thich"' + (r.name === 'favorites' ? ' aria-current="page"' : '') + '>' + icon('i-star') +
        '<span class="lbl">Yêu thích</span><span class="badge">' + state.fav.length + '</span></a></li>';
    state.groups.forEach(function (g) {
      var n = state.records.filter(function (x) { return x.group === g.id; }).length;
      html += '<li><a class="nav-item" href="#/nhom/' + g.id + '"' + (r.name === 'group' && r.id === g.id ? ' aria-current="page"' : '') + ' title="' + esc(g.label) + '">' +
        icon(groupIcon(g)) + '<span class="lbl">' + esc(g.label) + '</span><span class="badge">' + n + '</span></a></li>';
    });
    html += '</ul>';

    var list = L.search(state.records, state.q);
    if (state.q) {
      html += '<div class="nav-sec docs"><div class="nav-title">Kết quả <span class="count">(' + list.length + ')</span></div>';
      if (!list.length) html += '<div class="nav-empty">Không tìm thấy tài liệu khớp “' + esc(state.q) + '”.</div>';
      else html += '<ul class="nav-list">' + list.map(function (rec) { return navItem(rec, { sub: (groupOf(rec) || {}).label }); }).join('') + '</ul>';
      html += '</div>';
    } else {
      var curId = r.name === 'doc' ? r.id : null;
      var recent = state.recent.filter(function (id) { return id !== curId; })
        .map(function (id) { return L.findById(state.records, id); }).filter(Boolean).slice(0, 4);
      if (recent.length) {
        html += '<div class="nav-sec docs"><div class="nav-title">' + icon('i-clock', 'chev-none') + 'Xem gần đây</div><ul class="nav-list">' +
          recent.map(function (rec) { return navItem(rec); }).join('') + '</ul></div>';
      }
      L.groupBy(list, state.groups).forEach(function (o) {
        if (!o.items.length) return;
        var open = !state.closed[o.group.id];
        var lid = 'nl-' + o.group.id;
        html += '<div class="nav-sec docs"><button type="button" class="nav-title" data-toggle="' + o.group.id + '" aria-expanded="' + open + '" aria-controls="' + lid + '">' +
          esc(o.group.label) + ' <span class="count">' + o.items.length + '</span>' + icon('i-chev', 'chev') + '</button>' +
          '<ul class="nav-list" id="' + lid + '"' + (open ? '' : ' hidden') + '>' + o.items.map(function (rec) { return navItem(rec); }).join('') + '</ul></div>';
      });
    }
    nav.innerHTML = html;
    document.querySelectorAll('.sb-foot .nav-item').forEach(function (a) {
      if (a.getAttribute('data-route') === r.name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var cur = nav.querySelector('.nav-sec [aria-current="page"]');
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
  }

  /* ---------- Thẻ tài liệu ---------- */
  function card(rec) {
    var g = groupOf(rec);
    var on = state.fav.indexOf(rec.id) !== -1;
    return '<div class="card-wrap">' +
      '<a class="card" href="' + docHref(rec) + '">' +
        '<span class="card-top">' + icon(groupIcon(g)) + esc(g ? g.label : '') + '</span>' +
        '<h3>' + esc(rec.label) + '</h3>' +
        '<p>' + esc(rec.title) + '</p>' +
        '<span class="tags">' + (meta(rec) ? '<span class="tag">' + esc(meta(rec)) + '</span>' : '') + '<span class="tag">' + esc(rec.specialty) + '</span></span>' +
      '</a>' +
      '<button type="button" class="icon-btn fav" data-fav="' + esc(rec.id) + '" aria-pressed="' + on + '" aria-label="' + (on ? 'Bỏ khỏi' : 'Thêm vào') + ' yêu thích: ' + esc(rec.label) + '">' + icon('i-star') + '</button>' +
    '</div>';
  }
  function grid(list) { return '<div class="grid">' + list.map(card).join('') + '</div>'; }
  function emptyBox(ic, title, text) {
    return '<div class="empty">' + icon(ic) + '<h2>' + esc(title) + '</h2><p>' + text + '</p></div>';
  }

  /* ---------- Các trang ---------- */
  function privacyNote() {
    return '<div class="note">' + icon('i-alert') + '<span>Cổng chỉ hiển thị tài liệu tham khảo, không nhập và không lưu dữ liệu người bệnh. ' +
      'Dữ liệu sức khỏe là dữ liệu cá nhân nhạy cảm (Nghị định 13/2023/NĐ-CP); đơn vị triển khai chịu trách nhiệm pháp lý và nên đối chiếu với bộ phận pháp chế.</span></div>';
  }

  function pageHome() {
    var c = state.cat;
    var specs = [];
    state.records.forEach(function (r) { if (specs.indexOf(r.specialty) === -1) specs.push(r.specialty); });
    specs.sort(function (a, b) { return a.localeCompare(b, 'vi'); });
    var list = state.records.filter(function (r) { return !state.specialty || r.specialty === state.specialty; });

    var html = '<div class="wrap">' +
      '<div class="hero"><h1 id="page-h">' + esc(APP_NAME) + '</h1>' +
      '<p>Tra cứu nhanh tóm tắt guideline, tài liệu thông tin thuốc, so sánh dược lý và thẩm định bài báo. Dùng thanh bên trái để chuyển tài liệu; gõ <b>/</b> để tìm.</p>' +
      '<div class="stats">' + state.groups.map(function (g) {
        return '<a class="stat" href="#/nhom/' + g.id + '" style="text-decoration:none;color:inherit"><b>' +
          state.records.filter(function (r) { return r.group === g.id; }).length + '</b><span>' + esc(g.label) + '</span></a>';
      }).join('') + '</div>' +
      '<div class="note info">' + icon('i-info') + '<span>Danh mục phiên bản ' + esc(c.version) + ', cập nhật ' + esc(c.updated) +
        (c.status === 'unverified' ? '. <b>Nội dung các trang chưa được thẩm định lại trong cổng này</b>; đối chiếu nguồn gốc trước khi áp dụng cho người bệnh.' : '.') + '</span></div>' +
      privacyNote() + '</div>';

    var recent = state.recent.map(function (id) { return L.findById(state.records, id); }).filter(Boolean);
    if (recent.length) html += '<div class="sec-h"><h2>Xem gần đây</h2></div>' + grid(recent.slice(0, 3));

    html += '<div class="chips" role="group" aria-label="Lọc theo chuyên khoa">' +
      '<button type="button" class="chip" data-spec="" aria-pressed="' + (!state.specialty) + '">Tất cả</button>' +
      specs.map(function (s) { return '<button type="button" class="chip" data-spec="' + esc(s) + '" aria-pressed="' + (state.specialty === s) + '">' + esc(s) + '</button>'; }).join('') +
      '</div>';

    L.groupBy(list, state.groups).forEach(function (o) {
      if (!o.items.length) return;
      html += '<div class="sec-h"><h2>' + esc(o.group.label) + '</h2><span class="count">' + o.items.length + ' tài liệu</span>' +
        '<a href="#/nhom/' + o.group.id + '">Xem nhóm</a></div>' + grid(o.items);
    });
    return html + '</div>';
  }

  function pageGroup(id) {
    var g = null;
    state.groups.forEach(function (x) { if (x.id === id) g = x; });
    if (!g) return pageNotFound();
    var items = state.records.filter(function (r) { return r.group === id; });
    return '<div class="wrap"><div class="sec-h" style="margin-top:0"><h2 id="page-h" style="font-size:20px">' + esc(g.label) + '</h2>' +
      '<span class="count">' + items.length + ' tài liệu</span></div>' + grid(items) + '</div>';
  }

  function pageFav() {
    var items = state.fav.map(function (id) { return L.findById(state.records, id); }).filter(Boolean);
    return '<div class="wrap"><div class="sec-h" style="margin-top:0"><h2 id="page-h" style="font-size:20px">Yêu thích</h2>' +
      '<span class="count">' + items.length + ' tài liệu</span></div>' +
      (items.length ? grid(items) : emptyBox('i-star', 'Chưa có tài liệu yêu thích', 'Bấm biểu tượng ngôi sao trên thẻ tài liệu hoặc trên thanh trên khi đang xem để ghim vào đây.')) + '</div>';
  }

  function pageAbout() {
    var c = state.cat;
    return '<div class="wrap"><div class="prose">' +
      '<h2 id="page-h">Giới thiệu</h2>' +
      '<p><b>Cẩm nang Dược lâm sàng</b> (Khoa Dược – BV X) gom các trang tài liệu HTML của Khoa Dược vào một ứng dụng có thanh điều hướng bên trái, tìm kiếm không dấu và dùng được ngoại tuyến sau lần mở đầu tiên (PWA).</p>' +
      '<h2>Lưu ý chuyên môn</h2>' +
      '<p><span class="badge-unv">Chưa kiểm chứng</span> Cổng không sửa nội dung các trang gốc. Nội dung chuyên môn trong từng trang <b>chưa được thẩm định lại</b> khi đưa vào cổng; mỗi trang có nguồn riêng ở cuối trang. Khi áp dụng cho người bệnh cần đối chiếu nguồn gốc, và nên có thêm một dược sĩ hoặc bác sĩ khác rà soát.</p>' +
      privacyNote() +
      '<h2>Dữ liệu</h2>' +
      '<table><tbody>' +
        '<tr><th>Phiên bản danh mục</th><td>' + esc(c.version) + '</td></tr>' +
        '<tr><th>Ngày cập nhật</th><td>' + esc(c.updated) + '</td></tr>' +
        '<tr><th>Trạng thái</th><td>' + (c.status === 'verified' ? 'Đã đối chiếu nguồn' : 'Chưa kiểm chứng') + '</td></tr>' +
        '<tr><th>Nguồn</th><td>' + esc(c.source) + '</td></tr>' +
        '<tr><th>Lưu trên máy</th><td>Chỉ tuỳ chọn hiển thị (giao diện, đơn vị, yêu thích, gần đây) trong trình duyệt này. Không gửi dữ liệu lên máy chủ.</td></tr>' +
      '</tbody></table>' +
      '<h2>Phím tắt</h2>' +
      '<table><tbody>' +
        '<tr><td><kbd>/</kbd> hoặc <kbd>Ctrl</kbd>+<kbd>K</kbd></td><td>Tìm tài liệu</td></tr>' +
        '<tr><td><kbd>Enter</kbd> trong ô tìm</td><td>Mở kết quả đầu tiên</td></tr>' +
        '<tr><td><kbd>Esc</kbd></td><td>Xoá tìm kiếm / đóng thanh bên trên điện thoại</td></tr>' +
        '<tr><td><kbd>Ctrl</kbd>+<kbd>B</kbd></td><td>Thu gọn / mở rộng thanh bên</td></tr>' +
        '<tr><td><kbd>Alt</kbd>+<kbd>←</kbd> / <kbd>Alt</kbd>+<kbd>→</kbd></td><td>Tài liệu trước / sau trong nhóm</td></tr>' +
      '</tbody></table>' +
      '<h2>Cài như ứng dụng</h2>' +
      '<p>Android/Chrome: menu ⋮ → <i>Cài đặt ứng dụng</i>. iPhone/Safari: nút Chia sẻ → <i>Thêm vào MH chính</i>. Mở mỗi tài liệu một lần khi có mạng để lưu bản ngoại tuyến; một số trang tải phông chữ và thư viện biểu đồ từ CDN nên lần đầu cần mạng.</p>' +
      '</div></div>';
  }

  function pageNotFound() {
    return '<div class="wrap">' + emptyBox('i-search', 'Không tìm thấy trang', 'Đường dẫn không đúng hoặc tài liệu đã được gỡ khỏi danh mục. <a href="#/">Về trang chủ</a>.') + '</div>';
  }

  /* ---------- Khung xem tài liệu ---------- */
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
    var on = state.fav.indexOf(rec.id) !== -1;
    var fb = $('btn-fav');
    fb.setAttribute('aria-pressed', on);
    fb.setAttribute('aria-label', on ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích');
    $('btn-open').href = src;
    var nb = L.neighbors(state.records, rec.id);
    $('btn-prev').disabled = !nb.prev; $('btn-prev').title = nb.prev ? 'Trước: ' + nb.prev.label : '';
    $('btn-next').disabled = !nb.next; $('btn-next').title = nb.next ? 'Sau: ' + nb.next.label : '';
    state.recent = L.pushRecent(state.recent, rec.id, 6, state.ids);
    save('cpai.recent', state.recent);
    return true;
  }

  /* ---------- Định tuyến ---------- */
  function setCrumb(grp, title) {
    $('crumb-grp').textContent = grp;
    $('crumb-title').textContent = title;
    document.title = (title === 'Trang chủ' ? '' : title + ' · ') + APP_NAME;
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
        setCrumb(g ? g.label : '', rec.label);
        renderNav();
        closeDrawer();
        return;
      }
      r = state.route = { name: 'notfound' };
      $('doc-actions').hidden = true;
    }

    viewDoc.hidden = true;
    page.hidden = false;
    var title = 'Trang chủ', grp = APP_NAME;
    if (r.name === 'home') page.innerHTML = pageHome();
    else if (r.name === 'group') {
      page.innerHTML = pageGroup(r.id);
      state.groups.forEach(function (g) { if (g.id === r.id) title = g.label; });
      grp = 'Nhóm tài liệu';
    } else if (r.name === 'favorites') { page.innerHTML = pageFav(); title = 'Yêu thích'; }
    else if (r.name === 'about') { page.innerHTML = pageAbout(); title = 'Giới thiệu & lưu ý'; }
    else { page.innerHTML = pageNotFound(); title = 'Không tìm thấy'; }
    page.scrollTop = 0;
    setCrumb(grp, title);
    renderNav();
    closeDrawer();
  }

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

  function focusSearch() {
    if (!DESKTOP.matches) openDrawer();
    else if (app.getAttribute('data-sb') === 'rail') setRail(false);
    setTimeout(function () { $('q').focus(); $('q').select(); }, 30);
  }

  /* ---------- Theme & đơn vị ---------- */
  function applyTheme(t) {
    if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t); else root.removeAttribute('data-theme');
    var b = $('btn-theme');
    b.querySelector('use').setAttribute('href', '#' + THEME_ICON[t]);
    b.title = 'Giao diện: ' + THEME_LABEL[t];
    b.setAttribute('aria-label', 'Đổi giao diện (hiện tại: ' + THEME_LABEL[t] + ')');
    $('theme-lbl').textContent = 'Giao diện: ' + THEME_LABEL[t];
  }

  /* ---------- Sự kiện ---------- */
  function setQuery(v) {
    state.q = v;
    $('search-box').classList.toggle('has-q', !!v);
    renderNav();
  }

  $('q').addEventListener('input', function (e) { setQuery(e.target.value); });
  $('q').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      var first = L.search(state.records, state.q)[0];
      if (first && state.q) { location.hash = docHref(first); e.target.blur(); }
    } else if (e.key === 'Escape') {
      if (state.q) { e.target.value = ''; setQuery(''); e.stopPropagation(); }
    } else if (e.key === 'ArrowDown') {
      var a = $('nav').querySelector('.nav-sec .nav-item');
      if (a) { e.preventDefault(); a.focus(); }
    }
  });
  $('q-clear').addEventListener('click', function () { $('q').value = ''; setQuery(''); $('q').focus(); });

  $('nav').addEventListener('click', function (e) {
    var t = e.target.closest('[data-toggle]');
    if (!t) return;
    var id = t.getAttribute('data-toggle');
    state.closed[id] = !state.closed[id];
    save('cpai.closed', state.closed);
    t.setAttribute('aria-expanded', String(!state.closed[id]));
    var ul = $('nl-' + id); if (ul) ul.hidden = !!state.closed[id];
  });

  function toggleFav(id) {
    state.fav = L.toggleFav(state.fav, id);
    save('cpai.fav', state.fav);
  }
  $('view-page').addEventListener('click', function (e) {
    var f = e.target.closest('[data-fav]');
    if (f) {
      toggleFav(f.getAttribute('data-fav'));
      var keep = f.getAttribute('data-fav');
      render();
      var again = $('view-page').querySelector('[data-fav="' + keep + '"]');
      if (again) again.focus();
      return;
    }
    var chip = e.target.closest('[data-spec]');
    if (chip) {
      state.specialty = chip.getAttribute('data-spec');
      var y = $('view-page').scrollTop;
      render();
      $('view-page').scrollTop = y;
      var c2 = $('view-page').querySelector('[data-spec="' + (window.CSS && CSS.escape ? CSS.escape(state.specialty) : state.specialty) + '"]');
      if (c2) c2.focus();
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

  $('btn-menu').addEventListener('click', openDrawer);
  $('btn-close').addEventListener('click', function () { closeDrawer(true); });
  $('scrim').addEventListener('click', function () { closeDrawer(true); });
  $('btn-collapse').addEventListener('click', function () { setRail(app.getAttribute('data-sb') !== 'rail'); });

  $('btn-theme').addEventListener('click', function () {
    var cur = root.getAttribute('data-theme') || 'auto';
    var next = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
    applyTheme(next);
    saveRaw('cpai.theme', next === 'auto' ? null : next);
  });

  document.addEventListener('keydown', function (e) {
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '') || (e.target && e.target.isContentEditable);
    if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) { e.preventDefault(); focusSearch(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      if (DESKTOP.matches) setRail(app.getAttribute('data-sb') !== 'rail');
      else if (app.getAttribute('data-drawer') === 'open') closeDrawer(true); else openDrawer();
    }
    else if (e.key === 'Escape' && app.getAttribute('data-drawer') === 'open') closeDrawer(true);
    else if (e.altKey && e.key === 'ArrowLeft' && state.route.name === 'doc') { e.preventDefault(); go('prev'); }
    else if (e.altKey && e.key === 'ArrowRight' && state.route.name === 'doc') { e.preventDefault(); go('next'); }
  });

  window.addEventListener('hashchange', render);

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
    var closed = load('cpai.closed', {});
    state.closed = closed && typeof closed === 'object' ? closed : {};
    $('data-meta').innerHTML = 'Danh mục v' + esc(cat.version) + ' · ' + esc(cat.updated) +
      (cat.status === 'unverified' ? ' · <span class="badge-unv">Chưa kiểm chứng</span>' : '');
    render();
  }

  var savedTheme = null;
  try { savedTheme = localStorage.getItem('cpai.theme'); } catch (e) {}
  applyTheme(savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'auto');
  saveRaw('cpai.unit', null);   // dọn tuỳ chọn đơn vị của bản 1.0 (đã bỏ bộ chọn đơn vị)
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

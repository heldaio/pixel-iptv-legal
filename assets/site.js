/* Pixel IPTV — site script, v4. No dependencies, no external requests. */

/* ===================================================================
   DOWNLOADS — the only place to edit when Pixel Server is published.
   A download button stays disabled ("Em breve" / "Coming soon") until
   its `url` is filled in. `size` is shown as written (e.g. "21 MB");
   `sha256` is the file's SHA-256 in hex (shasum -a 256 <file>): kept here
   for the record, not shown on the page (the owner's choice, 2026-10-31);
   setup.sh checks the Linux tarballs against their published .sha256.
   =================================================================== */
window.PIXEL_SITE = {
  appStoreURL: 'https://apps.apple.com/app/id6773107337',
  server: {
    version: '1.0',
    // Docker image name shown in the compose examples on server.html.
    // Empty until the image is pushed to a registry (none chosen yet): the
    // page keeps the «build it yourself» note while this is empty.
    dockerImage: '',
    // Every file lives flat in downloads/ next to server.html, served at
    // https://www.pixeliptv.pt/downloads/<file>. A button stays «Em breve» /
    // "Coming soon" while its url is empty. size is what people read
    // (MiB, rounded); sha256 is of the published file itself.
    downloads: {
      // Mac (Apple silicon, macOS 14+), menu-bar app. Built 2026-10-31 by
      // PixelServer/Mac/make-dmg.sh: Developer ID, notarized and stapled
      // (5 752 818 bytes). Updates: downloads/appcast.xml (Sparkle, signed
      // with the EdDSA key in the developer's keychain; generate_appcast).
      macos:        { url: 'https://www.pixeliptv.pt/downloads/PixelServer-1.0.dmg', size: '5 MB', sha256: 'dac43cef24db732f0ccac7e5fb0b0ecd6d4f3c9e905b6c4b177afba9b0f43a1d', file: 'PixelServer-1.0.dmg' },
      // Windows 10 (1903+) / 11 installers, built 2026-10-31 by
      // PixelServer/Windows/build.ps1 (Inno Setup; not Authenticode-signed yet).
      // x64 21 731 473 bytes, arm64 20 855 791 bytes.
      windowsX64:   { url: 'https://www.pixeliptv.pt/downloads/PixelServer-1.0-windows-x64.exe', size: '21 MB',
                      sha256: 'a2037fe74e904478a50c5df3eb1849b24ecf52e38ce205b6bda7509788480259', file: 'PixelServer-1.0-windows-x64.exe' },
      windowsArm64: { url: 'https://www.pixeliptv.pt/downloads/PixelServer-1.0-windows-arm64.exe', size: '20 MB',
                      sha256: 'c577ff66f7d8839ba352b06d71f0c77ab180a16638be8086a4b700c61f33e205', file: 'PixelServer-1.0-windows-arm64.exe' },
      // Linux (systemd), built 2026-10-31 by
      // PIXEL_PUBLISH_URL=https://www.pixeliptv.pt/downloads PixelServer/Docker/make-tarball.sh
      // amd64 28 259 710 bytes, arm64 27 000 825 bytes. Its dist/setup.sh is
      // published as /setup.sh (the page's one-command install) and fetches
      // downloads/<file> plus downloads/<file>.sha256 — keep both published.
      linuxAmd64:   { url: 'https://www.pixeliptv.pt/downloads/pixel-server-1.0-linux-amd64.tar.gz', size: '27 MB',
                      sha256: '4e9441561b3b7ef2e3b9409e1aa1f5e3885d589c70b24a28ef351a0202b8732f', file: 'pixel-server-1.0-linux-amd64.tar.gz' },
      linuxArm64:   { url: 'https://www.pixeliptv.pt/downloads/pixel-server-1.0-linux-arm64.tar.gz', size: '26 MB',
                      sha256: '82e462dae4201bd491475034090e4bee4fff7db52c9de39d22b4519f715c1b1d', file: 'pixel-server-1.0-linux-arm64.tar.gz' }
    }
  }
};

(function () {
  'use strict';
  var doc = document.documentElement;
  var LANG_KEY = 'pixel-iptv-lang';
  var THEME_KEY = 'pixel-iptv-theme';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var hasIO = 'IntersectionObserver' in window;
  var each = function (sel, fn, root) { Array.prototype.forEach.call((root || document).querySelectorAll(sel), fn); };
  var listen = function (mq, fn) { if (mq.addEventListener) mq.addEventListener('change', fn); else if (mq.addListener) mq.addListener(fn); };

  function currentLang() { return /^pt/i.test(doc.lang) ? 'pt' : 'en'; }

  /* ---------- Language ---------- */
  function applyLang(l, remember) {
    doc.lang = l === 'pt' ? 'pt-PT' : 'en';
    if (remember) { try { localStorage.setItem(LANG_KEY, l); } catch (e) {} }
    var t = doc.getAttribute('data-title-' + l);
    if (t) document.title = t;
    var d = doc.getAttribute('data-desc-' + l);
    var meta = document.querySelector('meta[name="description"]');
    if (d && meta) meta.setAttribute('content', d);
    // Attributes that cannot be split into two elements.
    each('[data-aria-pt]', function (n) { n.setAttribute('aria-label', n.getAttribute('data-aria-' + l)); });
    each('[data-ph-pt]', function (n) { n.setAttribute('placeholder', n.getAttribute('data-ph-' + l)); });
    each('[data-rd-pt]', function (n) { n.setAttribute('aria-roledescription', n.getAttribute('data-rd-' + l)); });
    each('.lang-switch button', function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-lang') === l ? 'true' : 'false');
    });
    updateThemeButton();
    refreshGlows();
    if (window.__faqFilter) window.__faqFilter();
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.lang-switch button');
    if (b) applyLang(b.getAttribute('data-lang'), true);
  });

  /* ---------- Theme (every .theme-btn: header and menu) ---------- */
  var lightQuery = window.matchMedia('(prefers-color-scheme: light)');
  function effectiveTheme() {
    var a = doc.getAttribute('data-theme');
    if (a === 'light' || a === 'dark') return a;
    return lightQuery.matches ? 'light' : 'dark';
  }
  function updateThemeButton() {
    var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    each('.theme-btn', function (b) {
      b.setAttribute('data-aria-pt', next === 'light' ? 'Usar o tema claro' : 'Usar o tema escuro');
      b.setAttribute('data-aria-en', next === 'light' ? 'Switch to light theme' : 'Switch to dark theme');
      b.setAttribute('aria-label', b.getAttribute('data-aria-' + currentLang()));
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.theme-btn');
    if (!b) return;
    var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    doc.setAttribute('data-theme', next);
    try { localStorage.setItem(THEME_KEY, next); } catch (err) {}
    updateThemeButton();
  });
  listen(lightQuery, updateThemeButton);

  /* ---------- Header ---------- */
  var header = document.querySelector('.site-header');
  function onScroll() { if (header) header.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var menuBtn = document.querySelector('.menu-btn');
  var nav = document.getElementById('site-nav');
  if (menuBtn && nav) {
    var setMenu = function (open) {
      nav.classList.toggle('open', open);
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    menuBtn.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); menuBtn.focus(); }
    });
    listen(window.matchMedia('(min-width: 1068px)'), function () { setMenu(false); });
  }

  /* ---------- Screen light: a blurred copy of what each screen shows ---------- */
  function visibleImg(root) {
    var scope = root.querySelector('.story-shot[data-active]') || root;
    var imgs = scope.querySelectorAll('img');
    for (var i = 0; i < imgs.length; i++) if (imgs[i].getClientRects().length) return imgs[i];
    return null;
  }
  function refreshGlow(g) {
    var amb = g.querySelector(':scope > .amb');
    if (!amb) { amb = document.createElement('div'); amb.className = 'amb'; amb.setAttribute('aria-hidden', 'true'); g.insertBefore(amb, g.firstChild); }
    var img = visibleImg(g);
    if (!img) return;
    var set = function () { if (img.currentSrc) amb.style.backgroundImage = 'url("' + img.currentSrc + '")'; };
    if (img.complete && img.currentSrc) set(); else img.addEventListener('load', set, { once: true });
  }
  function refreshGlows() { each('.glow', refreshGlow); }

  /* ---------- Tabs — ARIA tabs with arrow keys (server.html) ---------- */
  each('[role="tablist"]', function (list) {
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        var p = document.getElementById(t.getAttribute('aria-controls'));
        if (p) p.hidden = !on;
      });
      if (focus) tab.focus();
      var panel = document.getElementById(tab.getAttribute('aria-controls'));
      var g = panel && panel.closest('.glow');
      if (g) refreshGlow(g);
      if (list.id && tab.getAttribute('data-hash') && history.replaceState) {
        history.replaceState(null, '', '#' + tab.getAttribute('data-hash'));
      }
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t, false); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === 'Home') n = tabs[0];
        if (e.key === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
    // Deep link: server.html#instalar-windows opens the Windows tab.
    var h = location.hash.replace('#', '');
    var target = tabs.filter(function (t) { return t.getAttribute('data-hash') === h; })[0];
    if (target) select(target, false);
  });

  /* ---------- Scroll-in ---------- */
  if (hasIO && !reduceMotion.matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.01 });
    each('.reveal', function (el) { io.observe(el); });
  } else {
    each('.reveal', function (el) { el.classList.add('in'); });
  }

  /* ---------- Nav: the chapter on screen (index only) ---------- */
  (function () {
    if (!hasIO || !nav) return;
    var ids = ['funcionalidades', 'apple-tv', 'precos'];
    var map = [];
    ids.forEach(function (id) {
      var sec = document.getElementById(id);
      var link = nav.querySelector('a[href$="#' + id + '"]');
      if (sec && link) map.push({ sec: sec, link: link });
    });
    if (!map.length) return;
    var nio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var m = map.filter(function (x) { return x.sec === en.target; })[0];
        if (!m) return;
        if (en.isIntersecting) {
          map.forEach(function (x) { if (x !== m) x.link.removeAttribute('aria-current'); });
          m.link.setAttribute('aria-current', 'location');
        } else {
          m.link.removeAttribute('aria-current');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach(function (x) { nio.observe(x.sec); });
  })();

  /* ---------- Story: one screen, four steps ---------- */
  (function () {
    var story = document.querySelector('.story');
    if (!story) return;
    var mq = window.matchMedia('(min-width: 735px) and (min-height: 640px) and (prefers-reduced-motion: no-preference)');
    var steps = Array.prototype.slice.call(story.querySelectorAll('.story-step'));
    var stage = story.querySelector('.story-stage');
    var sio = null;
    function activate(n) {
      steps.forEach(function (s) { s.toggleAttribute('data-active', s.getAttribute('data-step') === n); });
      each('.story-shot', function (s) { s.toggleAttribute('data-active', s.getAttribute('data-step') === n); }, story);
      if (stage) refreshGlow(stage);
    }
    function setup() {
      if (sio) { sio.disconnect(); sio = null; }
      if (!mq.matches || !hasIO) return;
      // A thin band across the middle of the viewport decides the step.
      sio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) activate(en.target.getAttribute('data-step')); });
      }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
      steps.forEach(function (s) { sio.observe(s); });
    }
    activate('1');
    setup();
    listen(mq, setup);
  })();

  /* ---------- Shelf: paddles, dots, arrow keys ---------- */
  each('.shelf', function (shelf) {
    var track = shelf.querySelector('.shelf-track');
    if (!track) return;
    var cards = Array.prototype.slice.call(track.querySelectorAll('.shelf-card'));
    var prev = shelf.querySelector('.paddle.prev');
    var next = shelf.querySelector('.paddle.next');
    var dots = Array.prototype.slice.call(shelf.querySelectorAll('.dot'));
    var ratios = cards.map(function () { return 0; });
    ratios[0] = 1;
    function behavior() { return reduceMotion.matches ? 'auto' : 'smooth'; }
    function step(dir) {
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      track.scrollBy({ left: dir * (cards[0].getBoundingClientRect().width + gap), behavior: behavior() });
    }
    function update() {
      var best = 0;
      ratios.forEach(function (r, i) { if (r > ratios[best] + 0.01) best = i; });
      dots.forEach(function (d, i) { if (i === best) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
      if (prev) prev.disabled = ratios[0] >= 0.6;
      if (next) next.disabled = ratios[ratios.length - 1] >= 0.6;
    }
    if (prev) prev.addEventListener('click', function () { step(-1); });
    if (next) next.addEventListener('click', function () { step(1); });
    dots.forEach(function (d, i) {
      d.addEventListener('click', function () {
        if (cards[i]) cards[i].scrollIntoView({ behavior: behavior(), inline: 'start', block: 'nearest' });
      });
    });
    track.addEventListener('keydown', function (e) {
      if (e.target !== track) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    });
    if (hasIO) {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { ratios[cards.indexOf(en.target)] = en.intersectionRatio; });
        update();
      }, { root: track, threshold: [0, 0.3, 0.6, 0.9, 1] });
      cards.forEach(function (c) { cio.observe(c); });
    }
    update();
  });

  /* ---------- New in 2.5: subtitle looks and the Skip Intro pill ---------- */
  each('.stage-block', function (block) {
    var sub = block.querySelector('.sub-sample');
    var pill = block.querySelector('.skip-pill');
    var stage = block.querySelector('.stage');
    var buttons = block.querySelectorAll('.looks button');
    Array.prototype.forEach.call(buttons, function (b) {
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(buttons, function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        if (!sub) return;
        sub.classList.remove('look-outline', 'look-box', 'look-yellow');
        sub.classList.add(b.getAttribute('data-look'));
        sub.classList.add('on');
      });
    });
    var show = function () { if (pill) pill.classList.add('on'); if (sub) sub.classList.add('on'); };
    if (reduceMotion.matches || !hasIO || !stage) { show(); return; }
    var pio = new IntersectionObserver(function (entries) {
      if (!entries.some(function (en) { return en.isIntersecting; })) return;
      pio.disconnect();
      setTimeout(function () { if (pill) pill.classList.add('on'); }, 800);
      setTimeout(function () { if (sub) sub.classList.add('on'); }, 1200);
    }, { threshold: 0.5 });
    pio.observe(stage);
  });

  /* ---------- Continue Watching: the row steps three times ---------- */
  each('.live-row', function (row) {
    var vp = row.querySelector('.row-viewport');
    var strip = row.querySelector('.row-strip');
    var replay = row.querySelector('.replay');
    if (!vp || !strip) return;
    var PER_STRIP = 5.6;   // cards in the capture
    var STEPS = 3;
    var k = 0, timer = null, running = false;
    function setK(n) {
      k = n;
      // Whole cards only: stop at the last step that still lands on a card edge.
      var card = strip.offsetWidth / PER_STRIP;
      var room = Math.floor(Math.max(0, strip.offsetWidth - vp.clientWidth) / card + 0.05);
      var shift = Math.min(n, room) * card + (n ? strip.offsetWidth * 10 / 1400 : 0);   // land in the gap between cards
      strip.style.transform = n ? 'translateX(' + (-shift) + 'px)' : '';
    }
    function schedule() { clearTimeout(timer); timer = setTimeout(tick, 2500); }
    function tick() {
      if (document.hidden) return;
      setK(k + 1);
      if (k < STEPS) schedule();
      else { running = false; if (replay) replay.hidden = false; }
    }
    function run() { running = true; setK(0); schedule(); }
    function makeStatic() {
      clearTimeout(timer); running = false; setK(0);
      row.classList.add('static');
      if (replay) replay.hidden = true;
    }
    if (reduceMotion.matches || !hasIO) { makeStatic(); return; }
    var started = false;
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && !started) { started = true; rio.disconnect(); run(); }
      });
    }, { threshold: 0.6 });
    rio.observe(vp);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) clearTimeout(timer);
      else if (running) schedule();
    });
    if (replay) replay.addEventListener('click', run);   // focus stays on the button
    // Keyboard users take over: the row becomes scrollable by hand.
    vp.addEventListener('focus', makeStatic);
  });

  /* ---------- The logo river ---------- */
  each('.river-wrap', function (w) {
    var river = w.querySelector('.river');
    var btn = w.querySelector('.river-btn');
    if (!river || !btn) return;
    function set(paused) {
      river.classList.toggle('paused', paused);
      btn.setAttribute('aria-pressed', paused ? 'true' : 'false');
      btn.setAttribute('data-aria-pt', paused ? 'Retomar animação' : 'Pausar animação');
      btn.setAttribute('data-aria-en', paused ? 'Resume animation' : 'Pause animation');
      btn.setAttribute('aria-label', btn.getAttribute('data-aria-' + currentLang()));
    }
    set(reduceMotion.matches);
    btn.addEventListener('click', function () { set(!river.classList.contains('paused')); });
    if (hasIO) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { river.classList.toggle('off', !en.isIntersecting); });
      }).observe(river);
    }
  });

  /* ---------- Footer: accordions on phones, open lists above 735 px ---------- */
  (function () {
    var cols = document.querySelectorAll('details.foot-col');
    if (!cols.length) return;
    var wide = window.matchMedia('(min-width: 735px)');
    function sync() {
      Array.prototype.forEach.call(cols, function (d) {
        var s = d.querySelector('summary');
        if (wide.matches) { d.setAttribute('open', ''); if (s) s.setAttribute('tabindex', '-1'); }
        else { d.removeAttribute('open'); if (s) s.removeAttribute('tabindex'); }
      });
    }
    sync();
    listen(wide, sync);
    document.addEventListener('click', function (e) {
      var s = e.target.closest && e.target.closest('details.foot-col > summary');
      if (s && wide.matches) e.preventDefault();
    });
  })();

  /* ---------- Hero / server art: alt text follows the art-directed source ---------- */
  (function () {
    var heroImgs = document.querySelectorAll('img[data-alt-phone]');
    if (!heroImgs.length) return;
    var narrow = window.matchMedia('(max-width: 734px)');
    function sync() {
      Array.prototype.forEach.call(heroImgs, function (i) {
        i.alt = i.getAttribute(narrow.matches ? 'data-alt-phone' : 'data-alt-tv');
      });
      refreshGlows();
    }
    sync();
    listen(narrow, sync);
  })();

  /* ---------- Downloads (server.html) ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var cfg = window.PIXEL_SITE.server;
  each('[data-dl]', function (btn) {
    var d = cfg.downloads[btn.getAttribute('data-dl')];
    if (d && d.url) {
      btn.setAttribute('href', d.url);
      btn.removeAttribute('aria-disabled');
      btn.setAttribute('download', '');
      each('.when-soon', function (s) { s.hidden = true; }, btn);
    } else {
      btn.removeAttribute('href');
      btn.setAttribute('aria-disabled', 'true');
      each('.when-ready', function (s) { s.hidden = true; }, btn);
    }
  });
  each('[data-dl-meta]', function (box) {
    var html = '';
    box.getAttribute('data-dl-meta').split(' ').forEach(function (k) {
      var d = cfg.downloads[k];
      if (!d || !d.url) return;
      var line = '<span>' + esc(d.file) + (d.size ? ' · ' + esc(d.size) : '') + '</span>';
      html += line;
    });
    box.innerHTML = html;
  });
  // The one-command Linux install: setup.sh next to this page.
  var canon = document.querySelector('link[rel="canonical"]');
  var setupURL = /^https?:/.test(location.protocol) ? new URL('setup.sh', location.href).href
    : canon ? new URL('setup.sh', canon.href).href : '';
  Array.prototype.forEach.call(document.querySelectorAll('[data-setup-url]'), function (el) { if (setupURL) el.textContent = setupURL; });
  if (cfg.downloads.linuxAmd64 && cfg.downloads.linuxAmd64.url) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-linux-unpublished]'), function (el) { el.hidden = true; });
  }
  each('[data-version]', function (el) { el.textContent = cfg.version; });
  if (cfg.dockerImage) {
    each('[data-docker-image]', function (el) { el.textContent = cfg.dockerImage; el.classList.remove('ph'); });
    each('[data-image-unpublished]', function (el) { el.hidden = true; });
  }

  /* ---------- Copy buttons ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.copy-btn');
    if (!b) return;
    var pre = document.getElementById(b.getAttribute('data-copy'));
    if (!pre || !navigator.clipboard) return;
    navigator.clipboard.writeText(pre.innerText.replace(/\n$/, '')).then(function () {
      var old = b.innerHTML;
      b.textContent = currentLang() === 'pt' ? 'Copiado' : 'Copied';
      setTimeout(function () { b.innerHTML = old; }, 1600);
    });
  });

  /* ---------- Support: filter the questions ---------- */
  var search = document.getElementById('faq-search');
  if (search) {
    var norm = function (s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
    var count = document.getElementById('faq-count');
    var empty = document.getElementById('faq-empty');
    var filter = window.__faqFilter = function () {
      var words = norm(search.value).split(/\s+/).filter(Boolean);
      var lang = currentLang() === 'pt' ? 'pt-PT' : 'en';
      var shown = 0;
      each('.faq-group', function (g) {
        var any = false;
        each('details', function (d) {
          var txt = '';
          each('[lang="' + lang + '"]', function (n) { txt += ' ' + n.textContent; }, d);
          var hay = norm(txt);
          var ok = words.every(function (w) { return hay.indexOf(w) !== -1; });
          d.hidden = !ok;
          if (ok) { any = true; shown++; }
        }, g);
        g.hidden = !any;
      });
      if (empty) empty.hidden = shown !== 0;
      if (count) {
        count.textContent = !words.length || !shown ? '' : (currentLang() === 'pt'
          ? (shown === 1 ? '1 resposta' : shown + ' respostas')
          : (shown === 1 ? '1 answer' : shown + ' answers'));
      }
    };
    search.addEventListener('input', filter);
  }

  /* ---------- Year ---------- */
  each('[data-year]', function (el) {
    var y = new Date().getFullYear();
    el.textContent = y > 2026 ? '2026–' + y : '2026';
  });

  applyLang(currentLang(), false);
})();

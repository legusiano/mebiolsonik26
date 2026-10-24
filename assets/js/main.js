/* Сборка страницы из data/*.js и мелкие эффекты. Без библиотек. */
(function () {
  "use strict";
  var S = window.SITE || {}, ADS = window.ADS || {}, P = window.PROJECTS || [];
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var lite = reduce || !finePointer || (navigator.hardwareConcurrency || 4) <= 2;
  if (lite) document.documentElement.classList.add("lite");

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function safeUrl(u) { return typeof u === "string" && /^https:\/\//i.test(u.trim()) ? u.trim() : ""; }
  window.store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* приватный режим — не страшно */ } }
  };

  var ICONS = {
    bots: '<rect x="4" y="7" width="16" height="12" rx="3"/><path d="M12 3v4M9 12h.01M15 12h.01M9 16h6"/>',
    automation: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    ai: '<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3"/>',
    web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    other: '<path d="M4 7l8-4 8 4-8 4zM4 12l8 4 8-4M4 17l8 4 8-4"/>'
  };
  function icon(name) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || ICONS.other) + "</svg>"; }

  /* ---------- Telegram из конфига ---------- */
  var tg = (S.telegram && safeUrl(S.telegram.url)) || "https://t.me/ZloOi72";
  document.querySelectorAll("[data-tg]").forEach(function (a) { a.href = tg; });
  if (S.telegram && S.telegram.handle) $("tg-handle").textContent = S.telegram.handle;

  /* ---------- первый экран ---------- */
  $("hero-sub").textContent = S.heroSubtitle || "";
  $("hero-text").textContent = S.heroText || "";
  var phrases = (S.typing && S.typing.length) ? S.typing : ["Building something cool..."];
  $("typing-static").textContent = phrases[0];
  var typing = $("typing");
  if (reduce) typing.textContent = phrases[0];
  else (function type(i, n, back) {
    var s = phrases[i];
    typing.textContent = s.slice(0, n);
    if (!back && n === s.length) return setTimeout(function () { type(i, n, true); }, 2200);
    if (back && n === 0) return setTimeout(function () { type((i + 1) % phrases.length, 0, false); }, 400);
    setTimeout(function () { type(i, n + (back ? -1 : 1), back); }, back ? 30 : 70);
  })(0, 0, false);

  /* бегущая строка: два одинаковых ряда для бесшовной прокрутки */
  var words = S.marquee || [];
  [0, 1].forEach(function () { words.forEach(function (w) { $("marquee").appendChild(el("span", null, w)); }); });
  if (!words.length) $("marquee").parentNode.hidden = true;

  /* ---------- обо мне, услуги ---------- */
  (S.about || []).forEach(function (t) { $("about-text").appendChild(el("p", null, t)); });
  (S.learning || []).forEach(function (t) { $("learning").appendChild(el("li", null, t)); });
  if (!(S.learning || []).length) $("learning").parentNode.hidden = true;
  (S.services || []).forEach(function (s, i) {
    var c = el("article", "tile service reveal");
    c.appendChild(el("span", "num", "0" + (i + 1) + " / 0" + S.services.length));
    c.appendChild(el("h3", null, s.title));
    var ul = el("ul");
    (s.items || []).forEach(function (t) { ul.appendChild(el("li", null, t)); });
    c.appendChild(ul);
    $("services").appendChild(c);
  });
  $("services-note").textContent = S.servicesNote || "";

  /* ---------- работы ---------- */
  var CATS = { all: "Все", bots: "Боты", ai: "Голос и AI", automation: "Автоматизация", web: "Веб", other: "Другое" };
  var STATUS = { "Работает": "ok", "В разработке": "dev", "Эксперимент": "exp" };
  var used = {};
  P.forEach(function (p) {
    used[p.category] = 1;
    var li = el("li", "work reveal");
    li.dataset.cat = p.category;
    var ico = el("div", "ico");
    if (p.image) {
      var img = el("img"); img.src = p.image; img.alt = ""; img.loading = "lazy";
      img.onerror = function () { ico.innerHTML = icon(p.category); };
      ico.appendChild(img);
    } else ico.innerHTML = icon(p.category);
    li.appendChild(ico);
    li.appendChild(el("h3", null, p.title));
    var d = el("div", "desc");
    d.appendChild(el("p", null, p.description));
    var tags = el("div", "tags");
    (p.tags || []).forEach(function (t) { tags.appendChild(el("span", "tag", t)); });
    d.appendChild(tags);
    var url = safeUrl(p.url);
    if (url) { var a = el("a", "open", "открыть ↗"); a.href = url; a.target = "_blank"; a.rel = "noopener"; d.appendChild(a); }
    li.appendChild(d);
    li.appendChild(el("span", "status " + (STATUS[p.status] || "exp"), p.status || "Эксперимент"));
    $("projects").appendChild(li);
  });
  if (P.length < 3) $("soon").hidden = false;
  var wf = $("work-filters");
  Object.keys(CATS).forEach(function (k) {
    if (k !== "all" && !used[k]) return;
    var b = el("button", "chip", CATS[k]);
    b.type = "button"; b.setAttribute("aria-pressed", k === "all");
    b.onclick = function () {
      wf.querySelectorAll(".chip").forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
      document.querySelectorAll(".work").forEach(function (c) { c.classList.toggle("hide", k !== "all" && c.dataset.cat !== k); });
    };
    wf.appendChild(b);
  });
  if (P.length < 2) wf.hidden = true;

  /* ---------- реклама и промо ---------- */
  if (ADS.enabled) {
    if (ADS.promo && ADS.promo.enabled) {
      $("promo").hidden = false;
      $("promo-h").textContent = ADS.promo.title;
      $("promo-text").textContent = ADS.promo.text;
      $("promo-btn").textContent = ADS.promo.button || "Обсудить проект";
    }
    var bn = ADS.banner || {};
    if (bn.enabled && safeUrl(bn.url) && bn.image) {
      $("promo").hidden = false;
      var ban = $("banner"); ban.hidden = false; ban.href = safeUrl(bn.url);
      ban.querySelector("img").src = bn.image; ban.querySelector("img").alt = bn.alt || "Партнёр";
    }
    if (ADS.floatingOrder) $("order-float").hidden = false;
  }
  var idea = ADS.idea || {};
  if (ADS.enabled && idea.enabled) { $("idea-h").textContent = idea.title; $("idea-text").textContent = idea.text; }
  else $("idea").hidden = true;

  /* ---------- лог, ссылки ---------- */
  (S.updates || []).forEach(function (u) {
    var li = el("li", "reveal");
    li.appendChild(el("time", null, u.date));
    li.appendChild(el("p", null, u.text));
    $("timeline").appendChild(li);
  });
  if (!(S.updates || []).length) $("updates").hidden = true;
  (S.links || []).forEach(function (l) {
    var u = safeUrl(l.url);
    if (!u) return;  // неизвестная ссылка — кнопку не показываем
    var a = el("a", null, l.label + " ↗"); a.href = u; a.target = "_blank"; a.rel = "noopener";
    $("links").appendChild(a);
  });
  $("year").textContent = new Date().getFullYear();

  /* ---------- копирование контакта ---------- */
  $("copy-tg").onclick = function () {
    var text = (S.telegram && S.telegram.handle) || "@ZloOi72";
    var done = function () { $("copied").textContent = "скопировано: " + text; setTimeout(function () { $("copied").textContent = ""; }, 2500); };
    window.__allowCopy = true;  // своё копирование не трогаем
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
    setTimeout(function () { window.__allowCopy = false; }, 500);
    function fallback() {
      var t = el("textarea"); t.value = text; t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); done(); } catch (e) { $("copied").textContent = "скопируй вручную: " + text; }
      t.remove();
    }
  };

  /* ---------- тема ---------- */
  var root = document.documentElement, themeBtn = $("theme");
  function setTheme(t) {
    root.dataset.theme = t;
    var night = t === "night";
    themeBtn.setAttribute("aria-label", night ? "Сменить оформление: северное сияние" : "Сменить оформление: полярная ночь");
    themeBtn.title = night ? "Северное сияние" : "Полярная ночь";
    store.set("theme", t);
  }
  setTheme(store.get("theme", "north") === "night" ? "night" : "north");
  themeBtn.onclick = function () { setTheme(root.dataset.theme === "night" ? "north" : "night"); };

  /* ---------- меню ---------- */
  var nav = $("nav"), menu = $("menu");
  function closeMenu() { nav.classList.remove("open"); menu.setAttribute("aria-expanded", false); }
  menu.onclick = function () { var o = nav.classList.toggle("open"); menu.setAttribute("aria-expanded", o); };
  nav.addEventListener("click", function (e) { if (e.target.tagName === "A") closeMenu(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.classList.contains("open")) { closeMenu(); menu.focus(); } });

  /* ---------- прокрутка ---------- */
  var top = document.querySelector(".top"), bar = $("progress"), toTop = $("to-top"), order = $("order-float");
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = "scaleX(" + (h > 0 ? y / h : 0) + ")";
    top.classList.toggle("scrolled", y > 20);
    toTop.classList.toggle("on", y > innerHeight * 0.8);
    order.classList.toggle("on", y > innerHeight * 0.8);
  }
  addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  toTop.onclick = function () { scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); $("hero-title").focus({ preventScroll: true }); };

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -6% 0px" });
    document.querySelectorAll(".reveal").forEach(function (r) { io.observe(r); });
    var links = {};
    nav.querySelectorAll("a").forEach(function (a) { links[a.getAttribute("href").slice(1)] = a; });
    var so = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var a = links[e.target.id];
        if (a && e.isIntersecting) {
          nav.querySelectorAll("a").forEach(function (x) { x.classList.remove("active"); x.removeAttribute("aria-current"); });
          a.classList.add("active"); a.setAttribute("aria-current", "true");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll("main section[id]").forEach(function (s) { so.observe(s); });
  } else document.querySelectorAll(".reveal").forEach(function (r) { r.classList.add("in"); });

  /* ---------- звёзды ---------- */
  var cv = $("stars"), ctx = cv.getContext && cv.getContext("2d");
  if (ctx) {
    var stars = [], W, H, dpr = Math.min(window.devicePixelRatio || 1, 2), running = true, last = 0;
    var draw = function (t) {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i];
        ctx.globalAlpha = reduce ? 0.7 : 0.3 + 0.5 * Math.abs(Math.sin(st.p + t * st.s * 0.06));
        ctx.fillStyle = i % 9 ? "#e8f6ff" : "#ffe58f";
        ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, 6.29); ctx.fill();
      }
    };
    var resize = function () {
      W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr;
      var count = Math.round(Math.min(150, innerWidth * innerHeight / (lite ? 14000 : 8500)));
      stars = [];
      for (var i = 0; i < count; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, r: (Math.random() * 1.1 + 0.3) * dpr, p: Math.random() * 6.3, s: Math.random() * 0.02 + 0.005 });
      draw(0);
    };
    var loop = function (t) {
      if (!running) return;
      if (t - last > 60) { draw(t); last = t; }
      requestAnimationFrame(loop);
    };
    resize();
    var rt; addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(resize, 200); });
    if (!reduce) {
      requestAnimationFrame(loop);
      document.addEventListener("visibilitychange", function () { running = !document.hidden; if (running) requestAnimationFrame(loop); });
    }
  }

  /* ---------- свет за курсором ---------- */
  if (finePointer && !reduce) {
    var glow = $("glow"), gx = 0, gy = 0, pending = false;
    addEventListener("pointermove", function (e) {
      gx = e.clientX; gy = e.clientY; glow.classList.add("on");
      if (!pending) { pending = true; requestAnimationFrame(function () { glow.style.transform = "translate(" + gx + "px," + gy + "px)"; pending = false; }); }
    }, { passive: true });
    document.addEventListener("pointerleave", function () { glow.classList.remove("on"); });
  }
})();

/* Презентация LANI: навигация и каталог команд. Без библиотек. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var slides = [].slice.call(document.querySelectorAll(".slide"));
  var cur = 0;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  /* ---------- навигация ---------- */
  $("total").textContent = "/ " + slides.length;
  $("goto").max = slides.length;
  function show(i, fromHash) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    slides.forEach(function (s, k) {
      s.classList.toggle("on", k === i);
      s.classList.toggle("past", k < i);
      s.setAttribute("aria-hidden", k !== i);
      s.inert = k !== i;
    });
    cur = i;
    $("bar").style.width = ((i + 1) / slides.length * 100) + "%";
    $("goto").value = i + 1;
    if (!fromHash) history.replaceState(null, "", "#" + (i + 1));
    document.title = "LANI — " + slides[i].dataset.title;
    menuButtons.forEach(function (b, k) { b.classList.toggle("on", k === i); });
    slides[i].scrollTop = 0;
    onEnter(slides[i]);
  }
  $("prev").onclick = function () { show(cur - 1); };
  $("next").onclick = function () { show(cur + 1); };
  $("goto").addEventListener("change", function () { show((parseInt(this.value, 10) || 1) - 1); });
  document.addEventListener("keydown", function (e) {
    var t = e.target.tagName;
    if (t === "INPUT" || t === "TEXTAREA") { if (e.key === "Escape") e.target.blur(); return; }
    if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); show(cur + 1); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); show(cur - 1); }
    else if (e.key === "Home") show(0);
    else if (e.key === "End") show(slides.length - 1);
    else if (e.key === "f" || e.key === "F" || e.key === "а" || e.key === "А") fullscreen();
  });
  // свайпы на телефоне
  var sx = null, sy = null;
  document.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  document.addEventListener("touchend", function (e) {
    if (sx === null) return;
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && !e.target.closest(".catalog")) show(cur + (dx < 0 ? 1 : -1));
    sx = null;
  }, { passive: true });

  function fullscreen() {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    } catch (e) { /* браузер не умеет */ }
  }
  $("fs").onclick = fullscreen;

  /* анимации вкл/выкл */
  var still = reduce;
  function setStill(v) { still = v; document.body.classList.toggle("still", v); $("motion").setAttribute("aria-pressed", v); $("motion").textContent = v ? "✦ без анимаций" : "✦ анимации"; }
  setStill(reduce || /[?&]still/.test(location.search));
  if (/[?&]export/.test(location.search)) document.body.classList.add("export");  // кадры для PDF/PPTX без кнопок  // ?still — для снимков в PDF/PPTX
  $("motion").onclick = function () { setStill(!still); };

  /* меню разделов */
  var menu = $("menu"), menuButtons = [];
  slides.forEach(function (s, k) {
    var b = el("button"); b.type = "button";
    b.appendChild(el("span", null, String(k + 1).padStart(2, "0")));
    b.appendChild(document.createTextNode(s.dataset.title));
    b.onclick = function () { show(k); toggleMenu(false); };
    menu.appendChild(b); menuButtons.push(b);
  });
  function toggleMenu(open) { menu.hidden = !open; $("menu-btn").setAttribute("aria-expanded", open); }
  $("menu-btn").onclick = function () { toggleMenu(menu.hidden); };
  document.addEventListener("click", function (e) { if (!menu.hidden && !menu.contains(e.target) && e.target !== $("menu-btn")) toggleMenu(false); });

  /* ---------- архитектура ---------- */
  document.querySelectorAll("#arch .node").forEach(function (n) {
    n.onclick = function () {
      document.querySelectorAll("#arch .node").forEach(function (x) { x.classList.toggle("on", x === n); });
      $("arch-info").textContent = n.dataset.info;
    };
  });

  /* ---------- каталог команд ---------- */
  var CMDS = window.LANI_COMMANDS || [];
  var COLORS = { "Плеер": "#A78BFA", "Поиск": "#C4B5FD", "Очередь": "#DDD6FE", "Плейлисты": "#F0ABFC", "Текстом": "#86EFAC" };
  var cats = Object.keys(COLORS).filter(function (c) { return CMDS.some(function (x) { return x.cat === c; }); });
  var filter = "Все", query = "";
  cats.forEach(function (c) {
    var n = CMDS.filter(function (x) { return x.cat === c; }).length;
    var b = el("button", "catcard"); b.type = "button"; b.style.setProperty("--acc", COLORS[c]);
    b.appendChild(el("b", null, n)); b.appendChild(document.createTextNode(c));
    b.onclick = function () { setFilter(c); show(slides.indexOf(document.querySelector(".catalog-slide"))); };
    if ($("catgrid")) $("catgrid").appendChild(b);
  });
  ["Все"].concat(cats).forEach(function (c) {
    var b = el("button", "chip", c); b.type = "button"; b.dataset.c = c;
    b.onclick = function () { setFilter(c); };
    $("chips").appendChild(b);
  });
  function setFilter(c) {
    filter = c;
    [].forEach.call($("chips").children, function (b) { b.setAttribute("aria-pressed", b.dataset.c === c); });
    render();
  }
  $("q").addEventListener("input", function () { query = this.value.trim().toLowerCase(); render(); });
  function render() {
    var box = $("catalog"); box.textContent = "";
    var list = CMDS.filter(function (x) {
      return (filter === "Все" || x.cat === filter) &&
        (!query || (x.name + " " + x.desc + " " + x.cat).toLowerCase().indexOf(query) >= 0);
    });
    list.forEach(function (x) {
      var c = el("article", "cmd"); c.style.borderLeft = "3px solid " + (COLORS[x.cat] || "#A78BFA");
      c.appendChild(el("code", null, x.syntax));
      c.appendChild(el("p", null, x.desc));
      var m = el("div", "meta");
      m.appendChild(el("span", "who", x.access));
      m.appendChild(el("span", "kind", x.kind === "slash" ? "slash · " + x.cat : "фраза · " + x.cat));
      var cp = el("button", "copy", "копировать"); cp.type = "button";
      cp.onclick = function () {
        var text = x.kind === "slash" ? x.name : x.name.replace(/^«|».*$/g, "");
        var ok = function () { cp.textContent = "скопировано"; setTimeout(function () { cp.textContent = "копировать"; }, 1500); };
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, function () { cp.textContent = "не вышло"; });
        else cp.textContent = "выдели вручную";
      };
      m.appendChild(cp);
      c.appendChild(m);
      box.appendChild(c);
    });
    $("count").textContent = "показано " + list.length + " из " + CMDS.length + " (slash: " + CMDS.filter(function (x) { return x.kind === "slash"; }).length + ", фраз: " + CMDS.filter(function (x) { return x.kind !== "slash"; }).length + ")";
  }
  setFilter("Все");

  /* ---------- при входе на слайд ---------- */
  var pipeTimer = null;
  function onEnter(s) {
    clearInterval(pipeTimer);
    var steps = s.querySelectorAll(".pipe .step");
    if (steps.length) {
      var k = 0;
      var tick = function () { steps.forEach(function (st, j) { st.classList.toggle("on", j === k); }); k = (k + 1) % steps.length; };
      tick();
      if (!still) pipeTimer = setInterval(tick, 900);
    }
    s.querySelectorAll("[data-count]").forEach(function (b) {
      var target = +b.dataset.count, fmt = function (v) { return v.toLocaleString("ru-RU"); };
      if (still) { b.textContent = fmt(target); return; }
      var t0 = performance.now();
      (function step(t) {
        var p = Math.min(1, (t - t0) / 900);
        b.textContent = fmt(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    });
  }

  var start = parseInt((location.hash || "").slice(1), 10);
  show(isNaN(start) ? 0 : start - 1, true);
  window.addEventListener("hashchange", function () { var n = parseInt(location.hash.slice(1), 10); if (!isNaN(n) && n - 1 !== cur) show(n - 1, true); });
})();

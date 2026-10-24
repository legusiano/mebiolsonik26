/* NORTH MUSIC PLAYER — без YouTube.
   Источник: официальные 30-сек. отрывки из каталога Apple (iTunes Search API) или свои файлы из audio/.
   Всё через HTML Audio: громкость, перемотка, время работают полностью. Само ничего не играет. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var TR = (window.TRACKS || []).map(function (t, i) { t.i = i; return t; });
  var store = window.store;
  var favs = store.get("favs2", []);
  var vol = store.get("vol", 70), muted = store.get("muted", false), shuffle = store.get("shuffle", false);
  var cur = -1, filter = "all", query = "", errors = 0, dragging = false;
  var audio = new Audio();
  audio.preload = "none";
  var playerBox = document.querySelector(".player");

  function playable(t) { return t && (t.source_type === "preview" || t.source_type === "audio") && /^(https:\/\/|audio\/)/.test(t.source_url || ""); }
  function fmt(s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ":" + ("0" + s % 60).slice(-2); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function fill(r) { r.style.setProperty("--p", (r.value - r.min) / (r.max - r.min) * 100 + "%"); }
  function note(t) { $("player-note").textContent = t; }
  function safe(u) { return /^https:\/\//.test(u || "") ? u : ""; }

  /* ---------- список ---------- */
  var FILTERS = { all: "Все", fav: "♥ Избранное", weezer: "Weezer", tiktok: "Тренды TikTok", punk: "Поп-панк", alt: "Альтернатива", indie: "Инди", ru: "Русское" };
  var list = $("tracks"), rows = [];
  var HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>';
  TR.forEach(function (t) {
    var li = el("li", "track");
    li.appendChild(el("span", "n", t.i + 1));
    var pick = el("button", "pick"); pick.type = "button";
    pick.disabled = !playable(t);
    pick.setAttribute("aria-label", "Играть: " + t.title + " — " + t.artist);
    var art = el("img", "mini-art"); art.alt = ""; art.loading = "lazy"; art.decoding = "async"; art.width = 42; art.height = 42;
    if (safe(t.cover)) { art.src = t.cover.replace("600x600bb", "100x100bb"); art.onerror = function () { art.removeAttribute("src"); }; }
    pick.appendChild(art);
    var meta = el("span", "meta");
    var b = el("b", null, t.title);
    if (t.explicit) { var e = el("span", "e", "E"); e.title = "Ненормативная лексика"; b.appendChild(e); }
    meta.appendChild(b); meta.appendChild(el("span", null, t.artist));
    pick.appendChild(meta);
    pick.onclick = function () { start(t.i); };
    li.appendChild(pick);
    if (t.tiktok) { var tt = el("span", "tt", "TT"); tt.title = "В трендах TikTok"; li.appendChild(tt); }
    var eq = el("span", "eq"); eq.innerHTML = "<i></i><i></i><i></i>"; eq.setAttribute("aria-hidden", "true");
    li.appendChild(eq);
    var f = el("button", "icon-btn fav"); f.type = "button"; f.innerHTML = HEART;
    f.setAttribute("aria-label", "В избранное: " + t.title);
    f.onclick = function () { toggleFav(t.i); };
    li.appendChild(f);
    li.title = t.license_or_source_note || "";
    list.appendChild(li);
    rows.push({ li: li, fav: f });
  });
  var tf = $("track-filters");
  Object.keys(FILTERS).forEach(function (k) {
    if (k === "tiktok" ? !TR.some(function (t) { return t.tiktok; }) : k !== "all" && k !== "fav" && !TR.some(function (t) { return t.genre === k; })) return;
    var b = el("button", "chip", FILTERS[k]); b.type = "button"; b.dataset.k = k;
    b.setAttribute("aria-pressed", k === "all");
    b.onclick = function () { filter = k; tf.querySelectorAll(".chip").forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); apply(); };
    tf.appendChild(b);
  });
  $("q").addEventListener("input", function () { query = this.value.trim().toLowerCase(); apply(); });

  function key(i) { return TR[i].title + "|" + TR[i].artist; }  // по названию — избранное не съедет при правке списка
  function visible(t) {
    if (filter === "fav" && favs.indexOf(key(t.i)) < 0) return false;
    if (filter === "tiktok" && !t.tiktok) return false;
    if (["all", "fav", "tiktok"].indexOf(filter) < 0 && t.genre !== filter) return false;
    return !query || (t.title + " " + t.artist + " " + (t.album || "")).toLowerCase().indexOf(query) >= 0;
  }
  function apply() {
    var n = 0;
    TR.forEach(function (t) { var v = visible(t); rows[t.i].li.hidden = !v; if (v) n++; });
    $("lib-count").textContent = (n === TR.length ? TR.length + " треков" : "найдено " + n + " из " + TR.length) +
      (filter === "fav" && !n ? " — жми ♥ у треков, чтобы собрать своё" : "");
  }
  function paintFavs() {
    TR.forEach(function (t) { rows[t.i].fav.setAttribute("aria-pressed", favs.indexOf(key(t.i)) >= 0); });
    var on = cur >= 0 && favs.indexOf(key(cur)) >= 0;
    $("now-fav").setAttribute("aria-pressed", on);
    $("now-fav").setAttribute("aria-label", on ? "Убрать из избранного" : "В избранное");
  }
  function toggleFav(i) {
    var k = favs.indexOf(key(i));
    if (k >= 0) favs.splice(k, 1); else favs.push(key(i));
    store.set("favs2", favs); paintFavs();
    if (filter === "fav") apply();
  }
  $("now-fav").onclick = function () { if (cur >= 0) toggleFav(cur); };

  /* ---------- показ и запуск ---------- */
  var PLAY = "M8 5l11 7-11 7z", PAUSE = "M8 5h3v14H8zM14 5h3v14h-3z";
  function setPlaying(p) {
    $("play-ico").innerHTML = '<path d="' + (p ? PAUSE : PLAY) + '"/>';
    $("play").setAttribute("aria-label", p ? "Пауза" : "Играть");
    $("mini-play").innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + (p ? PAUSE : PLAY) + '"/></svg>';
    $("mini-play").setAttribute("aria-label", p ? "Пауза" : "Играть");
    playerBox.classList.toggle("playing", p);
    rows.forEach(function (r, i) { r.li.classList.toggle("playing", p && i === cur); });
    updateMini();
  }
  function show(i) {
    var t = TR[i];
    cur = i;
    $("now-title").textContent = t.title;
    $("now-artist").textContent = t.artist + (t.album ? " · " + t.album : "");
    $("mini-title").textContent = t.title; $("mini-artist").textContent = t.artist;
    rows.forEach(function (r, k) { r.li.classList.toggle("current", k === i); });
    var c = $("cover");
    if (safe(t.cover)) { c.src = t.cover; $("mini-cover").src = t.cover.replace("600x600bb", "100x100bb"); } else { c.removeAttribute("src"); $("mini-cover").removeAttribute("src"); }
    var full = safe(t.full_url);
    $("full").hidden = !full; if (full) $("full").href = full;
    $("badge").textContent = t.source_type === "preview" ? "превью 0:30" : "полный трек";
    paintFavs();
    $("seek").value = 0; fill($("seek")); $("t-cur").textContent = "0:00"; $("t-dur").textContent = t.source_type === "preview" ? "0:30" : "0:00";
    var li = rows[i].li;
    if (!li.hidden && (li.offsetTop - list.offsetTop < list.scrollTop || li.offsetTop - list.offsetTop > list.scrollTop + list.clientHeight - 60)) list.scrollTop = li.offsetTop - list.offsetTop - 80;
    try {
      if ("mediaSession" in navigator && window.MediaMetadata) {
        navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist, album: t.album || "", artwork: safe(t.cover) ? [{ src: t.cover, sizes: "600x600", type: "image/jpeg" }] : [] });
      }
    } catch (e) { /* не поддерживается */ }
  }
  function start(i) {
    var t = TR[i];
    if (!playable(t)) return;
    show(i);
    audio.src = t.source_url;
    audio.volume = vol / 100; audio.muted = muted;
    audio.play().then(function () { errors = 0; }).catch(function (e) {
      if (e && e.name === "NotAllowedError") note("Браузер не дал включить звук — нажми ▶ ещё раз.");
    });
  }
  function pool() {
    var v = TR.filter(function (t) { return playable(t) && !rows[t.i].li.hidden; });
    return v.length ? v : TR.filter(playable);
  }
  function step(d) {
    var p = pool();
    if (!p.length) return;
    if (shuffle && p.length > 1) {
      var r; do { r = p[Math.floor(Math.random() * p.length)].i; } while (r === cur);
      return start(r);
    }
    var pos = p.findIndex(function (t) { return t.i === cur; });
    start(p[((pos < 0 ? (d > 0 ? -1 : 0) : pos) + d + p.length) % p.length].i);
  }
  function toggle() {
    if (cur < 0) return step(1);
    if (!audio.src) return start(cur);
    if (audio.paused) audio.play().catch(function () {}); else audio.pause();
  }
  $("play").onclick = toggle;
  $("mini-play").onclick = toggle;
  $("next").onclick = function () { step(1); };
  $("mini-next").onclick = function () { step(1); };
  $("prev").onclick = function () { if (audio.currentTime > 3) { audio.currentTime = 0; return; } step(-1); };
  $("shuffle").onclick = function () { shuffle = !shuffle; store.set("shuffle", shuffle); $("shuffle").setAttribute("aria-pressed", shuffle); };
  $("shuffle").setAttribute("aria-pressed", shuffle);

  /* стикер на первом экране — первый трек Weezer */
  var heroIdx = TR.findIndex(function (t) { return t.genre === "weezer" && playable(t); });
  if (heroIdx >= 0) {
    $("hero-track").textContent = TR[heroIdx].artist + " — " + TR[heroIdx].title;
    $("hero-listen").onclick = function () {
      start(heroIdx);
      $("music").scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    };
  } else $("hero-listen").hidden = true;

  /* ---------- время и перемотка ---------- */
  function tick() {
    var d = audio.duration;
    $("t-cur").textContent = fmt(audio.currentTime);
    if (d && isFinite(d)) {
      $("t-dur").textContent = fmt(d);
      if (!dragging) { $("seek").value = Math.round(audio.currentTime / d * 1000); fill($("seek")); }
      $("mini-bar").style.transform = "scaleX(" + audio.currentTime / d + ")";
    }
  }
  var seek = $("seek");
  seek.addEventListener("input", function () {
    dragging = true; fill(seek);
    if (audio.duration) $("t-cur").textContent = fmt(seek.value / 1000 * audio.duration);
  });
  seek.addEventListener("change", function () {
    dragging = false;
    if (audio.duration) audio.currentTime = seek.value / 1000 * audio.duration;
  });

  /* ---------- громкость ---------- */
  var volR = $("vol");
  var LOUD = '<path d="M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>', OFF = '<path d="M4 9h4l5-4v14l-5-4H4zM17 9l5 6M22 9l-5 6"/>';
  function applyVol() {
    volR.value = vol; fill(volR);
    audio.volume = vol / 100; audio.muted = muted;
    $("mute").setAttribute("aria-pressed", muted);
    $("mute").setAttribute("aria-label", muted ? "Включить звук" : "Выключить звук");
    $("mute-ico").innerHTML = muted || vol === 0 ? OFF : LOUD;
  }
  volR.addEventListener("input", function () { vol = +volR.value; if (vol > 0) muted = false; applyVol(); store.set("vol", vol); store.set("muted", muted); });
  $("mute").onclick = function () { muted = !muted; applyVol(); store.set("muted", muted); };

  /* ---------- события аудио ---------- */
  audio.addEventListener("play", function () { setPlaying(true); });
  audio.addEventListener("pause", function () { setPlaying(false); });
  audio.addEventListener("ended", function () { step(1); });
  audio.addEventListener("timeupdate", tick);
  audio.addEventListener("loadedmetadata", tick);
  audio.addEventListener("error", function () {
    if (cur < 0 || !audio.src) return;
    setPlaying(false);
    note("«" + TR[cur].title + "» не загрузился (нет сети или источник недоступен).");
    if (++errors < 4) setTimeout(function () { step(1); }, 1500);
  });

  /* ---------- мини-плеер, когда основной не виден ---------- */
  var playerVisible = true, started = false;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { playerVisible = es[0].isIntersecting; updateMini(); }, { threshold: 0.15 }).observe(playerBox);
  }
  function updateMini() {
    if (!audio.paused) started = true;
    var on = started && cur >= 0 && !playerVisible;  // после первого запуска — и на паузе, чтобы продолжить
    $("mini").hidden = !on;
    document.body.classList.toggle("mini-on", on);
  }

  try {
    navigator.mediaSession.setActionHandler("nexttrack", function () { step(1); });
    navigator.mediaSession.setActionHandler("previoustrack", function () { step(-1); });
  } catch (e) { /* нет Media Session */ }

  applyVol(); paintFavs(); apply();
  var first = TR.findIndex(playable);
  if (first >= 0) show(first);  // только показываем, без звука
})();

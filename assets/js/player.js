/* NORTH MUSIC PLAYER.
   Два источника: официальный плеер YouTube (IFrame API — play/pause, перемотка, громкость, время)
   и свои аудиофайлы (HTML Audio). Ничего не играет само — только после нажатия. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var TR = (window.TRACKS || []).map(function (t, i) { t.i = i; t.yt = ytId(t.source_url); return t; });
  var store = window.store;
  var favs = store.get("favs", []);
  var vol = store.get("vol", 70), muted = store.get("muted", false);
  var cur = -1, playing = false, filter = "all", query = "";
  var yt = null, ytReady = false, ytLoading = false, ytQueued = null, timer = null, errors = 0;
  var audio = new Audio();
  audio.preload = "none";

  function ytId(url) {
    var m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/.exec(url || "");
    return m ? m[1] : "";
  }
  function playable(t) { return t && ((t.source_type === "youtube" && t.yt) || (t.source_type === "audio" && t.source_url)); }
  function fmt(s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ":" + ("0" + s % 60).slice(-2); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function fill(r) { r.style.setProperty("--p", (r.value - r.min) / (r.max - r.min) * 100 + "%"); }
  function note(t) { $("player-note").textContent = t; }

  /* ---------- список ---------- */
  var GENRES = { all: "Все", fav: "♥ Избранное", pop: "Поп", rock: "Рок", hiphop: "Хип-хоп", electronic: "Электроника", unconfirmed: "Не подтверждено" };
  var list = $("tracks"), rows = [];
  var HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>';
  TR.forEach(function (t) {
    var li = el("li", "track" + (t.source_type === "none" ? " unconfirmed" : ""));
    li.appendChild(el("span", "n", t.i + 1));
    var pick = el("button", "pick"); pick.type = "button";
    pick.disabled = !playable(t);
    pick.setAttribute("aria-label", (playable(t) ? "Играть: " : "Недоступно: ") + t.title + " — " + t.artist);
    var mini = el("img", "mini"); mini.alt = ""; mini.loading = "lazy"; mini.decoding = "async";
    if (t.cover) { mini.src = t.cover; mini.onerror = function () { mini.removeAttribute("src"); }; }
    pick.appendChild(mini);
    var meta = el("span", "meta"); meta.appendChild(el("b", null, t.title)); meta.appendChild(el("span", null, t.artist));
    pick.appendChild(meta);
    pick.onclick = function () { start(t.i); };
    li.appendChild(pick);
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
  Object.keys(GENRES).forEach(function (k) {
    if (k !== "all" && k !== "fav" && !TR.some(function (t) { return t.genre === k; })) return;
    var b = el("button", "chip", GENRES[k]); b.type = "button"; b.dataset.k = k;
    b.setAttribute("aria-pressed", k === "all");
    b.onclick = function () { filter = k; tf.querySelectorAll(".chip").forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); apply(); };
    tf.appendChild(b);
  });
  $("q").addEventListener("input", function () { query = this.value.trim().toLowerCase(); apply(); });

  function visible(t) {
    if (filter === "fav" && favs.indexOf(t.i) < 0) return false;
    if (filter !== "all" && filter !== "fav" && t.genre !== filter) return false;
    return !query || (t.title + " " + t.artist).toLowerCase().indexOf(query) >= 0;
  }
  function apply() {
    var n = 0;
    TR.forEach(function (t) { var v = visible(t); rows[t.i].li.hidden = !v; if (v) n++; });
    var ok = TR.filter(playable).length;
    $("lib-count").textContent = (n === TR.length ? "" : "Найдено: " + n + " из " + TR.length + " · ") +
      "Всего позиций: " + TR.length + ", с проверенным источником: " + ok;
  }
  function paintFavs() {
    TR.forEach(function (t) { rows[t.i].fav.setAttribute("aria-pressed", favs.indexOf(t.i) >= 0); });
    var on = cur >= 0 && favs.indexOf(cur) >= 0;
    $("now-fav").setAttribute("aria-pressed", on);
    $("now-fav").setAttribute("aria-label", on ? "Убрать из избранного" : "В избранное");
  }
  function toggleFav(i) {
    var k = favs.indexOf(i);
    if (k >= 0) favs.splice(k, 1); else favs.push(i);
    store.set("favs", favs); paintFavs();
    if (filter === "fav") apply();
  }
  $("now-fav").onclick = function () { if (cur >= 0) toggleFav(cur); };

  /* ---------- общее управление ---------- */
  function setPlaying(p) {
    playing = p;
    $("play-ico").innerHTML = p ? '<path d="M8 5h3v14H8zM14 5h3v14h-3z"/>' : '<path d="M8 5l11 7-11 7z"/>';
    $("play").setAttribute("aria-label", p ? "Пауза" : "Играть");
    rows.forEach(function (r, i) { r.li.classList.toggle("playing", p && i === cur); });
    clearInterval(timer);
    if (p) timer = setInterval(tick, 500);
  }
  function show(i) {
    var t = TR[i];
    cur = i;
    $("now-title").textContent = t.title;
    $("now-artist").textContent = t.artist;
    rows.forEach(function (r, k) { r.li.classList.toggle("current", k === i); });
    var c = $("cover");
    if (t.cover) { c.src = t.cover; c.hidden = false; } else c.hidden = true;
    paintFavs();
    $("seek").value = 0; fill($("seek")); $("t-cur").textContent = "0:00"; $("t-dur").textContent = "0:00";
    var li = rows[i].li, box = list;
    if (li.offsetTop < box.scrollTop || li.offsetTop > box.scrollTop + box.clientHeight - 60) box.scrollTop = li.offsetTop - 80;
  }
  function start(i) {
    var t = TR[i];
    if (!playable(t)) return;
    stopAll();
    show(i);
    if (t.source_type === "audio") {
      $("screen").classList.remove("live");
      audio.src = t.source_url;
      audio.volume = vol / 100; audio.muted = muted;
      audio.play().then(function () { errors = 0; }).catch(function () { note("Браузер не дал начать воспроизведение — нажми Play ещё раз."); });
      $("seek").disabled = false;
      note("Свой аудиофайл: громкость и перемотка через HTML Audio.");
    } else {
      $("seek").disabled = false;
      playYT(t.yt);
    }
  }
  function stopAll() {
    if (!audio.paused) audio.pause();
    if (ytReady && yt.getPlayerState && yt.getPlayerState() === 1) yt.pauseVideo();
    setPlaying(false);
  }
  function kind() { return cur >= 0 ? TR[cur].source_type : ""; }
  function step(d) {
    if (!TR.some(playable)) return;
    var i = cur;
    for (var k = 0; k < TR.length; k++) {
      i = (i + d + TR.length) % TR.length;
      if (playable(TR[i]) && !rows[i].li.hidden) return start(i);
    }
  }
  $("play").onclick = function () {
    if (cur < 0) return step(1);
    if (kind() === "audio") return audio.paused ? audio.play().catch(function () {}) : audio.pause();
    if (!ytReady) return playYT(TR[cur].yt);
    if (yt.getPlayerState() === 1) yt.pauseVideo(); else yt.playVideo();
  };
  $("next").onclick = function () { step(1); };
  $("prev").onclick = function () {
    var at = kind() === "audio" ? audio.currentTime : (ytReady && yt.getCurrentTime ? yt.getCurrentTime() : 0);
    if (at > 3) return seekTo(0);  // как в обычных плеерах: сначала — в начало трека
    step(-1);
  };

  /* ---------- время и перемотка ---------- */
  var dragging = false;
  function times() {
    if (kind() === "audio") return [audio.currentTime, audio.duration];
    if (ytReady && yt.getDuration) return [yt.getCurrentTime(), yt.getDuration()];
    return [0, 0];
  }
  function tick() {
    var t = times();
    $("t-cur").textContent = fmt(t[0]);
    $("t-dur").textContent = t[1] ? fmt(t[1]) : "0:00";
    if (!dragging && t[1]) { $("seek").value = Math.round(t[0] / t[1] * 1000); fill($("seek")); }
  }
  function seekTo(sec) {
    if (kind() === "audio") audio.currentTime = sec;
    else if (ytReady) yt.seekTo(sec, true);
    tick();
  }
  var seek = $("seek");
  seek.addEventListener("input", function () {
    dragging = true; fill(seek);
    var d = times()[1]; if (d) $("t-cur").textContent = fmt(seek.value / 1000 * d);
  });
  seek.addEventListener("change", function () { dragging = false; var d = times()[1]; if (d) seekTo(seek.value / 1000 * d); });

  /* ---------- громкость ---------- */
  var volR = $("vol");
  function applyVol() {
    volR.value = vol; fill(volR);
    audio.volume = vol / 100; audio.muted = muted;
    if (ytReady) { yt.setVolume(vol); if (muted) yt.mute(); else yt.unMute(); }
    $("mute").setAttribute("aria-pressed", muted);
    $("mute").setAttribute("aria-label", muted ? "Включить звук" : "Выключить звук");
    $("mute-ico").innerHTML = muted || vol === 0 ? '<path d="M4 9h4l5-4v14l-5-4H4zM17 9l5 6M22 9l-5 6"/>' : '<path d="M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>';
  }
  volR.addEventListener("input", function () { vol = +volR.value; if (vol > 0) muted = false; applyVol(); store.set("vol", vol); store.set("muted", muted); });
  $("mute").onclick = function () { muted = !muted; applyVol(); store.set("muted", muted); };

  /* ---------- HTML Audio ---------- */
  audio.addEventListener("play", function () { setPlaying(true); });
  audio.addEventListener("pause", function () { setPlaying(false); });
  audio.addEventListener("ended", function () { step(1); });
  audio.addEventListener("loadedmetadata", tick);
  audio.addEventListener("error", function () { if (kind() === "audio") skip("Файл не загрузился"); });

  /* ---------- YouTube IFrame API: грузится только после первого нажатия ---------- */
  function playYT(id) {
    $("screen").classList.add("live");
    if (ytReady) { yt.loadVideoById(id); return; }
    ytQueued = id;
    if (ytLoading) return;
    ytLoading = true;
    note("Подключаю официальный плеер YouTube…");
    window.onYouTubeIframeAPIReady = function () {
      yt = new YT.Player("yt", {
        host: "https://www.youtube-nocookie.com",
        videoId: ytQueued,
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1, autoplay: 1, origin: location.protocol === "https:" ? location.origin : undefined },
        events: {
          onReady: function () {
            ytReady = true; applyVol(); yt.playVideo();
            note("Громкость, перемотка и время работают через официальный YouTube IFrame API. На iPhone и iPad громкость меняется только кнопками телефона — это ограничение iOS.");
          },
          onStateChange: function (e) {
            if (e.data === 1) { errors = 0; setPlaying(true); tick(); }
            else if (e.data === 2 || e.data === -1 || e.data === 5) setPlaying(false);
            else if (e.data === 0) { setPlaying(false); step(1); }
          },
          onError: function (e) {
            var why = e.data === 101 || e.data === 150 ? "владелец видео запретил встраивание" : e.data === 100 ? "видео удалено или скрыто" : "видео не загрузилось";
            skip("«" + TR[cur].title + "»: " + why + " (код " + e.data + "). Открыть можно на YouTube: " + TR[cur].source_url);
          }
        }
      });
    };
    var s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.onerror = function () { ytLoading = false; $("screen").classList.remove("live"); note("YouTube не загрузился (нет сети или он заблокирован). Попробуй ещё раз позже."); };
    document.head.appendChild(s);
  }
  function skip(msg) {
    setPlaying(false);
    note(msg);
    if (++errors < 4) setTimeout(function () { step(1); }, 1800);  // несколько ошибок подряд — останавливаемся
    else note(msg + " — несколько треков подряд не открылись, остановила плеер.");
  }

  /* клавиатура: пробел/стрелки, когда фокус внутри плеера (не в поиске) */
  document.querySelector(".player").addEventListener("keydown", function (e) {
    if (e.target.tagName === "INPUT") return;
    if (e.key === "ArrowRight" && e.shiftKey) { step(1); e.preventDefault(); }
    if (e.key === "ArrowLeft" && e.shiftKey) { step(-1); e.preventDefault(); }
  });

  try {
    navigator.mediaSession.setActionHandler("nexttrack", function () { step(1); });
    navigator.mediaSession.setActionHandler("previoustrack", function () { step(-1); });
  } catch (e) { /* нет Media Session — не важно */ }

  applyVol(); paintFavs(); apply();
  var first = TR.findIndex(playable);
  if (first >= 0) show(first);  // только показываем, без звука
})();

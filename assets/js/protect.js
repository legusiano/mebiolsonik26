/* Базовая защита от копирования. Честно: статический сайт нельзя защитить полностью —
   всё, что видит браузер, можно сохранить. Это отпугивает от «Ctrl+C / Сохранить как» и
   подписывает скопированный текст. Плюс проверка адреса: на чужом домене копия сама покажет оригинал. */
(function () {
  "use strict";
  var ORIGIN = "https://legusiano.github.io/mebiolsonik26/";
  var OWN = ["legusiano.github.io", "localhost", "127.0.0.1", ""];  // "" — открыт как файл с диска

  document.documentElement.classList.add("js");
  document.addEventListener("DOMContentLoaded", function () { document.body.classList.add("guard"); });

  function editable(t) { return t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable); }

  // правый клик и перетаскивание картинок
  document.addEventListener("contextmenu", function (e) { if (!editable(e.target)) e.preventDefault(); });
  document.addEventListener("dragstart", function (e) { if (e.target.tagName === "IMG") e.preventDefault(); });

  // сохранить / исходный код / печать / инструменты разработчика — сочетания клавиш
  document.addEventListener("keydown", function (e) {
    var k = (e.key || "").toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if (e.key === "F12" || (mod && (k === "s" || k === "u" || k === "p")) || (mod && e.shiftKey && (k === "i" || k === "j" || k === "c"))) {
      e.preventDefault();
    }
  });

  // если что-то всё же скопировали — добавляем подпись с источником
  document.addEventListener("copy", function (e) {
    if (window.__allowCopy || editable(e.target)) return;
    var sel = String(window.getSelection ? window.getSelection() : "");
    if (!sel || !e.clipboardData) return;
    e.clipboardData.setData("text/plain", sel.slice(0, 300) + "\n\n© mebioslonik26 — " + ORIGIN);
    e.preventDefault();
  });

  // копия на чужом домене — показываем ссылку на оригинал
  if (OWN.indexOf(location.hostname) < 0) {
    document.addEventListener("DOMContentLoaded", function () {
      var b = document.getElementById("copy-banner");
      if (!b) return;
      b.textContent = "Это копия сайта. Оригинал: ";
      var a = document.createElement("a"); a.href = ORIGIN; a.textContent = ORIGIN;
      b.appendChild(a); b.hidden = false;
    });
  }

  try {
    console.log("%cmebioslonik26", "font:800 28px sans-serif;color:#3ee6c4");
    console.log("Нравится сайт? Закажи такой же: https://t.me/ZloOi72 — копировать чужой не надо :)");
  } catch (e) { /* нет консоли */ }
})();

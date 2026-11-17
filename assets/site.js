/* Serkan Tiken — shared behaviour: nav, footer, language, motion */
(function () {
  "use strict";
  var root = document.documentElement;
  var R = root.getAttribute("data-root") || "";
  var page = root.getAttribute("data-page") || "home";
  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var KEY = "st-lang";

  /* ---------- language ---------- */
  function setLang(l) {
    root.setAttribute("data-lang", l);
    root.setAttribute("lang", l);
    document.dispatchEvent(new CustomEvent("langchange", { detail: l }));
  }
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  if (saved !== "tr" && saved !== "en") {
    saved = (navigator.language || "tr").toLowerCase().indexOf("tr") === 0 ? "tr" : "en";
  }
  setLang(saved);

  /* ---------- nav + footer ---------- */
  var PROJECTS = [
    { id: "pocketfarm", name: "PocketFarm", color: "var(--farm)", tr: "Çiftlik oyunu", en: "Farming game" },
    { id: "pocketville", name: "PocketVille", color: "var(--ville)", tr: "Şehir kurma oyunu", en: "City builder" },
    { id: "dicereign", name: "Dice Reign", color: "var(--dice)", tr: "Zarlı strateji", en: "Dice strategy" },
    { id: "synapse", name: "Synapse", color: "var(--syn)", tr: "Telefon ↔ Mac", en: "Phone ↔ Mac" },
    { id: "zeta", name: "Zeta", color: "var(--zeta)", tr: "Arayüz paketi", en: "Interface suite" }
  ];
  window.ST_PROJECTS = PROJECTS;

  var nav = document.createElement("header");
  nav.className = "nav";
  nav.innerHTML =
    '<div class="nav-in">' +
      '<a class="brand" href="' + R + 'index.html"><span class="mark" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>Serkan Tiken</a>' +
      '<nav class="nav-links" aria-label="Projeler">' +
        PROJECTS.map(function (p) {
          return '<a href="' + R + 'projeler/' + p.id + '/index.html"' + (page === p.id ? ' aria-current="page"' : "") +
            '><span class="dot" style="background:' + p.color + '"></span>' + p.name + "</a>";
        }).join("") +
      "</nav>" +
      '<button class="lang" type="button" aria-label="Dil / Language"><span lang="tr">EN</span><span lang="en">TR</span></button>' +
      '<button class="menu-btn" type="button" aria-label="Menü"><span></span></button>' +
    "</div>";
  document.body.prepend(nav);

  var bar = document.createElement("div");
  bar.className = "progress";
  document.body.prepend(bar);

  var foot = document.createElement("footer");
  foot.className = "foot";
  foot.innerHTML =
    '<div class="wrap">' +
      '<div class="foot-grid">' +
        "<div>" +
          '<a class="brand" href="' + R + 'index.html"><span class="mark" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>Serkan Tiken</a>' +
          '<p style="max-width:40ch;margin-top:16px"><span lang="tr">Telefon, tablet, Mac ve televizyon için oyunlar ve uygulamalar. Reklam yok, izleme yok.</span><span lang="en">Games and apps for phone, tablet, Mac and TV. No ads, no tracking.</span></p>' +
        "</div>" +
        '<div><h4><span lang="tr">Projeler</span><span lang="en">Projects</span></h4><ul>' +
          PROJECTS.map(function (p) { return '<li><a href="' + R + 'projeler/' + p.id + '/index.html">' + p.name + "</a></li>"; }).join("") +
        "</ul></div>" +
        '<div><h4><span lang="tr">Gizlilik</span><span lang="en">Privacy</span></h4><ul>' +
          PROJECTS.map(function (p) { return '<li><a href="' + R + 'projeler/' + p.id + '/privacy.html">' + p.name + "</a></li>"; }).join("") +
        "</ul></div>" +
      "</div>" +
      '<p style="margin-top:40px">© 2026 Serkan Tiken · <a href="https://github.com/serkantkn">GitHub</a></p>' +
      '<div class="big" aria-hidden="true">Serkan Tiken</div>' +
    "</div>";
  document.body.appendChild(foot);

  nav.querySelector(".lang").addEventListener("click", function () {
    var next = root.getAttribute("data-lang") === "tr" ? "en" : "tr";
    setLang(next);
    try { localStorage.setItem(KEY, next); } catch (e) {}
  });
  nav.querySelector(".menu-btn").addEventListener("click", function () { nav.classList.toggle("open"); });
  nav.querySelectorAll(".nav-links a").forEach(function (a) { a.addEventListener("click", function () { nav.classList.remove("open"); }); });

  var lastY = 0;
  function onScroll() {
    var y = window.scrollY;
    nav.classList.toggle("solid", y > 20);
    nav.classList.toggle("hide", y > 400 && y > lastY && !nav.classList.contains("open"));
    lastY = y;
    var h = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty("--p", h > 0 ? (y / h).toFixed(4) : 0);
  }
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- split headings into letters ---------- */
  function split(el) {
    var i = 0;
    function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (word) {
            if (!word) return;
            if (/^\s+$/.test(word)) { frag.appendChild(document.createTextNode(word)); return; }
            var w = document.createElement("span");
            w.className = "w";
            Array.from(word).forEach(function (c) {
              var s = document.createElement("span");
              s.className = "ch"; s.textContent = c; s.style.setProperty("--i", i++);
              w.appendChild(s);
            });
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.classList.contains("grad")) {
          // gradient text can't be split (background-clip breaks per letter): animate it as one piece
          n.classList.add("ch"); n.style.setProperty("--i", i); i += 3;
        } else if (n.nodeType === 1) { walk(n); }
      });
    }
    walk(el);
  }
  document.querySelectorAll(".split").forEach(split);

  /* ---------- reveal on scroll ---------- */
  var targets = document.querySelectorAll(".reveal, .split");
  if ("IntersectionObserver" in window && !REDUCED) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    targets.forEach(function (t) { io.observe(t); });
  } else {
    targets.forEach(function (t) { t.classList.add("in"); });
  }
  // stagger children
  document.querySelectorAll("[data-stagger]").forEach(function (g) {
    var step = parseFloat(g.getAttribute("data-stagger")) || 0.08;
    Array.prototype.forEach.call(g.children, function (c, i) { c.style.setProperty("--d", (i * step).toFixed(2) + "s"); });
  });

  /* ---------- pointer effects ---------- */
  var fine = window.matchMedia("(pointer: fine)").matches;
  if (fine && !REDUCED) {
    var cur = document.createElement("div");
    cur.className = "cursor";
    document.body.appendChild(cur);
    var cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
    addEventListener("pointermove", function (e) { tx = e.clientX; ty = e.clientY; document.body.classList.add("has-cursor"); }, { passive: true });
    document.addEventListener("pointerleave", function () { document.body.classList.remove("has-cursor"); });
    (function loop() {
      cx += (tx - cx) * 0.12; cy += (ty - cy) * 0.12;
      cur.style.transform = "translate(" + cx + "px," + cy + "px)";
      requestAnimationFrame(loop);
    })();

    document.querySelectorAll("[data-tilt]").forEach(function (el) {
      var max = parseFloat(el.getAttribute("data-tilt")) || 8;
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty("--ry", (x * max).toFixed(2) + "deg");
        el.style.setProperty("--rx", (-y * max).toFixed(2) + "deg");
        el.style.setProperty("--mx", ((x + 0.5) * 100).toFixed(1) + "%");
        el.style.setProperty("--my", ((y + 0.5) * 100).toFixed(1) + "%");
      });
      el.addEventListener("pointerleave", function () {
        el.style.setProperty("--ry", "0deg"); el.style.setProperty("--rx", "0deg");
      });
    });
    document.querySelectorAll(".feat").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--mx", (e.clientX - r.left) + "px");
        el.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
    document.querySelectorAll("[data-magnet]").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.translate = ((e.clientX - r.left - r.width / 2) * 0.25) + "px " + ((e.clientY - r.top - r.height / 2) * 0.35) + "px";
      });
      el.addEventListener("pointerleave", function () { el.style.translate = ""; });
    });
  }

  /* ---------- parallax ---------- */
  var par = document.querySelectorAll("[data-parallax]");
  if (par.length && !REDUCED) {
    var tick = false;
    var run = function () {
      par.forEach(function (el) {
        var s = parseFloat(el.getAttribute("data-parallax")) || 0.2;
        var r = el.parentElement.getBoundingClientRect();
        el.style.transform = "translate3d(0," + ((r.top + r.height / 2 - innerHeight / 2) * -s).toFixed(1) + "px,0)";
      });
      tick = false;
    };
    addEventListener("scroll", function () { if (!tick) { tick = true; requestAnimationFrame(run); } }, { passive: true });
    run();
  }

  /* ---------- counters ---------- */
  var counters = document.querySelectorAll("[data-count]");
  if (counters.length) {
    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target, to = parseFloat(el.getAttribute("data-count")), suf = el.getAttribute("data-suffix") || "";
        cio.unobserve(el);
        if (REDUCED) { el.textContent = to + suf; return; }
        var t0 = performance.now(), dur = 1400;
        (function step(t) {
          var k = Math.min(1, (t - t0) / dur), v = Math.round(to * (1 - Math.pow(1 - k, 3)));
          el.textContent = v + suf;
          if (k < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { cio.observe(c); });
  }

  /* ---------- lightbox ---------- */
  var gal = document.querySelectorAll(".gallery img, [data-zoom]");
  if (gal.length) {
    var lb = document.createElement("div");
    lb.className = "lb";
    lb.innerHTML = '<img alt=""><button type="button" aria-label="Kapat">✕</button>';
    document.body.appendChild(lb);
    var lbi = lb.querySelector("img");
    var close = function () { lb.classList.remove("open"); };
    gal.forEach(function (img) {
      img.addEventListener("click", function () {
        lbi.src = img.currentSrc || img.src; lbi.alt = img.alt;
        lb.classList.add("open");
      });
    });
    lb.addEventListener("click", function (e) { if (e.target !== lbi) close(); });
    addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }

  /* ---------- latest GitHub release ---------- */
  document.querySelectorAll("[data-release]").forEach(function (box) {
    var repo = box.getAttribute("data-release");
    fetch("https://api.github.com/repos/" + repo + "/releases?per_page=5", { headers: { Accept: "application/vnd.github+json" } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (list) {
        if (!list || !list.length) return;
        var rel = list.find(function (x) { return !x.draft; }) || list[0];
        box.querySelectorAll("[data-asset]").forEach(function (a) {
          var suf = a.getAttribute("data-asset");
          var asset = (rel.assets || []).find(function (x) { return x.name.slice(-suf.length) === suf; });
          if (!asset) return;
          a.href = asset.browser_download_url;
          var sz = a.querySelector(".size");
          if (sz) sz.textContent = Math.round(asset.size / 1048576) + " MB";
        });
        box.querySelectorAll("[data-version]").forEach(function (v) {
          v.textContent = (rel.name || rel.tag_name).replace(/^v/, "");
        });
      })
      .catch(function () {});
  });
})();

(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;
  var ACC = "119,161,136", INK = "230,238,232";

  var pointer = { x: -9999, y: -9999, nx: 0, ny: 0 };
  window.addEventListener("pointermove", function (e) {
    pointer.x = e.clientX; pointer.y = e.clientY;
    pointer.nx = e.clientX / window.innerWidth - 0.5;
    pointer.ny = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* =====================================================
     Hero headline: words rise in one after another
     ===================================================== */
  (function headline() {
    var h = document.getElementById("h1");
    if (!h) return;
    var words = h.textContent.trim().split(/\s+/);
    h.textContent = "";
    words.forEach(function (w, i) {
      var s = el("span", "w", w);
      s.style.animationDelay = (0.25 + i * 0.09) + "s";
      h.appendChild(s);
      if (i < words.length - 1) h.appendChild(document.createTextNode(" "));
    });
  })();

  /* =====================================================
     Nav: gets a soft backdrop after scrolling
     ===================================================== */
  var nav = document.getElementById("nav");
  function onScroll() { nav.classList.toggle("scrolled", window.scrollY > 24); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* =====================================================
     3D neural network with orbiting HUD rings
     ===================================================== */
  (function network() {
    var canvas = document.getElementById("net");
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d"), hero = canvas.parentElement;
    var W = 0, H = 0, running = false, raf = 0, visible = true;

    var LAYERS = [4, 7, 7, 5, 3], nodes = [], edges = [], pulses = [];
    LAYERS.forEach(function (count, li) {
      var x = (li - (LAYERS.length - 1) / 2) * 0.62;
      var r = [0.45, 0.8, 0.8, 0.62, 0.3][li];
      for (var i = 0; i < count; i++) {
        var a = (i / count) * Math.PI * 2 + li * 0.55;
        nodes.push({ x: x, y: Math.sin(a) * r, z: Math.cos(a) * r, layer: li });
      }
    });
    nodes.forEach(function (a, ai) { nodes.forEach(function (b, bi) { if (b.layer === a.layer + 1) edges.push([ai, bi]); }); });

    function ringPoints(plane, R, n) {
      var pts = [];
      for (var i = 0; i < n; i++) {
        var t = (i / n) * Math.PI * 2, c = Math.cos(t) * R, s = Math.sin(t) * R;
        pts.push(plane === "xz" ? { x: c, y: 0, z: s } : { x: c, y: s, z: 0 });
      }
      return pts;
    }
    var rings = [
      { pts: ringPoints("xz", 1.55, 160), spin: 0.6, tilt: 0.6, dash: 5, w: 1.1, a: 0.32 },
      { pts: ringPoints("xy", 1.22, 120), spin: -0.9, tilt: 1.0, dash: 3, w: 0.9, a: 0.26 },
      { pts: ringPoints("xz", 1.9, 200), spin: 0.25, tilt: 0.4, dash: 1, w: 0.6, a: 0.12 }
    ];

    function resize() {
      var rect = hero.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width; H = rect.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!running) draw(2000);
    }

    function project(p, ay, ax, scale, cx, cy) {
      var cY = Math.cos(ay), sY = Math.sin(ay);
      var x1 = p.x * cY + p.z * sY, z1 = -p.x * sY + p.z * cY;
      var cX = Math.cos(ax), sX = Math.sin(ax);
      var y2 = p.y * cX - z1 * sX, z2 = p.y * sX + z1 * cX;
      var k = 3.2 / (3.2 + z2);
      return { x: cx + x1 * scale * k, y: cy + y2 * scale * k, z: z2, k: k };
    }

    var mx = 0, my = 0;
    function draw(time) {
      ctx.clearRect(0, 0, W, H);
      var narrow = W < 900;
      var scale = narrow ? Math.min(W * 0.26, H * 0.2) : Math.min(W * 0.15, H * 0.3);
      var cx = narrow ? W * 0.5 : W * 0.68, cy = narrow ? H * 0.25 : H * 0.5;
      mx += (pointer.nx - mx) * 0.04; my += (pointer.ny - my) * 0.04;
      var ay = time * 0.00024 + mx * 0.9, ax = 0.38 + my * 0.5;
      // gentle floating
      cy += Math.sin(time * 0.0011) * scale * 0.055;

      // HUD rings (dashed, orbiting)
      rings.forEach(function (rg) {
        var n = rg.pts.length;
        for (var i = 0; i < n; i++) {
          if (Math.floor(i / rg.dash) % 2) continue;
          var a = project(rg.pts[i], ay * rg.spin, ax * 0.6 + rg.tilt * 0.3, scale, cx, cy);
          var b = project(rg.pts[(i + 1) % n], ay * rg.spin, ax * 0.6 + rg.tilt * 0.3, scale, cx, cy);
          ctx.strokeStyle = "rgba(" + ACC + "," + (rg.a * Math.max(0.3, a.k)).toFixed(3) + ")";
          ctx.lineWidth = rg.w;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      });

      var P = nodes.map(function (n) { return project(n, ay, ax, scale, cx, cy); });

      ctx.lineWidth = 0.6;
      edges.forEach(function (e) {
        var a = P[e[0]], b = P[e[1]];
        var depth = Math.max(0, Math.min(1, ((a.k + b.k) / 2 - 0.7) / 0.6));
        ctx.strokeStyle = "rgba(" + ACC + "," + (0.05 + depth * 0.17).toFixed(3) + ")";
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      });

      if (!reduce && time > 0) {
        if (pulses.length < 14 && Math.random() < 0.07) {
          pulses.push({ e: edges[(Math.random() * edges.length) | 0], t: 0, s: 0.005 + Math.random() * 0.008 });
        }
        for (var p = pulses.length - 1; p >= 0; p--) {
          var pu = pulses[p]; pu.t += pu.s;
          if (pu.t >= 1) { pulses.splice(p, 1); continue; }
          var A = P[pu.e[0]], B = P[pu.e[1]];
          var px = A.x + (B.x - A.x) * pu.t, py = A.y + (B.y - A.y) * pu.t;
          var g = ctx.createRadialGradient(px, py, 0, px, py, 13);
          g.addColorStop(0, "rgba(" + ACC + ",0.95)"); g.addColorStop(1, "rgba(" + ACC + ",0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, 13, 0, 6.2832); ctx.fill();
        }
      }

      var order = P.map(function (_, i) { return i; }).sort(function (a, b) { return P[b].z - P[a].z; });
      order.forEach(function (i) {
        var q = P[i], n = nodes[i], r = 2.2 * q.k + 0.8, alpha = Math.max(0.25, Math.min(1, q.k * 0.85));
        if (n.layer === LAYERS.length - 1) {
          var breathe = 1 + Math.sin(time * 0.002 + i) * 0.12;
          ctx.strokeStyle = "rgba(" + ACC + "," + alpha + ")"; ctx.lineWidth = 1.1;
          ctx.beginPath(); ctx.arc(q.x, q.y, r * 2.6 * breathe, 0, 6.2832); ctx.stroke();
          ctx.fillStyle = "rgba(" + ACC + "," + alpha + ")";
          ctx.beginPath(); ctx.arc(q.x, q.y, r * 1.1, 0, 6.2832); ctx.fill();
        } else {
          ctx.fillStyle = "rgba(" + INK + "," + alpha + ")";
          ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, 6.2832); ctx.fill();
        }
      });
    }

    function loop(t) { draw(t); raf = requestAnimationFrame(loop); }
    function start() { if (running || reduce) return; running = true; raf = requestAnimationFrame(loop); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    resize();
    window.addEventListener("resize", resize);
    if (reduce) { draw(2000); return; }
    start();
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; visible && !document.hidden ? start() : stop(); }).observe(hero);
    }
    document.addEventListener("visibilitychange", function () { document.hidden ? stop() : (visible && start()); });
  })();

  /* =====================================================
     Bubbles: slow, soft, depth-aware, react to the cursor
     ===================================================== */
  (function bubbles() {
    var canvas = document.getElementById("bubbles");
    if (!canvas || !canvas.getContext || reduce) return;
    var ctx = canvas.getContext("2d"), W = 0, H = 0, bs = [], last = 0, raf = 0;

    function make(initial) {
      var d = 0.25 + Math.random() * 0.75;            // depth: 1 = near
      return {
        x: Math.random() * W, y: initial ? Math.random() * (H + 200) : H + 100,
        d: d, r: 5 + d * d * 34 + Math.random() * 6,
        v: 6 + d * 20, ph: Math.random() * 6.28, ox: 0, oy: 0
      };
    }
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = W < 760 ? 12 : 24;
      while (bs.length < count) bs.push(make(true));
      bs.length = count;
    }

    function draw(t) {
      var dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
      ctx.clearRect(0, 0, W, H);
      var sy = window.scrollY, span = H + 200;
      bs.forEach(function (b) {
        b.y -= b.v * dt;
        if (b.y < -100) { b.y = H + 100; b.x = Math.random() * W; }
        var sway = Math.sin(t * 0.0005 * (0.6 + b.d) + b.ph) * (8 + b.r * 0.4);
        var x = b.x + sway, y = (((b.y - sy * 0.14 * b.d) % span) + span) % span - 100;

        // gently pushed away by the cursor
        var dx = x - pointer.x, dy = y - pointer.y, dist = Math.sqrt(dx * dx + dy * dy), R = 150;
        var tx = 0, ty = 0;
        if (dist < R && dist > 0) { var f = (1 - dist / R) * 46 * b.d; tx = dx / dist * f; ty = dy / dist * f; }
        b.ox += (tx - b.ox) * 0.06; b.oy += (ty - b.oy) * 0.06;
        x += b.ox; y += b.oy;

        var a = 0.07 + b.d * 0.2;
        var g = ctx.createRadialGradient(x, y, b.r * 0.2, x, y, b.r);
        g.addColorStop(0, "rgba(" + ACC + ",0)");
        g.addColorStop(0.8, "rgba(" + ACC + "," + (a * 0.18).toFixed(3) + ")");
        g.addColorStop(1, "rgba(" + ACC + "," + (a * 0.5).toFixed(3) + ")");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, b.r, 0, 6.2832); ctx.fill();
        ctx.strokeStyle = "rgba(" + ACC + "," + a.toFixed(3) + ")"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, b.r, 0, 6.2832); ctx.stroke();
        // small specular highlight
        ctx.strokeStyle = "rgba(255,255,255," + (a * 1.4).toFixed(3) + ")"; ctx.lineWidth = 1.2; ctx.lineCap = "round";
        ctx.beginPath(); ctx.arc(x, y, b.r * 0.72, Math.PI * 1.1, Math.PI * 1.38); ctx.stroke();
      });
      raf = requestAnimationFrame(draw);
    }
    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(draw);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) cancelAnimationFrame(raf); else { last = performance.now(); raf = requestAnimationFrame(draw); }
    });
  })();

  /* =====================================================
     Scroll reveal (soft fade + small rise, staggered)
     ===================================================== */
  (function reveal() {
    var sel = ".sec h2, .sec .lead, .sec .lic, .sec .body > *, .principles > div, .dim, .os > div, .limits li, .links li, .steps li, .outputs div";
    var items = [];
    Array.prototype.forEach.call(document.querySelectorAll(sel), function (n) {
      if (n.parentElement.closest(".r")) return;          // avoid fading a parent and its child twice
      n.classList.add("r"); items.push(n);
    });
    var secs = Array.prototype.slice.call(document.querySelectorAll(".sec"));
    var extra = Array.prototype.slice.call(document.querySelectorAll(".final .r"));
    items.forEach(function (n) {
      var idx = 0, c = n.previousElementSibling;
      while (c) { if (c.classList.contains("r")) idx++; c = c.previousElementSibling; }
      n.style.setProperty("--d", Math.min(idx, 5) * 80 + "ms");
    });
    extra.forEach(function (n, i) { n.style.setProperty("--d", i * 120 + "ms"); });
    var all = items.concat(extra, secs);
    if (!("IntersectionObserver" in window) || reduce) { all.forEach(function (n) { n.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    all.forEach(function (n) { io.observe(n); });
  })();

  /* =====================================================
     Pointer spotlight on .glow and 3D tilt on .tilt
     ===================================================== */
  document.querySelectorAll(".glow").forEach(function (n) {
    n.addEventListener("pointermove", function (e) {
      var r = n.getBoundingClientRect();
      n.style.setProperty("--mx", (e.clientX - r.left) + "px");
      n.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  });
  if (finePointer && !reduce) {
    document.querySelectorAll(".tilt").forEach(function (n) {
      n.addEventListener("pointermove", function (e) {
        var r = n.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        n.style.transform = "rotateX(" + (-py * 5).toFixed(2) + "deg) rotateY(" + (px * 7).toFixed(2) + "deg)";
      });
      n.addEventListener("pointerleave", function () { n.style.transform = ""; });
    });
  }

  /* =====================================================
     Illustrative (synthetic) report
     ===================================================== */
  var REPORT = [
    { name: "Performance", status: "ok", score: 0.91, metrics: { accuracy: "0.91", f1_macro: "0.89", cv_folds: "5" },
      text: "Scores are stable across folds in this synthetic example.", limit: "Computed on the evaluation split you provide; future data may differ." },
    { name: "Robustness", status: "inconclusive", score: null, metrics: { perturbations_run: "3", score_variation: "high" },
      text: "Results varied between runs, so no conclusion is drawn.", limit: "Only supported perturbations were tested.",
      rec: "Increase the evaluation sample size and run the audit again." },
    { name: "Explainability", status: "ok", score: 0.74, metrics: { top_feature: "feature_3", features_analyzed: "12" },
      text: "A few features account for most of the measured contribution.", limit: "A contribution is not a cause." },
    { name: "Calibration", status: "ok", score: 0.84, metrics: { ece: "0.04", bins: "10" },
      text: "Predicted probabilities track observed frequencies reasonably well.", limit: "Sparse bins make the estimate noisy." },
    { name: "Data Quality", status: "ok", score: 0.96, metrics: { missing_values: "0.0%", duplicate_rows: "2", constant_features: "0" },
      text: "Two duplicate rows found. No missing values or constant columns.", limit: "Only the supported checks are covered." },
    { name: "Fairness", status: "not_applicable", score: null, metrics: { groups_defined: "0" },
      text: "No groups were defined, so no comparison was made.", limit: "Having no result is not evidence of fairness.",
      rec: "Define the groups you care about to enable this dimension." },
    { name: "Complexity", status: "ok", score: 0.68, metrics: { n_parameters: "synthetic", fit_time: "synthetic" },
      text: "Model size and cost are moderate in this synthetic example.", limit: "Diagnostics depend on what the model exposes." }
  ];
  var STATUS_CLASS = { ok: "st-ok", not_applicable: "st-na", inconclusive: "st-inc" };

  function labelled(label, text) {
    var p = el("p"); p.appendChild(el("b", null, label + " ")); p.appendChild(document.createTextNode(text)); return p;
  }

  (function renderReport() {
    var list = document.getElementById("full-report");
    if (!list) return;
    REPORT.forEach(function (d, i) {
      var li = el("li", "row"), btn = el("button"), did = "full-report-d" + i;
      btn.type = "button"; btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-controls", did);
      btn.appendChild(el("span", "nm-d", d.name));
      var bar = el("span", "bar" + (d.score == null ? " empty" : "")), fill = el("i");
      fill.dataset.w = d.score == null ? "0" : String(Math.round(d.score * 100));
      bar.appendChild(fill); btn.appendChild(bar);
      btn.appendChild(el("span", "status " + STATUS_CLASS[d.status], d.status));
      btn.insertAdjacentHTML("beforeend", '<svg class="chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>');

      var detail = el("div", "detail"), inner = el("div"); detail.id = did;
      var dl = el("dl");
      if (d.score != null) { dl.appendChild(el("dt", null, "score")); dl.appendChild(el("dd", null, d.score.toFixed(2))); }
      Object.keys(d.metrics).forEach(function (k) { dl.appendChild(el("dt", null, k)); dl.appendChild(el("dd", null, d.metrics[k])); });
      inner.appendChild(dl);
      inner.appendChild(labelled("Finding.", d.text));
      inner.appendChild(labelled("Limitation.", d.limit));
      if (d.rec) inner.appendChild(labelled("Suggestion.", d.rec));
      detail.appendChild(inner);

      btn.addEventListener("click", function () { btn.setAttribute("aria-expanded", String(li.classList.toggle("open"))); });
      li.appendChild(btn); li.appendChild(detail); list.appendChild(li);
      if (d.status !== "ok") { li.classList.add("open"); btn.setAttribute("aria-expanded", "true"); }
    });

    var fills = list.querySelectorAll(".bar > i");
    var num = document.querySelector("[data-count]");
    var target = num ? parseFloat(num.dataset.count) : 0;
    function run() {
      fills.forEach(function (f) { f.style.width = f.dataset.w + "%"; });
      if (!num || reduce) return;
      var t0 = performance.now();
      (function tick(now) {
        var p = Math.min(1, (now - t0) / 1400), e = 1 - Math.pow(1 - p, 3);
        num.textContent = (target * e).toFixed(2);
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    }
    if (num && !reduce) num.textContent = "0.00";
    if (reduce || !("IntersectionObserver" in window)) { run(); return; }
    var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { setTimeout(run, 250); io.disconnect(); } }, { threshold: 0.25 });
    io.observe(list);
  })();

  /* ---------- Mobile nav ---------- */
  var toggle = document.querySelector(".nav-toggle"), links = document.getElementById("nav-links");
  function closeNav() { links.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); }
  if (toggle && links) {
    toggle.addEventListener("click", function () { toggle.setAttribute("aria-expanded", String(links.classList.toggle("open"))); });
    links.addEventListener("click", function (e) { if (e.target.closest("a")) closeNav(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && links.classList.contains("open")) { closeNav(); toggle.focus(); } });
    window.addEventListener("resize", function () { if (window.innerWidth > 760) closeNav(); });
  }

  /* ---------- Copy to clipboard ---------- */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy") ? resolve() : reject(); } catch (err) { reject(err); }
      document.body.removeChild(ta);
    });
  }
  document.querySelectorAll(".copy").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.dataset.copy;
      if (!text && btn.dataset.copyTarget) text = document.querySelector(btn.dataset.copyTarget).innerText;
      copyText(text).then(function () { btn.textContent = "Copied"; btn.classList.add("done"); })
        .catch(function () { btn.textContent = "Press Ctrl+C"; })
        .then(function () { setTimeout(function () { btn.textContent = "Copy"; btn.classList.remove("done"); }, 1800); });
    });
  });

  /* ---------- Task tabs (illustrative overview) ---------- */
  var TASKS = [
    { id: "classification", label: "Classification",
      desc: "Predicts a label from features. Probability-based checks such as calibration can apply when the model exposes probabilities.",
      ex: "accuracy, F1, ROC AUC",
      dims: { Performance: "ok", Robustness: "ok", Explainability: "ok", Calibration: "ok", "Data Quality": "ok", Fairness: "needs groups", Complexity: "ok" } },
    { id: "regression", label: "Regression",
      desc: "Predicts a continuous value. Error-based metrics replace classification metrics, and probability calibration generally does not apply.",
      ex: "R², MAE, RMSE",
      dims: { Performance: "ok", Robustness: "ok", Explainability: "ok", Calibration: "not_applicable", "Data Quality": "ok", Fairness: "needs groups", Complexity: "ok" } },
    { id: "clustering", label: "Clustering",
      desc: "Groups samples without ground-truth labels, so evaluation relies on structure-based measures instead of accuracy.",
      ex: "silhouette score, cluster sizes",
      dims: { Performance: "ok", Robustness: "ok", Explainability: "varies", Calibration: "not_applicable", "Data Quality": "ok", Fairness: "needs groups", Complexity: "ok" } },
    { id: "anomaly_detection", label: "Anomaly detection",
      desc: "Scores how unusual each sample is. Labelled anomalies are often scarce, so some dimensions may be inconclusive.",
      ex: "anomaly score distribution",
      dims: { Performance: "varies", Robustness: "ok", Explainability: "varies", Calibration: "not_applicable", "Data Quality": "ok", Fairness: "needs groups", Complexity: "ok" } },
    { id: "dimensionality_reduction", label: "Dimensionality reduction",
      desc: "Evaluates how well a lower-dimensional representation preserves information from the original data.",
      ex: "explained variance, reconstruction error",
      dims: { Performance: "ok", Robustness: "ok", Explainability: "varies", Calibration: "not_applicable", "Data Quality": "ok", Fairness: "needs groups", Complexity: "ok" } },
    { id: "reinforcement_learning", label: "Reinforcement learning",
      desc: "Judges a policy by the outcomes it produces in an environment, not by fixed labels.",
      ex: "episode return, return variance",
      dims: { Performance: "ok", Robustness: "varies", Explainability: "varies", Calibration: "not_applicable", "Data Quality": "varies", Fairness: "needs groups", Complexity: "varies" } }
  ];
  function chip(v) { return v === "ok" ? "st-ok" : v === "not_applicable" ? "st-na" : "st-inc"; }

  var tablist = document.getElementById("tablist"), panels = document.getElementById("tabpanels");
  if (tablist && panels) {
    TASKS.forEach(function (t, i) {
      var tab = el("button", "tab", t.label);
      tab.type = "button"; tab.id = "tab-" + t.id;
      tab.setAttribute("role", "tab"); tab.setAttribute("aria-controls", "panel-" + t.id);
      tab.setAttribute("aria-selected", i === 0 ? "true" : "false"); tab.tabIndex = i === 0 ? 0 : -1;
      tablist.appendChild(tab);

      var panel = el("div", "tabpanel"); panel.id = "panel-" + t.id;
      panel.setAttribute("role", "tabpanel"); panel.setAttribute("aria-labelledby", tab.id); panel.hidden = i !== 0;
      panel.appendChild(el("h3", null, t.label));
      panel.appendChild(el("p", null, t.desc));
      var cmd = el("div", "cmd"); cmd.appendChild(el("code", null, 'task_type="' + t.id + '"')); panel.appendChild(cmd);
      panel.appendChild(el("p", "small", "Typical metrics: " + t.ex + "."));
      var m = el("div", "matrix");
      Object.keys(t.dims).forEach(function (k) {
        var r = el("div"); r.appendChild(el("span", null, k)); r.appendChild(el("span", "status " + chip(t.dims[k]), t.dims[k])); m.appendChild(r);
      });
      panel.appendChild(m);
      var note = el("p", "small", "Illustrative overview, not the exact list of supported metrics. Check the repository for current behavior per task.");
      note.style.marginTop = "16px"; panel.appendChild(note);
      panels.appendChild(panel);
    });

    var tabs = Array.prototype.slice.call(tablist.querySelectorAll(".tab"));
    function select(i, focus) {
      tabs.forEach(function (t, j) { t.setAttribute("aria-selected", String(i === j)); t.tabIndex = i === j ? 0 : -1; panels.children[j].hidden = i !== j; });
      if (focus) tabs[i].focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(i, false); });
      t.addEventListener("keydown", function (e) {
        var n = tabs.length, k = e.key;
        if (k === "ArrowRight" || k === "ArrowDown") { e.preventDefault(); select((i + 1) % n, true); }
        else if (k === "ArrowLeft" || k === "ArrowUp") { e.preventDefault(); select((i - 1 + n) % n, true); }
        else if (k === "Home") { e.preventDefault(); select(0, true); }
        else if (k === "End") { e.preventDefault(); select(n - 1, true); }
      });
    });
  }
})();

/* =========================================================
   Projective-Attention Playground
   Embed with: <div data-widget="paa"></div>
   (also accepts the long alias data-widget="projective-attention")

   Modes
     standard  — attention weights α as bar strip
     clipping  — shows residual r = Σ αⱼ · ReLU(m − q·k̂ⱼ) · k̂ⱼ
     feature   — decomposes q = m + u along the attended key normals
   ========================================================= */
(function () {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";

  const KEY_COLORS = ["#CC785C", "#5C8FCC", "#6FA85C", "#B85CCC", "#CCA34D"];
  const KEY_LABELS = ["k₁", "k₂", "k₃", "k₄", "k₅"];
  const KEY_ANGLES_INIT = [0.35, 1.30, 2.55, 3.85, 5.20];
  const KEY_RADIUS_INIT = 1.4;

  const RED = "#D24A4A";
  const M_COLOR = "#CC785C";
  const U_COLOR = "#5C8FCC";

  function el(name, attrs, parent) {
    const node = document.createElementNS(SVG_NS, name);
    if (attrs) for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }

  function mount(container) {
    if (container.dataset.paMounted) return;
    container.dataset.paMounted = "1";

    const W = 620;
    const H_PLOT = 380;
    const H_BAR = 70;
    const H = H_PLOT + H_BAR;
    const cx = W / 2;
    const cy = H_PLOT / 2;
    const scale = 70;

    const keys = KEY_ANGLES_INIT.map((a, i) => ({
      x: KEY_RADIUS_INIT * Math.cos(a),
      y: KEY_RADIUS_INIT * Math.sin(a),
      color: KEY_COLORS[i],
      label: KEY_LABELS[i],
    }));

    const state = {
      query: { x: 1.15, y: 0.65 },
      mode: "standard",
      tau: 2.0,
      margin: 0.35,
      showWedges: true,
      dragTarget: null,
    };

    container.classList.add("pa-widget");
    container.innerHTML = `
      <header class="pa-header">
        <h4 class="pa-title">Projective-Attention Playground</h4>
        <p class="pa-caption">
          Drag <strong>q</strong> or any key <em>kⱼ</em>. Each key defines a hyperplane through
          the origin; the shaded wedges are the cells of the hyperplane arrangement.
          Switch modes for <em>standard</em> attention, <em>projective clipping</em>
          (red residual <strong>r</strong>), or the <em>projection feature</em> decomposition
          <em>q = m + u</em>.
        </p>
      </header>
      <svg class="pa-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet"
           xmlns="${SVG_NS}" role="img" aria-label="Interactive projective-attention diagram"></svg>
      <div class="pa-controls">
        <div class="pa-control">
          <span class="pa-control-label">mode</span>
          <div class="pa-seg" role="radiogroup">
            <button type="button" class="pa-seg-btn is-active" data-mode="standard">standard</button>
            <button type="button" class="pa-seg-btn" data-mode="clipping">clipping</button>
            <button type="button" class="pa-seg-btn" data-mode="feature">feature</button>
          </div>
        </div>
        <div class="pa-control">
          <span class="pa-control-label">τ</span>
          <input class="pa-slider" data-ctl="tau" type="range" min="0.2" max="5" step="0.1" value="2.0" />
          <output class="pa-out" data-out="tau">2.0</output>
        </div>
        <div class="pa-control pa-control-margin" hidden>
          <span class="pa-control-label">margin m</span>
          <input class="pa-slider" data-ctl="margin" type="range" min="-0.5" max="1.5" step="0.05" value="0.35" />
          <output class="pa-out" data-out="margin">0.35</output>
        </div>
        <div class="pa-control">
          <label class="pa-check">
            <input type="checkbox" checked /> <span>show wedges</span>
          </label>
          <button type="button" class="pa-reset">reset</button>
        </div>
      </div>
    `;

    const svg = container.querySelector(".pa-svg");
    const segBtns = container.querySelectorAll(".pa-seg-btn");
    const tauSlider = container.querySelector('[data-ctl="tau"]');
    const tauOut = container.querySelector('[data-out="tau"]');
    const marginCtl = container.querySelector(".pa-control-margin");
    const marginSlider = container.querySelector('[data-ctl="margin"]');
    const marginOut = container.querySelector('[data-out="margin"]');
    const checkbox = container.querySelector(".pa-check input");
    const resetBtn = container.querySelector(".pa-reset");

    function w2s(x, y) { return [cx + x * scale, cy - y * scale]; }
    function dotp(a, b) { return a.x * b.x + a.y * b.y; }
    function vnorm(v) { return Math.hypot(v.x, v.y); }
    function vhat(v) { const n = vnorm(v) || 1; return { x: v.x / n, y: v.y / n }; }

    function softmax(arr) {
      const m = Math.max.apply(null, arr);
      const e = arr.map((v) => Math.exp(v - m));
      const tot = e.reduce((a, b) => a + b, 0) || 1;
      return e.map((v) => v / tot);
    }

    function weights(qPoint) {
      const q = qPoint || state.query;
      const s = keys.map((k) => state.tau * dotp(q, k));
      return softmax(s);
    }

    function arrow(x1w, y1w, x2w, y2w, opts) {
      const [x1, y1] = w2s(x1w, y1w);
      const [x2, y2] = w2s(x2w, y2w);
      const attrs = {
        x1, y1, x2, y2,
        stroke: opts.color,
        "stroke-opacity": String(opts.opacity != null ? opts.opacity : 1),
        "stroke-width": String(opts.width != null ? opts.width : 2),
        "stroke-linecap": "round",
      };
      if (opts.dash) attrs["stroke-dasharray"] = opts.dash;
      el("line", attrs, svg);
      // head
      const ang = Math.atan2(y2 - y1, x2 - x1);
      const ah = opts.head != null ? opts.head : 8;
      const a1 = ang + Math.PI - 0.5;
      const a2 = ang + Math.PI + 0.5;
      el("path", {
        d:
          `M ${x2} ${y2} ` +
          `L ${x2 + Math.cos(a1) * ah} ${y2 + Math.sin(a1) * ah} ` +
          `L ${x2 + Math.cos(a2) * ah} ${y2 + Math.sin(a2) * ah} Z`,
        fill: opts.color,
        "fill-opacity": String(opts.opacity != null ? opts.opacity : 1),
      }, svg);
    }

    function drawWedges() {
      // Boundaries of the hyperplane arrangement: each k_j contributes the line
      // perpendicular to k_j through the origin, i.e. 2 rays at angle(k_j) ± π/2.
      const rays = [];
      keys.forEach((k) => {
        const a = Math.atan2(k.y, k.x);
        rays.push(((a + Math.PI / 2) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI));
        rays.push(((a - Math.PI / 2) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI));
      });
      rays.sort((a, b) => a - b);

      const R = 3.4;
      for (let i = 0; i < rays.length; i++) {
        const a1 = rays[i];
        const a2 = rays[(i + 1) % rays.length];
        let span = (a2 - a1 + 2 * Math.PI) % (2 * Math.PI);
        if (i === rays.length - 1) span = (2 * Math.PI + a2 - a1) % (2 * Math.PI);
        if (span < 1e-4) continue;
        const midA = a1 + span / 2;
        const sample = { x: R * 0.35 * Math.cos(midA), y: R * 0.35 * Math.sin(midA) };
        const ws = weights(sample);
        let mi = 0;
        for (let j = 1; j < ws.length; j++) if (ws[j] > ws[mi]) mi = j;
        const color = keys[mi].color;
        const dom = ws[mi];

        const [p1x, p1y] = w2s(R * Math.cos(a1), R * Math.sin(a1));
        const [p2x, p2y] = w2s(R * Math.cos(a2), R * Math.sin(a2));
        el("path", {
          d: `M ${cx} ${cy} L ${p1x} ${p1y} A ${R * scale} ${R * scale} 0 0 1 ${p2x} ${p2y} Z`,
          fill: color,
          "fill-opacity": (0.06 + dom * 0.16).toFixed(3),
          stroke: "none",
        }, svg);
      }
    }

    function drawClipping(w, khat) {
      const m = state.margin;
      let rx = 0, ry = 0;
      keys.forEach((k, i) => {
        const s = dotp(state.query, khat[i]);
        const viol = Math.max(0, m - s);
        if (viol <= 0) return;
        const coeff = w[i] * viol;
        rx += coeff * khat[i].x;
        ry += coeff * khat[i].y;
        // tiny individual ghost — drawn from origin, scaled for visibility
        arrow(0, 0, coeff * khat[i].x * 2.5, coeff * khat[i].y * 2.5, {
          color: RED, opacity: 0.32, width: 1.5, dash: "3 3", head: 6,
        });
      });
      const RSC = 2.5;
      arrow(0, 0, rx * RSC, ry * RSC, {
        color: RED, opacity: 0.95, width: 3.5, head: 11,
      });
      const [ex, ey] = w2s(rx * RSC, ry * RSC);
      el("text", {
        x: ex + 12, y: ey - 8,
        "font-family": "var(--font-en-sans, system-ui, sans-serif)",
        "font-size": "14", "font-weight": "700", fill: RED,
      }, svg).textContent = "r";
    }

    function drawFeature(w, khat) {
      let mx = 0, my = 0;
      keys.forEach((k, i) => {
        const s = dotp(state.query, khat[i]);
        mx += w[i] * s * khat[i].x;
        my += w[i] * s * khat[i].y;
      });
      // m from origin
      arrow(0, 0, mx, my, {
        color: M_COLOR, opacity: 0.95, width: 3.2, head: 10,
      });
      const [mxs, mys] = w2s(mx, my);
      el("text", {
        x: mxs + 12, y: mys - 8,
        "font-family": "var(--font-en-sans, system-ui, sans-serif)",
        "font-size": "14", "font-weight": "700", fill: M_COLOR,
      }, svg).textContent = "m";
      // u from m's tip to q's tip
      arrow(mx, my, state.query.x, state.query.y, {
        color: U_COLOR, opacity: 0.9, width: 2.6, dash: "6 4", head: 9,
      });
      const [qxs, qys] = w2s(state.query.x, state.query.y);
      const midx = (mxs + qxs) / 2;
      const midy = (mys + qys) / 2;
      el("text", {
        x: midx + 10, y: midy - 4,
        "font-family": "var(--font-en-sans, system-ui, sans-serif)",
        "font-size": "14", "font-weight": "700", fill: U_COLOR,
      }, svg).textContent = "u";
    }

    function drawBars(w) {
      const barY = H_PLOT + 22;
      const barH = 32;
      const padL = 24, padR = 24;
      const fullW = W - padL - padR;
      const lbl = el("text", {
        x: padL, y: barY - 6,
        "font-family": "var(--font-en-sans, system-ui, sans-serif)",
        "font-size": "11", fill: "currentColor", "fill-opacity": "0.6",
      }, svg);
      lbl.textContent = `attention α  ·  softmax(τ=${state.tau.toFixed(1)})`;
      let xC = padL;
      w.forEach((wi, i) => {
        const segW = wi * fullW;
        el("rect", {
          x: xC, y: barY, width: segW, height: barH,
          fill: keys[i].color, "fill-opacity": "0.92",
        }, svg);
        if (segW > 34) {
          el("text", {
            x: xC + segW / 2, y: barY + barH / 2 + 4,
            "font-family": "var(--font-mono, monospace)",
            "font-size": "11", fill: "#fff", "text-anchor": "middle",
          }, svg).textContent = wi.toFixed(2);
        }
        xC += segW;
      });
    }

    function render() {
      svg.innerHTML = "";
      const w = weights();
      const khat = keys.map(vhat);

      // wedges below everything
      if (state.showWedges) drawWedges();

      // axes
      el("line", {
        x1: 24, y1: cy, x2: W - 24, y2: cy,
        stroke: "currentColor", "stroke-opacity": "0.15",
      }, svg);
      el("line", {
        x1: cx, y1: 24, x2: cx, y2: H_PLOT - 24,
        stroke: "currentColor", "stroke-opacity": "0.15",
      }, svg);

      // hyperplane lines
      keys.forEach((k, i) => {
        const wi = w[i];
        const px = -k.y, py = k.x;
        const reach = 5;
        const [x1, y1] = w2s(px * reach, py * reach);
        const [x2, y2] = w2s(-px * reach, -py * reach);
        el("line", {
          x1, y1, x2, y2,
          stroke: k.color,
          "stroke-opacity": (0.18 + wi * 0.5).toFixed(3),
          "stroke-width": (1 + wi * 2.4).toFixed(2),
          "stroke-dasharray": "5 5",
        }, svg);
      });

      // key arrows + handles
      keys.forEach((k, i) => {
        const [kx, ky] = w2s(k.x, k.y);
        const wi = w[i];
        el("line", {
          x1: cx, y1: cy, x2: kx, y2: ky,
          stroke: k.color,
          "stroke-opacity": (0.55 + wi * 0.45).toFixed(3),
          "stroke-width": (2.5 + wi * 4.5).toFixed(2),
          "stroke-linecap": "round",
        }, svg);
        const dot = el("circle", {
          cx: kx, cy: ky, r: 7 + wi * 4,
          fill: k.color, "fill-opacity": "0.95",
          stroke: "var(--bg)", "stroke-width": "2.5",
          class: "pa-key-dot",
          "data-key-idx": String(i),
        }, svg);
        dot.style.cursor = "grab";
        const offX = k.x >= 0 ? 12 : -12;
        const offY = k.y >= 0 ? -6 : 16;
        el("text", {
          x: kx + offX, y: ky + offY,
          "font-family": "var(--font-en-sans, system-ui, sans-serif)",
          "font-size": "13", "font-weight": "600", fill: k.color,
          "text-anchor": k.x >= 0 ? "start" : "end",
        }, svg).textContent = k.label;
      });

      // mode overlays
      if (state.mode === "clipping") drawClipping(w, khat);
      else if (state.mode === "feature") drawFeature(w, khat);

      // query
      const [qx, qy] = w2s(state.query.x, state.query.y);
      el("line", {
        x1: cx, y1: cy, x2: qx, y2: qy,
        stroke: "currentColor",
        "stroke-opacity": "0.7",
        "stroke-width": "2",
      }, svg);
      const qDot = el("circle", {
        cx: qx, cy: qy, r: 10,
        fill: "currentColor",
        stroke: "var(--bg)", "stroke-width": "3",
        class: "pa-query-dot",
      }, svg);
      qDot.style.cursor = "grab";
      el("text", {
        x: qx + 14, y: qy - 10,
        "font-family": "var(--font-en-sans, system-ui, sans-serif)",
        "font-size": "13", "font-weight": "700", fill: "currentColor",
      }, svg).textContent = "q";

      // divider
      el("line", {
        x1: 0, y1: H_PLOT + 0.5, x2: W, y2: H_PLOT + 0.5,
        stroke: "currentColor", "stroke-opacity": "0.1",
      }, svg);

      drawBars(w);
    }

    // ---- Drag handling ----
    function svgPoint(clientX, clientY) {
      const rect = svg.getBoundingClientRect();
      const sx = W / rect.width;
      const sy = H / rect.height;
      return [(clientX - rect.left) * sx, (clientY - rect.top) * sy];
    }
    function pickTarget(px, py) {
      const targets = [];
      targets.push({
        type: "query",
        dist: Math.hypot(px - (cx + state.query.x * scale), py - (cy - state.query.y * scale)),
      });
      keys.forEach((k, i) => {
        targets.push({
          type: "key", idx: i,
          dist: Math.hypot(px - (cx + k.x * scale), py - (cy - k.y * scale)),
        });
      });
      targets.sort((a, b) => a.dist - b.dist);
      const best = targets[0];
      if (best.dist > 42) return { type: "query", dist: best.dist };
      return best;
    }
    function startDrag(ev) {
      const t = ev.touches ? ev.touches[0] : ev;
      const [px, py] = svgPoint(t.clientX, t.clientY);
      if (py > H_PLOT - 4) return; // ignore bar strip
      ev.preventDefault();
      state.dragTarget = pickTarget(px, py);
      svg.style.cursor = "grabbing";
      moveDrag(ev);
    }
    function moveDrag(ev) {
      if (!state.dragTarget) return;
      if (ev.preventDefault) ev.preventDefault();
      const t = ev.touches ? ev.touches[0] : ev;
      const [px, py] = svgPoint(t.clientX, t.clientY);
      let wx = (px - cx) / scale;
      let wy = -(py - cy) / scale;
      const r = Math.hypot(wx, wy);
      const maxR = 2.8;
      if (r > maxR) { wx *= maxR / r; wy *= maxR / r; }
      const tgt = state.dragTarget;
      if (tgt.type === "query") {
        state.query.x = wx; state.query.y = wy;
      } else {
        const minR = 0.4;
        if (r < minR) {
          const cur = keys[tgt.idx];
          const cn = Math.hypot(cur.x, cur.y) || 1;
          wx = (cur.x / cn) * minR;
          wy = (cur.y / cn) * minR;
        }
        keys[tgt.idx].x = wx;
        keys[tgt.idx].y = wy;
      }
      render();
    }
    function endDrag() {
      state.dragTarget = null;
      svg.style.cursor = "";
    }

    svg.addEventListener("mousedown", startDrag);
    window.addEventListener("mousemove", (e) => { if (state.dragTarget) moveDrag(e); });
    window.addEventListener("mouseup", endDrag);
    svg.addEventListener("touchstart", startDrag, { passive: false });
    window.addEventListener("touchmove", (e) => { if (state.dragTarget) moveDrag(e); }, { passive: false });
    window.addEventListener("touchend", endDrag);

    // ---- Controls ----
    segBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        segBtns.forEach((b) => b.classList.toggle("is-active", b === btn));
        state.mode = btn.dataset.mode;
        marginCtl.hidden = state.mode !== "clipping";
        render();
      });
    });
    tauSlider.addEventListener("input", () => {
      state.tau = parseFloat(tauSlider.value);
      tauOut.textContent = state.tau.toFixed(1);
      render();
    });
    marginSlider.addEventListener("input", () => {
      state.margin = parseFloat(marginSlider.value);
      marginOut.textContent = state.margin.toFixed(2);
      render();
    });
    checkbox.addEventListener("change", () => {
      state.showWedges = checkbox.checked;
      render();
    });
    resetBtn.addEventListener("click", () => {
      state.query = { x: 1.15, y: 0.65 };
      KEY_ANGLES_INIT.forEach((a, i) => {
        keys[i].x = KEY_RADIUS_INIT * Math.cos(a);
        keys[i].y = KEY_RADIUS_INIT * Math.sin(a);
      });
      render();
    });

    render();
  }

  function mountAll(root) {
    (root || document)
      .querySelectorAll('[data-widget="paa"], [data-widget="projective-attention"]')
      .forEach(mount);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => mountAll());
  } else {
    mountAll();
  }

  window.RuoshuiWidgets = window.RuoshuiWidgets || {};
  window.RuoshuiWidgets.projectiveAttention = mountAll;
})();

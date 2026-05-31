/* =========================================================
   HPA Geometry Playground
   Embed with: <div data-widget="hpa-geometry"></div>

   Shows three (q, k, v) tokens.  For each token j we draw
     • the key vector kⱼ
     • the value vector vⱼ
     • the address-shadow ghost vⱼ − cⱼ·kⱼ
   The standard attention output y = Σ αⱼ vⱼ is drawn in
   text-colour; the HPA output z = Σ αⱼ (vⱼ − cⱼ kⱼ) in orange-dashed.
   Toggle KeyNorm to swap kⱼ for its unit-length version k̂ⱼ.
   ========================================================= */
(function () {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const KEY_COLORS = ["#CC785C", "#5C8FCC", "#6FA85C"];
  const KEY_LABELS = ["k₁", "k₂", "k₃"];
  const VAL_LABELS = ["v₁", "v₂", "v₃"];
  const Z_COLOR = "#CC785C";

  function el(name, attrs, parent) {
    const node = document.createElementNS(SVG_NS, name);
    if (attrs) for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }
  function clone(o) { return { x: o.x, y: o.y }; }

  function mount(container) {
    if (container.dataset.hpaMounted) return;
    container.dataset.hpaMounted = "1";

    const W = 620;
    const H_PLOT = 400;
    const H_BAR = 70;
    const H = H_PLOT + H_BAR;
    const cx = W / 2;
    const cy = H_PLOT / 2;
    const scale = 58;

    const initial = {
      keys: [
        { x: 1.5, y: 0.45 },
        { x: -0.7, y: 1.6 },
        { x: 0.25, y: -1.7 },
      ],
      values: [
        { x: -1.6, y: 0.95 },
        { x: 1.25, y: -0.9 },
        { x: 1.85, y: 1.25 },
      ],
      query: { x: 1.05, y: 0.85 },
    };
    const keys = initial.keys.map(clone);
    const values = initial.values.map(clone);

    const state = {
      query: clone(initial.query),
      keyNorm: false,
      tau: 1.5,
      dragTarget: null,
    };

    container.classList.add("pa-widget");
    container.innerHTML = `
      <header class="pa-header">
        <h4 class="pa-title">HPA Geometry Playground</h4>
        <p class="pa-caption">
          Drag <strong>q</strong>, any key <em>kⱼ</em>, or any value <em>vⱼ</em>.
          The dashed segment off each <em>vⱼ</em> is the address shadow
          <em>cⱼ·kⱼ</em> that HPA subtracts. White
          <strong>y</strong> is standard attention; orange-dashed
          <strong>z</strong> is the HPA output.
          Toggle KeyNorm to use unit-length <em>k̂ⱼ</em>.
        </p>
      </header>
      <svg class="pa-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet"
           xmlns="${SVG_NS}" role="img" aria-label="Interactive HPA geometry diagram"></svg>
      <div class="pa-controls">
        <div class="pa-control">
          <label class="pa-check">
            <input type="checkbox" data-ctl="keynorm" /> <span>KeyNorm</span>
          </label>
        </div>
        <div class="pa-control">
          <span class="pa-control-label">τ</span>
          <input class="pa-slider" data-ctl="tau" type="range" min="0.2" max="4" step="0.1" value="1.5" />
          <output class="pa-out" data-out="tau">1.5</output>
        </div>
        <div class="pa-control">
          <button type="button" class="pa-reset">reset</button>
        </div>
      </div>
    `;

    const svg = container.querySelector(".pa-svg");
    const knCheck = container.querySelector('[data-ctl="keynorm"]');
    const tauSlider = container.querySelector('[data-ctl="tau"]');
    const tauOut = container.querySelector('[data-out="tau"]');
    const resetBtn = container.querySelector(".pa-reset");

    function w2s(x, y) { return [cx + x * scale, cy - y * scale]; }
    function dotp(a, b) { return a.x * b.x + a.y * b.y; }
    function vnorm(v) { return Math.hypot(v.x, v.y); }

    function effectiveKeys() {
      if (!state.keyNorm) return keys.map(clone);
      return keys.map((k) => {
        const n = vnorm(k) || 1;
        return { x: k.x / n, y: k.y / n };
      });
    }

    function compute() {
      const kEff = effectiveKeys();
      const scores = kEff.map((k) => state.tau * dotp(state.query, k));
      const mx = Math.max.apply(null, scores);
      const e = scores.map((s) => Math.exp(s - mx));
      const tot = e.reduce((a, b) => a + b, 0) || 1;
      const alpha = e.map((v) => v / tot);

      // shadow coefficient: q·k / ||k||²  (=  q·k̂ when KeyNorm, since ||k̂||²=1)
      const c = kEff.map((k) => dotp(state.query, k) / (dotp(k, k) || 1));
      const shadows = kEff.map((k, i) => ({ x: c[i] * k.x, y: c[i] * k.y }));

      let yx = 0, yy = 0, zx = 0, zy = 0;
      alpha.forEach((a, i) => {
        yx += a * values[i].x;
        yy += a * values[i].y;
        zx += a * (values[i].x - shadows[i].x);
        zy += a * (values[i].y - shadows[i].y);
      });
      return { alpha, c, shadows, kEff, y: { x: yx, y: yy }, z: { x: zx, y: zy } };
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
      if (opts.head !== 0) {
        const ang = Math.atan2(y2 - y1, x2 - x1);
        const ah = opts.head != null ? opts.head : 8;
        const a1 = ang + Math.PI - 0.5;
        const a2 = ang + Math.PI + 0.5;
        el("path", {
          d: `M ${x2} ${y2} ` +
             `L ${x2 + Math.cos(a1) * ah} ${y2 + Math.sin(a1) * ah} ` +
             `L ${x2 + Math.cos(a2) * ah} ${y2 + Math.sin(a2) * ah} Z`,
          fill: opts.color,
          "fill-opacity": String(opts.opacity != null ? opts.opacity : 1),
        }, svg);
      }
    }

    function render() {
      svg.innerHTML = "";
      const { alpha, c, shadows, kEff, y, z } = compute();

      // axes
      el("line", { x1: 24, y1: cy, x2: W - 24, y2: cy,
        stroke: "currentColor", "stroke-opacity": "0.12" }, svg);
      el("line", { x1: cx, y1: 24, x2: cx, y2: H_PLOT - 24,
        stroke: "currentColor", "stroke-opacity": "0.12" }, svg);

      // hyperplanes (perpendicular to k_j)
      kEff.forEach((ke, i) => {
        const n = vnorm(ke) || 1;
        const px = -ke.y / n, py = ke.x / n;
        const reach = 7;
        const [x1, y1] = w2s(px * reach, py * reach);
        const [x2, y2] = w2s(-px * reach, -py * reach);
        el("line", {
          x1, y1, x2, y2,
          stroke: KEY_COLORS[i],
          "stroke-opacity": "0.16",
          "stroke-width": "1",
          "stroke-dasharray": "4 6",
        }, svg);
      });

      // value arrows + handles
      values.forEach((v, i) => {
        arrow(0, 0, v.x, v.y, {
          color: KEY_COLORS[i],
          opacity: 0.35 + alpha[i] * 0.3,
          width: 1.5 + alpha[i] * 1.5,
          head: 7,
        });
      });

      // key arrows + handles
      kEff.forEach((ke, i) => {
        arrow(0, 0, ke.x, ke.y, {
          color: KEY_COLORS[i],
          opacity: 0.6 + alpha[i] * 0.4,
          width: 2 + alpha[i] * 2.5,
          head: 9,
        });
        const [kx, ky] = w2s(ke.x, ke.y);
        const handle = el("circle", {
          cx: kx, cy: ky, r: 6,
          fill: KEY_COLORS[i],
          stroke: "var(--bg)", "stroke-width": "2",
          class: "pa-key-dot",
          "data-key-idx": String(i),
        }, svg);
        handle.style.cursor = "grab";
        el("text", {
          x: kx + (ke.x >= 0 ? 10 : -10),
          y: ky + (ke.y >= 0 ? -8 : 16),
          "font-family": "var(--font-en-sans, system-ui, sans-serif)",
          "font-size": "12", "font-weight": "700",
          fill: KEY_COLORS[i],
          "text-anchor": ke.x >= 0 ? "start" : "end",
        }, svg).textContent = KEY_LABELS[i];
      });

      // address shadows + corrected value dots
      values.forEach((v, i) => {
        const sh = shadows[i];
        const [vx, vy] = w2s(v.x, v.y);
        const corr = { x: v.x - sh.x, y: v.y - sh.y };
        const [ex, ey] = w2s(corr.x, corr.y);
        el("line", {
          x1: vx, y1: vy, x2: ex, y2: ey,
          stroke: KEY_COLORS[i],
          "stroke-opacity": "0.7",
          "stroke-width": "2",
          "stroke-dasharray": "4 4",
        }, svg);
        el("circle", {
          cx: ex, cy: ey, r: 3.6,
          fill: KEY_COLORS[i], "fill-opacity": "0.55",
          stroke: "var(--bg)", "stroke-width": "1",
        }, svg);
        // v handle drawn on top
        const r = 7 + alpha[i] * 5;
        const handle = el("circle", {
          cx: vx, cy: vy, r,
          fill: KEY_COLORS[i], "fill-opacity": "0.9",
          stroke: "var(--bg)", "stroke-width": "2",
          class: "pa-val-dot",
          "data-val-idx": String(i),
        }, svg);
        handle.style.cursor = "grab";
        el("text", {
          x: vx + (v.x >= 0 ? 11 : -11),
          y: vy + (v.y >= 0 ? -9 : 17),
          "font-family": "var(--font-en-sans, system-ui, sans-serif)",
          "font-size": "12", "font-weight": "700",
          fill: KEY_COLORS[i],
          "text-anchor": v.x >= 0 ? "start" : "end",
        }, svg).textContent = VAL_LABELS[i];
      });

      // y vector (standard attention)
      arrow(0, 0, y.x, y.y, {
        color: "currentColor",
        opacity: 0.95,
        width: 3,
        head: 10,
      });
      const [yx, yy] = w2s(y.x, y.y);
      el("circle", {
        cx: yx, cy: yy, r: 6.5,
        fill: "currentColor",
        stroke: "var(--bg)", "stroke-width": "2.5",
      }, svg);
      el("text", {
        x: yx + 12, y: yy - 9,
        "font-family": "var(--font-en-sans, system-ui, sans-serif)",
        "font-size": "14", "font-weight": "700", fill: "currentColor",
      }, svg).textContent = "y";

      // z vector (HPA output)
      arrow(0, 0, z.x, z.y, {
        color: Z_COLOR,
        opacity: 0.95,
        width: 3,
        head: 10,
        dash: "6 4",
      });
      const [zx, zy] = w2s(z.x, z.y);
      el("circle", {
        cx: zx, cy: zy, r: 5.5,
        fill: Z_COLOR, stroke: "var(--bg)", "stroke-width": "2",
      }, svg);
      el("text", {
        x: zx + 12, y: zy + 15,
        "font-family": "var(--font-en-sans, system-ui, sans-serif)",
        "font-size": "14", "font-weight": "700", fill: Z_COLOR,
      }, svg).textContent = "z";

      // query q
      arrow(0, 0, state.query.x, state.query.y, {
        color: "currentColor",
        opacity: 0.55,
        width: 2,
        head: 8,
        dash: "3 4",
      });
      const [qx, qy] = w2s(state.query.x, state.query.y);
      const qDot = el("circle", {
        cx: qx, cy: qy, r: 9,
        fill: "currentColor",
        stroke: "var(--bg)", "stroke-width": "2.5",
        class: "pa-query-dot",
      }, svg);
      qDot.style.cursor = "grab";
      el("text", {
        x: qx + 13, y: qy - 9,
        "font-family": "var(--font-en-sans, system-ui, sans-serif)",
        "font-size": "14", "font-weight": "700", fill: "currentColor",
      }, svg).textContent = "q";

      // divider + bar strip
      el("line", { x1: 0, y1: H_PLOT + 0.5, x2: W, y2: H_PLOT + 0.5,
        stroke: "currentColor", "stroke-opacity": "0.1" }, svg);

      const barY = H_PLOT + 22;
      const barH = 32;
      const padL = 24, padR = 24;
      const fullW = W - padL - padR;
      const lbl = el("text", {
        x: padL, y: barY - 6,
        "font-family": "var(--font-en-sans, system-ui, sans-serif)",
        "font-size": "11", fill: "currentColor", "fill-opacity": "0.6",
      }, svg);
      lbl.textContent =
        `attention α  ·  softmax(τ=${state.tau.toFixed(1)})` +
        (state.keyNorm ? "  ·  KeyNorm" : "");
      let xC = padL;
      alpha.forEach((a, i) => {
        const segW = a * fullW;
        el("rect", {
          x: xC, y: barY, width: segW, height: barH,
          fill: KEY_COLORS[i], "fill-opacity": "0.92",
        }, svg);
        if (segW > 34) {
          el("text", {
            x: xC + segW / 2, y: barY + barH / 2 + 4,
            "font-family": "var(--font-mono, monospace)",
            "font-size": "11", fill: "#fff", "text-anchor": "middle",
          }, svg).textContent = a.toFixed(2);
        }
        xC += segW;
      });
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
        type: "q",
        dist: Math.hypot(px - (cx + state.query.x * scale), py - (cy - state.query.y * scale)),
      });
      const kE = effectiveKeys();
      kE.forEach((ke, i) => {
        targets.push({
          type: "k", idx: i,
          dist: Math.hypot(px - (cx + ke.x * scale), py - (cy - ke.y * scale)),
        });
      });
      values.forEach((v, i) => {
        targets.push({
          type: "v", idx: i,
          dist: Math.hypot(px - (cx + v.x * scale), py - (cy - v.y * scale)),
        });
      });
      targets.sort((a, b) => a.dist - b.dist);
      const best = targets[0];
      if (best.dist > 42) return { type: "q", dist: best.dist };
      return best;
    }
    function startDrag(ev) {
      const t = ev.touches ? ev.touches[0] : ev;
      const [px, py] = svgPoint(t.clientX, t.clientY);
      if (py > H_PLOT - 4) return;
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
      const maxR = 3.2;
      if (r > maxR) { wx *= maxR / r; wy *= maxR / r; }
      const tgt = state.dragTarget;
      if (tgt.type === "q") {
        state.query.x = wx; state.query.y = wy;
      } else if (tgt.type === "k") {
        const minR = 0.35;
        if (r < minR) {
          const cur = keys[tgt.idx];
          const cn = Math.hypot(cur.x, cur.y) || 1;
          wx = (cur.x / cn) * minR;
          wy = (cur.y / cn) * minR;
        }
        if (state.keyNorm) {
          // store direction at length ~1.4 so toggling back to non-KeyNorm looks sensible
          const n = Math.hypot(wx, wy) || 1;
          keys[tgt.idx].x = (wx / n) * 1.4;
          keys[tgt.idx].y = (wy / n) * 1.4;
        } else {
          keys[tgt.idx].x = wx;
          keys[tgt.idx].y = wy;
        }
      } else if (tgt.type === "v") {
        values[tgt.idx].x = wx;
        values[tgt.idx].y = wy;
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

    knCheck.addEventListener("change", () => {
      state.keyNorm = knCheck.checked;
      render();
    });
    tauSlider.addEventListener("input", () => {
      state.tau = parseFloat(tauSlider.value);
      tauOut.textContent = state.tau.toFixed(1);
      render();
    });
    resetBtn.addEventListener("click", () => {
      state.query = clone(initial.query);
      initial.keys.forEach((k, i) => { keys[i].x = k.x; keys[i].y = k.y; });
      initial.values.forEach((v, i) => { values[i].x = v.x; values[i].y = v.y; });
      render();
    });

    render();
  }

  function mountAll(root) {
    (root || document)
      .querySelectorAll('[data-widget="hpa-geometry"]')
      .forEach(mount);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => mountAll());
  } else {
    mountAll();
  }

  window.RuoshuiWidgets = window.RuoshuiWidgets || {};
  window.RuoshuiWidgets.hpaGeometry = mountAll;
})();

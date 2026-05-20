/* =========================================================
   Projective-Attention Playground
   Embed in a post with: <div data-widget="projective-attention"></div>
   ========================================================= */
(function () {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";

  // Colors picked to read against both cream and dark backgrounds.
  const KEY_COLORS = ["#CC785C", "#5C8FCC", "#6FA85C", "#B85CCC", "#CCA34D"];
  const KEY_LABELS = ["k₁", "k₂", "k₃", "k₄", "k₅"];

  // Asymmetric angles so no two keys produce mirrored geometry.
  const KEY_ANGLES = [0.35, 1.30, 2.55, 3.85, 5.20];

  function el(name, attrs, parent) {
    const node = document.createElementNS(SVG_NS, name);
    if (attrs) for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }

  function mount(container) {
    if (container.dataset.paMounted) return;
    container.dataset.paMounted = "1";

    const W = 620;          // SVG view width
    const H_PLOT = 380;     // 2-D plot height
    const H_BAR = 70;       // bar chart strip below
    const H = H_PLOT + H_BAR;
    const cx = W / 2;
    const cy = H_PLOT / 2;
    const scale = 70;       // pixels per world unit

    const keys = KEY_ANGLES.map((a, i) => ({
      x: Math.cos(a),
      y: Math.sin(a),
      color: KEY_COLORS[i],
      label: KEY_LABELS[i],
    }));

    const state = {
      query: { x: 1.15, y: 0.65 },
      activation: "softmax",
      tau: 2.0,
      showHyperplanes: true,
    };

    container.classList.add("pa-widget");
    container.innerHTML = `
      <header class="pa-header">
        <h4 class="pa-title">Projective-Attention Playground</h4>
        <p class="pa-caption">
          Drag <strong>q</strong>. Each key <em>k</em> defines a hyperplane through the origin;
          the dot product <code>q·k</code> is the query's signed distance to that hyperplane.
          The activation function turns those signed distances into the attention pattern <em>α</em>.
        </p>
      </header>
      <svg class="pa-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet"
           xmlns="${SVG_NS}" role="img" aria-label="Interactive projective-attention diagram"></svg>
      <div class="pa-controls">
        <div class="pa-control">
          <span class="pa-control-label">activation</span>
          <div class="pa-seg" role="radiogroup">
            <button type="button" class="pa-seg-btn is-active" data-act="softmax">softmax</button>
            <button type="button" class="pa-seg-btn" data-act="relu">ReLU</button>
          </div>
        </div>
        <div class="pa-control">
          <span class="pa-control-label">τ (sharpness)</span>
          <input class="pa-slider" type="range" min="0.2" max="5" step="0.1" value="2.0" />
          <output class="pa-out">2.0</output>
        </div>
        <div class="pa-control">
          <label class="pa-check">
            <input type="checkbox" checked /> <span>show hyperplanes</span>
          </label>
          <button type="button" class="pa-reset">reset q</button>
        </div>
      </div>
    `;

    const svg = container.querySelector(".pa-svg");
    const segBtns = container.querySelectorAll(".pa-seg-btn");
    const slider = container.querySelector(".pa-slider");
    const sliderOut = container.querySelector(".pa-out");
    const checkbox = container.querySelector(".pa-check input");
    const resetBtn = container.querySelector(".pa-reset");

    function w2s(x, y) {
      return [cx + x * scale, cy - y * scale];
    }
    function dot(a, b) { return a.x * b.x + a.y * b.y; }

    function weights() {
      const s = keys.map((k) => state.tau * dot(state.query, k));
      if (state.activation === "relu") {
        const r = s.map((v) => Math.max(0, v));
        const total = r.reduce((a, b) => a + b, 0);
        return total > 1e-9 ? r.map((v) => v / total) : r.map(() => 0);
      }
      const max = Math.max(...s);
      const e = s.map((v) => Math.exp(v - max));
      const total = e.reduce((a, b) => a + b, 0);
      return e.map((v) => v / total);
    }

    function render() {
      svg.innerHTML = "";
      const w = weights();

      // --- Plot background frame ---
      el("rect", {
        x: 0, y: 0, width: W, height: H_PLOT,
        fill: "var(--bg)", "fill-opacity": "0",
      }, svg);

      // --- Axes ---
      el("line", {
        x1: 24, y1: cy, x2: W - 24, y2: cy,
        stroke: "currentColor", "stroke-opacity": "0.15", "stroke-width": "1",
      }, svg);
      el("line", {
        x1: cx, y1: 24, x2: cx, y2: H_PLOT - 24,
        stroke: "currentColor", "stroke-opacity": "0.15", "stroke-width": "1",
      }, svg);

      // --- Hyperplanes (perpendicular to each key, through origin) ---
      if (state.showHyperplanes) {
        keys.forEach((k, i) => {
          const wi = w[i];
          const px = -k.y, py = k.x; // perpendicular direction
          const reach = 5;
          const [x1, y1] = w2s(px * reach, py * reach);
          const [x2, y2] = w2s(-px * reach, -py * reach);
          el("line", {
            x1, y1, x2, y2,
            stroke: k.color,
            "stroke-opacity": (0.18 + wi * 0.55).toFixed(3),
            "stroke-width": (1 + wi * 2.5).toFixed(2),
            "stroke-dasharray": "5 5",
          }, svg);
        });
      }

      // --- Key vectors ---
      keys.forEach((k, i) => {
        const [kx, ky] = w2s(k.x, k.y);
        const wi = w[i];
        el("line", {
          x1: cx, y1: cy, x2: kx, y2: ky,
          stroke: k.color,
          "stroke-opacity": (0.5 + wi * 0.5).toFixed(3),
          "stroke-width": (2.5 + wi * 4.5).toFixed(2),
          "stroke-linecap": "round",
        }, svg);
        el("circle", {
          cx: kx, cy: ky, r: 4 + wi * 4,
          fill: k.color, "fill-opacity": "0.95",
        }, svg);
        const offX = k.x >= 0 ? 12 : -12;
        const offY = k.y >= 0 ? -6 : 16;
        const t = el("text", {
          x: kx + offX, y: ky + offY,
          "font-family": "var(--font-en-sans, system-ui, sans-serif)",
          "font-size": "13",
          "font-weight": "600",
          fill: k.color,
          "text-anchor": k.x >= 0 ? "start" : "end",
        }, svg);
        t.textContent = k.label;
      });

      // --- Query vector ---
      const [qx, qy] = w2s(state.query.x, state.query.y);
      el("line", {
        x1: cx, y1: cy, x2: qx, y2: qy,
        stroke: "currentColor",
        "stroke-opacity": "0.65",
        "stroke-width": "2",
        "stroke-dasharray": "2 4",
      }, svg);
      const qDot = el("circle", {
        cx: qx, cy: qy, r: 10,
        fill: "currentColor",
        stroke: "var(--bg)",
        "stroke-width": "3",
        class: "pa-query-dot",
      }, svg);
      qDot.style.cursor = "grab";
      const ql = el("text", {
        x: qx + 14, y: qy - 10,
        "font-family": "var(--font-en-sans, system-ui, sans-serif)",
        "font-size": "13",
        "font-weight": "700",
        fill: "currentColor",
      }, svg);
      ql.textContent = "q";

      // --- Divider ---
      el("line", {
        x1: 0, y1: H_PLOT + 0.5, x2: W, y2: H_PLOT + 0.5,
        stroke: "currentColor", "stroke-opacity": "0.1",
      }, svg);

      // --- Bar strip: activation code α ---
      const barY = H_PLOT + 22;
      const barH = 32;
      const padL = 24, padR = 24;
      const fullW = W - padL - padR;

      const label = el("text", {
        x: padL, y: barY - 6,
        "font-family": "var(--font-en-sans, system-ui, sans-serif)",
        "font-size": "11", fill: "currentColor", "fill-opacity": "0.6",
      }, svg);
      label.textContent = `activation code α  ·  ${state.activation}(τ=${state.tau.toFixed(1)})`;

      const totalActive = w.reduce((a, b) => a + b, 0);
      let xCursor = padL;
      if (totalActive < 1e-6) {
        // ReLU dead zone
        el("rect", {
          x: padL, y: barY, width: fullW, height: barH,
          fill: "currentColor", "fill-opacity": "0.07",
        }, svg);
        const t = el("text", {
          x: cx, y: barY + barH / 2 + 4,
          "font-family": "var(--font-en-sans, system-ui, sans-serif)",
          "font-size": "12", fill: "currentColor", "fill-opacity": "0.55",
          "text-anchor": "middle",
        }, svg);
        t.textContent = "all halfspaces inactive — q is on the negative side of every key";
      } else {
        w.forEach((wi, i) => {
          const segW = wi * fullW;
          el("rect", {
            x: xCursor, y: barY, width: segW, height: barH,
            fill: keys[i].color,
            "fill-opacity": "0.92",
          }, svg);
          if (segW > 34) {
            const t = el("text", {
              x: xCursor + segW / 2, y: barY + barH / 2 + 4,
              "font-family": "var(--font-mono, monospace)",
              "font-size": "11", fill: "#fff", "text-anchor": "middle",
            }, svg);
            t.textContent = wi.toFixed(2);
          }
          xCursor += segW;
        });
      }
    }

    // ---- Drag handling ----
    function svgPoint(clientX, clientY) {
      const rect = svg.getBoundingClientRect();
      const sx = W / rect.width;
      const sy = H / rect.height;
      return [(clientX - rect.left) * sx, (clientY - rect.top) * sy];
    }
    function setQueryFromEvent(ev) {
      const t = ev.touches ? ev.touches[0] : ev;
      const [x, y] = svgPoint(t.clientX, t.clientY);
      if (y > H_PLOT - 12) return; // don't drag into bar strip
      let qx = (x - cx) / scale;
      let qy = -(y - cy) / scale;
      const r = Math.hypot(qx, qy);
      const maxR = 2.6;
      if (r > maxR) { qx *= maxR / r; qy *= maxR / r; }
      state.query.x = qx;
      state.query.y = qy;
      render();
    }
    let dragging = false;
    function startDrag(ev) {
      ev.preventDefault();
      dragging = true;
      svg.style.cursor = "grabbing";
      setQueryFromEvent(ev);
    }
    function moveDrag(ev) {
      if (!dragging) return;
      setQueryFromEvent(ev);
    }
    function endDrag() {
      dragging = false;
      svg.style.cursor = "";
    }
    svg.addEventListener("mousedown", startDrag);
    window.addEventListener("mousemove", moveDrag);
    window.addEventListener("mouseup", endDrag);
    svg.addEventListener("touchstart", startDrag, { passive: false });
    window.addEventListener("touchmove", moveDrag, { passive: false });
    window.addEventListener("touchend", endDrag);

    // ---- Controls ----
    segBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        segBtns.forEach((b) => b.classList.toggle("is-active", b === btn));
        state.activation = btn.dataset.act;
        render();
      });
    });
    slider.addEventListener("input", () => {
      state.tau = parseFloat(slider.value);
      sliderOut.textContent = state.tau.toFixed(1);
      render();
    });
    checkbox.addEventListener("change", () => {
      state.showHyperplanes = checkbox.checked;
      render();
    });
    resetBtn.addEventListener("click", () => {
      state.query = { x: 1.15, y: 0.65 };
      render();
    });

    render();
  }

  function mountAll(root) {
    (root || document)
      .querySelectorAll('[data-widget="projective-attention"]')
      .forEach(mount);
  }

  // Auto-mount on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => mountAll());
  } else {
    mountAll();
  }

  // Expose for the SPA route handler in app.js
  window.RuoshuiWidgets = window.RuoshuiWidgets || {};
  window.RuoshuiWidgets.projectiveAttention = mountAll;
})();

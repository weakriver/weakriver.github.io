/* global React, ReactDOM */
(function () {
const { useState, useRef, useMemo } = React;

/* =====================================================================
 *  Projective-Attention Playground
 *  Embedded via: <div data-widget="paa"></div>
 *
 *  A 2D cartoon of attention-as-token-conditioned-ReLU-layer.
 *  Each key k_j defines a hyperplane (a line through the origin in 2D).
 *  The query q lives somewhere in the plane.  The widget lets the reader:
 *    1. see the *cells* of the hyperplane arrangement (the "activation
 *       code" of each region),
 *    2. drag q around and watch the signed incidence bars + attention
 *       weights update,
 *    3. switch between three "modes" that overlay each of the
 *       mechanisms discussed in the post on the same scene:
 *         • Standard       — y = Σ α_j v_j
 *         • Clipping       — r = Σ α_j ReLU(m − s_j) k̂_j
 *         • Feature        — q = m + u  decomposition
 *    4. toggle KeyNorm on/off and watch the geometry stabilize.
 *
 *  No external libraries beyond React are used.
 * ===================================================================*/

const W = 480;
const H = 440;
const CX = W / 2;
const CY = H / 2;
const SCALE = 130; // 1 math unit = 130 px

const toSvg = (v) => ({ sx: CX + v.x * SCALE, sy: CY - v.y * SCALE });
const toMath = (sx, sy) => ({ x: (sx - CX) / SCALE, y: (CY - sy) / SCALE });

const dot = (a, b) => a.x * b.x + a.y * b.y;
const norm = (v) => Math.hypot(v.x, v.y) || 1e-12;
const unit = (v) => { const n = norm(v); return { x: v.x / n, y: v.y / n }; };
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
const scl = (v, c) => ({ x: v.x * c, y: v.y * c });
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

function softmax(xs) {
  const m = Math.max(...xs);
  const e = xs.map((x) => Math.exp(x - m));
  const Z = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / Z);
}

const TOKEN_COLORS = [
  "#6c8cff", // blue
  "#ef7ab8", // pink
  "#34c08f", // green
  "#f59e0b", // amber
  "#a78bfa", // violet
];

const MODES = [
  { id: "standard", label: "Standard", short: "y = Σα·v" },
  { id: "clipping", label: "Projective Clipping", short: "r = Σα·ReLU(m−s)·k̂" },
  { id: "feature", label: "Projection Feature", short: "q = m + u" },
];

function ProjectiveAttentionPAA() {
  // --- state ---------------------------------------------------------
  const [mode, setMode] = useState("feature");
  const [keyNorm, setKeyNorm] = useState(true);
  const [showCells, setShowCells] = useState(true);
  const [tau, setTau] = useState(2.5); // temperature τ_h
  const [margin, setMargin] = useState(0.55); // m_h
  const initialKeys = [
    { x: 1.05, y: 0.30 },
    { x: 0.35, y: 0.95 },
    { x: -0.60, y: 0.75 },
    { x: -0.85, y: -0.45 },
    { x: 0.45, y: -0.85 },
  ];
  const [keys, setKeys] = useState(initialKeys);
  const [query, setQuery] = useState({ x: 0.55, y: 0.25 });

  // The clipping residual r is honestly small in 2D because softmax
  // suppresses the very tokens that violate the margin.  We scale the
  // clipping arrows for display only and label the gain in the UI.
  const CLIP_DISPLAY_GAIN = 3;

  // values are a fixed function of keys so they evolve sensibly when
  // the reader drags keys around.  Rotating each key 90° gives each
  // token a distinct "value direction" that is visually separable
  // from its key direction.
  const values = useMemo(
    () => keys.map((k) => ({ x: -k.y, y: k.x })),
    [keys]
  );

  // --- computation ---------------------------------------------------
  const computed = useMemo(() => {
    const khat = keys.map((k) => unit(k));
    const qhat = unit(query);

    // raw signed-incidence (projective: uses normalized q and k̂)
    const sNorm = khat.map((kh) => dot(qhat, kh)); // ∈ [−1, 1]

    // raw (unnormalized) scores for the standard-style softmax
    const rawScores = keys.map((k, j) =>
      keyNorm ? tau * dot(qhat, khat[j]) : tau * dot(query, k) / Math.sqrt(2)
    );
    const alpha = softmax(rawScores);

    // standard output
    const y = values.reduce(
      (acc, v, j) => add(acc, scl(v, alpha[j])),
      { x: 0, y: 0 }
    );

    // clipping residual r = Σ α_j · ReLU(m − s_j) · k̂_j
    const rho = sNorm.map((s) => Math.max(0, margin - s));
    const r = khat.reduce(
      (acc, kh, j) => add(acc, scl(kh, alpha[j] * rho[j])),
      { x: 0, y: 0 }
    );
    // per-token violation arrows (for the visualization)
    const violArrows = khat.map((kh, j) => scl(kh, alpha[j] * rho[j]));

    // feature decomposition:  m_i = Σ α_j (q·k̂_j) k̂_j ;  u_i = q − m_i
    const m = khat.reduce(
      (acc, kh, j) => add(acc, scl(kh, alpha[j] * dot(query, kh))),
      { x: 0, y: 0 }
    );
    const u = sub(query, m);

    return { khat, qhat, sNorm, alpha, y, rho, r, violArrows, m, u };
  }, [keys, query, keyNorm, tau, margin, values]);

  // --- hyperplane-arrangement cells ---------------------------------
  // For T hyperplanes through the origin in 2D, the cells of the
  // arrangement are angular wedges.  We sort hyperplane angles, then
  // colour each wedge by the binary sign code of its midpoint.
  const cells = useMemo(() => {
    if (!showCells) return [];
    const khat = computed.khat;
    // each plane gives two ray boundaries (angle, angle+π); collect them.
    const rays = [];
    khat.forEach((kh) => {
      const a = Math.atan2(kh.y, kh.x) + Math.PI / 2;
      rays.push(((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI));
      rays.push(((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI));
    });
    rays.sort((a, b) => a - b);
    const R = 800;
    const out = [];
    for (let i = 0; i < rays.length; i++) {
      const a0 = rays[i];
      const a1 = rays[(i + 1) % rays.length];
      const span = (a1 - a0 + 2 * Math.PI) % (2 * Math.PI);
      if (span < 1e-6) continue;
      const mid = (a0 + span / 2) % (2 * Math.PI);
      const midPt = { x: 0.5 * Math.cos(mid), y: 0.5 * Math.sin(mid) };
      const signs = khat.map((kh) => (dot(midPt, kh) > 0 ? 1 : 0));
      const code = signs.join("");
      const p0 = toSvg({ x: R * Math.cos(a0), y: R * Math.sin(a0) });
      const p1 = toSvg({ x: R * Math.cos(mid), y: R * Math.sin(mid) });
      const p2 = toSvg({ x: R * Math.cos(a1), y: R * Math.sin(a1) });
      const pO = toSvg({ x: 0, y: 0 });
      out.push({
        points: `${pO.sx},${pO.sy} ${p0.sx},${p0.sy} ${p1.sx},${p1.sy} ${p2.sx},${p2.sy}`,
        code,
      });
    }
    return out;
  }, [computed.khat, showCells]);

  const cellColor = (code) => {
    // hash the bit string to a hue
    let n = 0;
    for (let i = 0; i < code.length; i++) n = (n * 2 + +code[i]) >>> 0;
    const hue = (n * 53) % 360;
    return `hsla(${hue}, 55%, 60%, 0.10)`;
  };

  // --- drag ----------------------------------------------------------
  const svgRef = useRef(null);
  const [drag, setDrag] = useState(null);

  const startDrag = (kind, idx) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag({ kind, idx });
  };

  const onPointerMove = (e) => {
    if (!drag) return;
    const rect = svgRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const p = toMath(sx, sy);
    const n = norm(p);
    const max = 1.65;
    const clamped = n > max ? scl(p, max / n) : p;
    if (drag.kind === "query") setQuery(clamped);
    else if (drag.kind === "key") {
      setKeys((ks) => ks.map((k, i) => (i === drag.idx ? clamped : k)));
    }
  };
  const onPointerUp = () => setDrag(null);

  // --- rendering helpers --------------------------------------------
  const drawArrow = (from, to, color, width = 2, opacity = 1, dash = null) => {
    const A = toSvg(from);
    const B = toSvg(to);
    const dx = B.sx - A.sx;
    const dy = B.sy - A.sy;
    const len = Math.hypot(dx, dy);
    if (len < 1) return null;
    const ux = dx / len;
    const uy = dy / len;
    // head
    const head = 8;
    const hx = B.sx - ux * head;
    const hy = B.sy - uy * head;
    const px = -uy;
    const py = ux;
    const headPath = `M ${B.sx} ${B.sy} L ${hx + px * head * 0.55} ${hy + py * head * 0.55} L ${hx - px * head * 0.55} ${hy - py * head * 0.55} Z`;
    return (
      <g opacity={opacity}>
        <line
          x1={A.sx} y1={A.sy} x2={hx} y2={hy}
          stroke={color} strokeWidth={width}
          strokeDasharray={dash || undefined} strokeLinecap="round"
        />
        <path d={headPath} fill={color} />
      </g>
    );
  };

  const drawHyperplane = (kh, color, j) => {
    // a line orthogonal to kh through the origin, extended to canvas
    const t = { x: -kh.y, y: kh.x };
    const a = scl(t, 4);
    const b = scl(t, -4);
    const A = toSvg(a);
    const B = toSvg(b);
    return (
      <line
        key={`hp-${j}`}
        x1={A.sx} y1={A.sy} x2={B.sx} y2={B.sy}
        stroke={color}
        strokeWidth={1}
        strokeDasharray="4 4"
        opacity={0.55}
      />
    );
  };

  // axes
  const axes = (
    <g opacity={0.25}>
      <line x1={0} y1={CY} x2={W} y2={CY} stroke="currentColor" strokeWidth={0.5} />
      <line x1={CX} y1={0} x2={CX} y2={H} stroke="currentColor" strokeWidth={0.5} />
    </g>
  );

  // pretty number
  const fmt = (x, d = 2) => (x >= 0 ? "+" : "") + x.toFixed(d);

  // mode-specific output description
  const modeReadout = () => {
    if (mode === "standard") {
      return (
        <>
          <div style={{ color: "var(--text2, #9ca0b0)", fontSize: 11, marginBottom: 4 }}>
            STANDARD OUTPUT
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>
            y = ({fmt(computed.y.x)}, {fmt(computed.y.y)})
          </div>
          <div style={{ color: "var(--text2, #9ca0b0)", fontSize: 11, marginTop: 8 }}>
            The dashed arrow on the canvas is y = Σⱼ αⱼ vⱼ. Faint coloured arrows are the per-token contributions αⱼvⱼ.
          </div>
        </>
      );
    }
    if (mode === "clipping") {
      const rmag = norm(computed.r);
      const anyViol = computed.rho.some((p) => p > 0);
      return (
        <>
          <div style={{ color: "var(--text2, #9ca0b0)", fontSize: 11, marginBottom: 4 }}>
            CLIPPING RESIDUAL
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>
            ‖r‖ = {rmag.toFixed(3)} {anyViol ? "" : "(no token violates the margin)"}
          </div>
          <div style={{ color: "var(--text2, #9ca0b0)", fontSize: 11, marginTop: 8 }}>
            For each token with sⱼ &lt; m, an arrow αⱼ·ReLU(m−sⱼ)·k̂ⱼ is added along that token's key direction. They sum to the thick red residual r — drawn here at <b>×{CLIP_DISPLAY_GAIN} for visibility</b>, since softmax-α suppresses exactly the tokens that violate the margin. Drag the margin slider up and watch the residual light up.
          </div>
        </>
      );
    }
    return (
      <>
        <div style={{ color: "var(--text2, #9ca0b0)", fontSize: 11, marginBottom: 4 }}>
          QUERY DECOMPOSITION
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>
          ‖m‖ = {norm(computed.m).toFixed(3)} ·  ‖u‖ = {norm(computed.u).toFixed(3)}
        </div>
        <div style={{ color: "var(--text2, #9ca0b0)", fontSize: 11, marginTop: 8 }}>
          The orange arrow is m — the query's projection onto the attended key-normal arrangement. The cyan arrow is u — what's left after that. Drag q to change which keys are attended; m chases the attended directions.
        </div>
      </>
    );
  };

  // -------------------------------------------------------------------
  return (
    <div
      style={{
        fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif",
        background: "var(--bg, #0f1117)",
        color: "var(--text, #e2e4e9)",
        borderRadius: 12,
        border: "1px solid var(--border, #2e3345)",
        padding: 20,
        margin: "20px 0",
      }}
      onMouseMove={onPointerMove}
      onMouseUp={onPointerUp}
      onMouseLeave={onPointerUp}
    >
      <style>{`
        .pa-pill {
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid var(--border, #2e3345);
          background: var(--surface, #1a1d27);
          color: var(--text2, #9ca0b0);
          cursor: pointer;
          font-size: 12px;
          font-family: 'IBM Plex Sans', sans-serif;
          transition: all 0.15s;
        }
        .pa-pill:hover { color: var(--text, #e2e4e9); border-color: var(--accent, #6c8cff); }
        .pa-pill.active {
          background: var(--accent2, #4a6bdf);
          border-color: var(--accent, #6c8cff);
          color: #fff;
        }
        .pa-toggle {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; color: var(--text2, #9ca0b0);
          cursor: pointer; user-select: none;
        }
        .pa-toggle input { accent-color: var(--accent, #6c8cff); }
        .pa-slider {
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; color: var(--text2, #9ca0b0);
        }
        .pa-slider input[type=range] { width: 110px; accent-color: var(--accent, #6c8cff); }
        .pa-grid {
          display: grid;
          grid-template-columns: minmax(340px, ${W}px) 1fr;
          gap: 20px;
        }
        @media (max-width: 760px) {
          .pa-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>
          Token-conditioned activation playground
        </div>
        <div style={{ color: "var(--text2, #9ca0b0)", fontSize: 12 }}>
          Drag the query <b style={{ color: "var(--text, #e2e4e9)" }}>q</b> or any key <b style={{ color: "var(--text, #e2e4e9)" }}>kⱼ</b>. Each key defines a hyperplane through the origin; the shaded wedges are the cells of that arrangement — the "activation code" of each region.
        </div>
      </div>

      {/* Mode pills */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`pa-pill ${mode === m.id ? "active" : ""}`}
            onClick={() => setMode(m.id)}
          >
            {m.label}{" "}
            <span style={{ opacity: 0.6, marginLeft: 4, fontFamily: "monospace", fontSize: 11 }}>
              {m.short}
            </span>
          </button>
        ))}
      </div>

      <div className="pa-grid">
        {/* ------------------ MAIN CANVAS ------------------ */}
        <div>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            style={{
              display: "block",
              background: "var(--surface, #1a1d27)",
              borderRadius: 8,
              touchAction: "none",
              cursor: drag ? "grabbing" : "default",
              userSelect: "none",
            }}
          >
            {/* hyperplane-arrangement cells */}
            {cells.map((c, i) => (
              <polygon key={`cell-${i}`} points={c.points} fill={cellColor(c.code)} />
            ))}

            {axes}

            {/* hyperplanes */}
            {computed.khat.map((kh, j) => drawHyperplane(kh, TOKEN_COLORS[j % 5], j))}

            {/* key arrows */}
            {keys.map((k, j) => {
              const kh = computed.khat[j];
              const v = keyNorm ? kh : k;
              return (
                <g key={`key-${j}`}>
                  {drawArrow({ x: 0, y: 0 }, v, TOKEN_COLORS[j % 5], 1.8, 0.95)}
                </g>
              );
            })}

            {/* mode-specific overlays */}
            {mode === "standard" && (
              <>
                {/* per-token contributions α_j v_j (faint) */}
                {values.map((v, j) =>
                  drawArrow(
                    { x: 0, y: 0 },
                    scl(v, computed.alpha[j]),
                    TOKEN_COLORS[j % 5],
                    1.2,
                    0.4
                  )
                )}
                {/* y output */}
                {drawArrow({ x: 0, y: 0 }, computed.y, "#e2e4e9", 2.4, 1, "6 4")}
              </>
            )}

            {mode === "clipping" && (
              <>
                {/* per-token violation arrows along k̂ (×gain for visibility) */}
                {computed.violArrows.map((v, j) =>
                  norm(v) > 1e-4
                    ? drawArrow(
                        { x: 0, y: 0 },
                        scl(v, CLIP_DISPLAY_GAIN),
                        "#ef4444",
                        1.6,
                        0.85
                      )
                    : null
                )}
                {/* total residual r (thick red, ×gain) */}
                {norm(computed.r) > 1e-4 &&
                  drawArrow(
                    { x: 0, y: 0 },
                    scl(computed.r, CLIP_DISPLAY_GAIN),
                    "#ef4444",
                    3.4,
                    1
                  )}
              </>
            )}

            {mode === "feature" && (
              <>
                {/* m arrow (orange) from origin */}
                {drawArrow({ x: 0, y: 0 }, computed.m, "#f59e0b", 2.4, 1)}
                {/* u arrow (cyan) from m to q */}
                {drawArrow(computed.m, query, "#22d3ee", 2.4, 1)}
                {/* small label connections */}
                <line
                  x1={toSvg(computed.m).sx}
                  y1={toSvg(computed.m).sy}
                  x2={toSvg(query).sx}
                  y2={toSvg(query).sy}
                  stroke="#22d3ee"
                  strokeWidth={0.5}
                  opacity={0.3}
                  strokeDasharray="2 3"
                />
              </>
            )}

            {/* key handles + labels */}
            {keys.map((k, j) => {
              const v = keyNorm ? computed.khat[j] : k;
              const p = toSvg(v);
              return (
                <g key={`kh-${j}`}>
                  <circle
                    cx={p.sx} cy={p.sy} r={8}
                    fill={TOKEN_COLORS[j % 5]}
                    stroke="var(--bg, #0f1117)" strokeWidth={2}
                    style={{ cursor: "grab" }}
                    onMouseDown={startDrag("key", j)}
                  />
                  <text
                    x={p.sx + 11} y={p.sy - 9}
                    fill={TOKEN_COLORS[j % 5]}
                    fontSize={11} fontFamily="IBM Plex Mono, monospace"
                    pointerEvents="none"
                  >
                    k{j + 1}
                  </text>
                </g>
              );
            })}

            {/* query handle */}
            {(() => {
              const p = toSvg(query);
              return (
                <g>
                  <circle
                    cx={p.sx} cy={p.sy} r={10}
                    fill="var(--text, #e2e4e9)"
                    stroke="var(--bg, #0f1117)" strokeWidth={2}
                    style={{ cursor: "grab" }}
                    onMouseDown={startDrag("query", -1)}
                  />
                  <text
                    x={p.sx + 13} y={p.sy - 11}
                    fill="var(--text, #e2e4e9)"
                    fontSize={12} fontFamily="IBM Plex Mono, monospace"
                    fontWeight={700}
                    pointerEvents="none"
                  >
                    q
                  </text>
                </g>
              );
            })()}
          </svg>

          {/* Controls row under canvas */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
            <label className="pa-toggle">
              <input
                type="checkbox"
                checked={keyNorm}
                onChange={(e) => setKeyNorm(e.target.checked)}
              />
              KeyNorm
            </label>
            <label className="pa-toggle">
              <input
                type="checkbox"
                checked={showCells}
                onChange={(e) => setShowCells(e.target.checked)}
              />
              Show arrangement cells
            </label>
            <div className="pa-slider">
              τ
              <input
                type="range" min="1" max="10" step="0.1" value={tau}
                onChange={(e) => setTau(+e.target.value)}
              />
              <span style={{ fontFamily: "IBM Plex Mono, monospace" }}>{tau.toFixed(1)}</span>
            </div>
            {mode === "clipping" && (
              <div className="pa-slider">
                m
                <input
                  type="range" min="-1" max="1" step="0.02" value={margin}
                  onChange={(e) => setMargin(+e.target.value)}
                />
                <span style={{ fontFamily: "IBM Plex Mono, monospace" }}>{fmt(margin)}</span>
              </div>
            )}
            <button
              className="pa-pill"
              onClick={() => {
                setKeys(initialKeys);
                setQuery({ x: 0.55, y: 0.25 });
              }}
            >
              reset
            </button>
          </div>
        </div>

        {/* ------------------ SIDE PANEL ------------------ */}
        <div>
          {/* Incidence bars */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: "var(--text2, #9ca0b0)", fontSize: 11, marginBottom: 6 }}>
              SIGNED INCIDENCE  sⱼ = q̂ᵀk̂ⱼ
            </div>
            <IncidenceBars
              scores={computed.sNorm}
              alpha={computed.alpha}
              margin={mode === "clipping" ? margin : null}
              colors={TOKEN_COLORS}
            />
          </div>

          {/* Attention weights */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: "var(--text2, #9ca0b0)", fontSize: 11, marginBottom: 6 }}>
              ATTENTION WEIGHTS  αⱼ = softmax(τ·sⱼ)
            </div>
            <AlphaBars alpha={computed.alpha} colors={TOKEN_COLORS} />
          </div>

          {/* mode-specific readout */}
          <div
            style={{
              background: "var(--surface, #1a1d27)",
              border: "1px solid var(--border, #2e3345)",
              borderRadius: 8,
              padding: 12,
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            {modeReadout()}
          </div>
        </div>
      </div>

      {/* Footnote */}
      <div
        style={{
          marginTop: 14,
          fontSize: 11,
          color: "var(--text2, #9ca0b0)",
          lineHeight: 1.5,
        }}
      >
        <b>Note.</b> This is a 2D cartoon. In a real attention head each token defines a hyperplane in ℝ<sup>d<sub>k</sub></sup>, and there are many more of them; the cells become high-dimensional polytopes rather than wedges. The mechanism — incidence scores, attention weights, the clipping residual, the m + u decomposition — is identical.
      </div>
    </div>
  );
}

/* ===== sub-components ============================================= */

function IncidenceBars({ scores, alpha, margin, colors }) {
  const max = 1.0; // sNorm ∈ [−1, 1] when KeyNorm is on
  const trackW = 220;
  const rowH = 22;
  const labelW = 26;
  const valW = 44;
  return (
    <div>
      {scores.map((s, j) => {
        const violated = margin !== null && s < margin;
        const w = (Math.abs(s) / max) * (trackW / 2);
        const center = labelW + trackW / 2;
        const barX = s >= 0 ? center : center - w;
        const color = violated ? "#ef4444" : colors[j % colors.length];
        return (
          <div
            key={j}
            style={{
              display: "flex",
              alignItems: "center",
              height: rowH,
              fontFamily: "IBM Plex Mono, monospace",
              fontSize: 11,
            }}
          >
            <span style={{ width: labelW, color: colors[j % colors.length] }}>k{j + 1}</span>
            <svg width={trackW} height={rowH}>
              {/* axis */}
              <line
                x1={trackW / 2} y1={2}
                x2={trackW / 2} y2={rowH - 2}
                stroke="var(--border, #2e3345)" strokeWidth={1}
              />
              {/* margin line */}
              {margin !== null && (
                <line
                  x1={trackW / 2 + (margin / max) * (trackW / 2)} y1={1}
                  x2={trackW / 2 + (margin / max) * (trackW / 2)} y2={rowH - 1}
                  stroke="#ef4444" strokeWidth={1.5} strokeDasharray="3 2"
                />
              )}
              {/* bar */}
              <rect
                x={barX - labelW} y={rowH / 2 - 5}
                width={w} height={10}
                fill={color} opacity={0.85}
                rx={2}
              />
            </svg>
            <span style={{ width: valW, marginLeft: 6, color: "var(--text2, #9ca0b0)", textAlign: "right" }}>
              {(s >= 0 ? "+" : "") + s.toFixed(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function AlphaBars({ alpha, colors }) {
  const trackW = 220;
  const rowH = 20;
  const labelW = 26;
  const valW = 44;
  const max = Math.max(...alpha);
  return (
    <div>
      {alpha.map((a, j) => {
        const w = (a / Math.max(max, 1e-6)) * trackW;
        return (
          <div
            key={j}
            style={{
              display: "flex",
              alignItems: "center",
              height: rowH,
              fontFamily: "IBM Plex Mono, monospace",
              fontSize: 11,
            }}
          >
            <span style={{ width: labelW, color: colors[j % colors.length] }}>k{j + 1}</span>
            <svg width={trackW} height={rowH}>
              <rect
                x={0} y={rowH / 2 - 4}
                width={w} height={8}
                fill={colors[j % colors.length]} opacity={0.85}
                rx={2}
              />
            </svg>
            <span style={{ width: valW, marginLeft: 6, color: "var(--text2, #9ca0b0)", textAlign: "right" }}>
              {a.toFixed(3)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
/* ---- Self-mount: scan [data-widget="paa"] divs ---- */
function mountPAA(root) {
  const scope = root || document;
  scope.querySelectorAll('[data-widget="paa"]').forEach((el) => {
    if (el.dataset.paaMounted) return;
    el.dataset.paaMounted = "1";
    ReactDOM.createRoot(el).render(React.createElement(ProjectiveAttentionPAA));
  });
}

if (typeof window !== "undefined") {
  window.RuoshuiWidgets = window.RuoshuiWidgets || {};
  window.RuoshuiWidgets.paa = mountPAA;
  // Babel-standalone transforms after DOMContentLoaded, so mount eagerly.
  mountPAA();
}
})();

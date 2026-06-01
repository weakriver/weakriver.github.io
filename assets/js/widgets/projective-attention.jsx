/* global React, ReactDOM */
(function () {
const { useState, useRef, useMemo } = React;

/* =====================================================================
 *  Projective-Attention Framework Playground
 *  Embedded via: <div data-widget="projective-attention"></div>
 *
 *  Illustrates the core framework claim:
 *      attention is a token-conditioned hyperplane activation layer
 *
 *  Each key kⱼ defines a hyperplane Hⱼ = {q : qᵀkⱼ = 0}.  The query q
 *  produces a vector of signed incidences sⱼ = qᵀkⱼ.  An activation
 *  function φ (softmax / ReLU / sigmoid) maps incidences to attention
 *  weights αⱼ = φ(τ·sⱼ).  Drag q or any kⱼ and watch the activation
 *  code change.
 *
 *  No external libraries beyond React are used.
 * ===================================================================*/

const W = 480;
const H = 440;
const CX = W / 2;
const CY = H / 2;
const SCALE = 120;

const toSvg = (v) => ({ sx: CX + v.x * SCALE, sy: CY - v.y * SCALE });
const toMath = (sx, sy) => ({ x: (sx - CX) / SCALE, y: (CY - sy) / SCALE });

const dot = (a, b) => a.x * b.x + a.y * b.y;
const norm = (v) => Math.hypot(v.x, v.y) || 1e-12;
const scl = (v, c) => ({ x: v.x * c, y: v.y * c });

function softmax(xs) {
  const m = Math.max(...xs);
  const e = xs.map((x) => Math.exp(x - m));
  const Z = e.reduce((a, b) => a + b, 0) || 1;
  return e.map((x) => x / Z);
}
function reluActivate(xs) {
  const r = xs.map((v) => Math.max(0, v));
  const Z = r.reduce((a, b) => a + b, 0);
  return Z > 1e-9 ? r.map((v) => v / Z) : r.map(() => 0);
}
function sigmoidActivate(xs) {
  // independent gates, NOT normalized to a simplex — divide by T to keep
  // the strip totals bounded so the bar chart remains readable
  return xs.map((v) => 1 / (1 + Math.exp(-v))).map((v) => v / xs.length);
}

const TOKEN_COLORS = [
  "#6c8cff", // blue
  "#ef7ab8", // pink
  "#34c08f", // green
  "#f59e0b", // amber
  "#a78bfa", // violet
];

const PHI_OPTIONS = [
  { id: "softmax", label: "softmax", short: "competitive simplex" },
  { id: "relu",    label: "ReLU",    short: "halfspace gates (avg)" },
  { id: "sigmoid", label: "sigmoid", short: "independent gates" },
];

const INITIAL_KEYS = [
  { x: 1.05, y: 0.30 },
  { x: 0.35, y: 0.95 },
  { x: -0.60, y: 0.75 },
  { x: -0.85, y: -0.45 },
  { x: 0.45, y: -0.85 },
];

function ProjectiveAttentionFramework() {
  const [phi, setPhi] = useState("softmax");
  const [keyNorm, setKeyNorm] = useState(true);
  const [showHyperplanes, setShowHyperplanes] = useState(true);
  const [tau, setTau] = useState(2.5);
  const [keys, setKeys] = useState(INITIAL_KEYS);
  const [query, setQuery] = useState({ x: 0.55, y: 0.25 });

  const computed = useMemo(() => {
    const khat = keys.map((k) => {
      const n = norm(k);
      return { x: k.x / n, y: k.y / n };
    });
    // raw incidence, with optional KeyNorm
    const scores = keys.map((k, j) => {
      const refK = keyNorm ? khat[j] : k;
      return tau * dot(query, refK);
    });
    let alpha;
    if (phi === "softmax")      alpha = softmax(scores);
    else if (phi === "relu")    alpha = reluActivate(scores);
    else                        alpha = sigmoidActivate(scores);
    const sNorm = khat.map((kh) => dot(query, kh));
    return { khat, scores, alpha, sNorm };
  }, [keys, query, keyNorm, tau, phi]);

  // ---- drag ----
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

  // ---- drawing helpers ----
  const drawArrow = (from, to, color, width = 2, opacity = 1, dash = null) => {
    const A = toSvg(from);
    const B = toSvg(to);
    const dx = B.sx - A.sx;
    const dy = B.sy - A.sy;
    const len = Math.hypot(dx, dy);
    if (len < 1) return null;
    const ux = dx / len;
    const uy = dy / len;
    const head = 8;
    const hx = B.sx - ux * head;
    const hy = B.sy - uy * head;
    const px = -uy;
    const py = ux;
    const headPath =
      `M ${B.sx} ${B.sy} ` +
      `L ${hx + px * head * 0.55} ${hy + py * head * 0.55} ` +
      `L ${hx - px * head * 0.55} ${hy - py * head * 0.55} Z`;
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
        opacity={0.45}
      />
    );
  };

  const axes = (
    <g opacity={0.25}>
      <line x1={0} y1={CY} x2={W} y2={CY} stroke="currentColor" strokeWidth={0.5} />
      <line x1={CX} y1={0} x2={CX} y2={H} stroke="currentColor" strokeWidth={0.5} />
    </g>
  );

  const fmt = (x, d = 2) => (x >= 0 ? "+" : "") + x.toFixed(d);

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
        .pf-pill {
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
        .pf-pill:hover { color: var(--text, #e2e4e9); border-color: var(--accent, #6c8cff); }
        .pf-pill.active {
          background: var(--accent2, #4a6bdf);
          border-color: var(--accent, #6c8cff);
          color: #fff;
        }
        .pf-toggle {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; color: var(--text2, #9ca0b0);
          cursor: pointer; user-select: none;
        }
        .pf-toggle input { accent-color: var(--accent, #6c8cff); }
        .pf-slider {
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; color: var(--text2, #9ca0b0);
        }
        .pf-slider input[type=range] { width: 110px; accent-color: var(--accent, #6c8cff); }
        .pf-grid {
          display: grid;
          grid-template-columns: minmax(340px, ${W}px) 1fr;
          gap: 20px;
        }
        @media (max-width: 760px) {
          .pf-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>
          Token-conditioned hyperplane activation
        </div>
        <div style={{ color: "var(--text2, #9ca0b0)", fontSize: 12 }}>
          Drag the query <b style={{ color: "var(--text, #e2e4e9)" }}>q</b> or any key{" "}
          <b style={{ color: "var(--text, #e2e4e9)" }}>kⱼ</b>.
          Each key defines a hyperplane through the origin; the activation function
          <span style={{ fontFamily: "monospace" }}> φ</span> maps signed incidences
          into the attention pattern <span style={{ fontFamily: "monospace" }}>α</span>.
        </div>
      </div>

      {/* φ pills */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {PHI_OPTIONS.map((m) => (
          <button
            key={m.id}
            className={`pf-pill ${phi === m.id ? "active" : ""}`}
            onClick={() => setPhi(m.id)}
          >
            φ = {m.label}{" "}
            <span style={{ opacity: 0.6, marginLeft: 4, fontFamily: "monospace", fontSize: 11 }}>
              {m.short}
            </span>
          </button>
        ))}
      </div>

      <div className="pf-grid">
        {/* --- canvas --- */}
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
            {axes}
            {showHyperplanes &&
              computed.khat.map((kh, j) =>
                drawHyperplane(kh, TOKEN_COLORS[j % 5], j)
              )}

            {/* key arrows, alpha-weighted thickness */}
            {keys.map((k, j) => {
              const kh = computed.khat[j];
              const v = keyNorm ? kh : k;
              const a = computed.alpha[j];
              return (
                <g key={`key-${j}`}>
                  {drawArrow(
                    { x: 0, y: 0 }, v,
                    TOKEN_COLORS[j % 5],
                    1.5 + a * 4.5,
                    0.55 + a * 0.45
                  )}
                </g>
              );
            })}

            {/* key handles + labels */}
            {keys.map((k, j) => {
              const v = keyNorm ? computed.khat[j] : k;
              const p = toSvg(v);
              const a = computed.alpha[j];
              return (
                <g key={`kh-${j}`}>
                  <circle
                    cx={p.sx} cy={p.sy} r={6 + a * 4}
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

            {/* query line from origin */}
            {drawArrow({ x: 0, y: 0 }, query, "var(--text, #e2e4e9)", 1.8, 0.55, "3 4")}

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

          {/* Controls under canvas */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
            <label className="pf-toggle">
              <input
                type="checkbox"
                checked={keyNorm}
                onChange={(e) => setKeyNorm(e.target.checked)}
              />
              KeyNorm
            </label>
            <label className="pf-toggle">
              <input
                type="checkbox"
                checked={showHyperplanes}
                onChange={(e) => setShowHyperplanes(e.target.checked)}
              />
              Show hyperplanes
            </label>
            <div className="pf-slider">
              τ
              <input
                type="range" min="0.4" max="10" step="0.1" value={tau}
                onChange={(e) => setTau(+e.target.value)}
              />
              <span style={{ fontFamily: "IBM Plex Mono, monospace" }}>{tau.toFixed(1)}</span>
            </div>
            <button
              className="pf-pill"
              onClick={() => {
                setKeys(INITIAL_KEYS);
                setQuery({ x: 0.55, y: 0.25 });
              }}
            >
              reset
            </button>
          </div>
        </div>

        {/* --- side panel --- */}
        <div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: "var(--text2, #9ca0b0)", fontSize: 11, marginBottom: 6 }}>
              SIGNED INCIDENCE  sⱼ = q̂ᵀk̂ⱼ
            </div>
            <IncidenceBars scores={computed.sNorm} colors={TOKEN_COLORS} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ color: "var(--text2, #9ca0b0)", fontSize: 11, marginBottom: 6 }}>
              ACTIVATION CODE  αⱼ = φ(τ·sⱼ)
            </div>
            <AlphaBars alpha={computed.alpha} colors={TOKEN_COLORS} />
          </div>

          <div
            style={{
              background: "var(--surface, #1a1d27)",
              border: "1px solid var(--border, #2e3345)",
              borderRadius: 8,
              padding: 12,
              fontSize: 12,
              lineHeight: 1.5,
              color: "var(--text2, #9ca0b0)",
            }}
          >
            <div style={{ marginBottom: 4 }}>
              <b style={{ color: "var(--text, #e2e4e9)" }}>What changes with φ?</b>
            </div>
            {phi === "softmax" && (
              <span>
                Softmax forces the row to a simplex — tokens compete. Sharp τ approaches
                argmax (hard retrieval); flat τ approaches uniform mixing.
              </span>
            )}
            {phi === "relu" && (
              <span>
                ReLU keeps each halfspace gate independent then averages over active tokens.
                Below the hyperplane a token contributes zero — its halfspace test fails.
              </span>
            )}
            {phi === "sigmoid" && (
              <span>
                Sigmoid replaces competition with independent bounded gates. Far on the
                positive side of <i>any</i> hyperplane the gate opens; far on the negative
                side it closes — and many can fire at once.
              </span>
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          fontSize: 11,
          color: "var(--text2, #9ca0b0)",
          lineHeight: 1.5,
        }}
      >
        <b>Note.</b> A 2D cartoon of the framework. In a real attention head each
        token contributes a hyperplane in ℝ<sup>d<sub>k</sub></sup>. The geometry —
        signed incidences, hyperplane arrangement, activation code — is the same.
      </div>
    </div>
  );
}

/* ===== sub-components ============================================= */

function IncidenceBars({ scores, colors }) {
  const max = 1.0;
  const trackW = 220;
  const rowH = 22;
  const labelW = 26;
  const valW = 44;
  return (
    <div>
      {scores.map((s, j) => {
        const w = (Math.abs(s) / max) * (trackW / 2);
        const center = trackW / 2;
        const barX = s >= 0 ? center : center - w;
        const color = colors[j % colors.length];
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
            <span style={{ width: labelW, color }}>k{j + 1}</span>
            <svg width={trackW} height={rowH}>
              <line
                x1={trackW / 2} y1={2}
                x2={trackW / 2} y2={rowH - 2}
                stroke="var(--border, #2e3345)" strokeWidth={1}
              />
              <rect
                x={barX} y={rowH / 2 - 5}
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
  const max = Math.max(...alpha, 1e-6);
  return (
    <div>
      {alpha.map((a, j) => {
        const w = (a / max) * trackW;
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

/* ---- Self-mount: scan [data-widget="projective-attention"] divs ---- */
function mountProjectiveAttentionFramework(root) {
  const scope = root || document;
  scope.querySelectorAll('[data-widget="projective-attention"]').forEach((el) => {
    if (el.dataset.pafMounted) return;
    el.dataset.pafMounted = "1";
    ReactDOM.createRoot(el).render(React.createElement(ProjectiveAttentionFramework));
  });
}

if (typeof window !== "undefined") {
  window.RuoshuiWidgets = window.RuoshuiWidgets || {};
  window.RuoshuiWidgets.projectiveAttentionFramework = mountProjectiveAttentionFramework;
  // Babel-standalone transforms after DOMContentLoaded, so mount eagerly.
  mountProjectiveAttentionFramework();
}
})();

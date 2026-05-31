import { useState, useRef, useMemo } from "react";

/* =====================================================================
 *  HPA Geometry Playground
 *  Embedded via: <div data-widget="hpa-geometry"></div>
 *
 *  Three tokens, each with a key kⱼ, a value vⱼ, and (for visualisation)
 *  its own hyperplane Hⱼ = { x : xᵀkⱼ = 0 }.  A draggable query q sits in
 *  the same 2D plane.  The widget makes the "address shadow" of HPA
 *  literally visible:
 *
 *      shadowⱼ  =  (qᵀkⱼ / ‖kⱼ‖²) · kⱼ                  [Vanilla HPA]
 *      shadowⱼ  =  (qᵀk̂ⱼ) · k̂ⱼ                          [KeyNorm HPA]
 *
 *      corrected_vⱼ  =  vⱼ − shadowⱼ
 *      y  = Σⱼ αⱼ vⱼ                  (standard attention)
 *      z  = Σⱼ αⱼ (vⱼ − shadowⱼ)      (HPA output)
 *
 *  Toggles:  hyperplanes / shadows / corrected values / KeyNorm.
 * ===================================================================*/

const W = 520;
const H = 460;
const CX = W / 2;
const CY = H / 2;
const SCALE = 110; // 1 math unit ≈ 110 px

const toSvg = (v) => ({ sx: CX + v.x * SCALE, sy: CY - v.y * SCALE });
const toMath = (sx, sy) => ({ x: (sx - CX) / SCALE, y: (CY - sy) / SCALE });

const dot = (a, b) => a.x * b.x + a.y * b.y;
const norm = (v) => Math.hypot(v.x, v.y) || 1e-12;
const unit = (v) => { const n = norm(v); return { x: v.x / n, y: v.y / n }; };
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
const scl = (v, c) => ({ x: v.x * c, y: v.y * c });

function softmax(xs) {
  const m = Math.max(...xs);
  const e = xs.map((x) => Math.exp(x - m));
  const Z = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / Z);
}

// distinct hue per token so reader can track key/value/shadow trios
const TOKENS = [
  { key: "#6c8cff", val: "#a3b8ff", soft: "#6c8cff" }, // blue
  { key: "#ef7ab8", val: "#f7b6d5", soft: "#ef7ab8" }, // pink
  { key: "#34c08f", val: "#86d9ba", soft: "#34c08f" }, // green
];

const Y_COLOR = "#e2e4e9"; // standard output
const Z_COLOR = "#fb923c"; // HPA output (orange — pops against blue/pink/green)

export default function HpaGeometry() {
  // --- state -------------------------------------------------------------
  const [keyNorm, setKeyNorm] = useState(false);
  const [showHyperplanes, setShowHyperplanes] = useState(true);
  const [showShadows, setShowShadows] = useState(true);
  const [showCorrected, setShowCorrected] = useState(true);

  // initial geometry — deliberately give k₁ a long norm and k₃ a short
  // one, so that toggling KeyNorm produces a visible stabilisation.
  const initial = {
    keys: [
      { x: 1.30, y: 0.45 }, // long
      { x: -0.45, y: 1.05 },
      { x: -0.35, y: -0.55 }, // short
    ],
    values: [
      { x: 0.95, y: -0.30 },
      { x: 0.20, y: 0.95 },
      { x: 1.10, y: 0.50 },
    ],
    query: { x: 0.75, y: 0.55 },
  };
  const [keys, setKeys] = useState(initial.keys);
  const [values, setValues] = useState(initial.values);
  const [query, setQuery] = useState(initial.query);

  // --- math --------------------------------------------------------------
  const computed = useMemo(() => {
    // Which "k" do we use for the address direction? In Vanilla HPA the
    // shadow lives along kⱼ with coefficient (q·kⱼ)/‖kⱼ‖²; in KeyNorm
    // HPA it lives along k̂ⱼ with coefficient (q·k̂ⱼ).
    const kEff = keys.map((k) => (keyNorm ? unit(k) : k));

    // coefficient cⱼ for the shadow vector cⱼ·kEff
    //   Vanilla:  c = (q·k)/‖k‖²   ⇒   c·k = (q·k/‖k‖²)·k
    //   KeyNorm:  c = q·k̂          ⇒   c·k̂ = (q·k̂)·k̂
    const c = keys.map((k, j) =>
      keyNorm ? dot(query, unit(k)) : dot(query, k) / (dot(k, k) || 1e-12)
    );

    // shadow vector for each token (in 2D math coords)
    const shadow = kEff.map((ke, j) => scl(ke, c[j]));

    // corrected per-token value
    const vCorr = values.map((v, j) => sub(v, shadow[j]));

    // attention weights:  softmax over (q·k_eff)/√d_k, d_k=2
    const scores = kEff.map((ke) => dot(query, ke) / Math.sqrt(2));
    const alpha = softmax(scores);

    // standard output  y = Σ αⱼ vⱼ
    const y = values.reduce((acc, v, j) => add(acc, scl(v, alpha[j])), { x: 0, y: 0 });
    // HPA output       z = Σ αⱼ (vⱼ − shadowⱼ)  =  y − Σ αⱼ shadowⱼ
    const totalShadow = shadow.reduce(
      (acc, s, j) => add(acc, scl(s, alpha[j])),
      { x: 0, y: 0 }
    );
    const z = sub(y, totalShadow);

    return { kEff, c, shadow, vCorr, scores, alpha, y, z, totalShadow };
  }, [keys, values, query, keyNorm]);

  // --- drag ---------------------------------------------------------------
  const svgRef = useRef(null);
  const [drag, setDrag] = useState(null); // { kind: 'key'|'value'|'query', idx }

  const startDrag = (kind, idx) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag({ kind, idx });
  };
  const onPointerMove = (e) => {
    if (!drag) return;
    const rect = svgRef.current.getBoundingClientRect();
    const p = toMath(e.clientX - rect.left, e.clientY - rect.top);
    const n = norm(p);
    const max = 2.0;
    const clamped = n > max ? scl(p, max / n) : p;
    if (drag.kind === "query") setQuery(clamped);
    else if (drag.kind === "key")
      setKeys((ks) => ks.map((k, i) => (i === drag.idx ? clamped : k)));
    else if (drag.kind === "value")
      setValues((vs) => vs.map((v, i) => (i === drag.idx ? clamped : v)));
  };
  const onPointerUp = () => setDrag(null);

  // --- drawing helpers ---------------------------------------------------
  const arrow = (from, to, color, opts = {}) => {
    const { width = 2, opacity = 1, dash = null, head = 8 } = opts;
    const A = toSvg(from);
    const B = toSvg(to);
    const dx = B.sx - A.sx;
    const dy = B.sy - A.sy;
    const len = Math.hypot(dx, dy);
    if (len < 0.5) return null;
    const ux = dx / len;
    const uy = dy / len;
    const hx = B.sx - ux * head;
    const hy = B.sy - uy * head;
    const px = -uy;
    const py = ux;
    const headPath = `M ${B.sx} ${B.sy} L ${hx + px * head * 0.55} ${hy + py * head * 0.55} L ${hx - px * head * 0.55} ${hy - py * head * 0.55} Z`;
    return (
      <g opacity={opacity}>
        <line
          x1={A.sx}
          y1={A.sy}
          x2={hx}
          y2={hy}
          stroke={color}
          strokeWidth={width}
          strokeDasharray={dash || undefined}
          strokeLinecap="round"
        />
        <path d={headPath} fill={color} />
      </g>
    );
  };

  const hyperplane = (kEffj, color, idx) => {
    // line orthogonal to kEffj through the origin
    const u = unit(kEffj);
    const t = { x: -u.y, y: u.x };
    const A = toSvg(scl(t, 4));
    const B = toSvg(scl(t, -4));
    return (
      <line
        key={`hp-${idx}`}
        x1={A.sx}
        y1={A.sy}
        x2={B.sx}
        y2={B.sy}
        stroke={color}
        strokeWidth={1}
        strokeDasharray="4 4"
        opacity={0.5}
      />
    );
  };

  const axes = (
    <g opacity={0.22}>
      <line x1={0} y1={CY} x2={W} y2={CY} stroke="currentColor" strokeWidth={0.5} />
      <line x1={CX} y1={0} x2={CX} y2={H} stroke="currentColor" strokeWidth={0.5} />
    </g>
  );

  const fmt = (x, d = 2) => (x >= 0 ? "+" : "") + x.toFixed(d);

  // --- legend chips ------------------------------------------------------
  const legendChips = [
    { color: "#6c8cff", label: "Token 1" },
    { color: "#ef7ab8", label: "Token 2" },
    { color: "#34c08f", label: "Token 3" },
    { color: Y_COLOR, label: "y (standard)" },
    { color: Z_COLOR, label: "z (HPA)" },
  ];

  // -----------------------------------------------------------------------
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
        .hpa-pill {
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
        .hpa-pill:hover { color: var(--text, #e2e4e9); border-color: var(--accent, #6c8cff); }
        .hpa-pill.active {
          background: var(--accent2, #4a6bdf);
          border-color: var(--accent, #6c8cff);
          color: #fff;
        }
        .hpa-toggle {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; color: var(--text2, #9ca0b0);
          cursor: pointer; user-select: none;
        }
        .hpa-toggle input { accent-color: var(--accent, #6c8cff); }
        .hpa-grid {
          display: grid;
          grid-template-columns: minmax(380px, ${W}px) 1fr;
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 800px) {
          .hpa-grid { grid-template-columns: 1fr; }
        }
        .hpa-readout {
          background: var(--surface, #1a1d27);
          border: 1px solid var(--border, #2e3345);
          border-radius: 8px;
          padding: 12px;
          font-size: 12px;
          line-height: 1.5;
        }
        .hpa-readout-row {
          display: flex;
          justify-content: space-between;
          font-family: 'IBM Plex Mono', monospace;
          padding: 2px 0;
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>
          Address-shadow playground
        </div>
        <div style={{ color: "var(--text2, #9ca0b0)", fontSize: 12 }}>
          Drag <b style={{ color: Y_COLOR }}>q</b>, any key <b style={{ color: TOKENS[0].key }}>k</b>, or any value <b>v</b>. Each key kⱼ defines a hyperplane (dashed line). The faint dashed segment along each kⱼ is the <b>address shadow</b> cⱼ·kⱼ that HPA subtracts from vⱼ.
        </div>
      </div>

      {/* Mode + toggles */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button className={`hpa-pill ${!keyNorm ? "active" : ""}`} onClick={() => setKeyNorm(false)}>
            Vanilla HPA <span style={{ opacity: 0.6, marginLeft: 4, fontFamily: "monospace" }}>c = q·k/‖k‖²</span>
          </button>
          <button className={`hpa-pill ${keyNorm ? "active" : ""}`} onClick={() => setKeyNorm(true)}>
            KeyNorm HPA <span style={{ opacity: 0.6, marginLeft: 4, fontFamily: "monospace" }}>c = q·k̂</span>
          </button>
        </div>
        <div style={{ flex: "0 0 auto", width: 1, height: 22, background: "var(--border, #2e3345)" }} />
        <label className="hpa-toggle">
          <input type="checkbox" checked={showHyperplanes} onChange={(e) => setShowHyperplanes(e.target.checked)} />
          hyperplanes
        </label>
        <label className="hpa-toggle">
          <input type="checkbox" checked={showShadows} onChange={(e) => setShowShadows(e.target.checked)} />
          address shadows
        </label>
        <label className="hpa-toggle">
          <input type="checkbox" checked={showCorrected} onChange={(e) => setShowCorrected(e.target.checked)} />
          corrected vⱼ − shadowⱼ
        </label>
        <button
          className="hpa-pill"
          onClick={() => {
            setKeys(initial.keys);
            setValues(initial.values);
            setQuery(initial.query);
          }}
          style={{ marginLeft: "auto" }}
        >
          reset
        </button>
      </div>

      <div className="hpa-grid">
        {/* ============ MAIN CANVAS ============ */}
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

            {/* hyperplanes */}
            {showHyperplanes &&
              computed.kEff.map((ke, j) => hyperplane(ke, TOKENS[j].key, j))}

            {/* per-token graphics — keys, values, shadows, corrected vⱼ */}
            {keys.map((k, j) => {
              const ke = computed.kEff[j];
              const v = values[j];
              const sh = computed.shadow[j];
              const vc = computed.vCorr[j];

              return (
                <g key={`tok-${j}`}>
                  {/* key arrow */}
                  {arrow({ x: 0, y: 0 }, ke, TOKENS[j].key, { width: 2.2, opacity: 0.95 })}

                  {/* value arrow (lighter shade) */}
                  {arrow({ x: 0, y: 0 }, v, TOKENS[j].val, { width: 1.6, opacity: 0.95 })}

                  {/* address shadow ghost — drawn along ke */}
                  {showShadows && Math.abs(computed.c[j]) > 1e-3 && (
                    <>
                      {arrow({ x: 0, y: 0 }, sh, TOKENS[j].soft, {
                        width: 1.2,
                        opacity: 0.55,
                        dash: "3 3",
                      })}
                    </>
                  )}

                  {/* corrected value arrow, drawn from the same origin so it's
                      easy to compare against the raw vⱼ */}
                  {showCorrected && (
                    <>
                      {arrow({ x: 0, y: 0 }, vc, TOKENS[j].val, {
                        width: 1.4,
                        opacity: 0.9,
                        dash: "5 3",
                      })}
                      {/* connector from raw vⱼ to corrected vⱼ — the literal
                          "minus shadow" arrow */}
                      <line
                        x1={toSvg(v).sx}
                        y1={toSvg(v).sy}
                        x2={toSvg(vc).sx}
                        y2={toSvg(vc).sy}
                        stroke={TOKENS[j].val}
                        strokeWidth={0.8}
                        strokeDasharray="2 2"
                        opacity={0.5}
                      />
                    </>
                  )}
                </g>
              );
            })}

            {/* standard output y (white) and HPA output z (orange) */}
            {arrow({ x: 0, y: 0 }, computed.y, Y_COLOR, { width: 2.6, opacity: 1 })}
            {arrow({ x: 0, y: 0 }, computed.z, Z_COLOR, { width: 2.6, opacity: 1, dash: "6 3" })}

            {/* labels and handles ------------------------------------------ */}
            {keys.map((k, j) => {
              const ke = computed.kEff[j];
              const v = values[j];
              const pK = toSvg(ke);
              const pV = toSvg(v);
              return (
                <g key={`handles-${j}`}>
                  {/* key handle */}
                  <circle
                    cx={pK.sx}
                    cy={pK.sy}
                    r={7}
                    fill={TOKENS[j].key}
                    stroke="var(--bg, #0f1117)"
                    strokeWidth={2}
                    style={{ cursor: "grab" }}
                    onMouseDown={startDrag("key", j)}
                  />
                  <text
                    x={pK.sx + 10}
                    y={pK.sy - 8}
                    fill={TOKENS[j].key}
                    fontSize={11}
                    fontFamily="IBM Plex Mono, monospace"
                    pointerEvents="none"
                  >
                    k{j + 1}
                  </text>
                  {/* value handle */}
                  <circle
                    cx={pV.sx}
                    cy={pV.sy}
                    r={6}
                    fill={TOKENS[j].val}
                    stroke="var(--bg, #0f1117)"
                    strokeWidth={2}
                    style={{ cursor: "grab" }}
                    onMouseDown={startDrag("value", j)}
                  />
                  <text
                    x={pV.sx + 9}
                    y={pV.sy - 7}
                    fill={TOKENS[j].val}
                    fontSize={11}
                    fontFamily="IBM Plex Mono, monospace"
                    pointerEvents="none"
                  >
                    v{j + 1}
                  </text>
                </g>
              );
            })}

            {/* y label */}
            {(() => {
              const p = toSvg(computed.y);
              return (
                <text
                  x={p.sx + 7}
                  y={p.sy - 5}
                  fill={Y_COLOR}
                  fontSize={11}
                  fontFamily="IBM Plex Mono, monospace"
                  pointerEvents="none"
                >
                  y
                </text>
              );
            })()}
            {/* z label */}
            {(() => {
              const p = toSvg(computed.z);
              return (
                <text
                  x={p.sx + 7}
                  y={p.sy + 12}
                  fill={Z_COLOR}
                  fontSize={11}
                  fontFamily="IBM Plex Mono, monospace"
                  pointerEvents="none"
                >
                  z
                </text>
              );
            })()}

            {/* query handle (on top) */}
            {(() => {
              const p = toSvg(query);
              return (
                <g>
                  <circle
                    cx={p.sx}
                    cy={p.sy}
                    r={10}
                    fill={Y_COLOR}
                    stroke="var(--bg, #0f1117)"
                    strokeWidth={2.5}
                    style={{ cursor: "grab" }}
                    onMouseDown={startDrag("query", -1)}
                  />
                  <text
                    x={p.sx + 13}
                    y={p.sy - 11}
                    fill={Y_COLOR}
                    fontSize={12}
                    fontWeight={700}
                    fontFamily="IBM Plex Mono, monospace"
                    pointerEvents="none"
                  >
                    q
                  </text>
                </g>
              );
            })()}
          </svg>

          {/* legend strip */}
          <div
            style={{
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
              marginTop: 10,
              fontSize: 11,
              color: "var(--text2, #9ca0b0)",
            }}
          >
            {legendChips.map((c) => (
              <span key={c.label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 12,
                    height: 3,
                    background: c.color,
                    borderRadius: 2,
                    display: "inline-block",
                  }}
                />
                {c.label}
              </span>
            ))}
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 12,
                  height: 0,
                  borderTop: "2px dashed #888",
                  display: "inline-block",
                }}
              />
              dashed = shadow / corrected vⱼ / z
            </span>
          </div>
        </div>

        {/* ============ SIDE PANEL ============ */}
        <div>
          {/* Attention weights */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: "var(--text2, #9ca0b0)", fontSize: 11, marginBottom: 6 }}>
              ATTENTION WEIGHTS  αⱼ = softmax(q·k{keyNorm ? "̂" : ""}ⱼ /√d)
            </div>
            <AlphaBars alpha={computed.alpha} colors={TOKENS.map((t) => t.key)} />
          </div>

          {/* Per-token shadow coefficients cⱼ */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: "var(--text2, #9ca0b0)", fontSize: 11, marginBottom: 6 }}>
              SHADOW COEFFICIENT  cⱼ {keyNorm ? "= q·k̂ⱼ" : "= q·kⱼ/‖kⱼ‖²"}
            </div>
            <CoeffBars
              values={computed.c}
              colors={TOKENS.map((t) => t.key)}
              range={keyNorm ? 1.6 : Math.max(2, ...computed.c.map(Math.abs)) + 0.1}
            />
            {!keyNorm && (
              <div
                style={{
                  marginTop: 6,
                  color: "var(--text2, #9ca0b0)",
                  fontSize: 11,
                  lineHeight: 1.4,
                }}
              >
                With Vanilla HPA, ‖kⱼ‖ varies — bars on the same query swing wildly between tokens. Toggle <b>KeyNorm</b> to watch the swing flatten.
              </div>
            )}
          </div>

          {/* Output readout */}
          <div className="hpa-readout">
            <div style={{ color: "var(--text2, #9ca0b0)", fontSize: 11, marginBottom: 6 }}>
              OUTPUTS
            </div>
            <div className="hpa-readout-row">
              <span style={{ color: Y_COLOR }}>‖y‖</span>
              <span>{norm(computed.y).toFixed(3)}</span>
            </div>
            <div className="hpa-readout-row">
              <span style={{ color: Z_COLOR }}>‖z‖</span>
              <span>{norm(computed.z).toFixed(3)}</span>
            </div>
            <div className="hpa-readout-row">
              <span>‖y − z‖</span>
              <span>{norm(computed.totalShadow).toFixed(3)}</span>
            </div>
            <div style={{ color: "var(--text2, #9ca0b0)", fontSize: 11, marginTop: 8, lineHeight: 1.5 }}>
              The HPA output z is y minus the attention-weighted sum of all address shadows. Drag q toward kⱼ to grow shadowⱼ and watch z diverge from y.
            </div>
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
        <b>Note.</b> A 2D cartoon: a real head has d<sub>k</sub>-dimensional keys and values, and many more tokens. The mechanism — pre-aggregation correction along each kⱼ before mixing — is unchanged.
      </div>
    </div>
  );
}

/* ===== sub-components ============================================= */

function AlphaBars({ alpha, colors }) {
  const trackW = 220;
  const rowH = 22;
  const labelW = 26;
  const valW = 50;
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
            <span style={{ width: labelW, color: colors[j] }}>k{j + 1}</span>
            <svg width={trackW} height={rowH}>
              <rect
                x={0}
                y={rowH / 2 - 5}
                width={w}
                height={10}
                fill={colors[j]}
                opacity={0.85}
                rx={2}
              />
            </svg>
            <span
              style={{
                width: valW,
                marginLeft: 6,
                color: "var(--text2, #9ca0b0)",
                textAlign: "right",
              }}
            >
              {a.toFixed(3)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CoeffBars({ values, colors, range }) {
  const trackW = 220;
  const rowH = 22;
  const labelW = 26;
  const valW = 50;
  return (
    <div>
      {values.map((c, j) => {
        const w = (Math.abs(c) / range) * (trackW / 2);
        const cx = trackW / 2;
        const barX = c >= 0 ? cx : cx - w;
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
            <span style={{ width: labelW, color: colors[j] }}>k{j + 1}</span>
            <svg width={trackW} height={rowH}>
              <line
                x1={cx}
                y1={2}
                x2={cx}
                y2={rowH - 2}
                stroke="var(--border, #2e3345)"
                strokeWidth={1}
              />
              <rect
                x={barX}
                y={rowH / 2 - 5}
                width={w}
                height={10}
                fill={colors[j]}
                opacity={0.85}
                rx={2}
              />
            </svg>
            <span
              style={{
                width: valW,
                marginLeft: 6,
                color: "var(--text2, #9ca0b0)",
                textAlign: "right",
              }}
            >
              {(c >= 0 ? "+" : "") + c.toFixed(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

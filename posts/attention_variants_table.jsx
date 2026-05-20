import { useState } from "react";

const variants = [
  {
    id: 1,
    name: "Hard Halfspace (ReLU) Attention",
    axis: "Activation φ",
    formula: "f(qᵢ) = (1/T) Σⱼ vⱼ · ReLU(qᵢᵀkⱼ)",
    intuition: "Each key hyperplane becomes a binary on/off gate. Tokens on the positive side contribute linearly; tokens on the negative side are zeroed out. The 1/T normalization keeps output scale stable as sequence length grows.",
    closestWork: [
      { name: "Wortsman et al. 2023", detail: "Replacing softmax with ReLU in Vision Transformers" },
      { name: "Lai, Lim, Liu 2024", detail: "Attention is a smoothed cubic spline — proves ReLU-attention is a piecewise cubic on a hyperplane arrangement" },
    ],
    closeness: "Exactly the same",
    closenessColor: "#dc2626",
    closenessNote: "Wortsman et al. propose the identical formula (ReLU + 1/L scaling). The hyperplane framework adds geometric motivation but the mechanism is identical.",
  },
  {
    id: 2,
    name: "Signed Attention",
    axis: "Activation φ",
    formula: "αᵢⱼ = qᵢᵀkⱼ / Σₗ|qᵢᵀkₗ|",
    intuition: "Preserves the sign of the incidence score. Tokens on the 'wrong' side of a hyperplane actively subtract their values. Output can be any point in the affine span of values, not just convex combinations.",
    closestWork: [
      { name: "Cog Attention (Lv et al. 2024)", detail: "sign(QKᵀ) ⊙ softmax(|QKᵀ|) — negative weights enable simultaneous copy+delete" },
      { name: "Differential Transformer (Ye et al. 2025)", detail: "softmax(Q₁K₁ᵀ) − λ·softmax(Q₂K₂ᵀ) — difference of two softmax maps" },
    ],
    closeness: "Close but distinct",
    closenessColor: "#f59e0b",
    closenessNote: "Both Cog and Diff Transformer achieve negative weights but via different mechanisms (sign-gated softmax or subtraction of two maps). The L1-normalized signed formulation here is a distinct construction.",
  },
  {
    id: 3,
    name: "Adaptive Temperature",
    axis: "Activation φ",
    formula: "αᵢⱼ = softmax(τ(qᵢ) · qᵢᵀkⱼ)",
    intuition: "Per-head or per-query learnable temperature controls how sharply the activation code discriminates between hyperplane regions. Sharp heads do retrieval; smooth heads do aggregation.",
    closestWork: [
      { name: "SSA (Zhang et al. NeurIPS 2024)", detail: "Learnable τ(q) per query, decoupling semantic similarity from contextual sparsity" },
      { name: "QKNorm (Henry et al. 2020)", detail: "Replaces 1/√dₖ with learnable per-head scalar γ after ℓ₂-normalizing Q, K" },
    ],
    closeness: "Exactly the same",
    closenessColor: "#dc2626",
    closenessNote: "SSA implements precisely the per-query adaptive temperature. QKNorm is the per-head special case. The framework explains why it works (partition smoothness), but the mechanism is known.",
  },
  {
    id: 4,
    name: "Polytope Attention (Hashed)",
    axis: "Hyperplanes (Keys)",
    formula: "h(qᵢ) = sign([qᵢᵀk₁, …, qᵢᵀkₜ]); attend within same hash bucket",
    intuition: "Activate based on which region (polytope) of the hyperplane arrangement the query falls in. Queries with the same binary sign pattern produce identical outputs. O(T log T) complexity.",
    closestWork: [
      { name: "Reformer (Kitaev et al. ICLR 2020)", detail: "LSH on shared Q=K to bin queries into buckets; attend within buckets only" },
    ],
    closeness: "Exactly the same",
    closenessColor: "#dc2626",
    closenessNote: "Reformer's LSH is literally a random sampling of hyperplanes + sign-pattern bucketing. The hyperplane framework provides the geometric explanation but the algorithm is identical.",
  },
  {
    id: 5,
    name: "Conjugate Head Pairs",
    axis: "Hyperplanes (Keys)",
    formula: "K⁽ʰ¹⁾ = XWₖ,  K⁽ʰ²⁾ = XWₖR  (R orthogonal)",
    intuition: "Pair heads with orthogonal hyperplane arrangements so they partition complementary subspaces. Guarantees geometric diversity rather than relying on regularization.",
    closestWork: [
      { name: "Li et al. (EMNLP 2018 / Neurocomputing 2021)", detail: "Disagreement regularization penalizing head cosine similarity in subspace, position, and output" },
      { name: "Voita et al. (ACL 2019)", detail: "Show many heads are redundant and prunable" },
    ],
    closeness: "Related but structurally different",
    closenessColor: "#22c55e",
    closenessNote: "Prior work uses soft regularization losses to encourage diversity post-hoc. Conjugate pairs enforce hard orthogonality of hyperplane normals by construction — a fundamentally different mechanism.",
  },
  {
    id: 6,
    name: "HPA (Orthogonal Retrieval)",
    axis: "Decoding (Values)",
    formula: "f(qᵢ) = Σⱼ αᵢⱼ(vⱼ − (qᵢᵀkⱼ/‖kⱼ‖²)·kⱼ)",
    intuition: "Retrieve only the component of each value orthogonal to its key direction — the information the activation code couldn't already encode. Strips key-aligned redundancy before aggregation.",
    closestWork: [
      { name: "XSA (Zhai 2026)", detail: "zᵢ = yᵢ − (yᵢᵀvᵢ/‖vᵢ‖²)·vᵢ — removes self-value direction post-aggregation" },
    ],
    closeness: "Related but structurally different",
    closenessColor: "#22c55e",
    closenessNote: "XSA subtracts the self-value component after aggregation. HPA subtracts the key-aligned component per source before aggregation. Pre- vs. post-aggregation and key- vs. value-direction make these structurally distinct.",
  },
  {
    id: 7,
    name: "Dual-Code Attention",
    axis: "Decoding (Values)",
    formula: "f(qᵢ) = Σⱼ αᵢⱼvⱼˢ + Σⱼ(c − αᵢⱼ)vⱼʳ",
    intuition: "The activation code tells what the query selects; its complement tells what it rejects. Use both — decode through separate 'select' and 'reject' value projections, doubling information bandwidth.",
    closestWork: [
      { name: "Differential Transformer (Ye et al. 2025)", detail: "α₁ − λα₂ applied to same values — 'selection minus noise' but no separate value projections" },
    ],
    closeness: "Novel — no close precedent",
    closenessColor: "#22c55e",
    closenessNote: "Diff Transformer subtracts attention maps but decodes through one value set. Dual-code gives the rejection channel its own value projection — a genuinely open idea with no published equivalent.",
  },
  {
    id: 8,
    name: "Margin-Gated Attention",
    axis: "Cross-cutting",
    formula: "f(qᵢ) = Σⱼ αᵢⱼ · g(|qᵢᵀkⱼ|) · vⱼ",
    intuition: "Modulate value contribution by confidence of hyperplane assignment. Queries near a boundary contribute less; confidently-classified positions contribute more. A multiplicative gate on top of softmax weights.",
    closestWork: [
      { name: "GAU / FLASH (Hua et al. ICML 2022)", detail: "Output gated by learned U: (U ⊙ AV)Wₒ" },
      { name: "Gated Linear Attention (Yang et al. ICML 2024)", detail: "Data-dependent gating matrix in recurrent state" },
    ],
    closeness: "Novel — no close precedent",
    closenessColor: "#22c55e",
    closenessNote: "Existing gating is either input-independent or applied per-query. Using absolute incidence |qᵀk| as a per-pair confidence gate is novel from the hyperplane perspective.",
  },
  {
    id: 9,
    name: "Hyperplane Activation Attention",
    axis: "Activation φ",
    formula: "aᵢⱼ = ReLU(γq̂ᵢᵀk̂ⱼ + bⱼ);  yᵢ = Σⱼaᵢⱼvⱼ / (Σⱼaᵢⱼ + ε)",
    intuition: "Treat keys exactly like ReLU critical planes with bias terms. Normalized Q/K ensure projective cleanliness. Self-normalizing denominator replaces softmax competition.",
    closestWork: [
      { name: "Wortsman et al. 2023", detail: "ReLU attention with 1/L scaling (no normalization or bias)" },
      { name: "Performer-ReLU (Choromanski et al. 2021)", detail: "φ=ReLU on random features; different architecture" },
    ],
    closeness: "Close but distinct",
    closenessColor: "#f59e0b",
    closenessNote: "Combines ReLU activation (Wortsman) with Q/K normalization (QKNorm) and per-key bias in a single mechanism. The combination is not published as a unit.",
  },
  {
    id: 10,
    name: "Two-Sided Hyperplane Attention",
    axis: "Activation φ + Decoding",
    formula: "aᵢⱼ⁺ = ReLU(q̂ᵢᵀk̂ⱼ),  aᵢⱼ⁻ = ReLU(−q̂ᵢᵀk̂ⱼ);  yᵢ = Σⱼaᵢⱼ⁺vⱼ⁺ + Σⱼaᵢⱼ⁻vⱼ⁻",
    intuition: "Both sides of each hyperplane carry information. Positive-side tokens retrieve from one value projection; negative-side tokens retrieve from another. A vectorized ReLU arrangement.",
    closestWork: [
      { name: "Cog Attention (Lv et al. 2024)", detail: "Achieves signed weights but through sign-gated softmax, not separate ReLU branches" },
      { name: "Dual-Code (Variant 7 above)", detail: "Same philosophy but uses softmax complement rather than ReLU ±" },
    ],
    closeness: "Novel — no close precedent",
    closenessColor: "#22c55e",
    closenessNote: "The explicit positive/negative ReLU branches with separate value projections is not published. Closest in spirit to Cog Attention but mechanistically distinct.",
  },
  {
    id: 11,
    name: "Projective Attention",
    axis: "Hyperplanes (Keys)",
    formula: "q̂ᵢ = qᵢ/‖qᵢ‖,  k̂ⱼ = kⱼ/‖kⱼ‖;  sᵢⱼ = q̂ᵢᵀk̂ⱼ with learned τ",
    intuition: "Normalize both Q and K to the unit sphere, so attention uses pure angular incidence. Tests whether fixing the projective gauge (k and ck define the same hyperplane) is the key insight.",
    closestWork: [
      { name: "QKNorm (Henry et al. 2020)", detail: "ℓ₂-normalize Q, K then scale by learned γ — essentially the same" },
      { name: "cosFormer (Qin et al. ICLR 2022)", detail: "ReLU + cosine reweighting; partially overlapping" },
    ],
    closeness: "Exactly the same",
    closenessColor: "#dc2626",
    closenessNote: "QKNorm is effectively identical: ℓ₂-normalize Q and K, scale by learned scalar. The 'projective gauge' language is new but the mechanism is known.",
  },
  {
    id: 12,
    name: "Activation-Code Attention",
    axis: "Cross-cutting (Reframing)",
    formula: "aᵢ = φ(qᵢKᵀ) ∈ ℝᵀ;  yᵢ = aᵢV",
    intuition: "Reframe attention not as retrieval but as 'dynamic basis activation.' The activation code aᵢ is the learned representation; values decode it. Emphasizes the code itself as the object of interest.",
    closestWork: [
      { name: "Schlag, Irie, Schmidhuber (ICML 2021)", detail: "Linear attention ≡ fast-weight networks: W = Σvkᵀ, y = Wq — same structural insight" },
      { name: "Tsai et al. (EMNLP 2019)", detail: "Attention as kernel smoothing — φ is the kernel, V decodes" },
    ],
    closeness: "Exactly the same",
    closenessColor: "#dc2626",
    closenessNote: "This is a notational reframing, not a new mechanism. Schlag et al. and Tsai et al. express the same decomposition. The 'activation code' terminology is new but the math is standard attention.",
  },
  {
    id: 13,
    name: "Projection Features (Not Subtraction)",
    axis: "Decoding (Values)",
    formula: "zᵢ = Wₒ[yᵢ,  Mᵢqᵢ,  yᵢ − Mᵢqᵢ]",
    intuition: "Instead of hardcoding the projective subtraction y−Mq, provide the model with all three signals (attention output, projective term, and their difference) and let a learned map decide how to combine them.",
    closestWork: [
      { name: "XSA (Zhai 2026)", detail: "Hardcodes subtraction of one specific direction; this generalizes" },
      { name: "Highway / gating mechanisms", detail: "Concatenate-and-project is a common residual pattern" },
    ],
    closeness: "Novel — no close precedent",
    closenessColor: "#22c55e",
    closenessNote: "The specific concatenation of [y, Mq, y−Mq] as three decoding features is not published. It generalizes both HPA (which bets on subtraction) and XSA (which bets on one direction).",
  },
];

const closenessLegend = [
  { label: "Exactly the same", color: "#dc2626", desc: "Published work implements the same mechanism" },
  { label: "Close but distinct", color: "#f59e0b", desc: "Core idea exists but construction differs" },
  { label: "Novel — no close precedent", color: "#22c55e", desc: "No published equivalent found" },
];

export default function AttentionVariantsTable() {
  const [expandedRow, setExpandedRow] = useState(null);
  const [filterAxis, setFilterAxis] = useState("All");

  const axes = ["All", "Activation φ", "Hyperplanes (Keys)", "Decoding (Values)", "Cross-cutting"];
  const filtered = filterAxis === "All" ? variants : variants.filter(v => v.axis.includes(filterAxis === "Cross-cutting" ? "Cross" : filterAxis));

  return (
    <div style={{
      fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif",
      background: "var(--bg, #0f1117)",
      color: "var(--text, #e2e4e9)",
      minHeight: "100vh",
      padding: "24px 16px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        :root {
          --bg: #0f1117;
          --surface: #1a1d27;
          --surface2: #242837;
          --border: #2e3345;
          --text: #e2e4e9;
          --text2: #9ca0b0;
          --accent: #6c8cff;
          --accent2: #4a6bdf;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .filter-btn {
          padding: 6px 14px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text2);
          cursor: pointer;
          font-size: 13px;
          font-family: 'IBM Plex Sans', sans-serif;
          transition: all 0.15s;
        }
        .filter-btn:hover { border-color: var(--accent); color: var(--text); }
        .filter-btn.active {
          background: var(--accent2);
          border-color: var(--accent);
          color: #fff;
        }
        .row-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          margin-bottom: 10px;
          overflow: hidden;
          transition: border-color 0.15s;
          cursor: pointer;
        }
        .row-card:hover { border-color: var(--accent); }
        .row-header {
          display: grid;
          grid-template-columns: 36px 1fr 140px 130px;
          align-items: center;
          padding: 14px 16px;
          gap: 12px;
        }
        @media (max-width: 700px) {
          .row-header {
            grid-template-columns: 28px 1fr;
            gap: 8px;
          }
          .row-header .hide-mobile { display: none; }
        }
        .formula-box {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 13px;
          background: var(--surface2);
          padding: 10px 14px;
          border-radius: 6px;
          color: #c4cbff;
          overflow-x: auto;
          white-space: nowrap;
          border: 1px solid var(--border);
        }
        .detail-panel {
          padding: 0 16px 16px 16px;
          border-top: 1px solid var(--border);
          animation: slideDown 0.2s ease-out;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .closeness-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
        }
      `}</style>

      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <h1 style={{
          fontSize: 22,
          fontWeight: 700,
          marginBottom: 4,
          letterSpacing: "-0.3px",
        }}>
          Hyperplane Framework — Attention Variants
        </h1>
        <p style={{ color: "var(--text2)", fontSize: 14, marginBottom: 20 }}>
          13 variants across 3 axes. Click any row to expand details and see closest prior work.
        </p>

        {/* Legend */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16, fontSize: 12 }}>
          {closenessLegend.map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                width: 10, height: 10, borderRadius: "50%",
                background: l.color, display: "inline-block", flexShrink: 0,
              }} />
              <span style={{ color: "var(--text2)" }}>{l.label}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          {axes.map(a => (
            <button
              key={a}
              className={`filter-btn ${filterAxis === a ? "active" : ""}`}
              onClick={() => setFilterAxis(a)}
            >
              {a}
            </button>
          ))}
        </div>

        {/* Cards */}
        {filtered.map(v => {
          const isOpen = expandedRow === v.id;
          return (
            <div key={v.id} className="row-card" onClick={() => setExpandedRow(isOpen ? null : v.id)}>
              <div className="row-header">
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 14,
                  color: "var(--accent)",
                  fontWeight: 600,
                }}>
                  {v.id}
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{v.name}</div>
                  <div style={{ color: "var(--text2)", fontSize: 13 }}>{v.intuition.slice(0, 90)}…</div>
                </div>
                <span className="hide-mobile" style={{
                  fontSize: 12,
                  color: "var(--accent)",
                  background: "rgba(108,140,255,0.1)",
                  padding: "3px 10px",
                  borderRadius: 20,
                  textAlign: "center",
                }}>
                  {v.axis}
                </span>
                <span className="hide-mobile closeness-badge" style={{
                  color: v.closenessColor,
                  background: v.closenessColor + "18",
                }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: v.closenessColor, display: "inline-block",
                  }} />
                  {v.closeness.split("—")[0].trim()}
                </span>
              </div>

              {isOpen && (
                <div className="detail-panel" onClick={e => e.stopPropagation()}>
                  <div style={{ marginTop: 12, marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--text2)", marginBottom: 6, letterSpacing: "0.5px" }}>
                      Formula
                    </div>
                    <div className="formula-box">{v.formula}</div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--text2)", marginBottom: 6, letterSpacing: "0.5px" }}>
                      Intuition
                    </div>
                    <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text)" }}>{v.intuition}</p>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--text2)", marginBottom: 8, letterSpacing: "0.5px" }}>
                      Closest Existing Work
                    </div>
                    {v.closestWork.map((w, i) => (
                      <div key={i} style={{
                        background: "var(--surface2)",
                        borderRadius: 8,
                        padding: "10px 14px",
                        marginBottom: 6,
                        borderLeft: `3px solid ${v.closenessColor}`,
                      }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{w.name}</div>
                        <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 2 }}>{w.detail}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{
                    background: v.closenessColor + "12",
                    border: `1px solid ${v.closenessColor}30`,
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: "var(--text)",
                  }}>
                    <span style={{ fontWeight: 600, color: v.closenessColor }}>Novelty Assessment: </span>
                    {v.closenessNote}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Summary stats */}
        <div style={{
          marginTop: 24,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10,
        }}>
          {[
            { label: "Exactly same as prior", count: variants.filter(v => v.closeness.includes("Exactly")).length, color: "#dc2626" },
            { label: "Close but distinct", count: variants.filter(v => v.closeness.includes("Close")).length, color: "#f59e0b" },
            { label: "Novel / no precedent", count: variants.filter(v => v.closeness.includes("Novel")).length, color: "#22c55e" },
          ].map(s => (
            <div key={s.label} style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "16px 18px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

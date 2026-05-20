---
title: Hyperplane Projection Attention 
date: 2026-05-15
tags: [好玩的]
excerpt: Attention as Hyperplane Projections 
---

*A geometric derivation of Hyperplane-Projection Attention, what the experiments actually support, and where the mechanism is still unresolved.*

---

###  Observation

Standard scaled dot-product attention and hyperplane projection are built from the same primitive:

$$
q^\top k.
$$

In standard attention, this dot product is an **addressing score**. A large value means the query and key align, so the corresponding value receives high weight:

$$
y_i = \sum_j \alpha_{ij} v_j,
\qquad
\alpha_{ij}
=
\operatorname{softmax}_j
\left(
\frac{q_i^\top k_j}{\sqrt{d_k}}
\right).
$$

In hyperplane geometry, the same dot product has a different reading. If a key vector $k_j$ is treated as the normal vector of a hyperplane,

$$
H_j = \{q : q^\top k_j = 0\},
$$

then $q_i^\top k_j$ is a signed incidence score: it says how far, and on which side, the query lies relative to the key-defined hyperplane.

So attention can be read in two languages at once:

| | Standard Attention | Hyperplane View |
|---|---|---|
| $q_i^\top k_j$ means | Similarity / address match | Signed incidence against a hyperplane |
| Large positive score | Select this value | Query lies strongly on one side of this key-plane |
| Softmax does | Converts scores into retrieval weights | Converts incidence into an activation pattern |
| Output is | Weighted mixture of values | Decoded activation over token-defined hyperplanes |

This suggests a natural question:

> If keys are the addresses used to retrieve values, can we subtract the address-like part of the retrieval so the attention output carries more of the non-address content?

That is the core idea behind Hyperplane-Projection Attention, or HPA.

The important phrase is **address-like part**. A previous version of this argument said HPA “projects each value onto the hyperplane defined by its key.” That is too strong, and mathematically not quite right. The actual HPA correction uses $q_i^\top k_j$, not $v_j^\top k_j$. So it is not literally the orthogonal projection of $v_j$.

A more accurate description is:

> HPA subtracts a query-conditioned key-normal correction from the value readout. It removes the *address shadow* induced by the query-key match.

That distinction matters. It turns HPA from a clean theorem about projecting values into a useful architectural hypothesis about separating addressing from content.

---

### Formulation

#### Standard Attention

For a single head, standard attention computes:

$$
y_i = \sum_j \alpha_{ij} v_j,
$$

where

$$
\alpha_{ij}
=
\operatorname{softmax}_j
\left(
\frac{q_i^\top k_j}{\sqrt{d_k}}
\right).
$$

Here the keys determine *where to read*, and the values determine *what is read*. But in a transformer head, $q$, $k$, and $v$ are all linear projections of the same residual stream. Keys and values are not independent objects. They are different views of the same token representation.

That creates a potential redundancy: the value retrieved from token $j$ may still carry information about the key/address that caused it to be retrieved.

HPA tries to remove that redundancy.

#### Pre-Aggregation HPA

The original pre-aggregation HPA correction is:

$$
z_i
=
\sum_j \alpha_{ij}
\left(
v_j
-
\frac{q_i^\top k_j}{\|k_j\|^2} k_j
\right).
$$

Equivalently:

$$
z_i
=
\underbrace{\sum_j \alpha_{ij} v_j}_{\text{standard attention}}
-
\underbrace{
\sum_j
\alpha_{ij}
\frac{q_i^\top k_j}{\|k_j\|^2} k_j
}_{\text{address-shadow correction}}.
$$

This is the defining structure of HPA.

The correction is **pre-aggregation** because each source token contributes its own key-normal correction before the final mixture is formed. Token $j$ is corrected along $k_j$; token $\ell$ is corrected along $k_\ell$; only after that are the results aggregated by $\alpha_{ij}$.

This is the part that makes HPA different from simply normalizing or decorrelating the final attention output.

Geometrically, for each query $q_i$, the key $k_j$ defines a hyperplane. The scalar

$$
\frac{q_i^\top k_j}{\|k_j\|^2}
$$

is the signed coordinate of the query along the key normal. HPA uses that coordinate to subtract a key-normal vector from the value readout.

Again, this is not literally:

$$
v_j - \frac{v_j^\top k_j}{\|k_j\|^2}k_j.
$$

That would be the orthogonal projection of the value vector $v_j$ onto the hyperplane normal to $k_j$.

Instead, HPA is:

$$
v_j - \frac{q_i^\top k_j}{\|k_j\|^2}k_j.
$$

The coefficient comes from the query-key address match. So the correction should be interpreted as subtracting a query-conditioned address component, not as projecting the value itself.

This is also why the geometry is most natural when the key and value coordinates are treated as living in a shared head space. If the key space and value space become completely unrelated, subtracting a key-normal vector from a value vector becomes less geometrically meaningful. That concern motivated the later basis and control experiments.

#### Why Pre-Aggregation Matters

The pre-aggregation version applies a different correction for every source token:

$$
z_i
=
\sum_j \alpha_{ij}
\left(
v_j - c_{ij} k_j
\right),
\qquad
c_{ij}
=
\frac{q_i^\top k_j}{\|k_j\|^2}.
$$

So HPA preserves the token-local structure of the correction. Each retrieved token gets de-addressed along its own key normal.

That is the main mechanism.

It is also the main cost. The correction requires an additional attention-shaped operation:

$$
(\alpha \odot QK^\top)K.
$$

This is roughly another $T \times T \times d_k$ multiplication on top of the standard $\alpha V$ readout. In small local timing runs, vanilla HPA was about $1.6$-$1.7\times$ the cost of standard attention. At sequence length $1024$ on CPU, standard attention took about `7.52 ms` per forward pass, while vanilla HPA took about `13.16 ms`.

So the question is not only whether HPA works. It is whether the effect is strong enough to justify the extra correction branch.

---

### Post-Aggregation HPA and XSA

The obvious cheaper version is to apply the projection after aggregation.

First compute the usual attention output:

$$
y_i = \sum_j \alpha_{ij} v_j.
$$

Then compute an attention-weighted average key:

$$
\bar{k}_i = \sum_j \alpha_{ij} k_j.
$$

Post-aggregation HPA removes the component of $y_i$ along this single direction:

$$
z_i
=
y_i
-
\frac{y_i^\top \bar{k}_i}{\|\bar{k}_i\|^2}
\bar{k}_i.
$$

This is cheaper, but it changes the mechanism. The correction no longer happens per source token. It happens once, after all values have already been mixed.

Structurally, this is close to Exclusive Self-Attention, or XSA. XSA removes the projection of the attention output onto the token's own value vector:

$$
z_i
=
y_i
-
\frac{y_i^\top v_i}{\|v_i\|^2}
v_i.
$$

The two mechanisms differ in the projection direction:

| | Post-Agg HPA | XSA |
|---|---|---|
| Start from | $y_i = \sum_j \alpha_{ij}v_j$ | $y_i = \sum_j \alpha_{ij}v_j$ |
| Direction removed | $\bar{k}_i = \sum_j \alpha_{ij}k_j$ | $v_i$ |
| Structure | Output minus one projection | Output minus one projection |
| Interpretation | Remove averaged key direction | Remove self-value direction |

Our direction analysis found that $\bar{k}_i$ and $v_i$ are not generally the same direction. Their mean cosine was close to zero in the small trained model we tested. So post-agg HPA and XSA are not equivalent.

![Cosine similarity between the attention-weighted average key $\bar{k}_i$ and the self-value direction $v_i$, measured per position and head. The two correction axes are nearly orthogonal, so post-agg HPA and XSA correct genuinely different directions.](assets/images/hpa/viz_c_direction_analysis.png)

But the bigger lesson is structural:

> Once the correction is moved after aggregation, HPA loses the per-source property that made it distinctive.

This showed up experimentally. Post-agg HPA did not behave like a cheaper version of pre-agg HPA. It behaved more like a one-direction output decorrelation method, and in our small runs it was weaker than the pre-aggregation version.

---

### What HPA Is Trying to Do

Consider associative recall. The sequence contains key-value pairs:

$$
[A, 3, B, 7, C, 1],
$$

then the model sees a query such as:

$$
[\text{QUERY}, B],
$$

and must output:

$$
7.
$$

Standard attention solves this by using the query representation to attend to the position containing key $B$, then reading the value information from that position.

The HPA hypothesis is that the retrieved value vector may contain both:

1. content information: “the answer is 7”
2. address information: “this was retrieved because it matched B”

The address information is useful for selecting the token, but may be redundant after selection has already happened. HPA subtracts a query-conditioned key-normal term so that the output is less dominated by the address that caused the retrieval.

This is why I now think of HPA as a **de-addressing operator**.

The model first uses keys to decide where to read. Then HPA tries to remove part of the key/address trace from what is read.

This is a more honest story than “HPA projects values onto hyperplanes.” The hyperplane geometry is still the inspiration, but the operation is better described as:

$$
\text{read content} - \text{address shadow}.
$$

---

### Early Core Experiments

The first experiments compared:

- standard attention
- pre-aggregation HPA
- post-aggregation HPA
- XSA
- gated pre-aggregation HPA

The small setup used a 2-layer transformer with $d=64$ and 4 heads. The main tasks were associative recall and a synthetic language modeling task.

The early result was:

| Variant | Recall | LM PPL | Interpretation |
|---|---:|---:|---|
| Standard | 0.401 | 33.45 | baseline |
| Pre-agg HPA | 0.414 | 33.38 | small positive signal |
| Post-agg HPA | 0.400 | 33.50 | no clear benefit |
| XSA | 0.411 | 33.59 | recall-neutral/slightly positive, LM weaker here |
| Gated HPA | 0.400 | 33.45 | gate stayed near zero |

![Part I: associative-recall accuracy and LM perplexity across the core HPA variants, three random seeds each. Pre-agg HPA leads on LM in 3/3 seeds and on recall in 2/3; post-agg HPA never beats the standard baseline.](assets/images/hpa/blog_fig_part1.png)

The important correction to the original writeup is scale of claim.

Pre-agg HPA did **not** decisively surpass standard attention in these early runs. It showed a small positive signal. The result was interesting because it matched the geometric intuition, not because it was already a large empirical win.

The stronger conclusion from Part I was negative:

> Post-aggregation HPA is not a faithful efficient approximation to pre-aggregation HPA.

Moving the correction after the value mixture changes the mechanism too much.

---

### The KeyNorm Turn

The original pre-agg HPA correction divides by $\|k_j\|^2$:

$$
\frac{q_i^\top k_j}{\|k_j\|^2}k_j.
$$

This is geometrically natural, but it is also numerically awkward. The correction strength depends strongly on key norm. Small key norms can amplify the correction; large key norms can suppress it.

The most useful HPA modification so far has been to normalize the keys before applying the correction:

$$
\hat{k}_j
=
\operatorname{RMSNorm}(k_j),
$$

and then use:

$$
z_i
=
\sum_j \alpha_{ij}v_j
-
\sum_j \alpha_{ij}
(q_i^\top \hat{k}_j)\hat{k}_j.
$$

This removes the explicit norm division and makes the correction scale much more predictable.

In the retrieval-pressure sweeps, KeyNorm HPA was the clearest HPA-family winner:

| Method | Mean Delta vs Standard | Positive Settings |
|---|---:|---:|
| KeyNorm HPA | +0.112 | 16/16 |

In a separate focused retrieval run, KeyNorm HPA also beat standard attention on all tested settings, with a mean gain around `+0.079`.

![Correction magnitude $\|\text{correction}\|/\|y\|$ across HPA variants. Pre-agg HPA modifies ~15–20% of the attention output; post-agg HPA only ~5%, which quantifies why pre-aggregation is the more aggressive — and more effective — mechanism. KeyNorm HPA applies the largest correction, consistent with its strongest recall gains.](assets/images/hpa/viz_b_correction_magnitude.png)

The local Mac tiny-overfit run told a compatible story. After 80 steps on the embedded Shakespeare-style character corpus:

| Method | Final Train Loss | Final Val Loss |
|---|---:|---:|
| Standard | 2.272 | 2.275 |
| Vanilla HPA | 2.269 | 2.272 |
| KeyNorm HPA | 2.225 | 2.225 |

This does not prove scale, but it does show that KeyNorm HPA is not merely a retrieval-task trick. It trains cleanly and can slightly improve a tiny language-modeling objective.

The caveat: in some earlier LM runs, KeyNorm HPA hurt perplexity. So the safe conclusion is not “KeyNorm HPA always improves LM.” The safe conclusion is:

> Key normalization makes the HPA correction much more reliable under retrieval pressure and does not appear to introduce basic optimization instability.

---

### Head Splitting

One practical issue with HPA is that not every head should necessarily subtract address information.

Sometimes the key-aligned part of a retrieved value is useful. If a head is doing copying, anchoring, or local identity preservation, then removing the address trace may hurt.

This motivated a head-split variant:

- some heads remain standard attention
- some heads use KeyNorm HPA

In the original associative-recall runs, HeadSplit+KeyNorm was the best small-model tradeoff. It improved recall while keeping overhead below full HPA on every head.

The mechanism is attractive because it does not force a universal claim. It says different heads may want different readout semantics:

| Head Type | Role |
|---|---|
| Standard heads | preserve full value readout, including address-aligned information |
| HPA heads | subtract address shadow and emphasize complementary content |

![Per-head attention heatmaps on the associative-recall task. Standard attention tends toward broad, similar distributions across heads; HeadSplit+KN develops a clear split — some heads stay broad, others become sharply peaked — which is the architectural pattern the head-split design was hoping to recover.](assets/images/hpa/viz_a_attn_heatmaps.png)

I still think this is one of the best architectural ideas from the HPA line.

---

### Controls and What They Changed

The controls weakened the purest version of the geometry story.

We tested variants designed to ask whether HPA helps because of the intended key geometry, or because it simply adds another operation to the attention block:

- tied $W_k = W_v$
- shared K/V space
- random rotations of key directions
- learned orthogonal transforms
- random direction subtraction
- shuffled key directions
- additive correction instead of subtractive correction
- compute-matched extra value matmul

The broad lesson was:

> The geometry matters, but it is not isolated cleanly by the current experiments.

Some controls performed close enough that we should not claim HPA’s gains come only from a precise projective interpretation. Normalization, extra computation, regularization, and the general act of adding a second attention-shaped pathway are real confounds.

This does not invalidate HPA. It clarifies the claim.

The defensible claim is:

> Treating keys as address directions and subtracting a key-normal address shadow is a useful inductive bias, especially when key norms are controlled. But the current evidence does not prove that the exact hyperplane projection geometry is the only reason it helps.

That is a much better scientific position.

---

### Other Experiments

We also implemented a local tiny validation suite:

1. attention correctness
2. tiny overfit
3. synthetic sequence tasks
4. sequence-length scaling

The HPA-relevant results:

#### Correctness

All selected HPA variants passed the local correctness grid:

- output shapes correct
- outputs finite
- gradients finite
- no causal leakage

Vanilla HPA and KeyNorm HPA both passed 32/32 shape/mask/gradient cases.

#### Tiny Overfit

All HPA variants trained down smoothly. Vanilla HPA matched standard attention closely; KeyNorm HPA improved the final loss in this short run.

#### Synthetic Tasks

On the compact synthetic suite, vanilla HPA was usually close to standard attention. KeyNorm HPA was mixed: sometimes better, sometimes worse. This again argues against a sweeping “HPA wins” claim.

#### Scaling

At sequence length 1024 on CPU:

| Method | ms / forward | Relative |
|---|---:|---:|
| Standard | 7.52 | 1.00× |
| Vanilla HPA | 13.16 | 1.75× |
| KeyNorm HPA | 13.41 | 1.78× |

![Recall-vs-overhead Pareto frontier across the HPA variants. HeadSplit+KN sits at the elbow — it captures most of the recall gain of the full-correction variants at roughly half the additional compute.](assets/images/hpa/viz_e_pareto.png)

This cost is meaningful. HPA needs either a strong quality gain, a sparse/factored correction, or a head-split design to be practically attractive.

---

### What HPA Teaches Us About Attention

The main conceptual lesson is that attention mixes two roles:

1. **addressing**: use $q^\top k$ to decide where to read
2. **content readout**: use $\alpha V$ to decide what information enters the residual stream

Standard attention ties these together. The same token that wins the address match contributes its full value vector.

HPA asks whether the output should carry all of that value, or whether some part of the address match should be subtracted after it has served its purpose.

That is the clean idea:

> Attention should not necessarily return the address that it used to retrieve content.

This is especially plausible in selective retrieval. Once the query has found the right key, the model may benefit from suppressing the key-like part of the retrieved representation and passing forward more of the answer-like part.

But there is a counterpoint:

> The address trace is not always waste.

Sometimes downstream layers may rely on it. Sometimes copying and identity preservation require it. This is why full HPA can be too aggressive, why gates are appealing, and why head splitting is conceptually natural.

My current view is that HPA is best understood as an **address/content separation prior**:

- standard attention retrieves content with address information still attached
- HPA subtracts a query-conditioned address shadow
- KeyNorm makes that subtraction stable
- head splitting lets some heads keep the address while others remove it

That framing is stronger than the original “projection improves attention” framing because it explains both the successes and the failures.

---

### Summary

The original HPA idea came from a simple geometric observation: the dot product $q^\top k$ can be read either as an attention score or as incidence against a key-defined hyperplane.

The first version of the story overclaimed the geometry. HPA does not literally project each value vector onto a hyperplane, because the subtraction coefficient comes from $q^\top k$, not $v^\top k$. The better interpretation is that HPA subtracts a **query-conditioned key-normal correction** from the attention readout.

Empirically, the story is also more nuanced than “HPA beats attention.”

What we found:

- vanilla pre-agg HPA is stable and sometimes slightly helpful
- post-agg HPA loses the per-source property and is not a faithful cheaper substitute
- learned gates have not yet produced a convincing pressure-specific policy
- KeyNorm HPA is the strongest and most reliable HPA-family result
- head splitting is a promising architectural compromise
- controls show that geometry is not yet isolated from normalization, extra computation, and regularization

So the final claim I would make is:

> Hyperplane-Projection Attention is a useful way to separate addressing from content in attention. The raw projection story is too clean, but the address-shadow story survives the experiments. The most promising form so far is not vanilla HPA; it is normalized, selective HPA, especially KeyNorm HPA and head-split variants.

That is where I would take the next round of experiments: larger models, real language data, stronger controls, and cheaper sparse or head-selective correction paths.

---

### Appendix: Experiment Ledger

*Tiny experiments does not inform usefulness in scaled scenarios*

This appendix records the main HPA-only experiments behind the claims above. The point is not to turn the post into a benchmark paper, but to make clear which claims are supported, which are weak, and which are still speculative.

#### Core HPA Variants

The first multi-seed comparison tested standard attention, pre-agg HPA, post-agg HPA, XSA, and gated HPA on associative recall and a small synthetic language modeling task.

| Variant | Recall | LM PPL | Main Takeaway |
|---|---:|---:|---|
| Standard | 0.401 | 33.45 | baseline |
| Pre-agg HPA | 0.414 | 33.38 | small positive signal |
| Post-agg HPA | 0.400 | 33.50 | no clear benefit |
| XSA | 0.411 | 33.59 | different projection axis, not equivalent to post-agg HPA |
| Gated HPA | 0.400 | 33.45 | gate stayed near zero |

The main result here is modest: pre-agg HPA looked slightly better, but not decisively. The clearer result is structural: post-agg HPA did not behave like a cheap approximation to pre-agg HPA.

#### KeyNorm and Head-Split Variants

The next round tested ways to make the correction more stable or more selective.

| Variant | Recall | LM PPL | Overhead | Main Takeaway |
|---|---:|---:|---:|---|
| Standard | 0.401 | 33.45 | 1.00× | baseline |
| KeyNorm HPA | 0.467 | 34.86 | 1.59× | stronger recall, LM tradeoff in this run |
| HeadSplit+KN | 0.517 | 34.29 | 1.53× | best early recall/overhead tradeoff |
| Split+Factor | 0.529 | 34.29 | 2.51× | strongest recall, but indexing overhead dominated locally |
| Gated Learned | 0.402 | 33.19 | 1.74× | good LM, weak recall |
| Full Stack | 0.402 | 33.19 | 2.00× | no additive recall gain |

![Part II: recall and LM perplexity for the stabilized and selective HPA variants. KeyNorm and HeadSplit+KN are the two methods that consistently beat the baseline on recall; the Full Stack combination wins on LM but loses the recall advantage.](assets/images/hpa/blog_fig_part2.png)

The important update from later experiments is that HeadSplit+KN remains promising, but should not be treated as settled. It looked strong in the original associative-recall setup, but later pressure and gate tests were more mixed.

#### Retrieval-Pressure Sweeps

We swept retrieval difficulty through number of pairs, distractors, sequence length, repeated keys, multi-query recall, and needle-style retrieval. Across the HPA-family methods in the broader retrieval-pressure comparison:

| Method | Mean Delta vs Standard | Positive Settings |
|---|---:|---:|
| KeyNorm HPA | +0.112 | 16/16 |
| Vanilla HPA / related pre-agg variants | small positive or mixed | setting-dependent |

This is the strongest empirical support for KeyNorm HPA. The gain is most believable under selective retrieval pressure, where address/content separation should matter most.

#### Gate Pressure Tests

The gate experiments asked whether learned correction gates activate specifically when retrieval gets harder.

| Variant | Mean Delta vs Standard | Gate Behavior |
|---|---:|---|
| KeyNorm HPA | positive | ungated correction remained strongest |
| Gated KeyNorm HPA | mixed to slightly negative in the 400-step multi-query run | nonzero gates, but no reliable gain |
| Gated HeadSplit+KN | mixed to slightly negative in the 400-step multi-query run | nonzero gates, but no reliable gain |

This is why the blog does not claim that gates learned a retrieval-pressure policy. The current evidence says gates are plausible safety valves, not yet a working adaptive mechanism.

#### Basis and Negative Controls

We ran controls to test whether the geometry itself was responsible for the gain:

| Control Family | What It Tested | Resulting Interpretation |
|---|---|---|
| Tied $W_k = W_v$ | whether shared key/value coordinates strengthen the geometry | useful diagnostic, not a complete explanation |
| Shared K/V space | whether K and V need a common basis | supports caring about basis, but not decisive |
| Random key rotations | whether any key-derived direction works | weakens a literal geometry-only claim when competitive |
| Learned orthogonal transforms | whether the model can learn a better normal basis | plausible but not clearly dominant locally |
| Random directions | whether subtraction itself is enough | important confound |
| Shuffled keys | whether source alignment matters | important confound |
| Additive correction | whether sign matters | subtractive story is not fully isolated |
| Extra matmul | whether added compute/capacity explains gains | capacity is a real confound |

The controls changed the conclusion. The correct claim is not “the exact projection geometry is proven.” The correct claim is that key-normal de-addressing plus normalization is a useful inductive bias, but the experiments do not yet isolate it from nearby explanations.


---

*The next blog will introduce an vectorized activation inspired attention mechanism that also fall under the projective attention framework*

---

### Cite

```bibtex
@misc{li2026hpa,
  title   = {Hyperplane Projection Attention},
  url     = {},
  author  = {Anthea Li},
  journal = {RuoShui},
  year    = {2026},
  month   = May,
}
```
---
title: Projection Activated Attention
date: 2026-05-16
tags: [好玩的]
excerpt: Attention as Projection Activations
related: [projective-attention, hpa, otda, back-to-sdpa]
---

*Two attention mechanisms that use token-conditioned hyperplane activation layer*

---

### Observation

In a previous blog, we explored the projective geometry perspective to Attention, by extending the standard attention form:

$$y_i = \sum_j \text{softmax}_j\!\left(\frac{q_i^\top k_j}{\sqrt{d_k}}\right) v_j \quad \rightarrow \quad f(q_i) = \sum_j v_j \, \phi(q_i^\top k_j)$$

It treats keys as hyperplane normals. Each key vector $k_j \in \mathbb{R}^{d_k}$ defines a hyperplane through the origin in query space:

$$H_j = \{q \in \mathbb{R}^{d_k} : q^\top k_j = 0\}$$

This hyperplane divides query space into two half-spaces: one where $q^\top k_j > 0$ (the query aligns with the key) and one where $q^\top k_j < 0$ (the query opposes it). The magnitude $|q^\top k_j|$ measures how far the query is from the hyperplane — not in Euclidean distance, but in the projection onto $k_j$'s direction.

So when we compute $q_i^\top k_j$, we are not merely measuring "similarity," we are also computing a **signed incidence score**: how strongly the query $q_i$ activates relative to the hyperplane $H_j$ defined by key $k_j$. It is a signed distance, a halfspace membership test, and an activation — all at once.

This reframes the entire attention mechanism. A sequence of $T$ tokens produces $T$ key vectors, which define $T$ hyperplanes in query space. Each query $q_i$ sits at some position in this space. Its dot product with each key gives a vector of $T$ signed incidence scores — one per hyperplane:

$$\text{incidence}(q_i) = [q_i^\top k_1,\; q_i^\top k_2,\; \ldots,\; q_i^\top k_T]$$

This vector is the query's **activation code** — a fingerprint of where it sits relative to every token's hyperplane. Two queries with the same activation code occupy the same region in the arrangement of hyperplanes; two queries with different codes are separated by at least one token's hyperplane.

This picture is very close to the geometry of **ReLU** networks.

A ReLU neuron has a critical hyperplane:

$$
w^\top x + b = 0
$$

and activation:

$$
\operatorname{ReLU}(w^\top x + b).
$$

The hyperplane partitions the input space into active and inactive regions. A layer of ReLU neurons therefore computes a vector of halfspace activations.

Attention does something analogous, except that the hyperplanes are not fixed weights. They are produced by tokens:

$$
q^\top k_j = 0.
$$

For a query \(q_i\), the attention head computes many such incidences at once:

$$
\left[
\phi(q_i^\top k_1),
\phi(q_i^\top k_2),
\ldots,
\phi(q_i^\top k_T)
\right].
$$

So attention can be viewed as a vectorized, data-dependent activation function. Each token contributes a hyperplane; the query's position relative to all these hyperplanes defines an activation code; values decode that activation code into the output.

This is the conceptual bridge to two mechanisms in this post.

<div data-widget="paa"></div>

*Drag the query **q** or any of the keys **kⱼ**. The shaded wedges are the cells of the hyperplane arrangement — every region has its own activation code. Switch modes to see Standard attention, Projective Clipping (red residual r along violated key normals), or Projection Feature (q decomposed into m + u) on the same scene.*

---

### Formulation I: Projective Clipping Attention

Wanted to know:

> If the keys define halfspaces, should the model receive an explicit signal when the query falls outside a desired side of those halfspaces?

The ReLU analogy suggests that a key-defined hyperplane can be treated as a boundary. A query can lie comfortably on one side, near the boundary, or on the wrong side.

Projective Clipping Attention adds a vector-valued residual based on halfspace violation:

> When the query violates a token-defined margin, return a learned correction in the direction of the violated key-normal arrangement.

This makes the attention head resemble a soft constraint system. The values still provide the normal readout, but the clipping branch records which token-defined halfspaces were violated.

#### Formulation

Normalize queries and keys:

$$
\hat q_i
=
\frac{q_i}{\|q_i\|},
\qquad
\hat k_j
=
\frac{k_j}{\|k_j\|}.
$$

Compute projective incidence:

$$
s_{ij}
=
\tau_h
\hat q_i^\top \hat k_j.
$$

Use angular attention weights:

$$
\alpha_{ij}
=
\operatorname{softmax}_j(s_{ij}).
$$

The ordinary value readout is:

$$
y_i = \sum_j \alpha_{ij}v_j.
$$

Now define a margin violation:

$$
\rho_{ij}
=
\operatorname{ReLU}(m_h - s_{ij}),
$$

where \(m_h\) is a learned per-head margin.

The clipping residual is:

$$
r_i
=
\sum_j
\alpha_{ij}
\rho_{ij}
\hat k_j.
$$

Finally:

$$
z_i
=
W_o
\left[
y_i;
W_r r_i
\right].
$$

The head therefore returns two streams:

1. the normal value readout \(y_i\);
2. a vector-valued halfspace violation residual \(r_i\).

#### What It Tries To Do

Projective Clipping Attention is best understood as a second activation channel.

Standard attention says:

> Which values should I read?

Projective Clipping says:

> Which token-defined halfspace constraints does this query violate, and in what normal direction?

This is why the residual is vector-valued. It is not just an extra scalar gate or bias. It gives the next layer a geometric direction associated with the violation.

In ReLU terms, the clipping branch is a learned response to being on the wrong side of token-defined hyperplanes.


---

### Formulation II: Projection Feature Attention

Wanted to know now:

> If attention already computes a data-dependent activation code, can we expose the geometry of that code as features?

The first design tries to avoid a common failure mode in geometric attention mechanisms: forcing the geometry to be the answer.

Instead of directly subtracting or replacing the normal attention output, Projection Feature Attention gives the model additional geometric features:

1. the standard value readout \(y_i\);
2. the component of the query captured by the attended key-normal arrangement;
3. the residual query component not captured by that arrangement.

The bet is simple:

> The attention head should not only return what it retrieved. It should also tell the next layer how the query sat relative to the hyperplanes that produced the retrieval.

#### Formulation

Start with ordinary softmax attention:

$$
\alpha_{ij}
=
\operatorname{softmax}_j
\left(
\frac{q_i^\top k_j}{\sqrt{d_k}}
\right),
\qquad
y_i = \sum_j \alpha_{ij}v_j.
$$

Normalize key directions:

$$
\hat k_j = \frac{k_j}{\|k_j\|}.
$$

Define the attention-weighted projective component:

$$
m_i
=
\sum_j
\alpha_{ij}
\left(q_i^\top \hat k_j\right)
\hat k_j.
$$

This is the component of the query reconstructed from the attended key-normal directions.

Then define the residual component:

$$
u_i = q_i - m_i.
$$

The output is formed from all three pieces:

$$
z_i
=
W_o
\left[
y_i;
W_m m_i;
W_u u_i
\right].
$$

Here \(W_m\) and \(W_u\) are learned per-head transforms. The model receives the normal value readout plus an explicit decomposition of the query relative to the attended hyperplane normals.

### What It Tries To Do

Projection Feature Attention is not a retrieval replacement. It is a feature augmentation.

Standard attention returns \(y_i\).

Projection Feature Attention returns a learned function of:

$$
(y_i, m_i, u_i).
$$

The intended interpretation is:

| Component | Meaning |
|---|---|
| \(y_i\) | what standard attention retrieved |
| \(m_i\) | query component explained by attended key-normal directions |
| \(u_i\) | query component left outside those directions |

If attention is a token-conditioned activation layer, then \(m_i\) and \(u_i\) are geometric features of that activation layer.

The method gives the model information that standard attention throws away: not only which values were read, but how the query decomposed relative to the hyperplanes that caused the read.

---

### Experiments

The experiments were local and small for interpreting the proposed mechanisms, **not** for making a scaling claim.

We used:

- synthetic retrieval-pressure tasks;
- quick synthetic language modeling;
- copy, induction, passkey, and delayed-dependency probes;
- correctness checks for shape, gradients, and causal masking;
- local sequence-length timing;
- controls with shuffled and random geometric branches.

As we have not found any exisiting literature that appear to be close to these designs, let's first explore some meaningful variants:


#### KeyNorm 

The strongest variant normalized keys not only for the projection feature, but also for the attention scores.

Let

$$
\tilde k_j
=
\operatorname{RMSNorm}(k_j)\odot \gamma.
$$

Then:

$$
\alpha_{ij}
=
\operatorname{softmax}_j
\left(
\frac{q_i^\top \tilde k_j}{\sqrt{d_k}}
\right),
$$

and:

$$
m_i
=
\sum_j
\alpha_{ij}
\left(q_i^\top \tilde k_j\right)
\tilde k_j.
$$

This version combines two ideas:

- key normalization stabilizes the address geometry;
- projection features expose the geometry as an auxiliary representation.

In our runs, this combination was much stronger than vanilla Projection Feature Attention.


#### Softplus Clipping

The hard ReLU violation can be smoothed:

$$
\rho_{ij}
=
\operatorname{softplus}(m_h - s_{ij}).
$$

This keeps gradients alive near the boundary and avoids a hard zero/nonzero transition. In the small runs, softplus was a mild improvement over vanilla clipping, especially on quick LM loss, but it did not change the overall story.

#### RMSNorm Residual Clipping

The strongest clipping variant normalized the residual branch:

$$
\bar r_i
=
\operatorname{RMSNorm}(r_i).
$$

Then:

$$
z_i
=
W_o
\left[
y_i;
W_r \bar r_i
\right].
$$

This was the most reliable Projective Clipping variant under retrieval pressure. The interpretation is straightforward: the clipping residual is useful, but its scale is unstable unless normalized.


#### Projection Feature Variants

The focused Projection Feature run compared vanilla projection features against normalization, bottleneck, zero-init, KeyNorm, light, gated, shuffled, and random controls.

![Projection Feature Variants](assets/images/projective_actived_attention/projection_feature_variants.png)

| Variant | Mean Acc | Mean Delta | Positive Settings | LM Loss | LM PPL |
|---|---:|---:|---:|---:|---:|
| Standard | 0.140 | +0.000 | 0/5 | 4.030 | 56.24 |
| VanillaProjection | 0.143 | +0.003 | 4/5 | 3.916 | 50.21 |
| NormProjection | 0.158 | +0.018 | 4/5 | 3.842 | 46.61 |
| ZeroInit | 0.166 | +0.026 | 4/5 | 3.930 | 50.91 |
| KeyNormProjection | 0.400 | +0.260 | 5/5 | 3.932 | 51.00 |
| GatedProjection | 0.141 | +0.001 | 3/5 | 3.938 | 51.30 |
| RandomControl | 0.143 | +0.003 | 3/5 | 3.898 | 49.32 |

The first important result is that vanilla Projection Feature Attention did not strongly improve retrieval. Its mean retrieval delta was only \(+0.003\).

But it did improve the quick LM objective substantially, loss 4.030 to 3.916.


The best LM variant was NormProjection, loss 3.842, and 46.61.


The strongest retrieval variant was KeyNormProjection, mean retrieval delta +0.260, positive settings 5/5.

This is a very large local signal, especially on needle-style retrieval.

#### Projective Clipping Variants

The focused Projective Clipping run compared vanilla clipping, positive margin, softplus, softplus margin, RMS-normalized residual, threshold gate, zero-init, and head-split clipping.

![Projective Clipping Variants](assets/images/projective_actived_attention/projective_clipping_variants.png)

| Variant | Mean Acc | Mean Delta | Positive Settings | LM Loss | LM PPL |
|---|---:|---:|---:|---:|---:|
| Standard | 0.130 | +0.000 | 0/5 | 4.030 | 56.24 |
| VanillaClip | 0.152 | +0.022 | 3/5 | 3.992 | 54.18 |
| Softplus | 0.154 | +0.024 | 3/5 | 3.991 | 54.13 |
| SoftplusMargin | 0.155 | +0.024 | 3/5 | 3.991 | 54.11 |
| RMSNormResidual | 0.170 | +0.040 | 5/5 | 4.001 | 54.65 |
| ThresholdGate | 0.152 | +0.021 | 3/5 | 3.992 | 54.15 |
| HeadSplitClip | 0.153 | +0.023 | 3/5 | 4.011 | 55.23 |

The result here was cleaner but smaller.

Vanilla Projective Clipping helped retrieval a little \(\Delta\) +0.022.

Softplus was a small improvement: \(\Delta\) = +0.024

RMSNormResidual was the best general clipping variant: \(\Delta\)= +0.040,positive settings 5/5.
 
This supports the same theme as the Projection Feature experiments: the geometry becomes more useful when the branch scale is controlled.

#### Combined Diagnostics and Controls

The most important controls were shuffled and random geometric branches.

![Projection and Clipping Diagnostics](assets/images/projective_actived_attention/projection_clip_diagnostics.png)

In one focused diagnostic run:

| Variant | Mean Delta | Positive Settings | LM Loss |
|---|---:|---:|---:|
| ProjectionFeature | +0.010 | 3/6 | 3.916 |
| ProjectionRandom | +0.017 | 4/6 | 3.898 |
| ProjClip | +0.102 | 3/6 | 3.992 |
| ClipSoftplus | +0.104 | 4/6 | 3.991 |
| ClipMargin | +0.106 | 4/6 | 3.992 |
| ClipShuffle | +0.100 | 4/6 | 3.992 |
| ClipRandom | +0.060 | 2/6 | 3.990 |

This is the section that makes the story scientifically uncomfortable, in a useful way.

For Projection Feature Attention, the random projection control improved LM loss almost as much as, or more than, the intended geometric branch. That means the LM improvement cannot be attributed cleanly to the exact projective decomposition. Extra features, extra parameters, and regularization are serious confounds.

For Projective Clipping, the shuffled control remained close to vanilla clipping in some retrieval settings. That weakens a strict “source-aligned hyperplane violation” interpretation. The random direction control was weaker than the real and shuffled clipping variants, so the branch is not arbitrary noise, but the exact source alignment is not fully isolated either.

So a honest claim should be:

> Projective geometric branches are useful feature/correction pathways, but current experiments do not yet isolate geometry from capacity, normalization, and extra computation.

#### Other experiments

We also ran the local validation suite from the experiment design document.

All nine mechanisms tested there passed correctness:

- standard attention;
- Projective Clipping;
- Projective Clipping + Softplus;
- Projective Clipping + RMSNormResidual;
- Projection Feature;
- Projection Feature + KeyNorm;
- Hyperplane Activation;
- vanilla HPA;
- KeyNorm HPA.

No NaNs, no infinite gradients, and no causal-mask leaks appeared in the checked shape grid.

On the 80-step tiny character-LM overfit run:

| Method | Final Train Loss | Final Val Loss |
|---|---:|---:|
| Standard | 2.272 | 2.275 |
| Projective Clipping | 2.275 | 2.317 |
| Projective Clipping + Softplus | 2.275 | 2.317 |
| Projective Clipping + RMSNormResidual | 2.230 | 2.276 |
| Projection Feature | 2.249 | 2.239 |
| Projection Feature + KeyNorm | 2.205 | 2.185 |

Projection Feature + KeyNorm had the best tiny-overfit result.

On local sequence-length scaling at \(T=1024\):

| Method | ms / forward | Relative to Standard |
|---|---:|---:|
| Standard | 7.52 | 1.00× |
| Projection Feature | 14.63 | 1.95× |
| Projection Feature + KeyNorm | 15.10 | 2.01× |
| Projective Clipping + RMSNormResidual | 25.01 | 3.33× |
| Projective Clipping | 29.16 | 3.88× |
| Projective Clipping + Softplus | 34.44 | 4.58× |

The cost difference matters. Projection Feature is expensive but plausible. Projective Clipping is currently too expensive unless the retrieval gains become much stronger or the residual branch is made sparse.

---

### What this teaches us

#### Projection Feature Attention

Projection Feature Attention is the more promising general-purpose direction.

Its vanilla form did not produce a strong retrieval result, but it consistently helped the quick LM objective. The normalized version helped more. The KeyNorm version had the strongest retrieval result of the whole series.

The mechanism seems to work best when the projection branch is treated as a feature path, not as a hard geometric correction.

My current interpretation:

> Projection Feature Attention is useful because it gives the next layer extra coordinates about how the query relates to the attended key-normal arrangement.

But the controls force humility:

> Some of the gain is probably just extra representational capacity.

So the next version should be judged against compute-matched and parameter-matched feature branches.

The most promising modifications are:

- normalize \(m_i\) and \(u_i\);
- use KeyNorm scoring;
- compress the projection branch more efficiently;
- zero-init the branch so the model starts as standard attention;
- compare against random and shuffled feature branches at equal parameter count.

#### Projective Clipping Attention

Projective Clipping has a more distinctive retrieval story.

It helped passkey and needle-style tasks more clearly than vanilla Projection Feature Attention. The RMSNormResidual version was positive across all focused retrieval settings. The mechanism seems most useful when there is a sharp retrieval constraint: find the right token, reject distractors, and use halfspace violations as an auxiliary signal.

But it is expensive.

The current formulation computes an extra attention-shaped residual over all visible tokens. At long sequence lengths, this is a serious cost.

The most promising modifications are:

- top-\(k\) clipping residuals;
- sparse clipping only on high-attention sources;
- RMS-normalized residuals;
- branch zero-init for stable scaling;
- learned margin schedules;
- head splitting so only some heads pay the clipping cost.

The softplus variant is a small but sensible improvement. It smooths the boundary and helped slightly in local runs, but it does not solve the main cost problem.

---

## Summary

The projective view begins with a simple reframing:

> Attention evaluates queries against token-defined hyperplanes.

The ReLU connection makes this more concrete. A transformer attention head is like a dynamic activation layer: the sequence supplies the hyperplanes, the query produces an activation code, and the values decode that code.

Projection Feature Attention and Projective Clipping Attention are two ways to use this view.

Projection Feature Attention exposes the query's decomposition relative to attended key normals:

$$
q_i = m_i + u_i.
$$

It gives the next layer the standard value readout plus projective coordinates. This looks promising for language-modeling-style objectives, especially when normalized or paired with KeyNorm scoring.

Projective Clipping Attention adds a vector-valued halfspace violation branch:

$$
r_i
=
\sum_j
\alpha_{ij}
\operatorname{ReLU}(m_h - s_{ij})
\hat k_j.
$$

It looks more promising for selective retrieval and passkey-style tasks, especially with RMS-normalized residuals.

---

*The next blog will look at oriented two-sided attention mechanism that is also inspired by the projective attention framework*

---

### Cite

```bibtex
@misc{li2026paa,
  title   = {Projection Activated Attention},
  url     = {https://weakriver.github.io/#/posts/paa},
  author  = {Anthea Li},
  journal = {RuoShui},
  year    = {2026},
  month   = May,
}
```
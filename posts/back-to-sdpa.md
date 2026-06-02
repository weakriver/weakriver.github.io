---
title: Projective Lesson on Attention
date: 2026-05-31
tags: [好玩的]
related: [projective-attention, hpa, paa, otda]
excerpt: What The Projective Geometry Lens Actually Teaches Us About Attention
---

*Some final reflections in retrospect of things we looked at along the projective attention trip.*

---

The projective geometry view of attention begins with a simple reframing.

In standard scaled dot-product attention, each head computes:

$$
s_{ij}
=
\frac{q_i^\top k_j}{\sqrt{d_k}},
\qquad
\alpha_{ij}
=
\operatorname{softmax}_j(s_{ij}),
\qquad
y_i
=
\sum_j \alpha_{ij}v_j.
$$

The usual language says, the query retrieves values from similar keys.

The geometric language says something slightly different. The query is evaluated against a context-generated arrangement of key-defined hyperplanes, producing an activation code that values decode.

Each key \(k_j\) defines a hyperplane:

$$
H_j
=
\{q : q^\top k_j = 0\}.
$$

The logit \(q_i^\top k_j\) is not only a similarity score. It is also a signed incidence score: which side of the key-plane the query lies on, and how strongly. Attention therefore has the form:

$$
f(q_i)
=
\sum_j v_j \phi(q_i^\top k_j),
$$

where standard attention chooses \(\phi\) to be softmax over the row.

This is the core framework:

$$
\text{incidence}
\longrightarrow
\text{activation code}
\longrightarrow
\text{value decoder}.
$$

Once attention is written this way, many natural design questions appear. 
- Should \(\phi\) be softmax, ReLU, sigmoid, sparsemax, entmax, or something signed? 
- Should key norm matter, or only key direction? 
- Should the positive and negative sides of a hyperplane decode differently? 
- Should the value output be projected, corrected, clipped, or given extra geometric features? Should the attention row itself be treated as an activation code worth decoding?

Those questions led to a series of mechanisms, both in existing literature and in my own attempts. 

An tempting story would be new variants beats standard attention, or that provided variant replaces SDPA.

But more interesting questions to ask is:

 - **What this variant tells us about the design space?**
 - **What do these explorations teach us on what makes a mechanism strong?**
 - **How to interpret the collective results that might lead to useful design directions for new attention and more?** 

A branch can be geometrically motivated and still help for ordinary reasons: extra parameters, extra normalization, regularization, changed gradient flow, or simply because it adds another residual path.

This blog is about what the exploration actually taught.

---

### Axis  One: Activation Over Incidence

Standard attention uses softmax:

$$
\alpha_{ij}
=
\frac{\exp(s_{ij})}
{\sum_\ell \exp(s_{i\ell})}.
$$

Geometrically, softmax turns the query's incidence vector into a dense, positive, competitive activation code. Every token receives some weight. Larger incidences suppress smaller ones through the denominator. The row lives on the probability simplex:

$$
\alpha_i \in \Delta^{T-1}.
$$

This is a very particular activation geometry.

ReLU attention instead uses something like:

$$
a_{ij}
=
\operatorname{ReLU}(s_{ij}).
$$

Now each key-plane behaves more like a halfspace gate. If the query lies on the positive side, the token activates. If it lies on the negative side, the token shuts off. Work such as ["Replacing Softmax with ReLU in Vision Transformers"](https://arxiv.org/abs/2309.08586) shows that this can work surprisingly well when sequence-length normalization is handled carefully.

Sigmoid attention uses independent bounded gates:

$$
a_{ij}
=
\sigma(s_{ij}).
$$

The paper ["Theory, Analysis, and Best Practices for Sigmoid Self-Attention"](https://arxiv.org/abs/2409.04431) makes a similar point: sigmoid attention is not doomed merely because it lacks softmax competition. It needs the right normalization and initialization.

Sparsemax and entmax project the row onto a sparse probability simplex. Top-k attention keeps only the strongest incidences. Signed and negative attention, as in [Cog Attention](https://arxiv.org/abs/2411.07176) or [Differential Transformer](https://arxiv.org/abs/2410.05258), allow the output to leave the ordinary convex hull of values.

The geometric lesson is clear:

> Softmax is not the only possible activation over hyperplane incidence.

But the more interesting practical lesson is:

> Softmax is not sacred, but normalized activation is.

Every successful softmax replacement seems to rebuild some part of what softmax gives for free:

- ReLU needs length scaling or row normalization;
- sigmoid needs norm control;
- entmax keeps a probability budget;
- top-k keeps a sparsity budget;
- signed attention needs magnitude normalization;
- subtractive attention needs branch budgeting.

This also matched our own attempts. Hyperplane Activation Attention was conceptually clean, but it was not a strong winner in the local experiments. Projection Feature variants using tanh, GELU, SiLU, absolute value, or normalized ReLU did not suddenly unlock a better mechanism. Projective Clipping variants with squared hinge, sigmoid violation, softmax-over-violations, and top-k softmax-over-violations were interesting, but none changed the basic conclusion.

The lesson on the activation axis is natural: 

> Activation alone is not the magic solution, it needs controlled row scale and output scale.

---

### Axis  Two: Projective Gauge And Key Normalization

A hyperplane normal is defined only up to scale:

$$
\{q : q^\top k = 0\}
=
\{q : q^\top (ck) = 0\}
$$

for any nonzero scalar \(c\).

But raw dot-product attention is not invariant to this scaling:

$$
q^\top (ck)
=
c(q^\top k).
$$

Changing the key norm changes the logit, the softmax row, and the output. That may be useful if the norm encodes confidence or salience. But it also means that standard attention entangles two roles:

- key direction defines the hyperplane;
- key norm controls score magnitude.

The projective move is to separate them:

$$
\hat q_i
=
\frac{q_i}{\|q_i\|+\epsilon},
\qquad
\hat k_j
=
\frac{k_j}{\|k_j\|+\epsilon},
$$

$$
s_{ij}
=
\tau_h \hat q_i^\top \hat k_j.
$$

This is the geometry behind Query-Key Normalization. [QKNorm](https://aclanthology.org/2020.findings-emnlp.379/) normalizes queries and keys and replaces the fixed \(1/\sqrt{d_k}\) factor with a learned per-head scale. Projective / Angular Attention is the same basic gauge-fixing idea read geometrically.

Selective Self-Attention goes one step further. In [Selective Attention](https://arxiv.org/abs/2411.12892), the temperature becomes query-dependent. In geometry language, the query decides how sharp its partition of the hyperplane arrangement should be.

This axis kept reappearing in our experiments.

Vanilla HPA was stable and sometimes helpful, but KeyNorm HPA was the clearest HPA-family result. In the retrieval-pressure sweeps, KeyNorm HPA produced the most reliable positive signal among the HPA variants. Projection Feature Attention also became much stronger when paired with KeyNorm scoring.

That is not an accident. If the mechanism depends on interpreting keys as hyperplane normals, then key scale has to be treated carefully.

The lesson can be summarized as:

> a lot of "geometric attention improvement" is really better gauge control.

This also suggests a more refined direction. We should not necessarily discard key norm. Instead, we should separate it:

$$
k_j
=
r_j \hat k_j,
\qquad
r_j
=
\|k_j\|.
$$

Use \(\hat k_j\) for incidence geometry. Use \(r_j\) as a separate confidence, salience, margin, or temperature feature. Standard attention blends these together. A more geometric attention layer should make the two roles explicit.

---

### Axis  Three: Hyperplane Arrangement And Access

Full attention evaluates all pairs:

$$
s_{ij}
=
q_i^\top k_j
\qquad
\text{for all } i,j.
$$

This is expensive because every query sees the full context-generated arrangement.

Efficient attention methods can be read as approximations to this arrangement.

[Reformer](https://arxiv.org/abs/2001.04451) uses locality-sensitive hashing. Geometrically, this means tokens are grouped by sign patterns in a random hyperplane arrangement. Queries attend only within coarse regions.

[Routing Transformer](https://arxiv.org/abs/2003.05997) clusters tokens and evaluates local sub-arrangements. [Performer](https://arxiv.org/abs/2009.14794) approximates the softmax kernel through random features, which is better understood as changing the activation/kernel representation than as direct hyperplane routing.

These are not the same mechanism as key-defined projective attention. But they occupy the same broad design axis:

> how much of the hyperplane arrangement does a query actually evaluate?

The lesson here is more computational than semantic. Many access mechanisms are useful because they make attention cheaper, not because they produce a better geometric inductive bias by themselves.

The overlooked direction is learned geometric routing. Reformer uses random hyperplanes. Routing Transformer uses clusters. A more projective version would route using learned normalized key directions, stable anchor planes, or learned sign codes that are tied to the attention geometry itself.

That direction is interesting, but it should be tested as an efficiency and routing hypothesis, not automatically as a stronger base attention mechanism.

---

### Axis Four: Decoding And Value Geometry

The usual attention story treats values as content:

$$
y_i
=
\sum_j \alpha_{ij}v_j.
$$

But in the activation-code view, values are a decoder:

$$
y_i
=
a_iV.
$$

The row \(a_i\) encodes the query's position relative to the key-hyperplane arrangement. The value matrix \(V\) maps that code into the output space.

This makes attention look like a data-dependent one-hidden-layer neural network:

- keys are hidden-unit normals;
- the attention row is the hidden activation code;
- values are output weights;
- the sequence supplies both the hidden units and the decoder.

This is close in spirit to the fast-weight interpretation in ["Linear Transformers Are Secretly Fast Weight Programmers"](https://arxiv.org/abs/2102.11174), and to kernel-regression views such as ["Transformer Dissection"](https://aclanthology.org/D19-1443/). The projective language adds a hyperplane-arrangement interpretation.

Once values are seen as decoders, several mechanisms become natural.

#### HPA: De-Addressing The Readout

HPA began from the idea that attention may retrieve value information with address information still attached. HPA subtracts a query-conditioned key-normal correction from the value readout. It removes an address shadow induced by the query-key match. In pre-aggregation HPA, each source token receives its own correction before aggregation:

$$
z_i
=
\sum_j
\alpha_{ij}
\left(
v_j
-
\lambda
\frac{q_i^\top k_j}{\|k_j\|^2+\epsilon}
k_j
\right).
$$

This preserves the per-source structure of the correction. Post-aggregation HPA loses that property, which is why it behaved differently from pre-aggregation HPA in our tests.

KeyNorm HPA made the correction more reliable:

$$
z_i
=
\sum_j
\alpha_{ij}
\left(
v_j
-
\lambda
(q_i^\top \hat k_j)\hat k_j
\right).
$$

So we learned that: 

> HPA is a useful address/content separation prior, especially when key geometry is normalized.

#### XSA: Output-Space Gauge Fixing

Exclusive Self Attention (XSA) sits on the same broad decoding axis. It projects the attention output away from the token's own value direction:

$$
z_i
=
y_i
-
\frac{y_i^\top v_i}{\|v_i\|^2+\epsilon}v_i.
$$

This is not a key-hyperplane mechanism. It is an output-space projection. But geometrically it is deeply related: instead of fixing the gauge of key directions, XSA fixes part of the output direction.

This suggests a whole underexplored family:

> output-space gauge fixing.

The model might remove self directions, address directions, repeated-token directions, head-specific nuisance directions, or learned low-rank directions that dominate the output without adding useful content.

#### Projection Feature Attention: Expose, Do Not Force

Projection Feature Attention took a gentler approach. Instead of forcing a subtraction, it exposed geometric features to the next layer.

For an active key direction \(\hat k_j\), decompose the query into:

$$
p_{ij}
=
(q_i^\top \hat k_j)\hat k_j,
\qquad
r_{ij}
=
q_i - p_{ij}.
$$

Then aggregate projected and residual components, and let a learned map decide how to use them.

This was promising in some LM-style runs, especially with KeyNorm. But the controls were sobering, we cannot yet claim the exact geometric decomposition is the only cause.

This pursuit suggests a useful design pattern: 

> expose interpretable geometric side information, normalize it, zero-init or budget the branch, and test it against feature-path controls.


#### Projective Clipping: Violation As A Second Channel

Projective Clipping asked a different question. If keys define halfspaces, should the model receive a signal when the query violates them?

For a halfspace:

$$
\langle q,\hat k_j\rangle \ge m,
$$

a clipping residual can be written as:

$$
\delta_{ij}
=
\operatorname{ReLU}(m - q_i^\top \hat k_j),
$$

$$
r_i
=
\sum_j \alpha_{ij}\delta_{ij}\hat k_j.
$$

Then \(r_i\) is decoded alongside the usual value readout.

This is conceptually clean because it is one-sided, like ReLU. But dense clipping is expensive and scale-sensitive. The best Projective Clipping variant in our focused tests used RMS-normalized residuals, which again repeats the same theme: the geometry becomes useful only when branch scale is controlled.

The likely future version is not dense clipping. It is sparse clipping: only compute violation residuals for top-k violated planes, high-pressure tokens, or heads explicitly assigned to boundary work.

#### OTDA And Subtractive Decoding

OTDA explored another decoding idea: each hyperplane has two sides, so perhaps positive and negative sides should decode differently.

The naive two-sided version was not the interesting part. Standard attention already handles positive evidence. The useful idea was the negative-only subtractive branch:

$$
a^-_{ij}
=
\operatorname{softmax}_j(-s_{ij}),
$$

$$
n_i
=
\sum_j a^-_{ij}v^-_j,
$$

$$
z_i
=
y_i - g_h n_i.
$$

We learned that:

> if the positive side is already handled by standard attention, the missing degree of freedom may be subtractive evidence, not naive two-sided decoding.

---

### Axis Five: Branch Budget And Controls

Every geometric branch has a strength:

$$
\rho_i
=
\frac{\|\text{branch}_i\|}
{\|y_i\|+\epsilon}.
$$

If \(\rho_i\) is too small, the branch is decorative. The model is mostly doing standard attention. If \(\rho_i\) is too large, the branch can dominate the value readout and break simple algorithmic behavior. This methodological lesson should be applied across.

This does not invalidate the geometry. It gives the geometry discipline.

For every proposed geometric attention mechanism, the first experiments should include:

- random direction controls;
- shuffled key/value controls;
- rotated-basis controls;
- tied and untied K/V controls;
- extra-linear and extra-matmul baselines;
- parameter-matched branches;
- compute-matched branches;
- zero-init residual variants;
- branch-budget measurements.

---

## Back to SDPA: the Interpretability Lesson

The most important thing the geometry lens teaches is not to replace SDPA.

It teaches what makes an attention mechanism works well, and why SDPA is not obsolete after this many years.

Standard scaled dot-product attention solves several problems at once:

$$
s_{ij}
=
\frac{q_i^\top k_j}{\sqrt{d_k}}
$$

gives cheap signed incidence against token-defined hyperplanes.

The factor \(1/\sqrt{d_k}\) keeps score scale in a reasonable range.

Softmax turns the incidence vector into a bounded, positive, competitive activation code:

$$
\alpha_i
=
\operatorname{softmax}(s_i).
$$

The value readout decodes the code while keeping the output in a controlled convex hull:

$$
y_i
=
\sum_j \alpha_{ij}v_j.
$$

This package is hard to beat because it is compact. It combines:

- incidence measurement;
- scale stabilization;
- competition;
- row normalization;
- dense retrieval;
- bounded output mixing;
- and a simple decoder.

Many proposed mechanisms start by relaxing one of these properties. Then, to become stable, they reintroduce it in another form.

ReLU attention removes softmax, then needs length scaling.

Sigmoid attention removes competition, then needs norm control.

Sparse attention removes dense support, then needs a sparsity budget.

Signed attention leaves the convex hull, then needs magnitude control.

HPA subtracts an address correction, then needs key normalization and branch selectivity.

Projection Feature adds coordinates, then needs feature-branch controls.

Projective Clipping adds violation residuals, then needs residual normalization and sparsity.

OTDA adds negative evidence, then needs branch budgeting and sharper controls.

This is the collapse back to SDPA.

Not because the new ideas are meaningless. They are meaningful. But the more stable they become, the more they recover SDPA-like structure: normalized activation, controlled row mass, bounded decoding, and careful scale.

The lesson might be humbling: the projective view does not make SDPA obsolete. But the constructive aspect is that it explains why SDPA is hard to beat.

> SDPA is already a strong geometric mechanism. The projective view helps us see what it compresses, why that compression is powerful, and where a carefully controlled extension might still matter.

> The best future mechanisms may not replace SDPA. They may expose one geometric degree of freedom that SDPA compresses away.

> A good extension might not only name the compression it is undoing but also have specific implications for some tasks where it is useful.

So now we might better targets.

---

## After SDPA: Potential Directions that Might be Overlooked 

The next useful mechanisms should probably stay close to SDPA, but open one geometric degree of freedom at a time.

### Separate Direction, Norm, And Temperature

The strongest axis is still gauge control.

Use normalized directions for incidence:

$$
s_{ij}
=
\tau_i \hat q_i^\top \hat k_j.
$$

But preserve key norm separately:

$$
r_j
=
\|k_j\|.
$$

Then let \(r_j\) influence confidence, margins, temperature, or value decoding. This keeps the projective geometry clean while avoiding the crude move of throwing away norm information.

This direction is high value.

### Output-Space Gauge Fixing

HPA and XSA suggest a larger family:

$$
z_i
=
y_i - P_i y_i,
$$

where \(P_i\) removes some data-dependent nuisance direction.

Possible nuisance directions include:

- the token's own value direction;
- the attended key-normal direction;
- repeated-token directions;
- head-specific address directions;
- low-rank directions learned to represent copying or self-reconstruction.

This direction is high value because it changes decoding, not just scoring.

###  Shared K/V Geometry

Any mechanism that subtracts a key-shaped vector from a value-shaped vector needs a basis story.

If \(K\) and \(V\) live in unrelated learned spaces, then operations like:

$$
v_j - c_{ij}k_j
$$

are geometrically suspicious.

This suggests experiments with:

- tied \(W_K = W_V\);
- partially tied K/V projections;
- learned orthogonal maps from key space to value space;
- shared latent spaces for address and content;
- basis-invariant controls.

This direction is high value because it tests whether the geometry is real or only metaphorical.

###  Sparse Violation Geometry

Projective Clipping is too expensive in dense form.

The more plausible version is:

$$
r_i
=
\sum_{j \in \operatorname{TopKViolation}(i)}
\alpha_{ij}
\delta_{ij}
\hat k_j.
$$

Only the most violated planes produce residuals. Or only high-pressure queries activate the branch.

This direction is medium to high value. The idea is distinctive, but it must become sparse and cheap.

###  Pressure-Conditioned SDPA

Instead of adding a new branch, let retrieval pressure modulate SDPA itself.

For example:

$$
\alpha_i
=
\operatorname{softmax}(\tau(p_i)s_i),
$$

where \(p_i\) is a pressure statistic such as entropy, margin, repeated-key ambiguity, or distractor density.

This could control:

- temperature;
- sparsity;
- top-k budget;
- key normalization strength;
- signed branch strength;
- clipping threshold.

This direction is high value because it preserves SDPA's core stability.

### Activation Mixtures Per Head

Different heads may want different activation semantics.

One head may want softmax retrieval. Another may want sigmoid multi-token gating. Another may want sparse top-k lookup. Another may want signed subtraction.

A head could learn a mixture:

$$
a_i^{(h)}
=
\sum_m \pi_{hm}\phi_m(s_i).
$$

The risk is complexity. The opportunity is interpretability: heads could specialize into retrieval, filtering, boundary, aggregation, or subtraction roles.

This direction is medium value unless regularized strongly.

###  Activation-Code Analysis

The attention row itself is a representation:

$$
a_i
=
\phi(q_iK^\top).
$$

We should analyze it directly:

- entropy;
- margin;
- sign pattern stability;
- angular concentration;
- code reuse across layers;
- code similarity between tokens;
- how code geometry changes under retrieval pressure.

This direction is high value for interpretability, even if it does not immediately produce a new mechanism.

###  Negative Evidence Tasks

Signed and subtractive mechanisms need tasks where negative evidence matters.

Standard passkey tasks mostly reward finding the right token. They do not always require suppressing a wrong token. OTDA needs settings where "this token strongly points the other way" is useful information.

Possible tasks:

- contradiction retrieval;
- exclusion queries;
- anti-key lookup;
- distractors with high positive lexical overlap but wrong sign;
- repeated keys where the correct value is determined by a negative condition.

This direction is medium value architecturally, but high value experimentally.

###  Geometry-First Controls

This is not a mechanism, but it may be the most important direction.

Every geometric attention proposal should come with controls from the start.

The first question to start might be: 

> does it beat the random, shuffled, rotated, parameter-matched, and compute-matched version of itself?

Only after that should we ask whether it scales.

---

## Closing

The projective geometry lens is useful because it changes the level at which we talk about attention.

It says that attention is not merely lookup. It is a token-conditioned hyperplane activation layer. The sequence builds the hyperplanes, the query produces an activation code, and the values decode that code into the next representation.

But the lens is useful for other reasons too: it does not flatter every geometric idea.

Some mechanisms are too weak. Some are too loud. Some are matched by random controls. Some are really normalization improvements. Some are beautiful but too expensive. Some collapse back into SDPA once they are made stable.

That is not a failure of the framework. That is the framework doing its job.

The central interpretability lesson is: SDPA is the simplest stable decoder of a token-generated hyperplane arrangement.

It measures incidence, normalizes the activation code, and decodes through values in one compact operation.

The next generation of geometric attention mechanisms should probably not try to replace that whole package. They should ask which degree of freedom SDPA hides:

- direction versus norm;
- activation versus normalization;
- positive versus negative evidence;
- address versus content;
- self direction versus contextual direction;
- dense retrieval versus sparse violation;
- value payload versus value decoder;
- branch signal versus branch capacity.

The projective geometry view is useful, but not because every geometric mechanism works.

It is useful because it decomposes attention into interpretable choices:

$$
\text{attention}
=
\text{hyperplanes}
+
\text{incidence activations}
+
\text{normalization}
+
\text{decoding}.
$$

Some choices are already well supported: direction normalization, activation scaling, sparse support, and controlled temperature.

Some choices are promising but unproven: HPA-style corrections, subtractive branches, output-space projection, and projective clipping.

Some choices are currently more diagnostic than practical: CCDA, HOHA, BBPA, and norm-confidence variants.

Through a series of exploration, we found that the projective framework is not only a metaphor for attention. It is a way to ask better questions about attention.


---

*This is the final blog of the series. Hope you enjoyed the trip.*

---

### Cite

```bibtex
@misc{li2026backtosdpa,
  title   = {Projective Lesson on Attention},
  url     = {https://weakriver.github.io/#/post/back-to-sdpa},
  author  = {Anthea Li},
  journal = {RuoShui},
  year    = {2026},
  month   = May,
}
```

---

### References

- Wortsman et al., [Replacing Softmax with ReLU in Vision Transformers](https://arxiv.org/abs/2309.08586).
- Ramapuram et al., [Theory, Analysis, and Best Practices for Sigmoid Self-Attention](https://arxiv.org/abs/2409.04431).
- Correia, Niculae, and Martins, [Adaptively Sparse Transformers](https://arxiv.org/abs/1909.00015).
- Henry et al., [Query-Key Normalization for Transformers](https://aclanthology.org/2020.findings-emnlp.379/).
- Zhang et al., [Selective Attention: Enhancing Transformer through Principled Context Control](https://arxiv.org/abs/2411.12892).
- Kitaev, Kaiser, and Levskaya, [Reformer: The Efficient Transformer](https://arxiv.org/abs/2001.04451).
- Choromanski et al., [Rethinking Attention with Performers](https://arxiv.org/abs/2009.14794).
- Roy et al., [Efficient Content-Based Sparse Attention with Routing Transformers](https://arxiv.org/abs/2003.05997).
- Ye et al., [Differential Transformer](https://arxiv.org/abs/2410.05258).
- Lv et al., [More Expressive Attention with Negative Weights](https://arxiv.org/abs/2411.07176).
- Zhai, [Exclusive Self Attention](https://arxiv.org/abs/2603.09078).
- Schlag, Irie, and Schmidhuber, [Linear Transformers Are Secretly Fast Weight Programmers](https://arxiv.org/abs/2102.11174).
- Tsai et al., [Transformer Dissection: An Unified Understanding for Transformer's Attention via the Lens of Kernel](https://aclanthology.org/D19-1443/).



---
title: "Oriented Two-sided Attention"
tags: [好玩的]
date: 2026-05-29
related: [projective-attention-framework, hpa, paa, back-to-sdpa]
excerpt: Attention with Oriented Two-Sided Decoding
---

*A small experimental sequel to the Projective Attention series, looking at both sides of hyperplanes, especially at the negative side.*

---

### Observation

The previous posts started from a geometric observation: the dot product inside attention has two lives.

In the usual transformer story, the score $q_i^\top k_j$ is a similarity score. If it is large, token $i$ should read from token $j$.

A different interpretation on same scalar is when the key $k_j$ is treated as the normal vector of a hyperplane,

$$
H_j = \{q : q^\top k_j = 0\},
$$

then $q_i^\top k_j$ is a signed incidence score. It says which side of the key-defined hyperplane the query lies on, and how strongly.

Standard attention can therefore be written in a second language:

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

The usual reading is: attention retrieves values from similar keys.

The projective reading is:

> attention builds an activation code over a sequence-generated hyperplane arrangement, then decodes that code through values.

That reframing opens several design axes, and this post focuses on one of those axes, **oriented decoding**, and especially the negative side of it.

The mechanism is **OTDA**, or Oriented Two-Sided Decoder Attention.

The short version is:

> OTDA did not beat the earlier HPA line in these local experiments. But the negative-only version did clarify something useful: the promising idea is not naive two-sided decoding. It is giving attention an explicit subtractive branch.

That is the main thread of the post.

The post will also discuss a series of relevant mechanisms: Cell-Code Decoder Attention (CCDA), Hybrid Offset Hyperplane Attention (HOHA), Norm-Confidence Projective Attention (NCPA), and Boundary-Based Projective Attention (BBPA). They will be used to explore various modes of behaviors: branches can be too quiet, too loud, too generic, or not isolated by controls.

---

###  The Projective Setup

For each attention head, define normalized projective scores:

$$
\hat q_i = \frac{q_i}{\|q_i\|+\epsilon},
\qquad
\hat k_j = \frac{k_j}{\|k_j\|+\epsilon},
$$

$$
s_{ij}
=
\tau_h \hat q_i^\top \hat k_j.
$$

Here $\tau_h$ is a learnable per-head scale.

This normalized form fixes a projective gauge: the key's direction carries the incidence geometry, while raw key length is separated from it.

The attention row

$$
\alpha_i
=
\operatorname{softmax}(s_i)
$$

can be viewed as an activation pattern induced by the query's position relative to the key-defined hyperplanes in the context.

Under this view, standard attention is only one point in a larger family:

$$
y_i
=
D_V(\phi(s_i)),
$$

where $\phi$ is an activation over incidences and $D_V$ is a decoder built from values.

The question is:

> Which extra geometric branch is useful enough, controlled enough, and cheap enough to justify adding to attention?


#### Candidate Axes

The projective framework suggested several mechanisms.

| Method | Axis | Main Idea |
|---|---|---|
| BBPA | Boundary activation | Read from hyperplanes the query lies near |
| OTDA | Oriented decoding | Decode positive and negative sides differently |
| HOHA | Hyperplane structure | Allow affine/content-offset hyperplanes |
| NCPA | Gauge and norm | Normalize direction, reintroduce norm as confidence |
| CCDA | Activation-code decoding | Use a sketch of the attention cell to modulate output |

The rest of this post will go through various choices to learn more about the underlying mechanisms. 

---

### OTDA: Two Sides of a Hyperplane

Every key-defined hyperplane has two sides. Standard softmax mostly cares about large positive incidence:

$$
a^+_{ij}
=
\operatorname{softmax}_j(s_{ij}).
$$

But the opposite side is also geometrically real:

$$
a^-_{ij}
=
\operatorname{softmax}_j(-s_{ij}).
$$

Raw OTDA asks:

> Should the positive and negative sides of the arrangement decode through different value semantics?

The initial two-sided form was:

$$
z_i
=
y_i
+
\lambda_+ \sum_j a^+_{ij}v_j^+
+
\lambda_- \sum_j a^-_{ij}v_j^-.
$$

The hope was that the model could learn different semantics for:

- "this key strongly matches the query";
- "this key strongly points the other way."

This is a natural projective idea. But it also asks the model to learn two extra branches, one of which overlaps heavily with ordinary attention.

In practice, the positive branch is not the interesting part. Standard attention already has a positive-side decoder.

The more interesting bit goes to the **negative side**.

---

### Negative-Only OTDA

The amended version isolates the negative branch:

$$
a^-_{ij}
=
\operatorname{softmax}_j(-s_{ij}),
$$

$$
n_i
=
\sum_j a^-_{ij}v_j^-.
$$

Then the branch is subtracted from the standard attention output:

$$
z_i
=
y_i
-
g_h B(y_i,n_i;\rho).
$$

Here $g_h$ is a head gate and $B$ is a branch-budget operator:

$$
B(y_i,b_i;\rho)
=
b_i
\frac{\rho \|y_i\|}{\|b_i\|+\epsilon}.
$$

This is **negative-only OTDA**.

The intuition is no longer on *decode both sides*, but now:

> attention should have a subtractive channel for anti-aligned evidence.

If standard attention says "read what matches," negative-only OTDA says "also suppress what points the wrong way."

---

### Experiments

The first local suite used small causal transformers on synthetic retrieval and tiny language-modeling tasks:

- associative recall;
- copy-first;
- induction;
- passkey retrieval;
- delayed dependency;
- distractor suppression;
- synthetic LM.

All methods passed correctness checks:

- finite outputs;
- finite gradients;
- causal-prefix consistency.

The first seed was misleadingly optimistic. Some variants looked useful on LM or retrieval, but the seed check gave the more important read:

| Method | Mean Acc | Delta | LM Loss | LM Delta | Assoc | Passkey |
|---|---:|---:|---:|---:|---:|---:|
| Standard | 0.589 | 0.000 | 1.992 | 0.000 | 0.022 | 0.020 |
| BBPA | 0.583 | -0.006 | 2.040 | +0.048 | 0.021 | 0.015 |
| OTDA | 0.611 | +0.022 | 2.155 | +0.163 | 0.029 | 0.027 |
| HOHA | 0.596 | +0.007 | 2.033 | +0.041 | 0.025 | 0.017 |
| NCPA | 0.591 | +0.002 | 1.964 | -0.028 | 0.021 | 0.020 |
| CCDA | 0.481 | -0.108 | 2.083 | +0.091 | 0.035 | 0.029 |

The read changed:

- OTDA had the strongest retrieval-side signal, but hurt LM.
- NCPA had the cleanest small LM signal.
- HOHA was seed-sensitive.
- CCDA was fragile.
- BBPA did not activate a clear boundary story.

This was the point where the projective framework stopped feeling like a menu of clever mechanisms and started feeling like an experimental discipline.

The question became:

> Are these branches actually contributing, and if they are, how loudly?


#### Branch Budgets

The diagnostic pass measured how much each projective branch contributed relative to the base attention output.

That produced a simple lesson:

> Some branches were too polite. CCDA was too loud.

BBPA, HOHA, NCPA, and parts of early OTDA often contributed only a tiny fraction of the base output. In those cases, the model was mostly doing normalized attention with a decorative geometric branch attached.

CCDA had the opposite problem. Its modulation/base ratio could land around 10 percent to 30 percent, large enough to matter and also large enough to break simple algorithmic tasks.

So I introduced explicit branch budgets:

$$
B(y_i,b_i;\rho)
=
b_i
\frac{\rho \|y_i\|}{\|b_i\|+\epsilon}.
$$

With this, a branch could be forced to speak at a known volume: 3 percent, 5 percent, 10 percent, and so on.

For OTDA, this made the central question sharper:

> Is the useful part really two-sided decoding, or is it the negative side?

---

### OTDA Ablations

The OTDA ablation tested:

- raw two-sided OTDA;
- negative-only OTDA;
- stronger and weaker branch budgets;
- hard head splits;
- random negative-value controls;
- shuffled negative branches;
- positive-subtract controls.

The result:

| Method | Mean Acc Delta | Positive Acc Tasks | LM Loss Delta | Read |
|---|---:|---:|---:|---|
| `otda_neg:hard_split_50_budget_5` | +0.0022 | 4/9 | +0.1301 | Best tiny accuracy delta, still hurts LM |
| `otda_neg:budget_5` | +0.0020 | 4/9 | +0.1300 | Passkey positive, LM negative |
| `otda_neg:budget_10` | +0.0020 | 4/9 | +0.1300 | No benefit over budget 5 |
| `otda_neg:shuffled_neg_budget_5` | +0.0017 | 4/9 | +0.1299 | Nearly matches real negative branch |
| `otda_neg:positive_subtract_budget_5` | +0.0015 | 4/9 | +0.1292 | Nearly matches negative-only branch |
| `otda:budget_10` | -0.0007 | 4/9 | +0.2036 | Two-sided OTDA is worse |
| `otda_neg:random_v_budget_5` | -0.0035 | 2/9 | +0.1901 | Random value control fails |

Diagnostics confirmed the branch budget:

| Variant | Branch/Base Ratio |
|---|---:|
| `otda:budget_10` | 0.100 |
| `otda_neg:budget_5` | 0.025 |
| `otda_neg:budget_10` | 0.050 |
| `otda_neg:hard_split_25_budget_5` | 0.0127 |
| `otda_neg:hard_split_50_budget_5` | 0.0251 |

This gives a nuanced result.

Negative-only OTDA is better than two-sided OTDA. The random-value control is worse. That supports the idea that the branch is doing something nontrivial.

But the shuffled-negative and positive-subtract controls are close. That means the current experiments do **not** prove that token-aligned negative evidence is the causal ingredient.

The fair OTDA conclusion might be:

> OTDA's useful direction is subtractive branch control, not naive two-sided decoding. 

Thais is interesting. It moves the mechanism from "two sides should decode differently" to a cleaner claim:

> attention may need explicit subtraction, not just selection.

---

### Comparison with Other Projective Attention Mechanisms

Now,it is fair to see how OTDA compares with against same-harness adapters of the other mechanisms proposed under the Projective Attention framework:

- `hpa_best`: KeyNorm HPA.
- `paa_best`: Projection-Feature + KeyNorm-style adapter.

These are not byte-for-byte imports of the old experiment code. They are local adapters built to run in the same tiny transformer harness as the new mechanisms.

The five-seed main comparison used:

- associative recall;
- copy-first;
- induction;
- passkey;
- delayed dependency;
- distractor suppression;
- synthetic LM.

The headline table:

| Method | Mean Non-LM Acc Delta | Positive Acc Tasks | LM Loss Delta | LM Improved Seeds | Read |
|---|---:|---:|---:|---:|---|
| `hpa_best` | +0.0192 | 18/30 | -0.0382 | 5/5 | Strongest same-harness result |
| `otda_neg:budget_5` | +0.0126 | 11/30 | +0.0285 | 3/5 | Small algorithmic gain, LM cost |
| `otda_neg:budget_10` | +0.0124 | 11/30 | +0.0285 | 3/5 | Same as budget 5 |
| `paa_best` | +0.0104 | 12/30 | +0.0868 | 0/5 | Helps some tasks, hurts LM |
| `ccda:budget_5` | -0.0508 | 11/30 | +0.0456 | 2/5 | Not a main-suite winner |
| `ccda:budget_10` | -0.0510 | 11/30 | +0.0449 | 2/5 | Not a main-suite winner |


KeyNorm HPA wins among all. OTDA remained interesting because it had a specific lesson:

> subtractive attention is more promising than two-sided additive decoding.

---

### Looking Deeper Into The Other Mechanisms

CCDA, NCPA, HOHA, and BBPA should not be centered as winners. But they are still worth writing about because they explain what can go wrong when a projective branch is added to attention.

#### CCDA: The Branch-Budget Probe

CCDA treats the attention row as an activation code.

For each query, compute a tiny sketch:

$$
r_i
=
\operatorname{sketch}(s_i,\alpha_i),
$$

where the sketch includes entropy, max score, top-score gap, positive mass, negative mass, and boundary mass.

Then:

$$
(\gamma_i,\delta_i)
=
\operatorname{MLP}(r_i),
$$

$$
z_i
=
y_i
+
y_i \odot \tanh(\gamma_i)
+
\delta_i.
$$

The idea is appealing:

> The geometry of the attention cell should change how the output is decoded.

But the experiments say something more cautious.

| Method | Mean Acc Delta | Positive Acc Tasks | LM Loss Delta | Read |
|---|---:|---:|---:|---|
| `ccda` | +0.0864 | 6/9 | +0.1060 | Large diagnostic-task gain, hurts LM |
| `ccda:budget_5` | +0.0812 | 6/9 | +0.1185 | Capped but not better than controls |
| `ccda:budget_10` | +0.0809 | 6/9 | +0.1178 | Capped but not better than controls |
| `ccda:param_matched_budget_10` | +0.0827 | 6/9 | +0.1182 | Matches capped CCDA |
| `ccda:random_sketch_budget_10` | +0.0820 | 6/9 | +0.1180 | Matches capped CCDA |
| `ccda_gain:budget_10` | +0.0825 | 4/9 | +0.1050 | Gain-only still not compelling |

The budget diagnostics behaved exactly as intended:

| Variant | Modulation/Base Ratio |
|---|---:|
| `ccda` | 0.199 |
| `ccda:budget_5` | 0.050 |
| `ccda:budget_10` | 0.100 |
| `ccda:random_sketch_budget_10` | 0.100 |
| `ccda:param_matched_budget_10` | 0.100 |

So CCDA teaches a strong experimental lesson:

> controlling branch strength is necessary.

But it does not yet validate the sketch mechanism:

> random-sketch and parameter-matched controls matched capped CCDA.

That moves CCDA out of the main story. It is not the hero. It is the mechanism that made the branch-budget problem impossible to ignore.

#### NCPA: Norm Confidence Or Norm Regularization?

NCPA starts from a real ambiguity in projective attention. If normalized directions define geometry, what should happen to norms?

The proposed form was:

$$
s_{ij}
=
\tau(\|q_i\|)
\hat q_i^\top \hat k_j
+
c_h \log(\epsilon+\|k_j\|).
$$

Optionally, values receive a norm-based gate.

The hope was:

> use normalized direction for geometry, then reintroduce norm only as confidence.

The issue is that the shuffled control matches the real mechanism:

| Method | Mean Acc Delta | Positive Acc Tasks | LM Loss Delta | Read |
|---|---:|---:|---:|---|
| `ncpa:budget_10` | +0.0040 | 6/18 | -0.0317 | Best NCPA variant; helps LM |
| `ncpa:shuffled_budget_10` | +0.0042 | 6/18 | -0.0317 | Shuffled control matches |
| `ncpa:row_centered_budget_10` | -0.0026 | 5/18 | -0.0261 | Cleaner, weaker |
| `ncpa:entropy_gated_row_centered_budget_10` | -0.0027 | 5/18 | -0.0261 | Entropy gate does not rescue it |
| `ncpa:source_centered_value_budget_10` | -0.0020 | 5/18 | -0.0262 | Mild value-only path |

The follow-up made NCPA more interpretable by row-centering the key-norm signal:

$$
b_{ij}
=
0.10
\tanh
\left(
\log \|k_j\|
-
\frac{1}{i+1}
\sum_{t \le i}
\log \|k_t\|
\right).
$$

But the cleaner version got weaker.

Diagnostics show why:

| Method | Key Bias / Score | Value Gate Delta |
|---|---:|---:|
| `ncpa:budget_10` | 0.0965 | 0.0822 |
| `ncpa:shuffled_budget_10` | 0.0965 | 0.0822 |
| `ncpa:row_centered_budget_10` | 0.0117 | 0.0000 |
| `ncpa:entropy_gated_row_centered_budget_10` | 0.0092 | 0.0000 |
| `ncpa:source_centered_value_budget_10` | 0.0000 | 0.0089 |

The old NCPA path is much louder and acts on query scale, key bias, and value amplitude together. That may be why it helps LM.

The lesson:

> NCPA probably helps as norm-shaped regularization, not as clean token-specific norm confidence.

#### HOHA: Affine Hyperplanes Without A Clean Offset Story

HOHA asks whether attention should use affine hyperplanes:

$$
q^\top k_j + b_j = 0.
$$

In projective-score form:

$$
s_{ij}
=
\tau_h(\hat q_i^\top \hat k_j + b_j).
$$

The follow-up tested centered margin offsets:

$$
s'_{ij}
=
s_{ij}
-
0.10
\left(
m_j
-
\frac{1}{i+1}
\sum_{t \le i}
m_t
\right).
$$

The results:

| Method | Mean Acc Delta | Positive Acc Tasks | LM Loss Delta | Read |
|---|---:|---:|---:|---|
| `hoha:budget_10` | +0.0035 | 7/18 | +0.0869 | Small non-LM gains, bad LM |
| `hoha:margin_centered_budget_10` | +0.0069 | 6/18 | +0.0872 | Better accuracy, same LM problem |
| `hoha:entropy_gated_margin_centered_budget_10` | +0.0067 | 6/18 | +0.0873 | Gate does not fix LM |
| `hoha:hard_split_50_margin_centered_budget_10` | +0.0063 | 6/18 | +0.0875 | Smaller branch, same tradeoff |
| `hoha:shuffled_margin_centered_budget_10` | +0.0071 | 7/18 | +0.0871 | Shuffled control wins |

Diagnostics:

| Method | Offset / Score |
|---|---:|
| `hoha:budget_10` | 0.0463 |
| `hoha:margin_centered_budget_10` | 0.0463 |
| `hoha:entropy_gated_margin_centered_budget_10` | 0.0367 |
| `hoha:hard_split_50_margin_centered_budget_10` | 0.0239 |
| `hoha:shuffled_margin_centered_budget_10` | 0.0465 |

HOHA is therefore a useful negative result:

> margin offsets can perturb classification tasks, but the aligned affine-offset story is not isolated.

The shuffled margin doing slightly better is the warning sign.

#### BBPA: Boundary Proximity Needs The Right Task

BBPA reads from keys near the decision boundary:

$$
\beta_{ij}
=
\operatorname{softmax}_j
\left(
-\frac{|s_{ij}-b_j|}{\sigma_h}
\right),
$$

$$
z_i
=
y_i
+
\lambda_b
\sum_j \beta_{ij}v_j^\partial.
$$

The intuition is clean: boundary regions are where classifications change, so maybe near-boundary tokens carry useful ambiguity information.

But in the current tasks, BBPA did not earn its complexity. It looked more like an extra value branch than a boundary-sensitive mechanism.

The lesson is not "boundary attention is impossible." It is:

> boundary attention needs a task where boundary proximity is directly rewarded.

---

#### Cost

At sequence length 1024 locally:

| Method | ms/forward | Params | Relative To Standard |
|---|---:|---:|---:|
| `standard` | 102.6 | 543k | 1.00x |
| `hpa_best` | 159.3 | 543k | 1.55x |
| `paa_best` | 163.1 | 560k | 1.59x |
| `ncpa:budget_10` | 173.1 | 543k | 1.69x |
| `hoha:budget_10` | 163.9 | 552k | 1.60x |
| `otda_neg:budget_10` | 216.9 | 576k | 2.11x |
| `otda_neg:budget_5` | 245.7 | 576k | 2.40x |
| `bbpa:budget_10` | 252.5 | 577k | 2.46x |
| `ccda:budget_10` | 327.2 | 548k | 3.19x |

---

### What This Exploration Teaches us

The projective framework did what it was supposed to do. It generated mechanisms from meaningful geometric axes:

- boundary proximity;
- two-sided orientation;
- affine hyperplanes;
- norm confidence;
- activation-cell decoding.

But the experiments showed that a mechanism can be geometrically motivated and still fail for ordinary reasons.

The branch can be too weak:

> BBPA, HOHA, NCPA, and early OTDA often contributed so little that the model was mostly doing normalized attention.

The branch can be too strong:

> CCDA contributed enough to matter, but also enough to break simple algorithmic behavior.

The branch can be controlled but still not isolated:

> Budgeted CCDA had the right strength, but random-sketch and parameter-matched controls matched it.

The branch can be cleaner but weaker:

> Row-centered NCPA was more interpretable than old NCPA, but less effective.

The branch can be conceptually promising but not yet decisive:

> Negative-only OTDA is better than two-sided OTDA, but shuffled and positive-subtract controls are still too close.

The strongest practical result remains KeyNorm HPA.

That is a useful outcome. It says the earlier HPA work was not merely a stepping stone; it is still the strongest practical member of this local projective-attention family.

---

### Summary

The original projective attention question was:

> What other geometric operations can attention perform?

The updated question is sharper:

> How do we give a geometric branch the right amount of influence, and how do we prove that the geometry, not just the branch, is responsible?

Lessons we learned from this round are that we need

- A branch budget: every projective branch should report branch/base ratio. If the branch is too quiet or too loud, the experiment is not interpretable.

- A matching control: random branches, shuffled branches, parameter-matched branches, and positive/negative sign controls should be run early.

- A task that directly rewards the hypothesis: OTDA needs tasks where negative evidence matters. BBPA needs tasks where boundary proximity matters. CCDA needs tasks where attention-cell shape should change decoding. HOHA needs tasks where learned margins are meaningful. NCPA needs a setup where norm confidence is injected or otherwise identifiable.

If I had to summarize this round in one sentence:

> OTDA clarified that the interesting projective direction is subtractive attention, not naive two-sided decoding.

---


code is here: [https://github.com/AntheaLi/Projective-Attention](https://github.com/AntheaLi/Projective-Attention)


---

*The next blog will connect back to the lessons we learned along this trip.*

---

### Cite

```bibtex
@misc{li2026otda,
  title   = {Oriented Two-sided Attention},
  url     = {https://weakriver.github.io/#/post/otda},
  author  = {Anthea Li},
  journal = {RuoShui},
  year    = {2026},
  month   = May,
}
```
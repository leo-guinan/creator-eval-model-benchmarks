# Creator Eval Model Benchmarks

Public-safe benchmark artifacts for testing site-processing prompts against creator websites.

Current case: Corey Wilks, Psy.D.

Source: https://coreywilkspsyd.com/

The repository contains:

- one bounded public-source capture receipt;
- the compiled Action Gap baseline used by the existing Creator Eval Engine;
- matched outputs from DeepSeek V4 Flash 0731, GPT-5.6 Luna, and Claude Haiku 5.5;
- deterministic contract tests for output shape, provenance, missing evidence, and claim boundaries;
- a live runner for adding future model/site cases.

This is a benchmark of instrument behavior, not a claim that any model found the creator's true framework. The existing compiled record contains creator-specific interpretation that is not necessarily recoverable from one homepage capture.

## Current run

Run date: 2026-10-12.

The first run exposed a semantic failure: all three models evaluated the website/creator rather than generating an assessment for the creator's audience. Prompt version `site-eval-draft.v2` makes the subject relationship explicit and requires respondent-facing question types and behavioral scoring fields.

The corrected run returned valid structured drafts from all three models.

- DeepSeek V4 Flash 0731: 6 dimensions, 6 questions, reported cost $0.00108184.
- GPT-5.6 Luna: 5 dimensions, 5 questions, reported cost $0.00407535.
- Claude Haiku 5.5: 6 dimensions, 6 questions, reported cost $0.0029639.
- Total reported cost: $0.00812109.

All three set `assessment_subject` to `creator_audience`. The outputs now include self-report, scenario, and forced-comparison item types rather than only expert-interview questions. This is a prompt correction, not proof of framework fidelity.

The model outputs are in `data/corey/2026-10-12/models.json`. Provider response IDs and usage receipts are preserved. API keys are not.

## V3 direction: source discovery before instrument construction

V3 separates two tasks that V2 combined:

1. `src/source-discovery.js` ranks same-host links using framework-language signals and fetches at most five candidate pages in addition to the homepage.
2. `src/v3-prompt.js` first extracts the creator's judgment model, then constructs a respondent-facing instrument from that extracted model.

The live Corey discovery receipt is `data/corey/2026-10-12/source-discovery-v3.json`. It selected and fetched three framework-bearing pages in addition to the homepage:

- `/the-four-horsemen-of-fear/`
- `/articles/`
- `/liminal-tension-imposter-syndrome/`

V3 also makes question contracts executable rather than decorative. A forced comparison must provide at least two `response_options`; an artifact judgment must require an artifact and define its `input_spec`; every instrument declares `score_semantics` (`capability`, `bottleneck_severity`, `readiness`, or `categorical`).

The V3 runner is `scripts/run_corey_v3.mjs`. It requires a process-environment OpenRouter key and writes timestamped, two-stage receipts. No V3 model call is represented as completed until the receipt exists.

The first V3 live pass is recorded in `data/coreywilkspsyd.com/2026-10-12/v3-2026-10-12T235541Z.json`:

- GPT-5.6 Luna: generated a six-framework extraction and six-question instrument; `score_semantics=bottleneck_severity`.
- Claude Haiku 5.5: generated an eight-framework extraction and six-question instrument; `score_semantics=categorical`.
- DeepSeek V4 Flash: failed with no usable text after a bounded 45-second request; preserved as a failure receipt, not silently retried.

The generated artifacts included executable forced comparisons and artifact-judgment items. The main result is not that the models are now correct. It is that the benchmark can finally distinguish source-grounded framework extraction from downstream instrument construction. DeepSeek's failure is operational evidence, not a quality score.

## V4: multi-axis judgment and construct fidelity

V4 adds the next contract layer:

- `creator_construct_id` on frameworks, dimensions, and questions;
- creator-claimed relationships separated from `validated_relationship`;
- explicit `score_direction`;
- separate mechanism, evidence-confidence, impact, and response-capability axes;
- separate question task types for identification, impact, response capability, discrimination, and re-test;
- alternative explanations and disconfirming evidence on every question;
- exact receipt validation that rejects aliases such as Claude V3's `name` where `text` is required.

V4 also expands article-directory discovery. On Corey’s homepage it now retrieves `/the-action-gap/` instead of allowing `/articles/` to consume one of the top framework-page slots. The discovery pass is bounded to five candidate pages and records the directory expansion policy.

The V4 live receipt is `data/coreywilkspsyd.com/2026-10-13/v4-2026-10-13T004228Z.json`:

- Claude Haiku 5.5 generated a valid two-stage result with 8 frameworks, 11 claimed relationships, 8 dimensions, and 10 questions.
- Its score axes are mechanism=`categorical`, evidence confidence=`confidence`, impact=`severity`, and response capability=`capability`.
- GPT-5.6 Luna and DeepSeek V4 Flash returned no usable text within bounded requests; both failures remain in the receipt.

The synthetic ambiguity fixture is `data/corey/2026-10-13/ambiguous-respondents-v1.json`. It includes Four Horsemen cases plus a legal-approval case that must remain an external-constraint candidate rather than being forced into a psychological explanation.

## Boundaries

Each page is bounded to the first 1.5 MB of its response and first 12,000 normalized text characters. Discovery stays same-host and is capped at five candidates. No authentication or private pages are used. The models see the same discovered source payload and prompt contract.

Model output is a reviewable hypothesis. It is not a diagnosis, stable trait score, causal finding, endorsement, or validated assessment. Missing evidence must remain missing.

Do not add private respondent answers, credentials, raw environment files, or unreviewed crawls to this repository.

## Run a new live benchmark

Set `OPENROUTER_API_KEY` in the process environment without committing it. The runner does not read or print credential files.

```text
OPENROUTER_API_KEY=[REDACTED] node scripts/run_corey_benchmark.mjs
```

The runner uses these exact model IDs by default:

- `deepseek/deepseek-v4-flash-0731`
- `openai/gpt-5.6-luna`
- `anthropic/claude-haiku-5.5`

It performs one sequential call per model, preserves failed attempts, and writes a timestamped JSON receipt under `data/corey/`.

## Tests

```text
python3 -m pytest -q
node --check src/site-prompt.js
node --check src/openrouter.js
node --check scripts/run_corey_benchmark.mjs
```

The tests validate the artifact contract. They do not rank model quality. A model-quality claim requires a declared rubric, independent adjudication, and more than one site or task family.

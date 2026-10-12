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

All three models returned valid structured drafts after the provider adapter was adjusted for model-specific reasoning behavior and tolerant JSON extraction.

- DeepSeek V4 Flash 0731: 8 dimensions, 8 questions, reported cost $0.0007858.
- GPT-5.6 Luna: 7 dimensions, 8 questions, reported cost $0.0033245.
- Claude Haiku 5.5: 8 dimensions, 8 questions, reported cost $0.0030296.
- Total reported cost: $0.0071399.

The model outputs are in `data/corey/2026-10-12/models.json`. Provider response IDs and usage receipts are preserved. API keys are not.

## Boundaries

The site capture is bounded to one public URL, the first 1.5 MB of the response, and the first 12,000 normalized text characters. No authentication or private pages are used. The models see the same normalized source payload and prompt contract.

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

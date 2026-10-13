# Corey starter experience

This directory is the handoff boundary between the protected evaluator and a creator-owned experience.

The judgment model and protocol are versioned separately from the presentation:

- `eval/index.json` records the judgment-model, protocol, and experience versions.
- `eval/protocol.js` is the protected protocol adapter.
- `eval/golden-cases.json` is a synthetic regression fixture. It is not Corey adjudication or respondent data.
- `app/` is the presentation surface Corey can reshape.

Start the local surface:

```text
python3 -m http.server 8765 --directory experience
```

Then open `http://127.0.0.1:8765/app/`.

Validate a revision from the repository root:

```text
npm run validate:experience -- --experience-dir experience
```

A passing validation writes a receipt under `data/corey/2026-10-13/`. The receipt keeps `judgment_model_version`, `protocol_version`, and `experience_version` separate. Cosmetic changes should pass without creator review; changes to the protocol or measurement-sensitive inputs must stop for review.

This is a starter workspace, not a production deployment. Its cases are synthetic and its results do not establish that the evaluator matches Corey.

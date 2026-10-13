import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).parents[1]


def load_json(relative):
    return json.loads((ROOT / relative).read_text())


def test_architecture_manifest_locks_semantics_and_frees_presentation():
    manifest = load_json('data/corey/2026-10-13/eval-architecture-v1.json')
    assert manifest['architecture_version'] == 'eval-architecture.v1'
    assert [layer['id'] for layer in manifest['layers']] == [
        'judgment_model', 'eval_protocol', 'experience'
    ]
    assert 'scoring' in manifest['layers'][0]['protected_capabilities']
    assert 'app/theme/**' in manifest['layers'][2]['presentation_safe_paths']
    assert 'eval/items.json' in manifest['layers'][0]['measurement_sensitive_paths']


def test_protocol_validator_accepts_v5_report_and_rejects_missing_boundary():
    report = load_json('data/corey/2026-10-13/judgment-reports-v1.json')['reports'][0]
    result = validate_protocol_result(report)
    assert result == []
    broken = dict(report)
    broken.pop('claim_boundary')
    assert 'claim_boundary' in validate_protocol_result(broken)


def test_experience_change_classifier_distinguishes_style_from_measurement():
    assert classify_experience_change(['app/theme/colors.css'])['risk'] == 'presentation_safe'
    sensitive = classify_experience_change([], changed_fields=['question_wording'])
    assert sensitive['risk'] == 'measurement_sensitive'
    assert sensitive['requires_creator_review'] is True


def test_constitutional_checks_preserve_ambiguity_and_external_constraints():
    cases = load_json('data/corey/2026-10-13/judgment-reports-v1.json')['reports']
    constitution = load_json('data/corey/2026-10-13/eval-constitution-v1.json')
    assert validate_constitution(cases, constitution) == []


def test_publish_gate_requires_review_for_measurement_sensitive_change():
    gate = build_publish_gate(
        experience_changes={'changed_fields': ['response_options']},
        protocol_results=[],
        constitution=load_json('data/corey/2026-10-13/eval-constitution-v1.json'),
    )
    assert gate['status'] == 'review_required'
    assert 'measurement_sensitive_change' in gate['reasons']


# The module is intentionally imported after the test contract is declared.
from src.eval_architecture import (  # noqa: E402
    build_publish_gate,
    classify_experience_change,
    validate_constitution,
    validate_protocol_result,
)

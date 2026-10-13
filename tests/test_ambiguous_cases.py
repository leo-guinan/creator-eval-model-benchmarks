import json
from pathlib import Path

ROOT = Path(__file__).parents[1]


def test_ambiguous_fixture_is_explicitly_synthetic_and_preserves_external_constraint():
    fixture = json.loads((ROOT / 'data' / 'corey' / '2026-10-13' / 'ambiguous-respondents-v1.json').read_text())
    assert fixture['status'] == 'synthetic_fixture'
    assert len(fixture['cases']) == 4
    legal = next(case for case in fixture['cases'] if case['id'] == 'D')
    assert legal['expected_candidates'] == ['external_constraint']
    assert legal['requires_more_evidence'] is True


def test_fixture_covers_four_horsemen_without_claiming_certainty():
    fixture = json.loads((ROOT / 'data' / 'corey' / '2026-10-13' / 'ambiguous-respondents-v1.json').read_text())
    candidates = {candidate for case in fixture['cases'] for candidate in case['expected_candidates']}
    assert candidates >= {
        'four_horsemen.fear_of_failure',
        'four_horsemen.fear_of_ridicule',
        'four_horsemen.fear_of_uncertainty',
        'four_horsemen.fear_of_success',
    }
    assert all(case['requires_more_evidence'] for case in fixture['cases'])

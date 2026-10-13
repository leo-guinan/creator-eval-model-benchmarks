import json
from pathlib import Path

ROOT = Path(__file__).parents[1]


def load_receipt():
    return json.loads((ROOT / 'data' / 'corey' / '2026-10-13' / 'v7-rule-learning-receipt-v1.json').read_text())


def test_correction_derives_executable_rules_without_override():
    receipt = load_receipt()
    ids = {rule['rule_id'] for rule in receipt['learned_rules']}
    assert ids == {'uncertainty.requires_decision_context', 'ridicule.requires_social_evaluation'}
    assert all(rule['required_fields'] for rule in receipt['learned_rules'])


def test_uncertainty_correction_changes_existing_case_without_hand_authored_after_override():
    receipt = load_receipt()
    before = next(row for row in receipt['before'] if row['case_id'] == 'B')
    after = next(row for row in receipt['after'] if row['case_id'] == 'B')
    assert before['primary_candidate']['construct_id'] == 'four_horsemen.fear_of_uncertainty'
    assert after['primary_candidate'] is None
    assert 'genuine_information_gap' in after['alternative_explanations_survived']
    assert 'after_overrides' not in receipt


def test_learned_rule_generalizes_to_unseen_case_e():
    receipt = load_receipt()
    fresh = receipt['fresh_case_generalization']
    assert fresh['case_id'] == 'E'
    assert fresh['primary_candidate']['construct_id'] == 'four_horsemen.fear_of_uncertainty'
    assert fresh['primary_candidate']['confidence'] == 'high'


def test_distance_exposes_component_metrics():
    receipt = load_receipt()
    row = receipt['distance_after']['rows'][0]
    assert 'mechanism_agreement' in row
    assert 'alternative_explanation_agreement' in row
    assert 'intervention_agreement' in row
    assert receipt['distance_after']['aggregate_judgment_distance'] <= receipt['distance_before']['aggregate_judgment_distance']

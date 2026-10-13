import json
from pathlib import Path

ROOT = Path(__file__).parents[1]


def load_receipt():
    return json.loads((ROOT / 'data' / 'corey' / '2026-10-13' / 'judge-the-judge-receipt-v1.json').read_text())


def test_judge_the_judge_packet_has_three_calibration_surfaces():
    receipt = load_receipt()
    assert set(receipt['packet']['sections']) == {'distinctions', 'judgments', 'recommendations'}
    assert len(receipt['packet']['sections']['distinctions']) == 4
    assert len(receipt['packet']['sections']['judgments']) == 4
    assert receipt['packet']['counterexample_prompt']


def test_judgment_distance_is_not_accuracy_claim():
    receipt = load_receipt()
    assert 0 <= receipt['distance_before_update']['aggregate_judgment_distance'] <= 1
    assert 'not Corey Accuracy' in receipt['distance_before_update']['claim_boundary']


def test_correction_propagation_is_explicit_and_includes_fresh_case():
    receipt = load_receipt()
    changes = receipt['propagation']['changes']
    assert len(changes) == 2
    assert changes[0]['changed_questions'] == 3
    assert changes[0]['changed_scoring_rules'] == 2
    assert receipt['propagation']['after']['reports'][0]['primary_candidate']['construct_id'] == 'four_horsemen.fear_of_failure'
    assert receipt['fresh_case']['id'] == 'E'
    assert receipt['fresh_case']['expected_calibration_target'] == 'four_horsemen.fear_of_uncertainty'


def test_boundary_adjudication_is_present():
    fixture = json.loads((ROOT / 'data' / 'corey' / '2026-10-13' / 'judge-the-judge-v1.json').read_text())
    case_d = next(case for case in fixture['adjudications'] if case['case_id'] == 'D')
    assert case_d['boundary_classification'] == 'external_constraint'
    assert case_d['same_call'] is True

import json
from pathlib import Path

ROOT = Path(__file__).parents[1]


def load_reports():
    return json.loads((ROOT / 'data' / 'corey' / '2026-10-13' / 'judgment-reports-v1.json').read_text())['reports']


def test_v5_compiler_reports_are_multi_axis():
    for report in load_reports():
        assert set(['primary_candidate', 'candidate_mechanisms', 'confidence', 'impact', 'response_capability', 'alternatives', 'next_discriminating_experiment', 'retest']) <= set(report)
        assert report['claim_boundary'].startswith('This is a deterministic compilation')


def test_v5_preserves_ambiguity_and_alternatives():
    reports = {report['case_id']: report for report in load_reports()}
    assert reports['A']['primary_candidate'] is None
    assert reports['A']['forced_classification'] is True
    assert 'skill_gap' in reports['A']['alternative_explanations_survived']
    assert reports['B']['primary_candidate']['construct_id'] == 'four_horsemen.fear_of_uncertainty'
    assert 'genuine_information_gap' in reports['B']['alternative_explanations_survived']


def test_v5_does_not_force_external_constraint_into_psychological_mechanism():
    report = next(report for report in load_reports() if report['case_id'] == 'D')
    assert report['primary_candidate']['construct_id'] == 'external_constraint'
    assert report['forced_classification'] is False
    assert all(row['construct_id'] != 'four_horsemen.fear_of_failure' or row['support'] < 0.6 for row in report['candidate_mechanisms'])


def test_v5_tracks_impact_and_response_capability_separately():
    reports = {report['case_id']: report for report in load_reports()}
    assert reports['C']['impact'] == 0.74
    assert reports['C']['response_capability'] == 0.31
    assert reports['C']['impact'] != reports['C']['response_capability']

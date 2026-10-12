import json
from pathlib import Path

ROOT = Path(__file__).parents[1]
CASE = ROOT / 'data' / 'corey' / '2026-10-12'


def load_outputs():
    return json.loads((CASE / 'models.json').read_text())


def test_registry_contains_three_exact_models():
    registry = json.loads((ROOT / 'data' / 'registry.json').read_text())
    ids = {model['id'] for model in registry['models']}
    assert ids == {
        'deepseek/deepseek-v4-flash-0731',
        'openai/gpt-5.6-luna',
        'anthropic/claude-haiku-5.5',
    }


def test_all_corey_outputs_pass_contract():
    outputs = load_outputs()
    assert outputs['source']['url'] == 'https://coreywilkspsyd.com/'
    assert len(outputs['models']) == 3
    for result in outputs['models']:
        assert result['status'] == 'generated'
        assert result['response_id']
        draft = result['draft']
        assert draft['title']
        assert draft['assessment_subject'] == 'creator_audience'
        assert draft['question']
        assert 1 <= len(draft['dimensions']) <= 8
        assert 1 <= len(draft['questions']) <= 8
        assert draft['claim_boundary']
        assert isinstance(draft['missing_evidence'], list)
        assert draft['evidence']['host'] == 'coreywilkspsyd.com'
        assert draft['provenance']['prompt_version'] == 'site-eval-draft.v2'
        assert all(question['response_type'] in {'self_report', 'scenario', 'forced_comparison', 'artifact_judgment'} for question in draft['questions'])
        assert draft['provenance']['requested_model'] == result['model']
        assert draft['provenance']['effective_model'] == result['effective_model']


def test_outputs_preserve_evidence_and_do_not_claim_validation():
    for result in load_outputs()['models']:
        draft = result['draft']
        assert draft['evidence']['coverage'].startswith('single public URL')
        assert draft['missing_evidence']
        boundary = draft['claim_boundary'].lower()
        assert 'not' in boundary
        assert ('causal' in boundary or 'diagnos' in boundary or 'quality' in boundary or 'effectiveness' in boundary or 'verified' in boundary)


def test_compiled_baseline_is_kept_separate():
    baseline = json.loads((CASE / 'compiled-baseline.v1.json').read_text())
    outputs = load_outputs()
    assert baseline['slug'] == 'corey-action-gap'
    assert len(baseline['dimensions']) == 5
    assert all(result['model'] != 'compiled-baseline' for result in outputs['models'])

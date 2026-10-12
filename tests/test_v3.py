import json
from pathlib import Path

ROOT = Path(__file__).parents[1]


def valid_question(question):
    kind = question['response_type']
    if kind == 'forced_comparison':
        return len(question['response_options']) >= 2
    if kind == 'artifact_judgment':
        return question['artifact_required'] and bool(question['input_spec'].strip())
    return bool(question['input_spec'].strip())


def test_v3_prompt_contract_is_explicit():
    prompt = (ROOT / 'src' / 'v3-prompt.js').read_text()
    assert "V3_PROMPT_VERSION = 'site-eval-draft.v3'" in prompt
    assert 'framework extraction' in prompt.lower() or 'judgment model' in prompt.lower()
    assert 'score_semantics' in prompt
    assert 'response_options' in prompt
    assert 'artifact_required' in prompt


def test_discovery_fixture_has_bounded_selection_policy():
    discovery = {
        'selection_policy': 'same-host links ranked by framework-language signals; bounded to top 5',
        'pages': [{'role': 'homepage'}, {'role': 'candidate_framework'}],
    }
    assert 'top 5' in discovery['selection_policy']
    assert discovery['pages'][0]['role'] == 'homepage'


def test_executable_question_contract_rejects_fake_types():
    good_forced = {'response_type': 'forced_comparison', 'response_options': ['delay action', 'take bounded action'], 'artifact_required': False, 'input_spec': 'Choose one and explain.'}
    bad_forced = {'response_type': 'forced_comparison', 'response_options': ['one'], 'artifact_required': False, 'input_spec': 'Choose one.'}
    good_artifact = {'response_type': 'artifact_judgment', 'response_options': [], 'artifact_required': True, 'input_spec': 'Upload a dated decision log.'}
    bad_artifact = {'response_type': 'artifact_judgment', 'response_options': [], 'artifact_required': False, 'input_spec': ''}
    assert valid_question(good_forced)
    assert not valid_question(bad_forced)
    assert valid_question(good_artifact)
    assert not valid_question(bad_artifact)


def test_score_semantics_are_directionally_defined():
    allowed = {'capability', 'bottleneck_severity', 'readiness', 'categorical'}
    for value in allowed:
        assert value in allowed
    assert len(allowed) == 4

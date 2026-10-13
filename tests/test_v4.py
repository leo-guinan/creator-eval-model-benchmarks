from pathlib import Path

ROOT = Path(__file__).parents[1]


def test_v4_schema_has_multi_axis_and_construct_relationships():
    prompt = (ROOT / 'src' / 'v4-prompt.js').read_text()
    assert "V4_PROMPT_VERSION = 'site-eval-draft.v4'" in prompt
    for marker in ['creator_construct_id', 'creator_claimed_relationship', 'validated_relationship', 'score_direction', 'task_type', 'alternative_explanations', 'disconfirming_evidence']:
        assert marker in prompt


def test_v4_contract_rejects_v3_name_alias_and_requires_axes():
    contract = (ROOT / 'src' / 'v4-contract.js').read_text()
    assert "REQUIRED_QUESTION_KEYS = ['text'" in contract
    assert 'generated_invalid' in (ROOT / 'src' / 'v4-openrouter.js').read_text()
    assert 'score_direction' in contract


def test_discovery_supports_directory_expansion():
    source = (ROOT / 'src' / 'source-discovery.js').read_text()
    assert 'directory expansion' in source
    assert 'Math.max(limit * 2, 10)' in source


def test_v4_task_types_are_separate():
    prompt = (ROOT / 'src' / 'v4-prompt.js').read_text()
    for task_type in ['identification', 'impact', 'response_capability', 'discrimination', 'retest']:
        assert task_type in prompt

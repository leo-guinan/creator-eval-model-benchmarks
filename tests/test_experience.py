import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).parents[1]


def run_node(script):
    return subprocess.run(['node', script], cwd=ROOT, capture_output=True, text=True, check=True)


def test_golden_runner_executes_protected_eval_through_protocol():
    run_node('scripts/run_golden_cases.mjs')
    receipt = json.loads((ROOT / 'data/corey/2026-10-13/golden-case-receipt-v1.json').read_text())
    assert receipt['judgment_model_version'] == 'corey-action-gap.v1'
    assert receipt['protocol_version'] == 'eval-protocol.v1'
    assert receipt['experience_version'] == 'corey-starter.v1'
    assert receipt['status'] == 'passed'
    assert receipt['case_count'] == 4
    assert receipt['constitutional_regression']['status'] == 'passed'


def test_receipt_keeps_experience_version_separate_from_judgment_model():
    receipt = json.loads((ROOT / 'data/corey/2026-10-13/golden-case-receipt-v1.json').read_text())
    assert receipt['artifact_versions']['judgment_model'] != receipt['artifact_versions']['experience']
    assert receipt['publish_gate']['presentation_change_requires_review'] is False


def test_starter_app_is_presentation_only_surface():
    html = (ROOT / 'experience/app/index.html').read_text()
    app = (ROOT / 'experience/app/app.js').read_text()
    assert 'corey-starter.v1' in html
    assert '/eval/protocol.js' in app
    assert 'getNextItem' in app
    assert 'submitResponse' in app

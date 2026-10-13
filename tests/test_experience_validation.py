import json
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).parents[1]
RECEIPT = ROOT / 'data/corey/2026-10-13/experience-validation-receipt-v1.json'


def run_validator(experience_dir='experience'):
    return subprocess.run(
        ['node', 'scripts/validate_experience.mjs', '--experience-dir', experience_dir],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    )


def test_validate_my_version_emits_separate_experience_receipt():
    run_validator()
    receipt = json.loads(RECEIPT.read_text())
    assert receipt['status'] == 'passed'
    assert receipt['experience_version'] == 'corey-starter.v1'
    assert receipt['judgment_model_version'] == 'corey-action-gap.v1'
    assert receipt['protocol_version'] == 'eval-protocol.v1'
    assert receipt['golden_cases']['case_count'] == 4
    assert receipt['golden_cases']['engine_regression_errors'] == []
    assert receipt['constitutional_regression']['status'] == 'passed'


def test_copied_workspace_validates_without_repository_src_dependency(tmp_path):
    workspace = tmp_path / 'copied-experience'
    shutil.copytree(ROOT / 'experience', workspace)
    completed = subprocess.run(
        ['node', 'scripts/validate_experience.mjs', '--experience-dir', str(workspace), '--output', str(tmp_path / 'copied-receipt.json')],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    assert '"status": "passed"' in completed.stdout
    assert '../../src/' not in (workspace / 'eval' / 'protocol.js').read_text()


def test_validate_my_version_fails_when_presentation_surface_is_missing(tmp_path):
    workspace = tmp_path / 'broken-experience'
    shutil.copytree(ROOT / 'experience', workspace)
    (workspace / 'app' / 'index.html').unlink()
    completed = subprocess.run(
        ['node', 'scripts/validate_experience.mjs', '--experience-dir', str(workspace)],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    assert completed.returncode != 0
    assert 'app/index.html' in completed.stderr

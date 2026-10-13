import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).parents[1]
RECEIPT = ROOT / 'data/corey/2026-10-13/creator-calibration-receipt-v1.json'


def test_synthetic_creator_calibration_receipt_has_reviewable_corrections():
    subprocess.run(['node', 'scripts/compile_creator_calibration.mjs'], cwd=ROOT, check=True)
    receipt = json.loads(RECEIPT.read_text())
    assert receipt['status'] == 'synthetic_fixture'
    assert receipt['calibration_version'] == 'creator-calibration.v1'
    assert receipt['case_count'] == 4
    assert receipt['adjudications'][0]['case_id'] == 'A'
    assert receipt['adjudications'][1]['correction_scope'] == 'judgment_model'
    assert receipt['provenance']['claim_boundary']


def test_creator_surface_contains_calibration_controls_and_local_export():
    html = (ROOT / 'experience/creator/index.html').read_text()
    app = (ROOT / 'experience/creator/app.js').read_text()
    assert 'Judge the Judge' in html
    assert 'exactly_right' in app
    assert 'correction' in app
    assert 'download' in app
    assert 'browser-local' in html

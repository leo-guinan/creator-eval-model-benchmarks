"""Offline checks for the protected judgment / stable protocol / free experience split."""

REQUIRED_PROTOCOL_FIELDS = {
    "case_id",
    "candidate_mechanisms",
    "confidence",
    "impact",
    "response_capability",
    "alternatives",
    "alternative_explanations_survived",
    "supporting_evidence",
    "disconfirming_evidence",
    "next_discriminating_experiment",
    "retest",
    "claim_boundary",
}

SENSITIVE_FIELDS = {
    "question_wording",
    "response_options",
    "item_order",
    "evidence_requested",
    "scenario_text",
    "scoring_mapping",
    "required_artifacts",
    "result_interpretation",
}


def validate_protocol_result(result):
    """Return missing/invalid protocol fields; an empty list means valid."""
    errors = sorted(REQUIRED_PROTOCOL_FIELDS - set(result))
    if result.get("claim_boundary") == "MISSING":
        errors.append("claim_boundary")
    if not isinstance(result.get("candidate_mechanisms"), list):
        errors.append("candidate_mechanisms")
    if not isinstance(result.get("alternatives"), list):
        errors.append("alternatives")
    return sorted(set(errors))


def classify_experience_change(changed_paths, changed_fields=None):
    changed_fields = set(changed_fields or [])
    reasons = []
    if changed_fields & SENSITIVE_FIELDS:
        reasons.append("measurement_sensitive_change")
    for path in changed_paths:
        if path.startswith("eval/") or path.startswith("src/"):
            reasons.append("protected_semantic_path")
        elif not (path.startswith("app/") or path.startswith("experience/")):
            reasons.append("unclassified_path")
    if reasons:
        return {
            "risk": "measurement_sensitive",
            "requires_creator_review": True,
            "reasons": sorted(set(reasons)),
        }
    return {
        "risk": "presentation_safe",
        "requires_creator_review": False,
        "reasons": [],
    }


def validate_constitution(reports, constitution):
    errors = []
    by_id = {row.get("case_id"): row for row in reports}
    for rule in constitution.get("rules", []):
        rule_id = rule["id"]
        if rule_id == "preserve_ambiguity":
            row = by_id.get("A")
            if not row or row.get("primary_candidate") is not None or not row.get("classification_withheld"):
                errors.append(rule_id)
        elif rule_id == "preserve_external_constraints":
            row = by_id.get("D")
            primary = (row or {}).get("primary_candidate") or {}
            if primary.get("construct_id") != "external_constraint":
                errors.append(rule_id)
        elif rule_id == "preserve_alternatives":
            expected = {"A": "skill_gap", "B": "genuine_information_gap"}
            for case_id, alternative in expected.items():
                if alternative not in (by_id.get(case_id) or {}).get("alternative_explanations_survived", []):
                    errors.append(f"{rule_id}:{case_id}")
        elif rule_id == "claim_boundary_required":
            for row in reports:
                if not row.get("claim_boundary") or row["claim_boundary"] == "MISSING":
                    errors.append(f"{rule_id}:{row.get('case_id', 'MISSING')}")
    return errors


def build_publish_gate(experience_changes, protocol_results, constitution):
    change = classify_experience_change(
        experience_changes.get("changed_paths", []),
        experience_changes.get("changed_fields", []),
    )
    reasons = list(change["reasons"])
    for result in protocol_results:
        reasons.extend(validate_protocol_result(result))
    if protocol_results:
        reasons.extend(validate_constitution(protocol_results, constitution))
    if reasons:
        return {"status": "review_required", "reasons": sorted(set(reasons))}
    return {"status": "publishable", "reasons": []}

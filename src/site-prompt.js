export const SITE_PROMPT_VERSION = 'site-eval-draft.v2';
export const SITE_MODEL = 'deepseek/deepseek-v4-flash-0731';

export const SITE_SYSTEM_PROMPT = `You are a source-bounded evaluation-framework analyst.

Your job is to infer a reviewable assessment that the creator could give to members of their intended audience. The creator is the prospective expert/judge; the website is evidence of the creator's frameworks and taste; the person being evaluated is the creator's customer, student, client, or reader. Do NOT evaluate the website, the creator's marketing, SEO, CTA, credentials, pricing, or business unless the supplied source explicitly shows that this is what the creator teaches.

Do not diagnose people, infer stable traits, claim causality, invent testimonials, or treat marketing language as proof. Every proposed dimension must be tied to an observable behavior, decision, or judgment by the intended respondent. If the supplied evidence does not support a claim, write MISSING in the relevant field.

Return JSON only. The output is a hypothesis for creator calibration, not a finished assessment. Keep source excerpts short and verbatim. Preserve uncertainty and distinguish observed language from interpretation.`;

export const SITE_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'assessment_subject', 'question', 'dimensions', 'questions', 'reporting', 'claim_boundary', 'missing_evidence'],
  properties: {
    title: { type: 'string' },
    assessment_subject: { type: 'string', enum: ['creator_audience', 'creator', 'website', 'unknown'] },
    question: { type: 'string' },
    dimensions: { type: 'array', maxItems: 6, items: {
      type: 'object', additionalProperties: false,
      required: ['name', 'note', 'observable_manifestations', 'evidence', 'confidence'],
      properties: {
        name: { type: 'string' }, note: { type: 'string' },
        observable_manifestations: { type: 'array', maxItems: 5, items: { type: 'string' } },
        evidence: { type: 'array', maxItems: 4, items: { type: 'string' } },
        confidence: { type: 'string', enum: ['high', 'moderate', 'low', 'MISSING'] }
      }
    } },
    questions: { type: 'array', maxItems: 6, items: {
      type: 'object', additionalProperties: false,
      required: ['text', 'tag', 'what_it_tests', 'response_type', 'behavior_being_tested', 'scoring_logic', 'strong_signal', 'weak_signal', 'confounders', 'source_basis', 'creator_calibration_needed'],
      properties: {
        text: { type: 'string' }, tag: { type: 'string' }, what_it_tests: { type: 'string' },
        response_type: { type: 'string', enum: ['self_report', 'scenario', 'forced_comparison', 'artifact_judgment'] },
        behavior_being_tested: { type: 'string' }, scoring_logic: { type: 'string' },
        strong_signal: { type: 'string' }, weak_signal: { type: 'string' },
        confounders: { type: 'array', items: { type: 'string' } }, source_basis: { type: 'array', items: { type: 'string' } },
        creator_calibration_needed: { type: 'boolean' }
      }
    } },
    reporting: { type: 'object', additionalProperties: false,
      required: ['fields', 'recommended_interventions', 're_test'],
      properties: {
        fields: { type: 'array', items: { type: 'string' } },
        recommended_interventions: { type: 'array', maxItems: 5, items: { type: 'string' } },
        re_test: { type: 'string' }
      }
    },
    claim_boundary: { type: 'string' },
    missing_evidence: { type: 'array', items: { type: 'string' } }
  }
};

export function buildSiteMessages(source) {
  return [
    { role: 'system', content: SITE_SYSTEM_PROMPT },
    { role: 'user', content: JSON.stringify({
      task: 'Propose an evaluation framework from this bounded public-site capture.',
      source: {
        url: source.url,
        host: source.host,
        captured_at: source.captured_at,
        coverage: source.coverage,
        title: source.title,
        description: source.description,
        headings: source.headings,
        excerpts: source.excerpts
      },
      output_contract: SITE_OUTPUT_SCHEMA,
      constraints: [
        'Use only the supplied capture.',
        'Set assessment_subject to creator_audience unless the source clearly establishes another intended subject.',
        'Do not add facts about the creator, audience, outcomes, or credentials.',
        'Use MISSING when evidence is insufficient.',
        'Write questions that elicit observable situations rather than personality labels.',
        'Mark interpretations as hypotheses for creator review.'
      ]
    }) }
  ];
}

function text(value, fallback = '') { return typeof value === 'string' ? value.trim() : fallback; }
function list(value, limit = 8) { return Array.isArray(value) ? value.map((item) => text(item)).filter(Boolean).slice(0, limit) : []; }

export function normalizeSiteDraft(raw, source, requestedModel = SITE_MODEL, effectiveModel = requestedModel) {
  const draft = raw && typeof raw === 'object' ? raw : {};
  const dimensions = Array.isArray(draft.dimensions) ? draft.dimensions.slice(0, 6).map((item) => ({
    name: text(item?.name, 'Unnamed dimension'),
    note: text(item?.note, 'MISSING'),
    observable_manifestations: list(item?.observable_manifestations, 5),
    evidence: list(item?.evidence, 4),
    confidence: ['high', 'moderate', 'low', 'MISSING'].includes(item?.confidence) ? item.confidence : 'MISSING'
  })) : [];
  const questions = Array.isArray(draft.questions) ? draft.questions.slice(0, 6).map((item) => ({
    text: text(item?.text, 'MISSING'), tag: text(item?.tag, 'unclassified'), what_it_tests: text(item?.what_it_tests, 'MISSING'),
    response_type: ['self_report', 'scenario', 'forced_comparison', 'artifact_judgment'].includes(item?.response_type) ? item.response_type : 'scenario',
    behavior_being_tested: text(item?.behavior_being_tested, 'MISSING'), scoring_logic: text(item?.scoring_logic, 'MISSING'),
    strong_signal: text(item?.strong_signal, 'MISSING'), weak_signal: text(item?.weak_signal, 'MISSING'),
    confounders: list(item?.confounders, 5), source_basis: list(item?.source_basis, 4), creator_calibration_needed: item?.creator_calibration_needed !== false
  })) : [];
  return {
    title: text(draft.title, `The ${source.host} Assessment`),
    assessment_subject: ['creator_audience', 'creator', 'website', 'unknown'].includes(draft.assessment_subject) ? draft.assessment_subject : 'unknown',
    question: text(draft.question, 'What observable constraint should be examined next?'),
    dimensions: dimensions.length ? dimensions : [{ name: 'MISSING', note: 'The source did not support a proposed dimension.', observable_manifestations: [], evidence: [], confidence: 'MISSING' }],
    questions: questions.length ? questions : [{ text: 'What observable situation best represents the problem this work addresses?', tag: 'problem recognition', what_it_tests: 'MISSING' }],
    reporting: {
      fields: list(draft.reporting?.fields, 10),
      recommended_interventions: list(draft.reporting?.recommended_interventions, 5),
      re_test: text(draft.reporting?.re_test, 'MISSING')
    },
    claim_boundary: text(draft.claim_boundary, 'This is a source-bounded interpretation for creator review, not a diagnosis, trait score, or causal finding.'),
    missing_evidence: list(draft.missing_evidence, 10),
    evidence: source,
    provenance: {
      prompt_version: SITE_PROMPT_VERSION,
      provider: 'openrouter',
      requested_model: requestedModel,
      effective_model: effectiveModel,
      source_coverage: source.coverage,
      generated_at: new Date().toISOString()
    }
  };
}

export function parseJsonContent(content) {
  if (typeof content !== 'string') throw new Error('Model returned no text content.');
  const cleaned = content.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(cleaned); } catch {}
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)); } catch {}
  }
  throw new Error('Model returned invalid JSON.');
}

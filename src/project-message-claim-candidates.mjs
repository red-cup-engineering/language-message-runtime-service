/**
 * Source-spanned, explicitly NON-authoritative projection from the original
 * communicating parser. A candidate speech act is not a factual admission;
 * a candidate claim is not a requirement, proof, instruction or office decision.
 *
 * No new sentence tokenizer or graph registry is introduced: sentence
 * boundaries and discourse evidence come from the existing parse forest.
 */
const REQUEST = /^(?:(?:please\s+)?(?:improve|build|make|implement|create|add|remove|change|update|fix|ensure|establish|investigate|research|design|parse|derive|check|review|test|use|start|stop|show|help|give|tell|send|find|write|draft|record|route|connect|support|enable|protect|preserve|provide|develop|replace|rename|formalize|measure)\b|(?:i|we)\s+(?:need|want|ask|require|would\s+like)\b|(?:can|could|would|will)\s+you\b|(?:don't|do\s+not)\b)/iu;
const PROPOSAL = /^(?:perhaps\b|maybe\b|(?:i|we)\s+(?:suggest|propose|recommend|might|could)\b)/iu;
const COMMITMENT = /^(?:i|we)\s+(?:promise|commit|undertake)\b/iu;
const DECLARATION = /^(?:i|we)\s+(?:hereby\s+)?(?:declare|adopt|authorize|decide|enact)\b/iu;
const QUESTION_OPEN = /^(?:who|what|when|where|why|how|which|whether|is|are|was|were|do|does|did|can|could|should|would|will)\b/iu;
const DECLARATIVE_BASIS = new Set(["assertion", "denial"]);

function forceOf(quoted, basis) {
  const s = quoted.trim().replace(/^[\s"'“‘]+/u, "");
  // Requests may be phrased as questions ("Could you ...?").
  if (REQUEST.test(s)) return "request";
  if (PROPOSAL.test(s)) return "proposal";
  if (COMMITMENT.test(s)) return "commissive";
  if (DECLARATION.test(s)) return "possible-declaration";
  if (/[?？]\s*["'”’]*$/u.test(s) || QUESTION_OPEN.test(s)) return "question";
  return DECLARATIVE_BASIS.has(basis) ? "assertive-candidate" : "undetermined";
}

const nonempty = value => typeof value === "string" && value.length > 0;

/**
 * @param {object} input
 * @param {object} input.source - Original parseLeaderMessage(...).source.
 * @param {object} input.forest - Original communicating.parse-forest.
 * @param {object} input.discourse - Original communicating.discourse-state.
 */
export function projectMessageClaimCandidates({ source, forest, discourse } = {}) {
  if (!source || !nonempty(source.token) || typeof source.text !== "string" || source.length !== source.text.length) {
    throw new TypeError("an unchanged source text, UTF-16 length and source identity are required");
  }
  if (forest?.kind !== "communicating.parse-forest" || forest.text !== source.text || !Array.isArray(forest.readings)) {
    throw new TypeError("a parse forest of these exact source bytes is required");
  }
  if (discourse?.kind !== "communicating.discourse-state" || discourse.text !== source.text || !Array.isArray(discourse.commitments)) {
    throw new TypeError("a discourse state of these exact source bytes is required");
  }

  const byReading = new Map();
  for (const commitment of discourse.commitments) {
    if (!nonempty(commitment?.readingId)) continue;
    const prior = byReading.get(commitment.readingId) ?? [];
    prior.push(commitment);
    byReading.set(commitment.readingId, prior);
  }

  const acts = [], claims = [], repairs = [];
  for (const reading of forest.readings) {
    const { start, end, text } = reading?.span ?? {};
    const anchored = nonempty(reading?.id) && Number.isInteger(start) && Number.isInteger(end) &&
      start >= 0 && end > start && end <= source.length && source.text.slice(start, end) === text;
    if (!anchored) {
      repairs.push(Object.freeze({ readingId: reading?.id ?? null, kind: "unanchored-source-span", note: "no exact source substring and offset range" }));
      continue;
    }
    const commitments = byReading.get(reading.id) ?? [];
    const basis = commitments.length === 1 ? commitments[0].basis : null;
    if (commitments.length !== 1) {
      repairs.push(Object.freeze({ readingId: reading.id, kind: "nonunique-discourse-commitment", count: commitments.length }));
    }
    const forceCandidate = forceOf(text, basis);
    const sourceSpan = Object.freeze({ token: source.token, readingId: reading.id, start, end, exact: text, offsets: "utf16-code-units" });
    const linguisticObstructions = Object.freeze([
      ...(Array.isArray(reading.obstructions) ? reading.obstructions : []),
      ...(Array.isArray(discourse.repairs) ? discourse.repairs.filter(item => item.readingId === reading.id) : []),
    ]);
    const act = Object.freeze({
      sourceSpan,
      forceCandidate,
      forceMethod: "surface-cues-plus-communicating-discourse/v1",
      discourseBasis: basis,
      linguisticCharge: reading.charge ?? null,
      parserComplete: reading.complete === true,
      linguisticObstructions,
      authority: "not-assessed",
    });
    acts.push(act);

    // Discourse currently models some questions and imperatives as assertions;
    // never convert those syntactic commitments into a claim candidate.
    if (forceCandidate === "assertive-candidate" && DECLARATIVE_BASIS.has(basis)) {
      claims.push(Object.freeze({
        kind: "561.message-claim-candidate/v1",
        sourceSpan,
        propositionExact: text,
        polarityCandidate: basis === "denial" ? "denial" : "affirmation",
        linguisticCharge: reading.charge ?? null,
        parserComplete: reading.complete === true,
        linguisticObstructions,
        evidentialStanding: "source-utterance-only",
        // No source authority, standards adoption or normative inference here.
        requirement: null,
      }));
    }
  }
  return Object.freeze({
    kind: "561.message-claim-candidate-projection/v1",
    source: Object.freeze({ token: source.token, length: source.length, offsets: "utf16-code-units" }),
    acts: Object.freeze(acts),
    claims: Object.freeze(claims),
    repairs: Object.freeze(repairs),
    downstream: Object.freeze({
      next: "qualify-evidence-and-normative-bridge-in-original-requirements-management",
      createsRequirements: false,
      verifiesTruth: false,
      verifiesAuthority: false,
    }),
  });
}

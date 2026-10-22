import assert from "node:assert/strict";
import test from "node:test";
import { projectMessageClaimCandidates } from "../src/project-message-claim-candidates.mjs";

function fixture(text, spans, bases = [], options = {}) {
  let from = 0;
  const readings = spans.map((s, i) => {
    const start = text.indexOf(s, from);
    assert.notEqual(start, -1, "fixture span must exist");
    from = start + s.length;
    return { id: "reading:" + i, span: { start, end: from, text: s }, complete: options.incompleteAt !== i,
      charge: "potential", obstructions: options.obstructAt === i ? [{kind:"void",label:"grammar",value:"absurd"}]:[] };
  });
  return {
    source: { token: "ni:///sha-256;test-source", text, length: text.length },
    forest: { kind: "communicating.parse-forest", text, readings },
    discourse: { kind: "communicating.discourse-state", text,
      commitments: readings.map((r, i) => ({ readingId:r.id, basis:bases[i] ?? "assertion" })),
      repairs: [],
    },
  };
}

test("claims retain exact source spans but never requirement authority", () => {
  const t="MetroPlat has a message inbox. The standard requires an audit log.";
  const p=projectMessageClaimCandidates(fixture(t,["MetroPlat has a message inbox.","The standard requires an audit log."]));
  assert.equal(p.claims.length,2);
  for (const c of p.claims) {
    assert.equal(t.slice(c.sourceSpan.start,c.sourceSpan.end),c.propositionExact);
    assert.equal(c.evidentialStanding,"source-utterance-only");
    assert.equal(c.requirement,null);
  }
  assert.equal(p.downstream.createsRequirements,false);
  assert.equal(p.downstream.verifiesTruth,false);
});

test("directive is not a factual claim despite discourse calling it an assertion", () => {
  const t="Improve our ability to get messages parsed for claims to derive requirements.";
  const p=projectMessageClaimCandidates(fixture(t,[t]));
  assert.equal(p.acts[0].forceCandidate,"request");
  assert.equal(p.claims.length,0);
});

test("question phrased as request cannot become a truth claim", () => {
  const t="Could you improve message parsing?";
  const p=projectMessageClaimCandidates(fixture(t,[t]));
  assert.equal(p.acts[0].forceCandidate,"request");
  assert.equal(p.claims.length,0);
});

test("questions, suggestions, promises and purported declarations are not truth claims", () => {
  const texts=["What does the standard require?","I propose a new parsing rule.",
    "We promise to finish it.", "I hereby declare it adopted."];
  const p=projectMessageClaimCandidates(fixture(texts.join(" "),texts));
  assert.deepEqual(p.acts.map(a=>a.forceCandidate),["question","proposal","commissive","possible-declaration"]);
  assert.equal(p.claims.length,0);
  assert.ok(p.acts.every(a=>a.authority==="not-assessed"));
});

test("negative assertion retains polarity but remains merely a claim candidate", () => {
  const t="The proposed rule is not applicable here.";
  const p=projectMessageClaimCandidates(fixture(t,[t],["denial"]));
  assert.equal(p.claims.length,1);
  assert.equal(p.claims[0].polarityCandidate,"denial");
  assert.equal(p.claims[0].requirement,null);
});

test("a challenged parse retains its obstructions", () => {
  const t="The standard applies here.";
  const p=projectMessageClaimCandidates(fixture(t,[t],[],{incompleteAt:0,obstructAt:0}));
  assert.equal(p.claims[0].parserComplete,false);
  assert.equal(p.claims[0].linguisticObstructions.length,1);
});

test("drifted source span emits repair rather than substituting source", () => {
  const t="An exact sentence.";
  const input=fixture(t,[t]);
  input.forest.readings[0].span.end--;
  const p=projectMessageClaimCandidates(input);
  assert.equal(p.claims.length,0);
  assert.equal(p.acts.length,0);
  assert.equal(p.repairs[0].kind,"unanchored-source-span");
});

test("nonunique discourse commitment cannot produce claim", () => {
  const t="Our system has a claim reader.";
  const input=fixture(t,[t]);
  input.discourse.commitments.push({...input.discourse.commitments[0]});
  const p=projectMessageClaimCandidates(input);
  assert.equal(p.claims.length,0);
  assert.equal(p.repairs[0].kind,"nonunique-discourse-commitment");
});

test("cross-message reuse and changed text length refuse", () => {
  const input=fixture("First source.",["First source."]);
  input.forest.text="Other source.";
  assert.throws(()=>projectMessageClaimCandidates(input),/these exact source bytes/);
  input.forest.text=input.source.text;
  input.source.length++;
  assert.throws(()=>projectMessageClaimCandidates(input),/unchanged source text/);
});

test("UTF-16 offsets survive surrogate pairs", () => {
  const first="A 🦐 observes things.";
  const second="This is a claim.";
  const t=first + " " + second;
  const p=projectMessageClaimCandidates(fixture(t,[first,second]));
  assert.equal(p.claims[1].sourceSpan.start, first.length + 1);
  assert.equal(t.slice(p.claims[1].sourceSpan.start,p.claims[1].sourceSpan.end),second);
});

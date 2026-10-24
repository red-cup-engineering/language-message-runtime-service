import assert from "node:assert/strict";
import test from "node:test";
import { parseLeaderMessage } from "../src/parse-leader-message.js";

test("actual English parser projects the Leader's request without converting it to a claim", () => {
  const words="Improve our ability to get messages parsed for claims to derive requirements.";
  const result=parseLeaderMessage(words);
  assert.equal(result.source.text,words);
  assert.equal(result.claimCandidates.kind,"561.message-claim-candidate-projection/v1");
  assert.equal(result.claimCandidates.acts.length,result.forest.readings.length);
  assert.equal(result.claimCandidates.acts[0].forceCandidate,"request");
  assert.equal(result.claimCandidates.claims.length,0);
  assert.equal(result.claimCandidates.downstream.createsRequirements,false);
});

test("actual parser must preserve any emitted claims as exact source substrings", () => {
  const words="The standard requires an audit log. What does it require?";
  const result=parseLeaderMessage(words);
  for (const candidate of result.claimCandidates.claims) {
    const s=candidate.sourceSpan;
    assert.equal(words.slice(s.start,s.end),candidate.propositionExact);
    assert.equal(s.token,result.source.token);
    assert.equal(candidate.requirement,null);
  }
  assert.ok(result.claimCandidates.acts.every(act=>act.authority==="not-assessed"));
});

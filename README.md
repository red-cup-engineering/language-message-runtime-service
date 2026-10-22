# language-message-runtime-service

<!-- 561-group-standards:badges:start -->
[![Red Cup Engineering](https://img.shields.io/badge/561%20Group-Red%20Cup%20Engineering-c0392b)](https://github.com/red-cup-engineering)
[![License: MIT](https://img.shields.io/badge/license-MIT-c0392b)](LICENSE)
[![Indigenous data: CARE](https://img.shields.io/badge/Indigenous%20data-CARE-4b6f44)](https://github.com/red-cup-engineering/.github/blob/main/GOVERNANCE.md)
[![Tips welcome](https://img.shields.io/badge/tips-welcome-d4a017)](https://github.com/561-group/.github/blob/main/TIPS.md)
<!-- 561-group-standards:badges:end -->

Runtime for parsing and projecting candidate language-message readings.

## Candidate claims from received messages

`parseLeaderMessage(text)` retains the unchanged source and the original
communicating parse forest and discourse reading. Its additive
`claimCandidates` projection now carries:

- `acts`: one *candidate* speech act for each source-anchored parser reading
  (request, question, proposal, possible declaration, commissive, possible
  assertion, or undetermined), together with the parser charge and repairs.
- `claims`: exact quoted source spans only for possible assertions or
  denials. Each has its original UTF-16 start/end range and the message's
  source identity. A statement *about* a standard is not an adoption.
- `repairs`: readings whose offsets do not match the unchanged source, or
  whose discourse commitment is missing or duplicated; these cannot become
  claim candidates by substitution.

This projection reads the **existing forest's sentence boundaries**, not an
independent sentence splitter. It does not assert that a statement is true,
interpret the speaker's authority, fabricate a Requirement, create Work, or
write a second claim database. Surface cues are intentionally narrow and
fallible; downstream receivers must qualify what they admit. For example,
the current general discourse parser can label `Improve message parsing.`
as an assertion; this projection retains it as a **request**, not a factual
claim.

Requirement derivation belongs to the original Requirements Management and
Coesite machinery. The receiving consumer must pin the source speaker and
message, qualify evidence and opposition, identify an actual adopted norm or
competent decision as the normative bridge, then author and independently
receive applicable conditions under the current canonical schema. Merely
passing this candidate parse does not do those steps.

Run `npm test` for the deterministic source-span and refusal controls. These
unit tests exercise the pure projector without treating a fixture as a live
provider, installation, schema admission or independent requirement receipt.

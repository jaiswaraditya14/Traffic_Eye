# Editorial Audit — TrafficEye

## Major issues in the supplied manuscript

The original manuscript repeated the same integration claim across the introduction, literature review, architecture, implementation, and discussion. It mixed implemented workflow features with a planned 50–100-item evaluation, leaving readers at risk of interpreting planned accuracy measures as results. The conclusion and future scope contained citations despite the requested citation-free ending. Two figure positions contained editing-placeholder text, and the review-screen caption treated an example “98% confidence” display as if it were a validated performance result. The keyword line was over-specific and inconsistently separated.

## Citation and reference audit

All 16 supplied references have been retained and cited in the revised main text; no new reference was invented. Numbering now follows first substantive use. Claims about existing reporting applications are limited to features supported by their official descriptions; the paper no longer infers that undocumented features are absent. The smartphone danger-section study is described as smartphone-based sensing and warnings, not simply as manual incident reporting. The VLM documentation establishes image-input capability, not TrafficEye accuracy. Citation checks find zero numbered citations in the abstract, conclusion, and future work. Bibliographic metadata and DOI links were checked against publisher, conference, institutional, or official product pages where available. A journal's copy-editing team should still perform its standard final link and metadata check.

## Whole-paper similarity and writing-style assessment

This is a qualitative editorial audit, **not** a Turnitin, iThenticate, or AI-detector report. No similarity percentage, originality certificate, or claim of human-only authorship is provided. I reviewed the abstract, introduction, problem statement, related work, methodology, architecture, implementation, outcome/discussion, conclusion, future work, captions, and references for formulaic or source-close wording.

| Area | Before: qualitative risk | Revision and remaining risk |
| --- | --- | --- |
| Abstract and introduction | Medium: repeated generic claims about coverage and integration | Recast around the concrete reporting and review tasks; low-to-medium residual risk from standard technical terms. |
| Related work | Medium: long source-by-source descriptions and repeated gap statements | Synthesized by reporting, task-specific vision, and governance; citations remain next to borrowed ideas. Check paraphrases against full texts in a licensed similarity service. |
| Problem statement | Medium: brief project-style summary that did not isolate the engineering problem | Rewritten as three linked constraints and an explicit integration gap; low residual wording risk. |
| Methodology, architecture, implementation | Medium: repeated workflow descriptions and template-like transitions | Separated capture, storage, inference, review, and planned testing; low-to-medium residual risk because component terminology is necessarily standard. |
| Results and captions | High: unmeasured benefit language and the “98% confidence” figure claim | Reframed as prototype outcome, removed the score claim, and labelled diagrams conceptual; low residual wording risk, though empirical validation is still required. |
| Conclusion and future work | Medium: repeated abstract-style claims and citations | Condensed, separated completed work from proposals, removed all citations; low residual wording risk. |
| References | Bibliographic overlap is expected and appropriate | References were normalized, not paraphrased to evade matching. |

The revision avoids stock phrases, repetitive transitions, and unsupported superlatives. It retains precise terminology and grammatical prose; it does not add errors to imitate a human writer. Any external similarity checker may still flag reference entries, method names, or common field terminology. The author should run the final DOCX through an institutional Turnitin/iThenticate account before submission and inspect matched passages manually.

## Format, figures, and technical consistency

The paper uses Springer Nature's official proceedings Word template styles and exports to **7 A4 pages**. Figures 1–2 are conceptual diagrams reconstructed from the described workflow; Figures 3–4 use screenshots embedded in the supplied Markdown. Captions no longer claim unmeasured confidence or accuracy. The text consistently treats vehicle, violation, plate, and severity outputs as *candidate* fields, keeps officer verification mandatory, and presents the 50–100-item protocol as planned rather than completed. Editable EXIF metadata, network dependence, missing anonymization, and absent load/performance testing remain explicit limitations.

## Final publication checklist

- ✓ Citations corrected and all 16 references used.
- ✓ Abstract, conclusion, and future work contain zero citations.
- ✓ Problem statement professionally rewritten in three linked points.
- ✓ Whole-paper qualitative similarity and AI-style review completed; no fabricated detector score.
- ✓ Seven broad, searchable keywords used.
- ✓ Figures and captions checked; editing placeholders and unsupported confidence claim removed.
- ✓ Technical claims compared with the supplied paper; no experiments or accuracy values invented.
- ✓ Springer-template PDF is 7 pages, below the 8-page limit.
- ◻ Author action: confirm names, affiliations, screenshots, consent/privacy arrangements, and final references; obtain an institutional similarity report before submission.

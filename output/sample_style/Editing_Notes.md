# TrafficEye redesign notes

The revised paper combines the original TrafficEye manuscript with the updated content in `E:\Research_paper\TrafficEye_Publication_Ready_Final.docx`. `E:\sample paper.pdf` supplied the layout reference. The sample's nine-page count supersedes the earlier eight-page maximum for this version.

The new DOCX and PDF have nine A4 pages, Times New Roman text, a centred title/author block, numbered sections and subsections, square-bracket citations, and captions below the reserved figure areas. All 16 supplied references are cited in the body. Abstract, conclusion, and future work contain zero citations. The five-author entry for reference 16 now includes Chang and uses the confirmed journal title, [AI & Society](https://link.springer.com/article/10.1007/s00146-025-02350-6).

## Insert your figures

No image was modified, copied into, or embedded in this version. The blank areas are borderless Word table cells; enable **Table Layout → View Gridlines** to locate them, then insert each image inside its cell. Keep the image within the reserved dimensions to preserve the nine-page layout.

| Figure | Page | Reserved area | Caption subject |
| --- | --- | --- | --- |
| 1 | 4 | About 13.7 cm wide × 9 cm high | TrafficEye system architecture |
| 2 | 5 | About 13.7 cm wide × 5 cm high | VLM inference pipeline |
| 3 | 7 | About 6.8 cm wide × 8 cm high | Officer pending-review queue |
| 4 | 7 | About 6.8 cm wide × 8 cm high | AI-assisted review screen |

## Content and citation corrections

The updated affiliation and React Native/Expo, Supabase/PostgreSQL, and hosted multimodal inference descriptions were incorporated. Accuracy, precision, recall, macro-F1, plate exact match, character error rate, and weighted severity agreement remain planned measures. No completed performance test or numerical accuracy was invented.

Unsupported claims that municipal applications are entirely manual, that officer review guarantees legal defensibility, or that a displayed 98% score establishes reliable recognition were removed or narrowed. The precise 1920 × 1080 / 0.82 compression settings and private signed-URL storage claim in the supplied DOCX were not carried forward: the available implementation shows different preprocessing and public-URL construction. The manuscript now describes those components conservatively and avoids certifying deployment security.

## Before and after similarity-risk review

The supplied DOCX contains repeated stock phrases, strong claims such as “severe administrative bottleneck,” “frictionless” capture and guaranteed due process, and categorical statements about other reporting systems. Those passages presented medium-to-high editorial risk because wording and evidence were not closely aligned. The revision uses specific workflow descriptions, cited literature summaries, explicit implementation limits, and prospective evaluation wording. Residual similarity risk mainly concerns conventional terminology, literature paraphrases, and bibliography entries.

This is a qualitative editorial review, not a Turnitin/iThenticate or AI-detector result. No database similarity percentage or human-authorship certification is claimed. The earlier audit remains available for comparison, but its seven-page checklist describes the earlier version, not this nine-page redesign.

The final PDF was rendered in Microsoft Word, checked for nine pages, and visually inspected. Automated checks confirm 16 cited references, four figure captions, zero embedded images, and zero citations in the three citation-free sections.

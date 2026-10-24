from pathlib import Path
import re
import json
import pdfplumber
from docx import Document
from PIL import Image, ImageOps, ImageDraw

ROOT = Path(r'D:\Traffic_Eye\output\sample_style')
source = Path(r'D:\Traffic_Eye\output\source\TrafficEye_Sample_Style.md').read_text(encoding='utf-8')
body, refs = source.split('## References', 1)
cited = set()
for bracket in re.findall(r'\[([\d, –-]+)\]', body):
    for part in bracket.split(','):
        endpoints = re.split('[–-]', part.strip())
        cited.update(range(int(endpoints[0]), int(endpoints[-1]) + 1))
reference_ids = set(map(int, re.findall(r'^(\d+)\.', refs, re.M)))
assert cited == reference_ids == set(range(1, 17))
for section in ('Abstract', '9 Conclusion', '10 Future Work'):
    prose = source.split('## ' + section, 1)[1].split('\n## ', 1)[0]
    assert not re.search(r'\[[\d, –-]+\]', prose)
doc = Document(ROOT / 'TrafficEye_Sample_Style.docx')
assert len(doc.inline_shapes) == 0
assert not any('/image' in rel.reltype for rel in doc.part.rels.values())
with pdfplumber.open(ROOT / 'TrafficEye_Sample_Style.pdf') as pdf:
    assert len(pdf.pages) == 9
    assert all(len(p.images) == 0 for p in pdf.pages)
    text = '\n'.join(p.extract_text() or '' for p in pdf.pages)
    assert all('Fig. ' + str(n) + '.' in text for n in range(1, 5))
    assert 'Editable Word' not in text and '98%' not in text
    report = {
        'pages': len(pdf.pages), 'references': len(reference_ids),
        'cited_references': len(cited), 'embedded_images': 0,
        'figure_captions': 4, 'abstract_conclusion_future_work_citations': 0,
        'page_word_counts': [len((p.extract_text() or '').split()) for p in pdf.pages],
        'text_bottoms_pt': [round(max(c['bottom'] for c in p.chars), 1) for p in pdf.pages],
    }
    print(json.dumps(report, indent=2))
pngs = sorted((ROOT / 'render').glob('page-*.png'))
if pngs:
    sheet = Image.new('RGB', (1200, 1740), '#cccccc')
    draw = ImageDraw.Draw(sheet)
    for idx, path in enumerate(pngs):
        im = Image.open(path).convert('RGB')
        im.thumbnail((385, 545))
        x, y = (idx % 3) * 400 + 7, (idx // 3) * 580 + 20
        sheet.paste(im, (x, y))
        draw.text((x, y - 17), 'Page ' + str(idx + 1), fill='black')
    sheet.save(ROOT / 'render' / 'contact-sheet.png')

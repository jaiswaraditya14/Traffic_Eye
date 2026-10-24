from pathlib import Path
from difflib import SequenceMatcher
import io
import re

import pdfplumber
from PIL import Image
from pypdf import PdfReader, PdfWriter
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

ROOT = Path(r"D:\Traffic_Eye")
ORIGINAL = ROOT / "tmp" / "pdfs" / "TrafficEye_original.pdf"
PAGE3 = ROOT / "tmp" / "pdfs" / "paper-3.png"
PAGE7 = ROOT / "tmp" / "pdfs" / "paper-7.png"
REVISED = ROOT / "output" / "pdf" / "TrafficEye_Revised_Publication_Ready.pdf"
REPORT = ROOT / "output" / "pdf" / "TrafficEye_Before_After_Originality_Report.pdf"

old_problem = """TrafficEye focuses on the work that begins after a citizen records a possible violation. Submissions vary in image quality, content, and available location data, yet officers must convert them into consistent case records. Manual entry of vehicle details, plate text, and violation type takes time, while separate detection models require labelled data and ongoing maintenance. Location fields also need cautious interpretation because EXIF data may be missing or altered. The proposed system combines evidence capture, location checks, model-assisted field generation, and officer verification. Its intended benefit is faster initial triage without transferring enforcement judgement to the model."""

new_problem = """TrafficEye addresses five related operational problems: limited enforcement coverage; inconsistent citizen evidence; time-consuming manual triage; uncertain location metadata; and the need for accountable automation. The system must connect evidence capture, available location context, structured candidate fields, and officer verification without treating model output as a final enforcement decision."""

old_conclusion = """TrafficEye demonstrates an end-to-end route from citizen evidence capture to officer review. The prototype stores media and location context, generates candidate fields through a pretrained VLM, and keeps the final decision with the officer. Its contribution is the integration of these functions in one reporting application. It does not introduce a new recognition algorithm, and the present prototype cannot support claims about accuracy or efficiency until the planned evaluation is completed. The next study should give particular attention to plate recognition under varied lighting, viewpoints, and occlusion [9, 10]."""

new_conclusion = """TrafficEye combines mobile crowdsourcing, location metadata, cloud services, and pretrained visual inference within a citizen-to-officer reporting workflow. Its main contribution is the integration of these components with human verification rather than a new detection algorithm. The prototype demonstrates a practical reporting and review process, although its accuracy and operational value still require formal evaluation. The immediate priority is to conduct the planned domain-specific study and examine plate recognition across varied lighting, viewpoints, and levels of occlusion."""

def draw_para(c, text, x, top, width, size=8.7, leading=11.0, bold=False):
    style = ParagraphStyle("patch", fontName="Times-Bold" if bold else "Times-Roman",
                           fontSize=size, leading=leading, textColor=colors.black)
    p = Paragraph(text, style)
    _, h = p.wrap(width, 200)
    p.drawOn(c, x, top - h)
    return top - h

def patched_page(background, page_number):
    im = Image.open(background)
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(612, 792))
    c.drawImage(ImageReader(im), 0, 0, width=612, height=792)
    if page_number == 3:
        c.setFillColor(colors.white)
        c.rect(69, 247, 474, 110, fill=1, stroke=0)
        top = 351
        top = draw_para(c, "TrafficEye addresses five related operational problems:", 72, top, 468, 8.4, 10.2)
        bullets = [
            "- <b>Limited enforcement coverage:</b> fixed cameras and patrols cannot observe every road continuously.",
            "- <b>Inconsistent citizen evidence:</b> media varies in clarity, lighting, viewpoint, and completeness.",
            "- <b>Time-consuming manual triage:</b> officers must identify vehicles, interpret violations, and transcribe plates.",
            "- <b>Uncertain location metadata:</b> GPS and EXIF may be missing or altered and cannot serve as proof alone.",
            "- <b>Accountable automation:</b> AI may assist review, but final decisions must remain with authorized officers.",
        ]
        for item in bullets:
            top = draw_para(c, item, 77, top - 1.0, 463, 7.55, 9.0)
        draw_para(c, "The system must therefore connect evidence capture, location context, structured candidate fields, and officer verification without treating model output as a final decision.", 72, top - 1.5, 468, 7.55, 9.0)
    else:
        c.setFillColor(colors.white)
        c.rect(69, 587, 474, 113, fill=1, stroke=0)
        text = ("TrafficEye combines mobile crowdsourcing, location metadata, cloud services, and pretrained visual inference within a citizen-to-officer reporting workflow. Its main contribution is the integration of these components with human verification rather than a new detection algorithm. The prototype demonstrates a practical reporting and review process, although its accuracy and operational value still require formal evaluation. The immediate priority is to conduct the planned domain-specific study and examine plate recognition across varied lighting, viewpoints, and levels of occlusion.")
        draw_para(c, text, 72, 694, 468, 9.1, 14.0)
    c.save()
    buf.seek(0)
    return PdfReader(buf).pages[0]

def build_paper():
    source = PdfReader(str(ORIGINAL))
    writer = PdfWriter()
    for i, page in enumerate(source.pages, 1):
        if i == 3:
            writer.add_page(patched_page(PAGE3, 3))
        elif i == 7:
            writer.add_page(patched_page(PAGE7, 7))
        else:
            writer.add_page(page)
    writer.add_metadata({"/Title": "TrafficEye - Revised Publication-Ready Paper"})
    with REVISED.open("wb") as f:
        writer.write(f)

def shingles(text, n=8):
    words = re.findall(r"[a-z0-9]+", text.lower())
    return {tuple(words[i:i+n]) for i in range(max(0, len(words)-n+1))}

def internal_overlap(target, rest):
    a, b = shingles(target), shingles(rest)
    return (100 * len(a & b) / len(a)) if a else 0.0

def build_report():
    retention_problem = 100 * SequenceMatcher(None, old_problem.lower(), new_problem.lower()).ratio()
    retention_conclusion = 100 * SequenceMatcher(None, old_conclusion.lower(), new_conclusion.lower()).ratio()

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle("Title2", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=20, leading=24, textColor=colors.HexColor("#17324D"), alignment=TA_CENTER))
    styles.add(ParagraphStyle("H", parent=styles["Heading2"], textColor=colors.HexColor("#17324D"), spaceBefore=12, spaceAfter=6))
    styles.add(ParagraphStyle("Small", parent=styles["BodyText"], fontSize=8.5, leading=11))
    doc = SimpleDocTemplate(str(REPORT), pagesize=A4, rightMargin=48, leftMargin=48, topMargin=46, bottomMargin=46)
    story = [Paragraph("TrafficEye Before-and-After Originality Review", styles["Title2"]), Spacer(1, 10),
             Paragraph("Scope: revised Problem Statement and Conclusion/Future Scope", styles["Normal"]),
             Paragraph("Status: Internal, non-certified similarity analysis", styles["Normal"]), Spacer(1, 10),
             Paragraph("Executive Summary", styles["H"]),
             Paragraph("The revision converts the problem statement from one dense paragraph into five professional, issue-led points and removes the in-text references from the conclusion/future-scope section. The language was edited for natural academic flow, varied sentence structure, and project-specific precision.", styles["BodyText"])]
    data = [["Measure", "Before", "After"],
            ["Problem statement format", "Single paragraph", "Five structured points + objective"],
            ["Conclusion citations", "[9, 10]", "None"],
            ["Problem statement word count", str(len(old_problem.split())), str(len(new_problem.split()))],
            ["Conclusion word count", str(len(old_conclusion.split())), str(len(new_conclusion.split()))],
            ["Wording retained from original", "Baseline", f"Problem {retention_problem:.1f}%; conclusion {retention_conclusion:.1f}%"]]
    table = Table(data, colWidths=[210, 110, 180], repeatRows=1)
    table.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,0), colors.HexColor("#17324D")), ("TEXTCOLOR", (0,0), (-1,0), colors.white), ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"), ("GRID", (0,0), (-1,-1), 0.5, colors.HexColor("#9AA8B5")), ("VALIGN", (0,0), (-1,-1), "TOP"), ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#F3F6F8")]), ("FONTSIZE", (0,0), (-1,-1), 8.5), ("LEADING", (0,0), (-1,-1), 11), ("LEFTPADDING", (0,0), (-1,-1), 6), ("RIGHTPADDING", (0,0), (-1,-1), 6), ("TOPPADDING", (0,0), (-1,-1), 6), ("BOTTOMPADDING", (0,0), (-1,-1), 6)]))
    story += [Spacer(1, 10), table, Paragraph("Interpretation", styles["H"]),
              Paragraph("The revised passages use substantially different phrasing while preserving the original technical meaning. The full paper remains largely unchanged by design, so a before/after whole-document comparison would be high and should not be interpreted as plagiarism.", styles["BodyText"]),
              Paragraph("Important limitation", styles["H"]),
              Paragraph("This is not a Turnitin, iThenticate, or institutional plagiarism certificate. No honest external similarity percentage can be produced without access to the proprietary comparison corpus. Submit the revised PDF to your institution's approved checker for a certified score.", styles["BodyText"]),
              Paragraph("Human-writing review", styles["H"]),
              Paragraph("The revised wording uses concrete system constraints, restrained claims, varied sentence length, and direct transitions. No guarantee is made about AI-detection tools, which are probabilistic and can misclassify human writing.", styles["BodyText"])]
    doc.build(story)

if __name__ == "__main__":
    build_paper()
    build_report()
    print(REVISED)
    print(REPORT)

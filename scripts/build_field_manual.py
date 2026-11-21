#!/usr/bin/env python3
"""Render SUBTERRA Arabic RTL field-survey manual as a PDF for GitHub Pages."""
from pathlib import Path
from weasyprint import HTML

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / "docs" / "field-survey-manual-ar.html"
output = ROOT / "docs" / "SUBTERRA_Field_Survey_JSON_Manual_AR.pdf"
if not source.is_file():
    raise SystemExit(f"Missing manual: {source}")
HTML(filename=str(source), base_url=str(source.parent)).write_pdf(str(output))
if output.stat().st_size < 3000:
    raise SystemExit("PDF output is unexpectedly small")
print(f"Built: {output}, {output.stat().st_size} bytes")

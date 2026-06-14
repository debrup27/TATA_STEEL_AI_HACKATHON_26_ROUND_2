"""
Document text extraction for RAG ingestion.
Priority: local corpus file → pymupdf (PDF) → HTML strip → plain text/md.
"""
import os
import re
from pathlib import Path
from typing import Optional, Tuple

from django.conf import settings

# Image/scanned uploads: OCR is ~2–5s/page; keep uploads small.
MAX_UPLOAD_IMAGE_PDF_PAGES = 10
# Text-selectable uploads: fast extract but cap for RAG context size.
MAX_UPLOAD_TEXT_PDF_PAGES = 20
_MIN_TEXT_PER_PAGE = 48


def _corpus_dir() -> Path:
    return Path(getattr(settings, "CORPUS_DIR", os.environ.get("CORPUS_DIR", "/app/data/corpus")))


def resolve_local_path(doc) -> Optional[Path]:
    """Resolve on-disk corpus file for a Document instance."""
    if getattr(doc, "local_path", None) and not str(doc.local_path).startswith("maintenance_event:"):
        p = Path(doc.local_path)
        if p.is_file():
            return p
        candidate = _corpus_dir() / doc.local_path
        if candidate.is_file():
            return candidate
        # Fallback extension (download script may write .md when PDF fails)
        stem = candidate.with_suffix("")
        for ext in (".pdf", ".md", ".html", ".txt"):
            alt = stem.with_suffix(ext)
            if alt.is_file():
                return alt

    if doc.title:
        slug_map = getattr(doc, "_corpus_slug", None)
        if slug_map:
            candidate = _corpus_dir() / slug_map
            if candidate.is_file():
                return candidate

    # Search by title slug under corpus subdirs
    safe = re.sub(r"[^a-zA-Z0-9]+", "-", doc.title.lower()).strip("-")
    for sub in ("equipment_manual", "sop", "iso_standard", "safety_code"):
        base = _corpus_dir() / sub
        if not base.is_dir():
            continue
        for ext in (".pdf", ".md", ".html", ".txt"):
            for pattern in (f"{safe}{ext}", f"*{safe}*{ext}"):
                matches = list(base.glob(pattern))
                if matches:
                    return matches[0]
    return None


def _ocr_page_text(page) -> str:
    """Tesseract OCR via PyMuPDF for sparse/scanned PDF pages."""
    from django.conf import settings

    dpi = max(72, min(int(getattr(settings, "RAG_OCR_DPI", 200)), 300))
    try:
        tp = page.get_textpage_ocr(language="eng", dpi=dpi, full=True)
        return (tp.extractText() or "").strip()
    except Exception:
        return ""


def _describe_visual_page(page, page_num: int, doc_name: str) -> str:
    blocks = page.get_text("dict").get("blocks", [])
    img_blocks = sum(1 for b in blocks if b.get("type") == 1)
    try:
        drawings = len(page.get_drawings())
    except Exception:
        drawings = 0
    w, h = int(page.rect.width), int(page.rect.height)
    return (
        f"## Page {page_num}\n"
        f"[Visual page in '{doc_name}': {w}×{h}pt layout with "
        f"{img_blocks} image region(s) and {drawings} diagram element(s). "
        f"Figures/photos on this page — open the PDF preview for exact visuals.]"
    )


def _pdf_is_image_heavy(pdf, sample_pages: int = 3) -> bool:
    """Heuristic: little selectable text on the first pages → scanned/image PDF."""
    chars = 0
    for i in range(min(len(pdf), sample_pages)):
        chars += len((pdf[i].get_text("text") or "").strip())
    return chars < _MIN_TEXT_PER_PAGE * max(1, min(len(pdf), sample_pages))


def _extract_pdf(path: Path, *, doc_name: str | None = None, max_pages: int | None = None) -> str:
    import fitz
    from django.conf import settings

    label = doc_name or path.name
    parts: list[str] = []
    ocr_budget = max(0, int(getattr(settings, "RAG_OCR_MAX_PAGES", 5)))
    ocr_used = 0
    with fitz.open(path) as pdf:
        page_limit = min(len(pdf), max_pages) if max_pages else len(pdf)
        for page_num in range(1, page_limit + 1):
            page = pdf[page_num - 1]
            text = (page.get_text("text") or "").strip()
            if len(text) < 48 and ocr_used < ocr_budget:
                ocr = _ocr_page_text(page)
                if ocr:
                    ocr_used += 1
                if len(ocr) > len(text):
                    text = ocr
            elif len(text) < 48:
                parts.append(_describe_visual_page(page, page_num, label))
                continue
            if text:
                parts.append(f"\n## Page {page_num}\n{text}")
            else:
                parts.append(_describe_visual_page(page, page_num, label))
    return "\n".join(parts)


def extract_upload_file(path: Path) -> Tuple[str, str]:
    """Extract text from an uploaded file path (PDF with OCR/visual fallback)."""
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        import fitz

        with fitz.open(path) as pdf:
            n = len(pdf)
            if n > MAX_UPLOAD_IMAGE_PDF_PAGES and _pdf_is_image_heavy(pdf):
                raise ValueError(
                    f"PDF has {n} pages. Image-based uploads are limited to "
                    f"{MAX_UPLOAD_IMAGE_PDF_PAGES} pages — split the document or "
                    "export a shorter excerpt."
                )
            if n > MAX_UPLOAD_TEXT_PDF_PAGES and not _pdf_is_image_heavy(pdf):
                raise ValueError(
                    f"PDF has {n} pages. Text-based uploads are limited to "
                    f"{MAX_UPLOAD_TEXT_PDF_PAGES} pages — split the document or "
                    "export a shorter excerpt."
                )
        text = _extract_pdf(path, doc_name=path.name)
        return text, "upload_pdf"
    if suffix in (".html", ".htm"):
        return _extract_html(path), "upload_html"
    return _extract_plain(path), "upload_text"


def _extract_html(path: Path) -> str:
    raw = path.read_text(encoding="utf-8", errors="replace")
    text = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", raw)
    text = re.sub(r"(?is)<br\s*/?>", "\n", text)
    text = re.sub(r"(?is)</(p|div|h[1-6]|li|tr)>", "\n", text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _extract_plain(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def extract_text(doc) -> Tuple[str, str]:
    """
    Return (text, source_kind) for a Document model instance.
    source_kind: local_pdf | local_html | local_text | maintenance_event | synthetic | placeholder
    """
    if getattr(doc, "local_path", None) and str(doc.local_path).startswith("maintenance_event:"):
        event_id = str(doc.local_path).split(":", 1)[1]
        from apps.maintenance.models import MaintenanceEvent
        try:
            event = MaintenanceEvent.objects.select_related("asset").get(id=event_id)
            text = (
                f"# Maintenance Event — {event.asset.asset_type}\n\n"
                f"**Type:** {event.event_type}\n"
                f"**Description:** {event.description}\n"
                f"**Outcome:** {event.outcome}\n"
                f"**Parts used:** {', '.join(event.parts_used or [])}\n"
                f"**ISO 14224:** {event.iso14224_classification}\n"
                f"**Completed:** {event.completed_date}\n"
                f"**Downtime hours:** {event.downtime_hours}\n"
            )
            return text, "maintenance_event"
        except MaintenanceEvent.DoesNotExist:
            pass

    local = resolve_local_path(doc)
    if local and local.is_file():
        suffix = local.suffix.lower()
        if suffix == ".pdf":
            return _extract_pdf(local, doc_name=doc.title), "local_pdf"
        if suffix in (".html", ".htm"):
            return _extract_html(local), "local_html"
        return _extract_plain(local), "local_text"

    if doc.source_url and doc.source_url.startswith("http"):
        return f"[Document: {doc.title}] Source: {doc.source_url}", "placeholder"

    return "", "synthetic"

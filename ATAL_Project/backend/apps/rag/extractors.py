"""
Document text extraction for RAG ingestion.
Priority: local corpus file → pymupdf (PDF) → HTML strip → plain text/md.
"""
import os
import re
from pathlib import Path
from typing import Optional, Tuple

from django.conf import settings


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


def _extract_pdf(path: Path) -> str:
    import fitz

    parts = []
    with fitz.open(path) as pdf:
        for page_num, page in enumerate(pdf, start=1):
            text = page.get_text("text")
            if text.strip():
                parts.append(f"\n## Page {page_num}\n{text}")
    return "\n".join(parts)


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
            return _extract_pdf(local), "local_pdf"
        if suffix in (".html", ".htm"):
            return _extract_html(local), "local_html"
        return _extract_plain(local), "local_text"

    if doc.source_url and doc.source_url.startswith("http"):
        return f"[Document: {doc.title}] Source: {doc.source_url}", "placeholder"

    return "", "synthetic"

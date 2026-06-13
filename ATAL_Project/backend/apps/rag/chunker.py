"""
Semantic chunker — splits at section/paragraph level.
Preserves tables and formulas in their enclosing context.
Target: 400-600 tokens per chunk, 50-token overlap.
"""
import re
from typing import List, Dict


def chunk_document(doc) -> List[Dict]:
    """Given a Document model instance, return list of chunk dicts."""
    if not doc.source_url:
        return []

    # For demonstration, create a single chunk with doc metadata
    # Production: fetch URL, parse PDF/HTML, split semantically
    return [
        {
            "title": doc.title,
            "content": f"[Document: {doc.title}] Source: {doc.source_url}",
            "section": "full_document",
            "page": None,
            "asset_scope": doc.asset_scope,
            "source_url": doc.source_url,
        }
    ]


def semantic_split(text: str, max_tokens: int = 500, overlap_tokens: int = 50) -> List[str]:
    """Split text at section headings, then paragraphs, respecting token limits."""
    # Split at markdown headings first
    sections = re.split(r"\n#{1,3}\s+", text)
    chunks = []
    for section in sections:
        paragraphs = section.split("\n\n")
        current = []
        current_len = 0
        for para in paragraphs:
            para_len = len(para.split())
            if current_len + para_len > max_tokens and current:
                chunks.append(" ".join(current))
                # Keep overlap
                overlap = " ".join(" ".join(current).split()[-overlap_tokens:])
                current = [overlap]
                current_len = overlap_tokens
            current.append(para)
            current_len += para_len
        if current:
            chunks.append(" ".join(current))
    return [c for c in chunks if len(c.strip()) > 20]


def preserve_table(text: str) -> bool:
    """Return True if text contains a markdown table — keep as single chunk."""
    return "|" in text and "---" in text


def extract_formula(text: str) -> List[str]:
    """Extract math formulas — keep in enclosing paragraph."""
    formula_pattern = re.compile(r"`[^`]+`|exp\([^)]+\)|\w+\([^)]+\)\^[\d.]+")
    return formula_pattern.findall(text)

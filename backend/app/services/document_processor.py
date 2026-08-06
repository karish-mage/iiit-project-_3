"""
PDF text extraction and cleaning — production-grade.

Features:
- pdfplumber for layout-aware text extraction
- Table extraction → structured text
- OCR fallback via pytesseract for scanned PDFs
- Document-level content hashing for incremental indexing
- Page-number provenance tracking
"""
import os
import re
import hashlib
import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class PageText:
    """A block of extracted text with its page number."""
    page_number: int
    text: str
    doc_id: Optional[int] = None
    filename: Optional[str] = None
    tables: List[str] = field(default_factory=list)


@dataclass
class ExtractedDocument:
    """Full extraction result for one PDF."""
    doc_id: int
    filename: str
    page_count: int
    pages: List[PageText] = field(default_factory=list)
    full_text: str = ""
    content_hash: str = ""
    has_tables: bool = False
    used_ocr: bool = False


def extract_text_from_pdf(filepath: str, doc_id: int = 0) -> ExtractedDocument:
    """
    Extract text from a PDF using pdfplumber.
    Falls back to OCR for scanned/image-based PDFs.
    Also extracts tables and converts them to structured text.
    """
    try:
        import pdfplumber
    except ImportError:
        raise ImportError("pdfplumber is required: pip install pdfplumber")

    filename = os.path.basename(filepath)
    pages = []
    has_tables = False
    used_ocr = False

    with pdfplumber.open(filepath) as pdf:
        page_count = len(pdf.pages)
        for i, page in enumerate(pdf.pages, start=1):
            raw_text = page.extract_text() or ""
            cleaned = clean_text(raw_text)

            # Extract tables
            table_texts = []
            try:
                tables = page.extract_tables()
                if tables:
                    has_tables = True
                    for table in tables:
                        table_text = _table_to_text(table)
                        if table_text.strip():
                            table_texts.append(table_text)
            except Exception as e:
                logger.warning(f"Table extraction failed on page {i} of {filename}: {e}")

            # OCR fallback for scanned pages
            if not cleaned.strip() and len(cleaned) < 50:
                ocr_text = _ocr_page(page, filepath, i)
                if ocr_text:
                    cleaned = ocr_text
                    used_ocr = True

            if cleaned.strip() or table_texts:
                # Append table content to page text
                full_page_text = cleaned
                if table_texts:
                    full_page_text += "\n\n" + "\n\n".join(table_texts)

                pages.append(PageText(
                    page_number=i,
                    text=full_page_text.strip(),
                    doc_id=doc_id,
                    filename=filename,
                    tables=table_texts,
                ))

    full_text = "\n\n".join(p.text for p in pages)
    doc_hash = content_hash(full_text)

    return ExtractedDocument(
        doc_id=doc_id,
        filename=filename,
        page_count=page_count if 'page_count' in dir() else len(pages),
        pages=pages,
        full_text=full_text,
        content_hash=doc_hash,
        has_tables=has_tables,
        used_ocr=used_ocr,
    )


def extract_text_from_txt(filepath: str, doc_id: int = 0) -> ExtractedDocument:
    """Extract text from a plain text file."""
    filename = os.path.basename(filepath)
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        raw = f.read()

    cleaned = clean_text(raw)
    # Split into pseudo-pages (every ~3000 chars)
    page_size = 3000
    pages = []
    for i in range(0, len(cleaned), page_size):
        chunk = cleaned[i:i + page_size].strip()
        if chunk:
            pages.append(PageText(
                page_number=len(pages) + 1,
                text=chunk,
                doc_id=doc_id,
                filename=filename,
            ))

    full_text = "\n\n".join(p.text for p in pages)

    return ExtractedDocument(
        doc_id=doc_id,
        filename=filename,
        page_count=len(pages),
        pages=pages,
        full_text=full_text,
        content_hash=content_hash(full_text),
    )


def _table_to_text(table: list) -> str:
    """Convert a pdfplumber table (list of lists) to readable text."""
    if not table:
        return ""

    rows = []
    for row in table:
        if row:
            cells = [str(cell).strip() if cell else "" for cell in row]
            rows.append(" | ".join(cells))

    if not rows:
        return ""

    # First row as header
    result = rows[0] + "\n" + "-" * len(rows[0])
    for row in rows[1:]:
        result += "\n" + row

    return result


def _ocr_page(page, filepath: str, page_number: int) -> str:
    """
    OCR fallback for scanned PDF pages using pytesseract.
    Returns extracted text or empty string if OCR is not available.
    """
    try:
        import pytesseract
        from PIL import Image
        import io

        # Convert PDF page to image
        img = page.to_image(resolution=300)
        # pytesseract expects PIL Image
        pil_image = img.original
        text = pytesseract.image_to_string(pil_image)
        cleaned = clean_text(text)
        if cleaned.strip():
            logger.info(f"OCR extracted {len(cleaned)} chars from page {page_number} of {os.path.basename(filepath)}")
        return cleaned
    except ImportError:
        logger.debug("pytesseract not installed — skipping OCR fallback")
        return ""
    except Exception as e:
        logger.warning(f"OCR failed on page {page_number}: {e}")
        return ""


def clean_text(text: str) -> str:
    """Clean extracted text: normalize whitespace, fix encoding artifacts."""
    if not text:
        return ""
    # Replace common encoding issues
    text = text.replace("\u2018", "'").replace("\u2019", "'")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = text.replace("\u2013", "-").replace("\u2014", "-")
    text = text.replace("\xa0", " ")
    # Normalize whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r' {2,}', ' ', text)
    # Remove page headers/footers (common patterns)
    text = re.sub(r'(?m)^Page \d+ of \d+\s*$', '', text)
    text = re.sub(r'(?m)^\d+\s*$', '', text)  # standalone page numbers
    return text.strip()


def content_hash(text: str) -> str:
    """SHA-256 hash for deduplication and change detection."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def count_tokens(text: str) -> int:
    """Approximate token count (words * 1.3)."""
    return int(len(text.split()) * 1.3)


def file_hash(filepath: str) -> str:
    """SHA-256 hash of a file's bytes — for incremental indexing."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()

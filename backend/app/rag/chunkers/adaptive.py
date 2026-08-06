"""
Adaptive Chunker — the novel contribution.

Section-aware, clause-preserving, dynamically-sized chunking:
- Detects headings/section markers via regex + numbering heuristics
- Never splits a clause or section mid-sentence
- Sub-chunks oversize sections recursively while keeping section header attached
- Dynamic sizing: short clauses stay whole, long sections split at sentence boundaries
- Attaches rich metadata: section_title, clause_number, page_number, doc_id
"""
import re
from typing import List, Optional, Dict, Any, Tuple
from app.rag.chunkers.base import BaseChunker, ChunkData


# ── Heading / clause detection patterns ────────────────────────
HEADING_PATTERNS = [
    # "Section 4:", "SECTION 4.2:", "Section IV:"
    re.compile(r'^(?:SECTION|Section)\s+[\dIVXivx]+[\.:]\s*(.*)$', re.MULTILINE),
    # "Article 3 — Coverage"
    re.compile(r'^(?:ARTICLE|Article)\s+\d+[\s\-—:]+(.*)$', re.MULTILINE),
    # "PART II: GENERAL CONDITIONS"
    re.compile(r'^(?:PART|Part)\s+[\dIVXivx]+[\s\-—:]+(.*)$', re.MULTILINE),
    # "12.3 Exclusions" or "4. Coverage Terms"
    re.compile(r'^(\d+(?:\.\d+)*)\s+([A-Z][A-Za-z\s]{2,})$', re.MULTILINE),
    # ALL CAPS lines (likely headings) — at least 3 words
    re.compile(r'^([A-Z][A-Z\s]{8,})$', re.MULTILINE),
    # "Clause 12.3:" or "Clause XII:"
    re.compile(r'^(?:Clause|CLAUSE)\s+([\d.]+|[IVXivx]+)[\.:]\s*(.*)$', re.MULTILINE),
]

CLAUSE_NUMBER_PATTERN = re.compile(
    r'^(\d+(?:\.\d+)*)\s+'   # "4.2.1 "
)


class AdaptiveChunker(BaseChunker):
    """
    Adaptive section-aware chunking strategy.

    - Detects document structure (headings, clauses, sections)
    - Preserves clause integrity: never splits mid-sentence within a clause
    - Dynamically sizes chunks: short clauses stay whole, long sections
      get split at sentence boundaries closest to target size
    - Attaches section_title and clause_number metadata to every chunk
    """

    strategy_name = "adaptive"

    def __init__(self, max_chunk_size: int = 600, min_chunk_size: int = 100,
                 target_chunk_size: int = 400):
        self.max_chunk_size = max_chunk_size
        self.min_chunk_size = min_chunk_size
        self.target_chunk_size = target_chunk_size

    def chunk(self, text: str, doc_id: int = 0, page_number: Optional[int] = None,
              metadata: Optional[Dict[str, Any]] = None) -> List[ChunkData]:
        if not text.strip():
            return []

        # Step 1: Detect sections/headings
        sections = self._detect_sections(text)

        # Step 2: Process each section
        chunks = []
        idx = 0
        for section in sections:
            section_chunks = self._process_section(
                section_text=section["text"],
                section_title=section.get("title"),
                clause_number=section.get("clause_number"),
                doc_id=doc_id,
                page_number=page_number,
                start_idx=idx,
            )
            chunks.extend(section_chunks)
            idx += len(section_chunks)

        # Step 3: Merge very small chunks with neighbors if under min_size
        chunks = self._merge_small_chunks(chunks, doc_id, page_number)

        return chunks

    def _detect_sections(self, text: str) -> List[Dict[str, Any]]:
        """
        Split text into sections based on detected headings.
        Returns list of {"title": ..., "clause_number": ..., "text": ...}
        """
        # Find all heading positions
        headings = []
        for pattern in HEADING_PATTERNS:
            for match in pattern.finditer(text):
                heading_text = match.group(0).strip()
                headings.append({
                    "start": match.start(),
                    "end": match.end(),
                    "title": heading_text,
                    "clause_number": self._extract_clause_number(heading_text),
                })

        # Sort by position
        headings.sort(key=lambda h: h["start"])

        # Deduplicate overlapping headings (keep the first)
        deduped = []
        last_end = -1
        for h in headings:
            if h["start"] >= last_end:
                deduped.append(h)
                last_end = h["end"]
        headings = deduped

        if not headings:
            # No headings detected — treat entire text as one section
            return [{"title": None, "clause_number": None, "text": text}]

        sections = []

        # Text before first heading
        if headings[0]["start"] > 0:
            preamble = text[:headings[0]["start"]].strip()
            if preamble:
                sections.append({"title": "Preamble", "clause_number": None, "text": preamble})

        # Each heading → next heading
        for i, h in enumerate(headings):
            end = headings[i + 1]["start"] if i + 1 < len(headings) else len(text)
            body = text[h["end"]:end].strip()
            sections.append({
                "title": h["title"],
                "clause_number": h["clause_number"],
                "text": body if body else h["title"],
            })

        return sections

    def _extract_clause_number(self, heading: str) -> Optional[str]:
        """Extract clause/section number from heading text."""
        match = CLAUSE_NUMBER_PATTERN.match(heading)
        if match:
            return match.group(1)
        # Try "Section X:" pattern
        m = re.match(r'(?:Section|SECTION|Clause|CLAUSE|Article|ARTICLE)\s+([\d.]+|[IVXivx]+)', heading)
        if m:
            return m.group(1)
        return None

    def _process_section(self, section_text: str, section_title: Optional[str],
                         clause_number: Optional[str], doc_id: int,
                         page_number: Optional[int], start_idx: int) -> List[ChunkData]:
        """
        Process a single section:
        - If under max_chunk_size, keep whole
        - If over, sub-chunk at sentence boundaries while keeping header attached
        """
        if len(section_text) <= self.max_chunk_size:
            # Short enough — keep as one chunk
            chunk = self._make_chunk(
                text=section_text.strip(),
                doc_id=doc_id,
                page_number=page_number,
                section_title=section_title,
                clause_number=clause_number,
                idx=start_idx,
            )
            return [chunk]

        # Section too large — split at sentence boundaries
        sentences = self._split_sentences(section_text)
        sub_chunks = []
        current_sentences = []
        current_len = 0
        idx = start_idx

        # Prefix for sub-chunks: attach section header for context
        header_prefix = ""
        if section_title:
            header_prefix = f"[{section_title}] "

        for sent in sentences:
            if current_len + len(sent) > self.target_chunk_size and current_sentences:
                # Flush current chunk
                chunk_text = header_prefix + " ".join(current_sentences)
                sub_chunks.append(self._make_chunk(
                    text=chunk_text.strip(),
                    doc_id=doc_id,
                    page_number=page_number,
                    section_title=section_title,
                    clause_number=clause_number,
                    idx=idx,
                ))
                idx += 1
                current_sentences = []
                current_len = 0

            current_sentences.append(sent)
            current_len += len(sent) + 1

        # Flush remaining
        if current_sentences:
            chunk_text = header_prefix + " ".join(current_sentences)
            sub_chunks.append(self._make_chunk(
                text=chunk_text.strip(),
                doc_id=doc_id,
                page_number=page_number,
                section_title=section_title,
                clause_number=clause_number,
                idx=idx,
            ))

        return sub_chunks

    def _split_sentences(self, text: str) -> List[str]:
        """Split text into sentences, preserving clause integrity."""
        # Split on sentence-ending punctuation followed by whitespace
        sentences = re.split(r'(?<=[.!?])\s+', text)
        return [s.strip() for s in sentences if s.strip()]

    def _merge_small_chunks(self, chunks: List[ChunkData], doc_id: int,
                            page_number: Optional[int]) -> List[ChunkData]:
        """Merge consecutive chunks that are under min_chunk_size."""
        if len(chunks) <= 1:
            return chunks

        merged = []
        i = 0
        while i < len(chunks):
            current = chunks[i]
            # If this chunk is too small and there's a next chunk with same section
            if (current.char_count < self.min_chunk_size and
                    i + 1 < len(chunks) and
                    chunks[i + 1].section_title == current.section_title):
                # Merge with next
                combined_text = current.text + " " + chunks[i + 1].text
                merged_chunk = self._make_chunk(
                    text=combined_text.strip(),
                    doc_id=doc_id,
                    page_number=page_number,
                    section_title=current.section_title,
                    clause_number=current.clause_number,
                    idx=len(merged),
                )
                merged.append(merged_chunk)
                i += 2
            else:
                current.chunk_id = f"{self.strategy_name}_{doc_id}_{len(merged)}"
                merged.append(current)
                i += 1

        return merged

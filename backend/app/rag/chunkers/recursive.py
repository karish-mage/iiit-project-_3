"""
Recursive Chunker — splits on paragraph → sentence → word boundaries.
Uses LangChain's RecursiveCharacterTextSplitter logic, implemented directly
to avoid dependency issues.
"""
import re
from typing import List, Optional, Dict, Any
from app.rag.chunkers.base import BaseChunker, ChunkData


class RecursiveChunker(BaseChunker):
    """
    Recursively split text using a hierarchy of separators:
    paragraph breaks → sentence boundaries → word boundaries.
    """

    strategy_name = "recursive"

    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 50):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = ["\n\n", "\n", ". ", "? ", "! ", "; ", ", ", " "]

    def chunk(self, text: str, doc_id: int = 0, page_number: Optional[int] = None,
              metadata: Optional[Dict[str, Any]] = None) -> List[ChunkData]:
        if not text.strip():
            return []

        raw_chunks = self._split_recursive(text, self.separators)
        merged = self._merge_with_overlap(raw_chunks)

        results = []
        for idx, chunk_text in enumerate(merged):
            if chunk_text.strip():
                results.append(self._make_chunk(
                    text=chunk_text.strip(),
                    doc_id=doc_id,
                    page_number=page_number,
                    idx=idx,
                ))
        return results

    def _split_recursive(self, text: str, separators: List[str]) -> List[str]:
        """Recursively split text using the first separator that produces splits."""
        if not separators:
            return [text] if text.strip() else []

        sep = separators[0]
        remaining_seps = separators[1:]

        # Split on this separator
        if sep in text:
            parts = text.split(sep)
        else:
            return self._split_recursive(text, remaining_seps)

        result = []
        for part in parts:
            if not part.strip():
                continue
            # Re-attach separator (except for whitespace)
            piece = part + sep if sep.strip() else part
            if len(piece) <= self.chunk_size:
                result.append(piece.strip())
            else:
                # Still too large — recurse with next separator
                result.extend(self._split_recursive(piece, remaining_seps))

        return result

    def _merge_with_overlap(self, chunks: List[str]) -> List[str]:
        """Merge small chunks and add overlap between consecutive chunks."""
        if not chunks:
            return []

        merged = []
        current = chunks[0]

        for i in range(1, len(chunks)):
            combined = current + " " + chunks[i]
            if len(combined) <= self.chunk_size:
                current = combined
            else:
                merged.append(current)
                # Create overlap: take last N chars of current chunk
                overlap_text = current[-self.chunk_overlap:] if len(current) > self.chunk_overlap else ""
                current = (overlap_text + " " + chunks[i]).strip()

        if current.strip():
            merged.append(current)

        return merged

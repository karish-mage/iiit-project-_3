"""
Fixed Chunker — fixed character/token window with fixed overlap.
Simplest baseline strategy.
"""
from typing import List, Optional, Dict, Any
from app.rag.chunkers.base import BaseChunker, ChunkData
from app.services.document_processor import count_tokens


class FixedChunker(BaseChunker):
    """Split text into fixed-size windows with overlap."""

    strategy_name = "fixed"

    def __init__(self, chunk_size: int = 500, overlap: int = 50):
        """
        Args:
            chunk_size: Target size in tokens per chunk.
            overlap: Overlap in tokens between consecutive chunks.
        """
        self.chunk_size = chunk_size
        self.overlap = overlap

    def chunk(self, text: str, doc_id: int = 0, page_number: Optional[int] = None,
              metadata: Optional[Dict[str, Any]] = None) -> List[ChunkData]:
        if not text.strip():
            return []

        words = text.split()
        # Approximate: 1 token ≈ 0.75 words → chars_per_token ≈ 5
        # Use word-based splitting for simplicity
        tokens_per_word = 1.33
        words_per_chunk = max(1, int(self.chunk_size / tokens_per_word))
        words_overlap = max(0, int(self.overlap / tokens_per_word))

        chunks = []
        idx = 0
        start = 0

        while start < len(words):
            end = min(start + words_per_chunk, len(words))
            chunk_text = " ".join(words[start:end])

            if chunk_text.strip():
                chunks.append(self._make_chunk(
                    text=chunk_text,
                    doc_id=doc_id,
                    page_number=page_number,
                    idx=idx,
                ))
                idx += 1

            # Advance by (chunk_size - overlap)
            step = max(1, words_per_chunk - words_overlap)
            start += step

        return chunks

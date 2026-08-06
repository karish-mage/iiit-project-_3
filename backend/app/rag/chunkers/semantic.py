"""
Semantic Chunker — embedding-similarity-based splitting.
Groups semantically coherent sentences using a sliding-window
cosine-similarity breakpoint detector.
"""
import re
import numpy as np
from typing import List, Optional, Dict, Any
from app.rag.chunkers.base import BaseChunker, ChunkData


class SemanticChunker(BaseChunker):
    """
    Split text at semantic boundaries detected via cosine-similarity
    drops between consecutive sentence embeddings.
    """

    strategy_name = "semantic"

    def __init__(self, breakpoint_threshold: float = 0.5, max_chunk_size: int = 600,
                 embedding_func=None):
        """
        Args:
            breakpoint_threshold: Percentile threshold for detecting breakpoints.
                Similarities below this percentile trigger a split.
            max_chunk_size: Maximum characters per chunk (hard limit).
            embedding_func: Callable that takes List[str] -> np.ndarray of embeddings.
        """
        self.breakpoint_threshold = breakpoint_threshold
        self.max_chunk_size = max_chunk_size
        self._embedding_func = embedding_func

    def set_embedding_func(self, func):
        """Set the embedding function after init (avoids circular imports)."""
        self._embedding_func = func

    def chunk(self, text: str, doc_id: int = 0, page_number: Optional[int] = None,
              metadata: Optional[Dict[str, Any]] = None) -> List[ChunkData]:
        if not text.strip():
            return []

        sentences = self._split_sentences(text)
        if len(sentences) <= 1:
            return [self._make_chunk(text=text.strip(), doc_id=doc_id,
                                     page_number=page_number, idx=0)]

        # If no embedding function, fall back to sentence-length heuristic
        if self._embedding_func is None:
            return self._fallback_chunk(sentences, doc_id, page_number)

        # Get embeddings for all sentences
        embeddings = self._embedding_func(sentences)

        # Compute cosine similarities between consecutive sentences
        similarities = []
        for i in range(len(embeddings) - 1):
            sim = self._cosine_similarity(embeddings[i], embeddings[i + 1])
            similarities.append(sim)

        # Find breakpoints: where similarity drops below threshold percentile
        if similarities:
            threshold = np.percentile(similarities, self.breakpoint_threshold * 100)
        else:
            threshold = 0.5

        breakpoints = [i + 1 for i, sim in enumerate(similarities) if sim < threshold]

        # Build chunks from breakpoints
        chunks = []
        start = 0
        idx = 0
        for bp in breakpoints:
            chunk_text = " ".join(sentences[start:bp]).strip()
            if chunk_text:
                # Enforce max size with sub-splitting if needed
                for sub in self._enforce_max_size(chunk_text):
                    chunks.append(self._make_chunk(
                        text=sub, doc_id=doc_id, page_number=page_number, idx=idx))
                    idx += 1
            start = bp

        # Last segment
        chunk_text = " ".join(sentences[start:]).strip()
        if chunk_text:
            for sub in self._enforce_max_size(chunk_text):
                chunks.append(self._make_chunk(
                    text=sub, doc_id=doc_id, page_number=page_number, idx=idx))
                idx += 1

        return chunks

    def _fallback_chunk(self, sentences: List[str], doc_id: int,
                        page_number: Optional[int]) -> List[ChunkData]:
        """Fallback when no embedding function: group sentences by target size."""
        full_text = " ".join(sentences).strip()
        sub_texts = self._enforce_max_size(full_text)
        return [
            self._make_chunk(text=sub, doc_id=doc_id, page_number=page_number, idx=idx)
            for idx, sub in enumerate(sub_texts)
        ]

    def _split_sentences(self, text: str) -> List[str]:
        """Split text into sentences."""
        sentences = re.split(r'(?<=[.!?])\s+', text)
        return [s.strip() for s in sentences if s.strip()]

    def _cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        """Cosine similarity between two vectors."""
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))

    def _enforce_max_size(self, text: str) -> List[str]:
        """Split text that exceeds max_chunk_size at sentence/word/char boundaries."""
        if len(text) <= self.max_chunk_size:
            return [text]

        sentences = self._split_sentences(text)
        expanded = []
        for s in sentences:
            if len(s) > self.max_chunk_size:
                # Sub-split long sentences
                for i in range(0, len(s), self.max_chunk_size):
                    part = s[i:i + self.max_chunk_size].strip()
                    if part:
                        expanded.append(part)
            else:
                expanded.append(s)

        result = []
        current = []
        current_len = 0
        for sent in expanded:
            if current_len + len(sent) > self.max_chunk_size and current:
                result.append(" ".join(current).strip())
                current = []
                current_len = 0
            current.append(sent)
            current_len += len(sent) + 1
        if current:
            result.append(" ".join(current).strip())
        return result

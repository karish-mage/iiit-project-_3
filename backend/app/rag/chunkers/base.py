"""
BaseChunker — abstract interface all chunking strategies implement.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
import hashlib


@dataclass
class ChunkData:
    """A single chunk produced by any strategy."""
    chunk_id: str = ""
    doc_id: int = 0
    filename: Optional[str] = None
    page_number: Optional[int] = None
    section_title: Optional[str] = None
    clause_number: Optional[str] = None
    strategy_name: str = ""
    char_count: int = 0
    token_count: int = 0
    content_hash: str = ""
    text: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        if not self.content_hash and self.text:
            self.content_hash = hashlib.sha256(self.text.encode("utf-8")).hexdigest()
        if not self.char_count and self.text:
            self.char_count = len(self.text)


class BaseChunker(ABC):
    """
    Abstract base class for chunking strategies.
    All implementations must provide:
      - strategy_name: str
      - chunk(text, metadata) -> List[ChunkData]
    """

    strategy_name: str = "base"

    @abstractmethod
    def chunk(self, text: str, doc_id: int = 0, page_number: Optional[int] = None,
              metadata: Optional[Dict[str, Any]] = None) -> List[ChunkData]:
        """
        Split text into chunks.

        Args:
            text: The input text to chunk.
            doc_id: Document ID for provenance.
            page_number: Page number (if known) for provenance.
            metadata: Additional metadata to attach to each chunk.

        Returns:
            List of ChunkData objects.
        """
        pass

    def _make_chunk(self, text: str, doc_id: int, page_number: Optional[int],
                    section_title: Optional[str] = None, clause_number: Optional[str] = None,
                    idx: int = 0) -> ChunkData:
        """Helper to build a ChunkData with standard fields populated."""
        from app.document_processor import count_tokens
        return ChunkData(
            chunk_id=f"{self.strategy_name}_{doc_id}_{idx}",
            doc_id=doc_id,
            page_number=page_number,
            section_title=section_title,
            clause_number=clause_number,
            strategy_name=self.strategy_name,
            char_count=len(text),
            token_count=count_tokens(text),
            text=text,
        )

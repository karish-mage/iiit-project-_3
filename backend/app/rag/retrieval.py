"""
Retrieval Engine — parallel top-K search across all 4 strategy collections.
"""
import time
import concurrent.futures
from typing import List, Dict, Any, Optional
from app.rag.vector_store import get_vector_store, STRATEGY_COLLECTIONS
from app.config import settings


class RetrievalEngine:
    """Run retrieval against all 4 chunking strategy collections in parallel."""

    def __init__(self, top_k: int = None):
        self.top_k = top_k or settings.retrieval_top_k
        self.store = get_vector_store()

    def retrieve_all_strategies(self, query: str, top_k: int = None
                                 ) -> Dict[str, Dict[str, Any]]:
        """
        Query all 4 collections in parallel.
        Returns:
            {strategy_name: {"chunks": [...], "scores": [...], "latency_ms": float}}
        """
        k = top_k or self.top_k
        results = {}

        strategies = list(STRATEGY_COLLECTIONS.keys())

        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            futures = {
                executor.submit(self._query_strategy, query, strategy, k): strategy
                for strategy in strategies
            }
            for future in concurrent.futures.as_completed(futures):
                strategy = futures[future]
                try:
                    results[strategy] = future.result()
                except Exception as e:
                    results[strategy] = {
                        "chunks": [],
                        "scores": [],
                        "latency_ms": 0,
                        "error": str(e),
                    }

        return results

    def retrieve_single_strategy(self, query: str, strategy_name: str,
                                  top_k: int = None) -> Dict[str, Any]:
        """Query a single strategy's collection."""
        return self._query_strategy(query, strategy_name, top_k or self.top_k)

    def _query_strategy(self, query: str, strategy_name: str,
                        top_k: int) -> Dict[str, Any]:
        """Internal: query one collection and format results."""
        parsed, latency_ms = self.store.query(query, strategy_name, top_k)

        chunks = []
        scores = []
        for r in parsed:
            chunks.append({
                "chunk_id": r["chunk_id"],
                "text": r["text"],
                "doc_id": r["metadata"].get("doc_id", 0),
                "page_number": r["metadata"].get("page_number", 0),
                "section_title": r["metadata"].get("section_title", ""),
                "clause_number": r["metadata"].get("clause_number", ""),
                "char_count": r["metadata"].get("char_count", 0),
                "token_count": r["metadata"].get("token_count", 0),
                "document_name": r["metadata"].get("document_name", ""),
                "similarity_score": r["similarity_score"],
            })
            scores.append(r["similarity_score"])

        return {
            "chunks": chunks,
            "scores": scores,
            "latency_ms": latency_ms,
        }


# Singleton
_engine: Optional[RetrievalEngine] = None


def get_retrieval_engine() -> RetrievalEngine:
    global _engine
    if _engine is None:
        _engine = RetrievalEngine()
    return _engine

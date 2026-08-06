"""
Evaluation Engine — metrics computation for retrieval quality.

Metrics:
- Similarity Score: cosine similarity (already from ChromaDB)
- Precision@K: fraction of top-K that are relevant
- Recall@K: fraction of all relevant chunks found in top-K
- Context Relevance: cosine-similarity proxy OR LLM-as-judge (Gemini)
- Response Time: wall-clock ms
"""
import numpy as np
from typing import List, Dict, Any, Optional, Set
from app.rag.embedding import get_embedding_engine


class EvaluationEngine:
    """Compute retrieval quality metrics for each strategy."""

    def __init__(self):
        self._embedding_engine = get_embedding_engine()

    def evaluate_retrieval(
        self,
        query: str,
        strategy_name: str,
        retrieved_chunks: List[Dict[str, Any]],
        similarity_scores: List[float],
        latency_ms: float,
        relevant_chunk_ids: Optional[Set[str]] = None,
        use_llm_judge: bool = False,
    ) -> Dict[str, float]:
        """
        Compute all metrics for one strategy's retrieval result.

        Args:
            query: Original query text.
            strategy_name: Name of the chunking strategy.
            retrieved_chunks: List of retrieved chunk dicts with 'text', 'chunk_id'.
            similarity_scores: Corresponding similarity scores.
            latency_ms: Retrieval latency in milliseconds.
            relevant_chunk_ids: Set of known-relevant chunk IDs (for P@K / R@K).
            use_llm_judge: If True, use Gemini to score context relevance.

        Returns:
            Dict with all metric values.
        """
        k = len(retrieved_chunks)

        # Similarity Score — average of top-K scores
        avg_similarity = float(np.mean(similarity_scores)) if similarity_scores else 0.0

        # Precision@K
        precision = self._precision_at_k(retrieved_chunks, relevant_chunk_ids)

        # Recall@K
        recall = self._recall_at_k(retrieved_chunks, relevant_chunk_ids)

        # Context Relevance
        if use_llm_judge:
            context_relevance = self._llm_judge_relevance(query, retrieved_chunks)
        else:
            context_relevance = self._cosine_proxy_relevance(query, retrieved_chunks)

        return {
            "strategy_name": strategy_name,
            "avg_similarity": round(avg_similarity, 4),
            "precision_at_k": round(precision, 4),
            "recall_at_k": round(recall, 4),
            "context_relevance": round(context_relevance, 4),
            "response_time_ms": round(latency_ms, 2),
        }

    def _precision_at_k(
        self,
        retrieved: List[Dict[str, Any]],
        relevant_ids: Optional[Set[str]],
    ) -> float:
        """
        Precision@K = |relevant ∩ retrieved| / K

        If no ground-truth relevant_ids provided, use similarity threshold
        as a proxy (score > 0.3 considered relevant).
        """
        if relevant_ids is not None:
            hits = sum(1 for c in retrieved if c.get("chunk_id", "") in relevant_ids)
            return hits / max(len(retrieved), 1)
        else:
            # Proxy: chunks with similarity > threshold are "relevant"
            hits = sum(1 for c in retrieved if c.get("similarity_score", 0) > 0.3)
            return hits / max(len(retrieved), 1)

    def _recall_at_k(
        self,
        retrieved: List[Dict[str, Any]],
        relevant_ids: Optional[Set[str]],
    ) -> float:
        """
        Recall@K = |relevant ∩ retrieved| / |relevant|

        If no ground-truth, returns same as precision (proxy).
        """
        if relevant_ids is not None and len(relevant_ids) > 0:
            retrieved_ids = {c.get("chunk_id", "") for c in retrieved}
            hits = len(relevant_ids & retrieved_ids)
            return hits / len(relevant_ids)
        else:
            # Without ground truth, use similarity proxy
            return self._precision_at_k(retrieved, relevant_ids)

    def _cosine_proxy_relevance(
        self,
        query: str,
        retrieved: List[Dict[str, Any]],
    ) -> float:
        """
        Context Relevance via cosine similarity proxy.
        Compute cosine similarity between query embedding and the
        concatenated retrieved context embedding.
        """
        if not retrieved:
            return 0.0

        # Embed query and concatenated context
        context_text = " ".join(c.get("text", "") for c in retrieved[:5])
        if not context_text.strip():
            return 0.0

        embeddings = self._embedding_engine.embed_texts([query, context_text])
        query_emb = embeddings[0]
        context_emb = embeddings[1]

        # Cosine similarity
        dot = np.dot(query_emb, context_emb)
        norm_q = np.linalg.norm(query_emb)
        norm_c = np.linalg.norm(context_emb)
        if norm_q == 0 or norm_c == 0:
            return 0.0
        similarity = float(dot / (norm_q * norm_c))
        # Normalize to 0-1 range (cosine can be negative)
        return max(0.0, min(1.0, (similarity + 1) / 2))

    def _llm_judge_relevance(
        self,
        query: str,
        retrieved: List[Dict[str, Any]],
    ) -> float:
        """
        Context Relevance via LLM-as-judge.
        Ask Gemini to rate 1-5 whether retrieved context answers the query.
        Returns normalized score 0-1.
        """
        try:
            import google.generativeai as genai
            from app.config import settings

            if settings.gemini_api_key == "not-set":
                return self._cosine_proxy_relevance(query, retrieved)

            genai.configure(api_key=settings.gemini_api_key)
            model = genai.GenerativeModel(settings.gemini_model)

            context = "\n---\n".join(c.get("text", "") for c in retrieved[:5])
            prompt = f"""Rate from 1 to 5 how well the following retrieved context answers the query.
            
Query: {query}

Retrieved Context:
{context}

Respond with ONLY a single number from 1 to 5.
1 = completely irrelevant
2 = slightly relevant
3 = moderately relevant
4 = highly relevant  
5 = perfectly answers the query"""

            response = model.generate_content(prompt)
            score_text = response.text.strip()
            # Extract number
            for char in score_text:
                if char.isdigit():
                    score = int(char)
                    return max(0.0, min(1.0, (score - 1) / 4.0))
            return 0.5
        except Exception:
            return self._cosine_proxy_relevance(query, retrieved)


# Singleton
_engine = None

def get_evaluation_engine() -> EvaluationEngine:
    global _engine
    if _engine is None:
        _engine = EvaluationEngine()
    return _engine

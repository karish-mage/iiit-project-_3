"""
Verification Engine — cross-check generated answer claims against retrieved evidence.

Outputs:
- Confidence score (0-100%)
- List of supporting clauses
- List of supporting page numbers
- Any unsupported claims flagged
"""
import re
import numpy as np
from typing import List, Dict, Any, Tuple
from app.rag.embedding import get_embedding_engine
from app.config import settings


class VerificationEngine:
    """
    Verify generated answers against source chunks.
    Uses embedding similarity to match claims to evidence.
    """

    def __init__(self, similarity_threshold: float = 0.3):
        self.similarity_threshold = similarity_threshold
        self._embedding_engine = get_embedding_engine()

    def verify_answer(
        self,
        answer_text: str,
        source_chunks: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Cross-check answer claims against source chunks.

        Returns:
            {
                "confidence_score": float (0-100),
                "supporting_clauses": List[str],
                "supporting_pages": List[int],
                "unsupported_claims": List[str],
                "claim_evidence_pairs": List[Dict],
            }
        """
        # Extract claims (sentences) from the answer
        claims = self._extract_claims(answer_text)
        if not claims:
            return {
                "confidence_score": 0.0,
                "supporting_clauses": [],
                "supporting_pages": [],
                "unsupported_claims": [],
                "claim_evidence_pairs": [],
            }

        # Get source texts
        source_texts = [c.get("text", "") for c in source_chunks]
        if not source_texts:
            return {
                "confidence_score": 0.0,
                "supporting_clauses": [],
                "supporting_pages": [],
                "unsupported_claims": claims,
                "claim_evidence_pairs": [],
            }

        # Embed claims and sources
        all_texts = claims + source_texts
        embeddings = self._embedding_engine.embed_texts(all_texts)
        claim_embeddings = embeddings[:len(claims)]
        source_embeddings = embeddings[len(claims):]

        # Match each claim to best-matching source
        supported_claims = []
        unsupported_claims = []
        claim_evidence_pairs = []
        supporting_clauses = set()
        supporting_pages = set()

        for i, claim in enumerate(claims):
            best_score = 0.0
            best_source_idx = -1

            for j in range(len(source_texts)):
                # Cosine similarity
                dot = np.dot(claim_embeddings[i], source_embeddings[j])
                norm_c = np.linalg.norm(claim_embeddings[i])
                norm_s = np.linalg.norm(source_embeddings[j])
                if norm_c > 0 and norm_s > 0:
                    sim = float(dot / (norm_c * norm_s))
                else:
                    sim = 0.0

                if sim > best_score:
                    best_score = sim
                    best_source_idx = j

            if best_score >= self.similarity_threshold and best_source_idx >= 0:
                supported_claims.append(claim)
                source = source_chunks[best_source_idx]
                clause = source.get("clause_number", "")
                page = source.get("page_number", 0)
                if clause:
                    supporting_clauses.add(clause)
                if page:
                    supporting_pages.add(page)

                claim_evidence_pairs.append({
                    "claim": claim[:200],
                    "evidence_source": source.get("section_title", ""),
                    "similarity": round(best_score, 3),
                    "page": page,
                    "clause": clause,
                })
            else:
                unsupported_claims.append(claim)

        # Confidence = % of claims supported
        confidence = (len(supported_claims) / len(claims)) * 100 if claims else 0

        return {
            "confidence_score": round(confidence, 1),
            "supporting_clauses": sorted(supporting_clauses),
            "supporting_pages": sorted(supporting_pages),
            "unsupported_claims": unsupported_claims,
            "claim_evidence_pairs": claim_evidence_pairs,
        }

    def _extract_claims(self, text: str) -> List[str]:
        """
        Extract individual claims (sentences) from answer text.
        Filters out metadata lines, citations-only lines, etc.
        """
        # Split into sentences
        sentences = re.split(r'(?<=[.!?])\s+', text)

        claims = []
        for s in sentences:
            s = s.strip()
            # Skip very short "sentences" or pure formatting
            if len(s) < 20:
                continue
            # Skip lines that are just citations or formatting
            if s.startswith("**Note:**") or s.startswith("*API"):
                continue
            if s.startswith(">"):
                continue
            claims.append(s)

        return claims


# Singleton
_engine = None

def get_verification_engine() -> VerificationEngine:
    global _engine
    if _engine is None:
        _engine = VerificationEngine()
    return _engine

"""
Embedding Layer — configurable embeddings with SHA-256 caching.

Supports:
- Local: sentence-transformers (default, offline)
- Swap-in: any hosted embedding API
"""
import hashlib
import numpy as np
from typing import List, Dict, Optional
from app.config import settings

# In-memory embedding cache: content_hash -> embedding vector
_embedding_cache: Dict[str, np.ndarray] = {}


class EmbeddingEngine:
    """
    Configurable embedding engine.
    Default: sentence-transformers (all-MiniLM-L6-v2) for offline reliability.
    """

    def __init__(self, provider: str = None, model_name: str = None):
        self.provider = provider or settings.embedding_provider
        self.model_name = model_name or settings.embedding_model
        self._model = None
        self._dimension = None

    def _load_model(self):
        """Lazy-load the embedding model."""
        if self._model is not None:
            return

        if self.provider == "local":
            try:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer(self.model_name)
                self._dimension = self._model.get_sentence_embedding_dimension()
            except ImportError:
                print("WARNING: sentence-transformers not installed. Using fallback TF-IDF-style embeddings.")
                self._model = "fallback"
                self._dimension = 384  # match MiniLM dimension
        else:
            # Placeholder for hosted API
            self._model = "hosted"
            self._dimension = 384

    @property
    def dimension(self) -> int:
        self._load_model()
        return self._dimension

    def embed_texts(self, texts: List[str], use_cache: bool = True) -> np.ndarray:
        """
        Embed a list of texts. Returns shape (N, D) numpy array.
        Uses SHA-256 content hash caching to skip unchanged texts.
        """
        self._load_model()

        results = []
        texts_to_embed = []
        indices_to_embed = []

        for i, text in enumerate(texts):
            h = _content_hash(text)
            if use_cache and h in _embedding_cache:
                results.append((i, _embedding_cache[h]))
            else:
                texts_to_embed.append(text)
                indices_to_embed.append(i)
                results.append((i, None))  # placeholder

        if texts_to_embed:
            new_embeddings = self._compute_embeddings(texts_to_embed)
            for j, idx in enumerate(indices_to_embed):
                emb = new_embeddings[j]
                h = _content_hash(texts[idx])
                _embedding_cache[h] = emb
                # Replace placeholder
                results[idx] = (idx, emb)

        # Sort by original index and stack
        results.sort(key=lambda x: x[0])
        return np.array([r[1] for r in results])

    def embed_query(self, query: str) -> np.ndarray:
        """Embed a single query string. Returns shape (D,) vector."""
        return self.embed_texts([query], use_cache=False)[0]

    def _compute_embeddings(self, texts: List[str]) -> np.ndarray:
        """Compute embeddings using the configured model."""
        if self._model == "fallback":
            return self._fallback_embeddings(texts)
        elif self._model == "hosted":
            return self._fallback_embeddings(texts)
        else:
            # sentence-transformers model
            return self._model.encode(texts, show_progress_bar=False, convert_to_numpy=True)

    def _fallback_embeddings(self, texts: List[str]) -> np.ndarray:
        """
        Fallback: simple TF-IDF-style hashing embeddings.
        Not great quality, but works without any ML dependencies.
        """
        dim = self._dimension or 384
        embeddings = []
        for text in texts:
            # Deterministic hash-based embedding
            words = text.lower().split()
            vec = np.zeros(dim)
            for w in words:
                h = int(hashlib.md5(w.encode()).hexdigest(), 16)
                idx = h % dim
                vec[idx] += 1.0
            # Normalize
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm
            embeddings.append(vec)
        return np.array(embeddings)


def _content_hash(text: str) -> str:
    """SHA-256 hash of text for cache keying."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


# Singleton instance
_engine: Optional[EmbeddingEngine] = None


def get_embedding_engine() -> EmbeddingEngine:
    """Get or create the singleton embedding engine."""
    global _engine
    if _engine is None:
        _engine = EmbeddingEngine()
    return _engine

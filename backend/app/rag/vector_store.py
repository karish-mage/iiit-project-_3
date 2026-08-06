"""
ChromaDB Vector Store Layer — Production Grade.

Collections:
  Strategy collections (chunking comparison research):
    - fixed_chunks, recursive_chunks, semantic_chunks, adaptive_chunks
  Domain collections (production RAG):
    - insurance_policies, customer_profiles, claims, knowledge_base
"""
import time
import logging
from typing import List, Dict, Any, Optional, Tuple
import chromadb
from app.config import settings
from app.rag.embedding import get_embedding_engine

logger = logging.getLogger(__name__)

STRATEGY_COLLECTIONS = {
    "fixed": "fixed_chunks",
    "recursive": "recursive_chunks",
    "semantic": "semantic_chunks",
    "adaptive": "adaptive_chunks",
}

DOMAIN_COLLECTIONS = {
    "insurance_policies": "insurance_policies",
    "customer_profiles": "customer_profiles",
    "claims": "claims",
    "knowledge_base": "knowledge_base",
}


class VectorStore:
    """Manages ChromaDB collections for strategies and domain data."""

    def __init__(self, persist_dir: str = None):
        self.persist_dir = persist_dir or settings.chroma_persist_dir
        self._client = None
        self._collections: Dict[str, Any] = {}
        self._embedding_engine = get_embedding_engine()
        self._indexed_hashes: Dict[str, set] = {}  # collection -> set of content_hashes

    @property
    def client(self):
        if self._client is None:
            try:
                self._client = chromadb.PersistentClient(path=self.persist_dir)
            except Exception:
                # Fallback for older chromadb versions
                self._client = chromadb.Client()
            logger.info(f"ChromaDB client initialized at {self.persist_dir}")
        return self._client

    def get_collection(self, name: str):
        """Get or create a collection by name."""
        if name not in self._collections:
            self._collections[name] = self.client.get_or_create_collection(
                name=name,
                metadata={
                    "embedding_model": settings.embedding_model,
                    "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                },
            )
        return self._collections[name]

    def get_strategy_collection(self, strategy_name: str):
        """Get collection for a chunking strategy."""
        col_name = STRATEGY_COLLECTIONS.get(strategy_name, f"{strategy_name}_chunks")
        return self.get_collection(col_name)

    def get_domain_collection(self, domain: str):
        """Get collection for a domain (insurance_policies, claims, etc.)."""
        col_name = DOMAIN_COLLECTIONS.get(domain, domain)
        return self.get_collection(col_name)

    # ── Indexing (Strategy Collections) ───────────────────
    def index_chunks(self, chunks, strategy_name: str) -> int:
        """Embed and upsert chunks into the strategy's collection."""
        if not chunks:
            return 0

        collection = self.get_strategy_collection(strategy_name)
        texts = [c.text for c in chunks]
        embeddings = self._embedding_engine.embed_texts(texts).tolist()

        ids, metadatas, documents = [], [], []
        for i, chunk in enumerate(chunks):
            chunk_id = f"{strategy_name}_doc{chunk.doc_id}_c{i}"
            ids.append(chunk_id)
            documents.append(chunk.text)
            metadatas.append({
                "doc_id": chunk.doc_id,
                "document_name": getattr(chunk, 'filename', '') or '',
                "page_number": chunk.page_number or 0,
                "section_title": chunk.section_title or "",
                "clause_number": chunk.clause_number or "",
                "strategy_name": strategy_name,
                "char_count": chunk.char_count,
                "token_count": chunk.token_count,
                "content_hash": chunk.content_hash,
            })

        self._batch_upsert(collection, ids, embeddings, documents, metadatas)
        logger.info(f"Indexed {len(ids)} chunks into {strategy_name}")
        return len(ids)

    # ── Indexing (Domain Collections) ─────────────────────
    def index_domain_chunks(self, chunks_data: List[Dict[str, Any]],
                            domain: str) -> int:
        """Index chunks into a domain collection with rich metadata."""
        if not chunks_data:
            return 0

        collection = self.get_domain_collection(domain)
        texts = [c["text"] for c in chunks_data]
        embeddings = self._embedding_engine.embed_texts(texts).tolist()

        ids, metadatas, documents = [], [], []
        for i, chunk in enumerate(chunks_data):
            chunk_id = chunk.get("chunk_id", f"{domain}_c{i}_{int(time.time())}")

            # Deduplication check
            c_hash = chunk.get("content_hash", "")
            if c_hash and self._is_duplicate(domain, c_hash):
                continue

            ids.append(chunk_id)
            documents.append(chunk["text"])
            metadatas.append({
                "document_name": chunk.get("document_name", ""),
                "page_number": chunk.get("page_number", 0),
                "section": chunk.get("section", ""),
                "chunk_id": chunk_id,
                "customer_id": chunk.get("customer_id", ""),
                "customer_name": chunk.get("customer_name", ""),
                "policy_number": chunk.get("policy_number", ""),
                "insurance_type": chunk.get("insurance_type", ""),
                "claim_id": chunk.get("claim_id", ""),
                "source_file": chunk.get("source_file", ""),
                "upload_timestamp": chunk.get("upload_timestamp", ""),
                "content_hash": c_hash,
            })

        if ids:
            self._batch_upsert(collection, ids, embeddings[:len(ids)],
                               documents, metadatas)
            logger.info(f"Indexed {len(ids)} items into {domain}")
        return len(ids)

    def index_customer_records(self, records, domain: str = "customer_profiles") -> int:
        """Index customer records from the data ingester."""
        chunks_data = []
        for rec in records:
            chunks_data.append({
                "text": rec.searchable_text,
                "chunk_id": rec.record_id,
                "customer_id": rec.customer_id,
                "customer_name": rec.customer_name,
                "policy_number": rec.policy_number,
                "insurance_type": rec.insurance_type,
                "claim_id": rec.claim_id,
                "source_file": rec.source_file,
                "upload_timestamp": rec.upload_timestamp,
                "content_hash": rec.content_hash,
            })
        return self.index_domain_chunks(chunks_data, domain)

    # ── Query ─────────────────────────────────────────────
    def query(self, query_text: str, strategy_name: str, top_k: int = None
              ) -> Tuple[List[Dict[str, Any]], float]:
        """Query a strategy collection. Returns (results, latency_ms)."""
        top_k = top_k or settings.retrieval_top_k
        collection = self.get_strategy_collection(strategy_name)
        return self._do_query(collection, query_text, top_k)

    def query_domain(self, query_text: str, domain: str, top_k: int = None,
                     where_filter: Dict = None) -> Tuple[List[Dict[str, Any]], float]:
        """Query a domain collection with optional metadata filters."""
        top_k = top_k or settings.retrieval_top_k
        collection = self.get_domain_collection(domain)
        return self._do_query(collection, query_text, top_k, where_filter)

    def hybrid_search(self, query_text: str, top_k: int = None,
                      domains: List[str] = None,
                      where_filter: Dict = None) -> List[Dict[str, Any]]:
        """
        Hybrid search: query across multiple domain collections,
        merge and re-rank by similarity score.
        """
        top_k = top_k or settings.retrieval_top_k
        if domains is None:
            domains = list(DOMAIN_COLLECTIONS.keys())

        all_results = []
        for domain in domains:
            try:
                results, latency = self.query_domain(
                    query_text, domain, top_k, where_filter
                )
                for r in results:
                    r["collection"] = domain
                all_results.extend(results)
            except Exception as e:
                logger.warning(f"Hybrid search failed for {domain}: {e}")

        # Re-rank by similarity score and take top_k
        all_results.sort(key=lambda x: x.get("similarity_score", 0), reverse=True)
        return all_results[:top_k]

    # ── Delete / Update ───────────────────────────────────
    def delete_by_doc_id(self, doc_id: int, strategy_name: str = None):
        """Delete all chunks for a document from strategy collections."""
        strategies = [strategy_name] if strategy_name else list(STRATEGY_COLLECTIONS.keys())
        for s in strategies:
            try:
                col = self.get_strategy_collection(s)
                # Get all IDs matching this doc_id
                results = col.get(where={"doc_id": doc_id})
                if results and results["ids"]:
                    col.delete(ids=results["ids"])
                    logger.info(f"Deleted {len(results['ids'])} chunks for doc {doc_id} from {s}")
            except Exception as e:
                logger.warning(f"Delete failed for {s}: {e}")

    def delete_from_domain(self, domain: str, record_ids: List[str]):
        """Delete specific records from a domain collection."""
        try:
            col = self.get_domain_collection(domain)
            col.delete(ids=record_ids)
            logger.info(f"Deleted {len(record_ids)} records from {domain}")
        except Exception as e:
            logger.warning(f"Domain delete failed: {e}")

    # ── Stats ─────────────────────────────────────────────
    def get_collection_stats(self) -> Dict[str, int]:
        stats = {}
        for strategy, col_name in STRATEGY_COLLECTIONS.items():
            try:
                col = self.get_collection(col_name)
                stats[strategy] = col.count()
            except Exception:
                stats[strategy] = 0
        return stats

    def get_domain_stats(self) -> Dict[str, int]:
        stats = {}
        for domain, col_name in DOMAIN_COLLECTIONS.items():
            try:
                col = self.get_collection(col_name)
                stats[domain] = col.count()
            except Exception:
                stats[domain] = 0
        return stats

    def get_metadata(self, collection_name: str, limit: int = 100) -> List[Dict]:
        """Retrieve metadata from a collection."""
        try:
            col = self.get_collection(collection_name)
            results = col.get(limit=limit, include=["metadatas"])
            return results.get("metadatas", [])
        except Exception as e:
            logger.warning(f"Metadata retrieval failed: {e}")
            return []

    def clear_collection(self, name: str):
        try:
            self.client.delete_collection(name)
            self._collections.pop(name, None)
        except Exception:
            pass

    def list_collections(self) -> List[str]:
        try:
            return [c.name for c in self.client.list_collections()]
        except Exception:
            return list(STRATEGY_COLLECTIONS.values()) + list(DOMAIN_COLLECTIONS.values())

    # ── Internal helpers ──────────────────────────────────
    def _do_query(self, collection, query_text: str, top_k: int,
                  where_filter: Dict = None) -> Tuple[List[Dict], float]:
        start_time = time.time()
        query_embedding = self._embedding_engine.embed_query(query_text).tolist()

        kwargs = {
            "query_embeddings": [query_embedding],
            "n_results": top_k,
            "include": ["documents", "metadatas", "distances"],
        }
        if where_filter:
            kwargs["where"] = where_filter

        results = collection.query(**kwargs)
        latency_ms = (time.time() - start_time) * 1000

        parsed = []
        if results and results["ids"] and results["ids"][0]:
            for i in range(len(results["ids"][0])):
                distance = results["distances"][0][i] if results["distances"] else 0
                similarity = 1.0 / (1.0 + distance)
                parsed.append({
                    "chunk_id": results["ids"][0][i],
                    "text": results["documents"][0][i] if results["documents"] else "",
                    "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                    "similarity_score": round(similarity, 4),
                })

        return parsed, round(latency_ms, 2)

    def _batch_upsert(self, collection, ids, embeddings, documents, metadatas):
        batch_size = 100
        for start in range(0, len(ids), batch_size):
            end = min(start + batch_size, len(ids))
            collection.upsert(
                ids=ids[start:end],
                embeddings=embeddings[start:end],
                documents=documents[start:end],
                metadatas=metadatas[start:end],
            )

    def _is_duplicate(self, collection_name: str, content_hash: str) -> bool:
        if collection_name not in self._indexed_hashes:
            self._indexed_hashes[collection_name] = set()
        if content_hash in self._indexed_hashes[collection_name]:
            return True
        self._indexed_hashes[collection_name].add(content_hash)
        return False


# Singleton
_store: Optional[VectorStore] = None

def get_vector_store() -> VectorStore:
    global _store
    if _store is None:
        _store = VectorStore()
    return _store

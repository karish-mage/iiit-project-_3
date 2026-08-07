"""
Pydantic schemas for API request / response bodies.
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


# ── Document ──────────────────────────────────────────────
class DocumentOut(BaseModel):
    id: int
    filename: str
    page_count: int
    uploaded_at: Optional[datetime] = None
    status: str
    content_hash: Optional[str] = None
    has_tables: Optional[bool] = False
    used_ocr: Optional[bool] = False

    class Config:
        from_attributes = True


class UploadResponse(BaseModel):
    message: str
    documents: List[DocumentOut]


class ProcessResponse(BaseModel):
    message: str
    documents_processed: int
    chunks_created: Dict[str, int]   # strategy_name -> count


# ── Chunk ─────────────────────────────────────────────────
class ChunkOut(BaseModel):
    chunk_id: str
    doc_id: int = 0
    page_number: Optional[int] = None
    section_title: Optional[str] = None
    clause_number: Optional[str] = None
    char_count: int = 0
    token_count: int = 0
    text: str = ""
    similarity_score: Optional[float] = None
    document_name: Optional[str] = None

    class Config:
        from_attributes = True


# ── Query ─────────────────────────────────────────────────
class AskRequest(BaseModel):
    query: str = Field(..., min_length=3, description="Insurance question to answer")
    session_id: str = Field("default", description="Session ID for conversation memory")
    use_llm_judge: bool = Field(False, description="Use Gemini as context-relevance judge")


class StrategyResult(BaseModel):
    strategy_name: str
    chunks: List[ChunkOut]
    similarity_scores: List[float]
    retrieval_latency_ms: float
    precision_at_k: Optional[float] = None
    recall_at_k: Optional[float] = None
    context_relevance: Optional[float] = None
    final_score: Optional[float] = None


class AskResponse(BaseModel):
    query: str
    answer: str
    strategy_used: str
    confidence_score: float
    supporting_clauses: List[str]
    supporting_pages: List[int]
    unsupported_claims: List[str]
    strategy_scores: Dict[str, float]
    cached: bool = False


class CompareResponse(BaseModel):
    query: str
    strategies: List[StrategyResult]
    winner: str
    winner_score: float


# ── Chat (Streaming) ─────────────────────────────────────
class ChatRequest(BaseModel):
    query: str = Field(..., min_length=3)
    session_id: str = "default"
    stream: bool = True


class ChatStreamChunk(BaseModel):
    text: str
    done: bool = False
    metadata: Optional[Dict[str, Any]] = None


# ── Customer Data ─────────────────────────────────────────
class CustomerRecordOut(BaseModel):
    record_id: str
    customer_id: str = ""
    customer_name: str = ""
    policy_number: str = ""
    insurance_type: str = ""
    claim_id: str = ""
    source_file: str = ""

    class Config:
        from_attributes = True


class CustomerUploadResponse(BaseModel):
    message: str
    records_ingested: int
    records_indexed: int
    source_file: str


# ── Hybrid Search ─────────────────────────────────────────
class HybridSearchRequest(BaseModel):
    query: str = Field(..., min_length=2)
    domains: Optional[List[str]] = None  # insurance_policies, customer_profiles, claims, knowledge_base
    top_k: int = Field(10, ge=1, le=50)
    filters: Optional[Dict[str, str]] = None  # metadata filters


class SearchResult(BaseModel):
    chunk_id: str
    text: str
    similarity_score: float
    collection: str = ""
    metadata: Dict[str, Any] = {}


class HybridSearchResponse(BaseModel):
    query: str
    total_results: int
    results: List[SearchResult]


# ── Metadata ──────────────────────────────────────────────
class MetadataResponse(BaseModel):
    collection: str
    count: int
    metadata: List[Dict[str, Any]]


# ── Delete ────────────────────────────────────────────────
class DeleteResponse(BaseModel):
    message: str
    deleted_count: int = 0


# ── Evaluation ────────────────────────────────────────────
class EvaluationRun(BaseModel):
    query: str
    strategy_name: str
    precision_at_k: float
    recall_at_k: float
    context_relevance: float
    response_time_ms: float
    final_score: float


class EvaluateResponse(BaseModel):
    message: str
    total_queries: int
    results: List[EvaluationRun]
    strategy_summary: Dict[str, Dict[str, float]]


# ── Health ────────────────────────────────────────────────
class HealthResponse(BaseModel):
    status: str
    version: str
    documents_indexed: int
    total_chunks: int
    collections: List[str]
    llm_configured: bool = False
    domain_stats: Optional[Dict[str, int]] = None


# ── Stats (Home Page) ─────────────────────────────────────
class StatsResponse(BaseModel):
    documents_indexed: int
    queries_answered: int
    strategies_available: int = 4
    avg_confidence: float
    total_chunks: int = 0
    avg_accuracy: float = 0.0
    avg_precision: float = 0.0
    avg_recall: float = 0.0
    avg_context_relevance: float = 0.0
    avg_response_time_ms: float = 0.0
    active_provider: str = "none"
    active_model: str = "not-set"


# ── Evaluation Results (Analytics Dashboard) ──────────────
class EvaluationResultOut(BaseModel):
    id: int
    query_id: int
    query_text: Optional[str] = None
    strategy_name: str
    precision_at_k: float
    recall_at_k: float
    context_relevance: float
    response_time_ms: float
    final_score: float

    class Config:
        from_attributes = True


class EvaluationResultsResponse(BaseModel):
    total: int
    results: List[EvaluationResultOut]
    strategy_summary: Dict[str, Dict[str, float]]


# ── Analytics ─────────────────────────────────────────────
class AnalyticsResponse(BaseModel):
    total_documents: int
    total_queries: int
    total_chunks: Dict[str, int]
    avg_confidence: float
    strategy_win_rates: Dict[str, float]
    avg_metrics_per_strategy: Dict[str, Dict[str, float]]
    domain_stats: Optional[Dict[str, int]] = None
    strategy_summary: Optional[Dict[str, Dict[str, float]]] = None

"""
SQLAlchemy ORM models — 8 tables.
"""
from sqlalchemy import (
    Column, Integer, String, Float, Text, DateTime, ForeignKey, JSON, Boolean
)
from sqlalchemy.sql import func
from app.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    filename = Column(String(512), nullable=False)
    page_count = Column(Integer, default=0)
    uploaded_at = Column(DateTime, server_default=func.now())
    status = Column(String(50), default="uploaded")  # uploaded | processing | indexed | error
    content_hash = Column(String(64), nullable=True)  # SHA-256 for incremental indexing
    document_name = Column(String(512), nullable=True)  # Display name
    has_tables = Column(Boolean, default=False)
    used_ocr = Column(Boolean, default=False)


class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    doc_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    strategy_name = Column(String(50), nullable=False)   # fixed | recursive | semantic | adaptive
    page_number = Column(Integer, nullable=True)
    section_title = Column(String(512), nullable=True)
    clause_number = Column(String(50), nullable=True)
    char_count = Column(Integer, default=0)
    token_count = Column(Integer, default=0)
    content_hash = Column(String(64), nullable=False)     # SHA-256
    text = Column(Text, nullable=False)
    document_name = Column(String(512), nullable=True)    # Source document name


class Query(Base):
    __tablename__ = "queries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    query_text = Column(Text, nullable=False)
    asked_at = Column(DateTime, server_default=func.now())


class RetrievalLog(Base):
    __tablename__ = "retrieval_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    query_id = Column(Integer, ForeignKey("queries.id"), nullable=False)
    strategy_name = Column(String(50), nullable=False)
    chunk_id = Column(String(128), nullable=False)        # ChromaDB chunk id
    similarity_score = Column(Float, default=0.0)
    rank = Column(Integer, default=0)
    latency_ms = Column(Float, default=0.0)


class EvaluationResult(Base):
    __tablename__ = "evaluation_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    query_id = Column(Integer, ForeignKey("queries.id"), nullable=False)
    strategy_name = Column(String(50), nullable=False)
    precision_at_k = Column(Float, default=0.0)
    recall_at_k = Column(Float, default=0.0)
    context_relevance = Column(Float, default=0.0)
    response_time_ms = Column(Float, default=0.0)
    final_score = Column(Float, default=0.0)


class Answer(Base):
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    query_id = Column(Integer, ForeignKey("queries.id"), nullable=False)
    strategy_used = Column(String(50), nullable=False)
    answer_text = Column(Text, nullable=False)
    confidence_score = Column(Float, default=0.0)
    supporting_clauses = Column(JSON, nullable=True)      # list of clause strings
    supporting_pages = Column(JSON, nullable=True)         # list of page numbers
    created_at = Column(DateTime, server_default=func.now())


class CustomerRecord(Base):
    """Structured customer/policy/claims data from CSV/Excel/JSON."""
    __tablename__ = "customer_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    record_id = Column(String(256), nullable=False, unique=True)
    customer_id = Column(String(128), nullable=True)
    customer_name = Column(String(512), nullable=True)
    policy_number = Column(String(128), nullable=True)
    insurance_type = Column(String(128), nullable=True)
    claim_id = Column(String(128), nullable=True)
    source_file = Column(String(512), nullable=False)
    upload_timestamp = Column(String(64), nullable=True)
    searchable_text = Column(Text, nullable=True)
    raw_data = Column(JSON, nullable=True)
    content_hash = Column(String(64), nullable=True)
    indexed = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())


class IngestionLog(Base):
    """Tracks file-level ingestion for incremental indexing."""
    __tablename__ = "ingestion_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    filename = Column(String(512), nullable=False)
    file_hash = Column(String(64), nullable=False)  # SHA-256 of file bytes
    file_type = Column(String(20), nullable=True)    # pdf, csv, xlsx, json
    status = Column(String(50), default="pending")   # pending | indexed | error
    records_processed = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

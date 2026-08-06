"""
FastAPI Application — Adaptive RAG Insurance Decision Engine.
Production-grade with 14 endpoints, logging, streaming, and validation.
"""
import os
import time
import json
import logging
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import settings, validate_api_key
from app.database import get_db, init_db
from app.models import models
from app.models.schemas import (
    HealthResponse, UploadResponse, DocumentOut, ProcessResponse,
    AskRequest, AskResponse, CompareResponse, StrategyResult,
    ChunkOut, EvaluateResponse, EvaluationRun, AnalyticsResponse,
    ChatRequest, CustomerUploadResponse,
    HybridSearchRequest, HybridSearchResponse, SearchResult,
    MetadataResponse, DeleteResponse,
    StatsResponse, EvaluationResultOut, EvaluationResultsResponse,
)
from app.services.document_processor import (
    extract_text_from_pdf, extract_text_from_txt, content_hash,
    count_tokens, file_hash,
)
from app.rag.chunkers.fixed import FixedChunker
from app.rag.chunkers.recursive import RecursiveChunker
from app.rag.chunkers.semantic import SemanticChunker
from app.rag.chunkers.adaptive import AdaptiveChunker
from app.rag.embedding import get_embedding_engine
from app.rag.vector_store import get_vector_store
from app.rag.retrieval import get_retrieval_engine
from app.services.evaluation import get_evaluation_engine
from app.rag.strategy_selector import get_strategy_selector
from app.services.answer_generator import get_answer_generator, sanitize_input
from app.services.verification import get_verification_engine
from app.services.data_ingester import get_data_ingester

# ── Logging setup ─────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("rag_engine")

# ── App init ──────────────────────────────────────────────
app = FastAPI(
    title="Insurance Division",
    description="AI-powered insurance intelligence platform — empirically compares four chunking strategies, auto-selects the best per query, and verifies answers against retrieved evidence.",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_llm_validated = False


@app.on_event("startup")
def startup():
    global _llm_validated
    init_db()
    os.makedirs(settings.raw_pdfs_dir, exist_ok=True)
    os.makedirs(settings.synthetic_dir, exist_ok=True)
    os.makedirs(settings.customer_data_dir, exist_ok=True)
    _llm_validated = validate_api_key()
    logger.info("🚀 Insurance Division started")


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


# ═══════════════════════════════════════════════════════════
# 1. HEALTH CHECK
# ═══════════════════════════════════════════════════════════
@app.get("/health", response_model=HealthResponse)
def health_check(db: Session = Depends(get_db)):
    total_docs = db.query(models.Document).filter_by(status="indexed").count()
    store = get_vector_store()
    stats = store.get_collection_stats()
    total_chunks = sum(stats.values())
    collections = store.list_collections()
    domain_stats = store.get_domain_stats()

    return HealthResponse(
        status="healthy",
        version="3.0.0",
        documents_indexed=total_docs,
        total_chunks=total_chunks,
        collections=collections,
        llm_configured=_llm_validated,
        domain_stats=domain_stats,
    )


# ═══════════════════════════════════════════════════════════
# 2. UPLOAD DOCUMENTS (PDF/TXT)
# ═══════════════════════════════════════════════════════════
@app.post("/upload-documents", response_model=UploadResponse)
async def upload_documents(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    """Accept multiple PDFs/TXT files, store and persist metadata."""
    uploaded = []
    for f in files:
        ext = os.path.splitext(f.filename)[1].lower()
        if ext not in (".pdf", ".txt"):
            continue

        filepath = os.path.join(settings.raw_pdfs_dir, f.filename)
        file_content = await f.read()
        with open(filepath, "wb") as out:
            out.write(file_content)

        # Check for duplicates via file hash
        f_hash = file_hash(filepath)
        existing = db.query(models.IngestionLog).filter_by(file_hash=f_hash).first()
        if existing:
            logger.info(f"Skipping duplicate file: {f.filename}")
            continue

        page_count = 0
        try:
            if ext == ".pdf":
                doc = extract_text_from_pdf(filepath)
                page_count = doc.page_count
            else:
                doc = extract_text_from_txt(filepath)
                page_count = doc.page_count
        except Exception:
            page_count = 1

        db_doc = models.Document(
            filename=f.filename,
            page_count=page_count,
            status="uploaded",
            content_hash=f_hash,
        )
        db.add(db_doc)

        # Log ingestion
        db.add(models.IngestionLog(
            filename=f.filename,
            file_hash=f_hash,
            file_type=ext.lstrip("."),
            status="uploaded",
        ))
        db.commit()
        db.refresh(db_doc)
        uploaded.append(DocumentOut.model_validate(db_doc))

    return UploadResponse(
        message=f"Uploaded {len(uploaded)} document(s)",
        documents=uploaded,
    )


# ═══════════════════════════════════════════════════════════
# 3. PROCESS DOCUMENTS (Extract → Chunk → Embed → Index)
# ═══════════════════════════════════════════════════════════
@app.post("/process-documents", response_model=ProcessResponse)
def process_documents(db: Session = Depends(get_db)):
    """Extract text, chunk with all 4 strategies, embed, and index."""
    # Auto-scan raw_pdfs_dir for unregistered files
    if os.path.exists(settings.raw_pdfs_dir):
        for fname in os.listdir(settings.raw_pdfs_dir):
            if fname.lower().endswith((".pdf", ".txt")) and not fname.startswith("."):
                existing = db.query(models.Document).filter_by(filename=fname).first()
                if not existing:
                    filepath = os.path.join(settings.raw_pdfs_dir, fname)
                    page_count = 0
                    try:
                        ext = os.path.splitext(fname)[1].lower()
                        if ext == ".pdf":
                            doc = extract_text_from_pdf(filepath)
                            page_count = doc.page_count
                        else:
                            doc = extract_text_from_txt(filepath)
                            page_count = doc.page_count
                    except Exception:
                        page_count = 1

                    db_doc = models.Document(
                        filename=fname,
                        page_count=page_count,
                        status="uploaded",
                        content_hash=file_hash(filepath),
                    )
                    db.add(db_doc)
                    db.commit()

    docs = db.query(models.Document).filter(
        models.Document.status.in_(["uploaded", "error"])
    ).all()

    # Initialize chunkers
    chunkers = {
        "fixed": FixedChunker(settings.fixed_chunk_size, settings.fixed_chunk_overlap),
        "recursive": RecursiveChunker(settings.recursive_chunk_size, settings.recursive_chunk_overlap),
        "semantic": SemanticChunker(
            breakpoint_threshold=settings.semantic_breakpoint_threshold,
            max_chunk_size=settings.adaptive_max_chunk_size,
        ),
        "adaptive": AdaptiveChunker(
            max_chunk_size=settings.adaptive_max_chunk_size,
            min_chunk_size=settings.adaptive_min_chunk_size,
        ),
    }

    store = get_vector_store()
    chunks_created = {"fixed": 0, "recursive": 0, "semantic": 0, "adaptive": 0}

    all_docs = list(docs)

    # Also process synthetic docs if no uploaded docs exist
    if not all_docs:
        synthetic_dir = settings.synthetic_dir
        if os.path.exists(synthetic_dir):
            for fname in os.listdir(synthetic_dir):
                fpath = os.path.join(synthetic_dir, fname)
                if os.path.isfile(fpath) and fname.endswith(".txt"):
                    existing = db.query(models.Document).filter_by(filename=fname).first()
                    if not existing:
                        ext_doc = extract_text_from_txt(fpath)
                        db_doc = models.Document(
                            filename=fname,
                            page_count=ext_doc.page_count,
                            status="uploaded",
                        )
                        db.add(db_doc)
                        db.commit()
                        db.refresh(db_doc)
                        all_docs.append(db_doc)

    docs_processed = 0
    for db_doc in all_docs:
        try:
            db_doc.status = "processing"
            db.commit()

            # Find the file
            filepath = os.path.join(settings.raw_pdfs_dir, db_doc.filename)
            if not os.path.exists(filepath):
                filepath = os.path.join(settings.synthetic_dir, db_doc.filename)
            if not os.path.exists(filepath):
                db_doc.status = "error"
                db.commit()
                continue

            # Incremental indexing: skip if content hasn't changed
            f_hash = file_hash(filepath)
            if db_doc.content_hash and db_doc.content_hash == f_hash and db_doc.status == "indexed":
                logger.info(f"Skipping unchanged file: {db_doc.filename}")
                continue

            # Extract text
            ext = os.path.splitext(db_doc.filename)[1].lower()
            if ext == ".pdf":
                extracted = extract_text_from_pdf(filepath, db_doc.id)
            else:
                extracted = extract_text_from_txt(filepath, db_doc.id)

            # Update doc metadata
            db_doc.content_hash = extracted.content_hash
            db_doc.has_tables = getattr(extracted, 'has_tables', False)
            db_doc.used_ocr = getattr(extracted, 'used_ocr', False)

            # Chunk with all 4 strategies
            for strategy_name, chunker in chunkers.items():
                full_text = extracted.full_text
                chunk_list = chunker.chunk(
                    text=full_text,
                    doc_id=db_doc.id,
                    page_number=extracted.pages[0].page_number if extracted.pages else 1,
                )

                # Set filename on chunks
                for c in chunk_list:
                    c.filename = db_doc.filename

                # Persist chunks to SQLite
                for c in chunk_list:
                    db_chunk = models.Chunk(
                        doc_id=db_doc.id,
                        strategy_name=strategy_name,
                        page_number=c.page_number,
                        section_title=c.section_title,
                        clause_number=c.clause_number,
                        char_count=c.char_count,
                        token_count=c.token_count,
                        content_hash=c.content_hash,
                        text=c.text,
                        document_name=db_doc.filename,
                    )
                    db.add(db_chunk)

                # Index in ChromaDB
                indexed_count = store.index_chunks(chunk_list, strategy_name)
                chunks_created[strategy_name] += indexed_count

            # Also index into knowledge_base domain collection
            for page in extracted.pages:
                store.index_domain_chunks([{
                    "text": page.text,
                    "chunk_id": f"kb_doc{db_doc.id}_p{page.page_number}",
                    "document_name": db_doc.filename,
                    "page_number": page.page_number,
                    "section": "",
                    "source_file": db_doc.filename,
                    "upload_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "content_hash": content_hash(page.text),
                }], domain="knowledge_base")

            db_doc.status = "indexed"
            db.commit()
            docs_processed += 1
            logger.info(f"✅ Processed: {db_doc.filename} ({sum(chunks_created.values())} total chunks)")

        except Exception as e:
            db_doc.status = "error"
            db.commit()
            logger.error(f"❌ Error processing {db_doc.filename}: {e}")

    return ProcessResponse(
        message=f"Processed {docs_processed} document(s)",
        documents_processed=docs_processed,
        chunks_created=chunks_created,
    )


# ═══════════════════════════════════════════════════════════
# 4. ASK QUESTION (Full RAG Pipeline)
# ═══════════════════════════════════════════════════════════
@app.post("/ask", response_model=AskResponse)
def ask_question(request: AskRequest, db: Session = Depends(get_db)):
    """Full pipeline: retrieve → evaluate → select → generate → verify."""
    query = sanitize_input(request.query)

    db_query = models.Query(query_text=query)
    db.add(db_query)
    db.commit()
    db.refresh(db_query)

    retrieval = get_retrieval_engine()
    all_results = retrieval.retrieve_all_strategies(query)

    evaluator = get_evaluation_engine()
    eval_results = {}
    for strategy, result in all_results.items():
        metrics = evaluator.evaluate_retrieval(
            query=query,
            strategy_name=strategy,
            retrieved_chunks=result["chunks"],
            similarity_scores=result["scores"],
            latency_ms=result["latency_ms"],
            use_llm_judge=request.use_llm_judge,
        )
        eval_results[strategy] = metrics

        db_eval = models.EvaluationResult(
            query_id=db_query.id,
            strategy_name=strategy,
            precision_at_k=metrics["precision_at_k"],
            recall_at_k=metrics["recall_at_k"],
            context_relevance=metrics["context_relevance"],
            response_time_ms=metrics["response_time_ms"],
            final_score=0,
        )
        db.add(db_eval)

        for i, chunk in enumerate(result["chunks"]):
            db_log = models.RetrievalLog(
                query_id=db_query.id,
                strategy_name=strategy,
                chunk_id=chunk.get("chunk_id", ""),
                similarity_score=chunk.get("similarity_score", 0),
                rank=i + 1,
                latency_ms=result["latency_ms"],
            )
            db.add(db_log)

    selector = get_strategy_selector()
    winner, winner_score, scores = selector.select_best_strategy(eval_results)

    for strategy, score in scores.items():
        db.query(models.EvaluationResult).filter_by(
            query_id=db_query.id, strategy_name=strategy
        ).update({"final_score": score})

    generator = get_answer_generator()
    winning_chunks = all_results[winner]["chunks"]
    answer_result = generator.generate_answer(
        query, winning_chunks, winner, session_id=request.session_id
    )

    verifier = get_verification_engine()
    verification = verifier.verify_answer(answer_result["answer_text"], winning_chunks)

    db_answer = models.Answer(
        query_id=db_query.id,
        strategy_used=winner,
        answer_text=answer_result["answer_text"],
        confidence_score=verification["confidence_score"],
        supporting_clauses=verification["supporting_clauses"],
        supporting_pages=verification["supporting_pages"],
    )
    db.add(db_answer)
    db.commit()

    return AskResponse(
        query=query,
        answer=answer_result["answer_text"],
        strategy_used=winner,
        confidence_score=verification["confidence_score"],
        supporting_clauses=verification["supporting_clauses"],
        supporting_pages=verification["supporting_pages"],
        unsupported_claims=verification["unsupported_claims"],
        strategy_scores=scores,
        cached=answer_result.get("cached", False),
    )


# ═══════════════════════════════════════════════════════════
# 5. STREAMING CHAT (SSE)
# ═══════════════════════════════════════════════════════════
@app.post("/chat")
async def chat_stream(request: ChatRequest):
    """Streaming chat endpoint using Server-Sent Events."""
    from starlette.responses import StreamingResponse

    query = sanitize_input(request.query)

    # Retrieve context
    retrieval = get_retrieval_engine()
    all_results = retrieval.retrieve_all_strategies(query)

    # Pick best strategy quickly
    evaluator = get_evaluation_engine()
    eval_results = {}
    for strategy, result in all_results.items():
        metrics = evaluator.evaluate_retrieval(
            query=query, strategy_name=strategy,
            retrieved_chunks=result["chunks"],
            similarity_scores=result["scores"],
            latency_ms=result["latency_ms"],
        )
        eval_results[strategy] = metrics

    selector = get_strategy_selector()
    winner, _, _ = selector.select_best_strategy(eval_results)
    winning_chunks = all_results[winner]["chunks"]

    generator = get_answer_generator()

    if request.stream:
        def event_generator():
            for text_chunk in generator.generate_stream(
                query, winning_chunks, winner, session_id=request.session_id
            ):
                yield f"data: {json.dumps({'text': text_chunk, 'done': False})}\n\n"
            # Send metadata at the end
            metadata = {
                "strategy_used": winner,
                "chunks_used": len(winning_chunks),
                "sources": [
                    {"document": c.get("document_name", ""), "page": c.get("page_number", 0)}
                    for c in winning_chunks[:3]
                ],
            }
            yield f"data: {json.dumps({'text': '', 'done': True, 'metadata': metadata})}\n\n"

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )
    else:
        answer_result = generator.generate_answer(
            query, winning_chunks, winner, session_id=request.session_id
        )
        return {"text": answer_result["answer_text"], "done": True, "metadata": {"strategy_used": winner}}


# ═══════════════════════════════════════════════════════════
# 6. UPLOAD CUSTOMER DATA (CSV/Excel/JSON)
# ═══════════════════════════════════════════════════════════
@app.post("/upload-customer-data", response_model=CustomerUploadResponse)
async def upload_customer_data(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload and ingest CSV/Excel/JSON customer data."""
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in (".csv", ".xlsx", ".xls", ".json"):
        raise HTTPException(400, f"Unsupported file type: {ext}. Use CSV, Excel, or JSON.")

    os.makedirs(settings.customer_data_dir, exist_ok=True)
    filepath = os.path.join(settings.customer_data_dir, file.filename)
    file_content = await file.read()
    with open(filepath, "wb") as out:
        out.write(file_content)

    # Check for duplicates
    f_hash = file_hash(filepath)
    existing = db.query(models.IngestionLog).filter_by(file_hash=f_hash).first()
    if existing:
        return CustomerUploadResponse(
            message=f"File already ingested: {file.filename}",
            records_ingested=0,
            records_indexed=0,
            source_file=file.filename,
        )

    # Ingest
    ingester = get_data_ingester()
    try:
        records = ingester.ingest_file(filepath)
    except Exception as e:
        raise HTTPException(500, f"Ingestion failed: {e}")

    # Persist to SQLite
    for rec in records:
        existing_rec = db.query(models.CustomerRecord).filter_by(record_id=rec.record_id).first()
        if not existing_rec:
            db_rec = models.CustomerRecord(
                record_id=rec.record_id,
                customer_id=rec.customer_id,
                customer_name=rec.customer_name,
                policy_number=rec.policy_number,
                insurance_type=rec.insurance_type,
                claim_id=rec.claim_id,
                source_file=rec.source_file,
                upload_timestamp=rec.upload_timestamp,
                searchable_text=rec.searchable_text,
                raw_data=rec.raw_data,
                content_hash=rec.content_hash,
            )
            db.add(db_rec)

    # Determine domain based on content
    domain = _detect_domain(records)

    # Index in ChromaDB
    store = get_vector_store()
    indexed = store.index_customer_records(records, domain=domain)

    # Log ingestion
    db.add(models.IngestionLog(
        filename=file.filename,
        file_hash=f_hash,
        file_type=ext.lstrip("."),
        status="indexed",
        records_processed=len(records),
    ))
    db.commit()

    logger.info(f"✅ Customer data: {len(records)} records from {file.filename} → {domain}")

    return CustomerUploadResponse(
        message=f"Ingested {len(records)} records into {domain}",
        records_ingested=len(records),
        records_indexed=indexed,
        source_file=file.filename,
    )


# ═══════════════════════════════════════════════════════════
# 7. HYBRID SEARCH (Keyword + Vector across domains)
# ═══════════════════════════════════════════════════════════
@app.post("/search", response_model=HybridSearchResponse)
def hybrid_search(request: HybridSearchRequest):
    """Hybrid search across domain collections with optional filters."""
    query = sanitize_input(request.query)
    store = get_vector_store()

    where_filter = None
    if request.filters:
        # Build ChromaDB where filter
        conditions = []
        for key, value in request.filters.items():
            conditions.append({key: value})
        if len(conditions) == 1:
            where_filter = conditions[0]
        elif len(conditions) > 1:
            where_filter = {"$and": conditions}

    results = store.hybrid_search(
        query_text=query,
        top_k=request.top_k,
        domains=request.domains,
        where_filter=where_filter,
    )

    search_results = [
        SearchResult(
            chunk_id=r.get("chunk_id", ""),
            text=r.get("text", ""),
            similarity_score=r.get("similarity_score", 0),
            collection=r.get("collection", ""),
            metadata=r.get("metadata", {}),
        )
        for r in results
    ]

    return HybridSearchResponse(
        query=query,
        total_results=len(search_results),
        results=search_results,
    )


# ═══════════════════════════════════════════════════════════
# 8. COMPARE STRATEGIES
# ═══════════════════════════════════════════════════════════
@app.post("/compare-strategies", response_model=CompareResponse)
def compare_strategies(request: AskRequest, db: Session = Depends(get_db)):
    """Side-by-side retrieval + metrics for all 4 strategies."""
    query = sanitize_input(request.query)

    retrieval = get_retrieval_engine()
    all_results = retrieval.retrieve_all_strategies(query)

    evaluator = get_evaluation_engine()
    strategies = []
    eval_results = {}

    for strategy, result in all_results.items():
        metrics = evaluator.evaluate_retrieval(
            query=query,
            strategy_name=strategy,
            retrieved_chunks=result["chunks"],
            similarity_scores=result["scores"],
            latency_ms=result["latency_ms"],
            use_llm_judge=request.use_llm_judge,
        )
        eval_results[strategy] = metrics

        chunk_outs = [
            ChunkOut(
                chunk_id=c.get("chunk_id", ""),
                doc_id=c.get("doc_id", 0),
                page_number=c.get("page_number"),
                section_title=c.get("section_title"),
                clause_number=c.get("clause_number"),
                char_count=c.get("char_count", 0),
                token_count=c.get("token_count", 0),
                text=c.get("text", ""),
                similarity_score=c.get("similarity_score"),
                document_name=c.get("document_name", ""),
            )
            for c in result["chunks"]
        ]

        strategies.append(StrategyResult(
            strategy_name=strategy,
            chunks=chunk_outs,
            similarity_scores=result["scores"],
            retrieval_latency_ms=result["latency_ms"],
            precision_at_k=metrics["precision_at_k"],
            recall_at_k=metrics["recall_at_k"],
            context_relevance=metrics["context_relevance"],
            final_score=0,
        ))

    selector = get_strategy_selector()
    winner, winner_score, scores = selector.select_best_strategy(eval_results)

    for sr in strategies:
        sr.final_score = scores.get(sr.strategy_name, 0)

    return CompareResponse(
        query=query,
        strategies=strategies,
        winner=winner,
        winner_score=winner_score,
    )


# ═══════════════════════════════════════════════════════════
# 9. EVALUATE (Benchmark)
# ═══════════════════════════════════════════════════════════
@app.post("/evaluate", response_model=EvaluateResponse)
def run_evaluation(db: Session = Depends(get_db)):
    """Run evaluation suite against benchmark question set."""
    benchmark_path = os.path.join(os.path.dirname(__file__), "..", "tests", "benchmark_questions.json")
    if not os.path.exists(benchmark_path):
        benchmark = _default_benchmark_questions()
    else:
        with open(benchmark_path) as f:
            benchmark = json.load(f)

    retrieval = get_retrieval_engine()
    evaluator = get_evaluation_engine()
    results = []
    strategy_totals = {}

    for item in benchmark:
        query = item["question"]
        all_results = retrieval.retrieve_all_strategies(query)

        for strategy, result in all_results.items():
            metrics = evaluator.evaluate_retrieval(
                query=query, strategy_name=strategy,
                retrieved_chunks=result["chunks"],
                similarity_scores=result["scores"],
                latency_ms=result["latency_ms"],
            )

            selector = get_strategy_selector()
            _, _, scores = selector.select_best_strategy({strategy: metrics})

            run = EvaluationRun(
                query=query, strategy_name=strategy,
                precision_at_k=metrics["precision_at_k"],
                recall_at_k=metrics["recall_at_k"],
                context_relevance=metrics["context_relevance"],
                response_time_ms=metrics["response_time_ms"],
                final_score=scores.get(strategy, 0),
            )
            results.append(run)

            if strategy not in strategy_totals:
                strategy_totals[strategy] = {
                    "precision_sum": 0, "recall_sum": 0, "relevance_sum": 0,
                    "time_sum": 0, "score_sum": 0, "count": 0,
                }
            st = strategy_totals[strategy]
            st["precision_sum"] += metrics["precision_at_k"]
            st["recall_sum"] += metrics["recall_at_k"]
            st["relevance_sum"] += metrics["context_relevance"]
            st["time_sum"] += metrics["response_time_ms"]
            st["score_sum"] += scores.get(strategy, 0)
            st["count"] += 1

    summary = {}
    for strategy, st in strategy_totals.items():
        n = max(st["count"], 1)
        summary[strategy] = {
            "avg_precision": round(st["precision_sum"] / n, 4),
            "avg_recall": round(st["recall_sum"] / n, 4),
            "avg_context_relevance": round(st["relevance_sum"] / n, 4),
            "avg_response_time_ms": round(st["time_sum"] / n, 2),
            "avg_final_score": round(st["score_sum"] / n, 4),
        }

    return EvaluateResponse(
        message=f"Evaluated {len(benchmark)} queries across 4 strategies",
        total_queries=len(benchmark),
        results=results,
        strategy_summary=summary,
    )


# ═══════════════════════════════════════════════════════════
# 10. ANALYTICS
# ═══════════════════════════════════════════════════════════
@app.get("/analytics", response_model=AnalyticsResponse)
def get_analytics(db: Session = Depends(get_db)):
    """Aggregate analytics across all evaluation runs."""
    from sqlalchemy import func

    total_docs = db.query(models.Document).count()
    total_queries = db.query(models.Query).count()

    chunk_counts = dict(
        db.query(models.Chunk.strategy_name, func.count(models.Chunk.id))
        .group_by(models.Chunk.strategy_name).all()
    )

    avg_conf_result = db.query(func.avg(models.Answer.confidence_score)).scalar()
    avg_confidence = float(avg_conf_result) if avg_conf_result else 0.0

    win_counts = dict(
        db.query(models.Answer.strategy_used, func.count(models.Answer.id))
        .group_by(models.Answer.strategy_used).all()
    )
    total_answers = sum(win_counts.values()) if win_counts else 1
    win_rates = {k: round(v / total_answers, 4) for k, v in win_counts.items()}

    avg_metrics = {}
    eval_rows = (
        db.query(
            models.EvaluationResult.strategy_name,
            func.avg(models.EvaluationResult.precision_at_k),
            func.avg(models.EvaluationResult.recall_at_k),
            func.avg(models.EvaluationResult.context_relevance),
            func.avg(models.EvaluationResult.response_time_ms),
            func.avg(models.EvaluationResult.final_score),
        )
        .group_by(models.EvaluationResult.strategy_name)
        .all()
    )
    for row in eval_rows:
        avg_metrics[row[0]] = {
            "avg_precision": round(float(row[1] or 0), 4),
            "avg_recall": round(float(row[2] or 0), 4),
            "avg_context_relevance": round(float(row[3] or 0), 4),
            "avg_response_time_ms": round(float(row[4] or 0), 2),
            "avg_final_score": round(float(row[5] or 0), 4),
        }

    store = get_vector_store()
    domain_stats = store.get_domain_stats()

    return AnalyticsResponse(
        total_documents=total_docs,
        total_queries=total_queries,
        total_chunks=chunk_counts,
        avg_confidence=round(avg_confidence, 2),
        strategy_win_rates=win_rates,
        avg_metrics_per_strategy=avg_metrics,
        domain_stats=domain_stats,
    )


# ═══════════════════════════════════════════════════════════
# 11. LIST DOCUMENTS
# ═══════════════════════════════════════════════════════════
@app.get("/documents", response_model=List[DocumentOut])
def list_documents(db: Session = Depends(get_db)):
    docs = db.query(models.Document).order_by(models.Document.uploaded_at.desc()).all()
    return [DocumentOut.model_validate(d) for d in docs]


# ═══════════════════════════════════════════════════════════
# 12. DELETE DOCUMENT
# ═══════════════════════════════════════════════════════════
@app.delete("/documents/{doc_id}", response_model=DeleteResponse)
def delete_document(doc_id: int, db: Session = Depends(get_db)):
    """Delete a document and all its chunks from DB and ChromaDB."""
    db_doc = db.query(models.Document).filter_by(id=doc_id).first()
    if not db_doc:
        raise HTTPException(404, "Document not found")

    # Delete from ChromaDB
    store = get_vector_store()
    store.delete_by_doc_id(doc_id)

    # Delete chunks from SQLite
    deleted_chunks = db.query(models.Chunk).filter_by(doc_id=doc_id).delete()

    # Delete document
    db.delete(db_doc)
    db.commit()

    logger.info(f"🗑️ Deleted document {doc_id}: {db_doc.filename} ({deleted_chunks} chunks)")

    return DeleteResponse(
        message=f"Deleted {db_doc.filename} and {deleted_chunks} chunks",
        deleted_count=deleted_chunks,
    )


# ═══════════════════════════════════════════════════════════
# 13. REINDEX DOCUMENT
# ═══════════════════════════════════════════════════════════
@app.put("/documents/{doc_id}/reindex", response_model=ProcessResponse)
def reindex_document(doc_id: int, db: Session = Depends(get_db)):
    """Re-index a specific document (delete old chunks, re-process)."""
    db_doc = db.query(models.Document).filter_by(id=doc_id).first()
    if not db_doc:
        raise HTTPException(404, "Document not found")

    # Clear old data
    store = get_vector_store()
    store.delete_by_doc_id(doc_id)
    db.query(models.Chunk).filter_by(doc_id=doc_id).delete()
    db_doc.status = "uploaded"
    db_doc.content_hash = None  # Force re-processing
    db.commit()

    # Re-process via the main pipeline
    return process_documents(db)


# ═══════════════════════════════════════════════════════════
# 14. GET METADATA FROM COLLECTION
# ═══════════════════════════════════════════════════════════
@app.get("/metadata/{collection}", response_model=MetadataResponse)
def get_collection_metadata(collection: str, limit: int = 100):
    """Retrieve metadata from a ChromaDB collection."""
    from app.vector_store import STRATEGY_COLLECTIONS, DOMAIN_COLLECTIONS
    store = get_vector_store()

    # Allow both collection names and strategy/domain keys
    resolved = STRATEGY_COLLECTIONS.get(collection, DOMAIN_COLLECTIONS.get(collection, collection))

    metadata = store.get_metadata(resolved, limit=limit)

    try:
        col = store.get_collection(resolved)
        count = col.count()
    except Exception:
        count = 0

    return MetadataResponse(
        collection=resolved,
        count=count,
        metadata=metadata,
    )


# ═══════════════════════════════════════════════════════════
# 15. STATS (Home Page live counts)
# ═══════════════════════════════════════════════════════════
@app.get("/stats", response_model=StatsResponse)
def get_stats(db: Session = Depends(get_db)):
    """Live counts for the Home Page — no hardcoded data."""
    from sqlalchemy import func

    docs_indexed = db.query(models.Document).filter_by(status="indexed").count()
    queries_answered = db.query(models.Query).count()
    avg_conf_result = db.query(func.avg(models.Answer.confidence_score)).scalar()
    avg_confidence = float(avg_conf_result) if avg_conf_result else 0.0

    store = get_vector_store()
    stats = store.get_collection_stats()
    total_chunks = sum(stats.values())

    return StatsResponse(
        documents_indexed=docs_indexed,
        queries_answered=queries_answered,
        strategies_available=4,
        avg_confidence=round(avg_confidence, 1),
        total_chunks=total_chunks,
    )


# ═══════════════════════════════════════════════════════════
# 16. EVALUATION RESULTS (Analytics Dashboard)
# ═══════════════════════════════════════════════════════════
@app.get("/evaluation-results", response_model=EvaluationResultsResponse)
def get_evaluation_results(db: Session = Depends(get_db)):
    """Return real evaluation rows for the Analytics Dashboard."""
    from sqlalchemy import func

    rows = db.query(models.EvaluationResult).order_by(
        models.EvaluationResult.id.desc()
    ).limit(500).all()

    results = []
    for row in rows:
        # Get query text
        query_obj = db.query(models.Query).filter_by(id=row.query_id).first()
        query_text = query_obj.query_text if query_obj else ""
        results.append(EvaluationResultOut(
            id=row.id,
            query_id=row.query_id,
            query_text=query_text,
            strategy_name=row.strategy_name,
            precision_at_k=row.precision_at_k,
            recall_at_k=row.recall_at_k,
            context_relevance=row.context_relevance,
            response_time_ms=row.response_time_ms,
            final_score=row.final_score,
        ))

    # Build summary
    strategy_summary = {}
    eval_rows = (
        db.query(
            models.EvaluationResult.strategy_name,
            func.avg(models.EvaluationResult.precision_at_k),
            func.avg(models.EvaluationResult.recall_at_k),
            func.avg(models.EvaluationResult.context_relevance),
            func.avg(models.EvaluationResult.response_time_ms),
            func.avg(models.EvaluationResult.final_score),
        )
        .group_by(models.EvaluationResult.strategy_name)
        .all()
    )
    for row in eval_rows:
        strategy_summary[row[0]] = {
            "avg_precision": round(float(row[1] or 0), 4),
            "avg_recall": round(float(row[2] or 0), 4),
            "avg_context_relevance": round(float(row[3] or 0), 4),
            "avg_response_time_ms": round(float(row[4] or 0), 2),
            "avg_final_score": round(float(row[5] or 0), 4),
        }

    return EvaluationResultsResponse(
        total=len(results),
        results=results,
        strategy_summary=strategy_summary,
    )


# ═══════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════
def _detect_domain(records) -> str:
    """Detect which ChromaDB domain collection to use based on record content."""
    has_claim = any(r.claim_id for r in records)
    has_policy = any(r.policy_number for r in records)
    has_customer = any(r.customer_name or r.customer_id for r in records)

    if has_claim:
        return "claims"
    elif has_policy and not has_customer:
        return "insurance_policies"
    elif has_customer:
        return "customer_profiles"
    return "knowledge_base"


def _default_benchmark_questions():
    return [
        {"question": "What is the bodily injury liability limit per person?", "expected_doc": "auto_policy.txt"},
        {"question": "What is the collision coverage deductible?", "expected_doc": "auto_policy.txt"},
        {"question": "Are rideshare services covered under the auto policy?", "expected_doc": "auto_policy.txt"},
        {"question": "What is the individual annual deductible for health insurance?", "expected_doc": "health_policy.txt"},
        {"question": "What prescription drug tiers are available?", "expected_doc": "health_policy.txt"},
        {"question": "How long does a member have to file a claim?", "expected_doc": "health_policy.txt"},
        {"question": "What is the dwelling coverage limit?", "expected_doc": "home_policy.txt"},
        {"question": "Is flood damage covered under the homeowners policy?", "expected_doc": "home_policy.txt"},
        {"question": "What is the wind and hail deductible?", "expected_doc": "home_policy.txt"},
        {"question": "What are the duties of the insured after a loss?", "expected_doc": "home_policy.txt"},
        {"question": "What mental health services are covered?", "expected_doc": "health_policy.txt"},
        {"question": "What is the out-of-pocket maximum for a family?", "expected_doc": "health_policy.txt"},
        {"question": "What is the personal liability limit per occurrence?", "expected_doc": "home_policy.txt"},
        {"question": "What is the uninsured motorist coverage?", "expected_doc": "auto_policy.txt"},
        {"question": "What exclusions apply to medical payments in auto insurance?", "expected_doc": "auto_policy.txt"},
    ]

# 🧠 Adaptive RAG Insurance Decision Engine

> **AI-powered insurance intelligence platform** that answers insurance questions using RAG, empirically compares four chunking strategies, automatically selects the best-performing strategy per query, verifies answers against retrieved evidence, and surfaces everything in a judge-facing dashboard.

![Python](https://img.shields.io/badge/Python-3.9+-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![ChromaDB](https://img.shields.io/badge/ChromaDB-0.4-FF6F00)
![Gemini](https://img.shields.io/badge/Gemini-Pro-4285F4?logo=google&logoColor=white)

---

## 📋 Problem Statement

**Impact of Chunk Size and Chunking Strategy on Retrieval Quality in RAG-Based Insurance Risk Evaluation Systems.**

---

## 🏗️ Architecture

```
Insurance PDFs
      │
      ▼
┌─────────────────┐
│ Text Extraction  │  pdfplumber / plain text
│ + Cleaning       │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│           Chunking Engine (4 Strategies)         │
│  ┌──────────┐ ┌───────────┐ ┌─────────────────┐ │
│  │  Fixed   │ │ Recursive │ │    Semantic      │ │
│  │ 500 tok  │ │ Para→Sent │ │ Cosine Breakpt   │ │
│  └──────────┘ └───────────┘ └─────────────────┘ │
│  ┌─────────────────────────────────────────────┐ │
│  │          Adaptive (Novel)                    │ │
│  │  Section-aware · Clause-preserving           │ │
│  │  Dynamic sizing · Rich metadata              │ │
│  └─────────────────────────────────────────────┘ │
└────────┬────────────────────────────┬───────────┘
         │                            │
         ▼                            ▼
┌─────────────────┐    ┌─────────────────────────┐
│   Embedding     │    │  ChromaDB (4 collections)│
│  MiniLM-L6-v2   │    │  1 per strategy          │
│  + SHA256 cache  │    │  Persistent local disk   │
└────────┬────────┘    └──────────┬──────────────┘
         │                        │
         ▼                        ▼
┌──────────────────────────────────────┐
│   Parallel Retrieval (Top-K = 5)     │
│   All 4 strategies queried at once   │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│   Evaluation Engine                   │
│   Precision@K · Recall@K ·            │
│   Context Relevance · Response Time   │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│   Strategy Selection (Weighted)       │
│   → Best strategy's chunks passed on  │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│   Gemini Answer Generation            │
│   Citation-forced · Grounded answers  │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│   Verification Engine                 │
│   Confidence score · Evidence check   │
│   Unsupported claims flagged          │
└──────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- npm

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY (optional — works without it)

# Start the server
uvicorn app.main:app --reload --port 8000
```

The backend will be available at `http://localhost:8000`.

**First run:** Process the synthetic insurance documents:
```bash
# The API will auto-process synthetic docs when you call:
curl -X POST http://localhost:8000/process-documents
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

The dashboard will be available at `http://localhost:5173`.

### 3. Quick Test

```bash
# Health check
curl http://localhost:8000/health

# Process synthetic documents
curl -X POST http://localhost:8000/process-documents

# Ask a question
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the collision coverage deductible?"}'

# Compare all strategies
curl -X POST http://localhost:8000/compare-strategies \
  -H "Content-Type: application/json" \
  -d '{"query": "What mental health services are covered?"}'

# Run benchmark
curl -X POST http://localhost:8000/evaluate
```

---

## 🐳 Docker Deployment

```bash
# From project root
docker-compose up --build

# Backend: http://localhost:8000
# Frontend: http://localhost:3000
```

---

## 📡 API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Liveness check + stats |
| `/upload-documents` | POST | Multipart PDF/TXT upload |
| `/process-documents` | POST | Extract → Chunk → Embed → Index |
| `/ask` | POST | Full pipeline: answer + evidence |
| `/compare-strategies` | POST | Side-by-side strategy comparison |
| `/evaluate` | POST | Run benchmark suite (15 questions) |
| `/analytics` | GET | Aggregate metrics + win rates |
| `/documents` | GET | List indexed documents |

---

## 🧪 Running Tests

```bash
cd backend
pytest tests/ -v
```

---

## 📊 Database Schema

| Table | Purpose |
|---|---|
| `documents` | Uploaded PDF metadata |
| `chunks` | All chunks across 4 strategies |
| `queries` | User query log |
| `retrieval_logs` | Per-chunk retrieval scores |
| `evaluation_results` | Metrics per strategy per query |
| `answers` | Generated answers + confidence |

---

## 🔧 Configuration

All settings in `backend/.env`:

| Variable | Default | Description |
|---|---|---|
| `GEMINI_API_KEY` | `not-set` | Google Gemini API key |
| `EMBEDDING_PROVIDER` | `local` | `local` or `hosted` |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | Embedding model name |
| `RETRIEVAL_TOP_K` | `5` | Number of chunks to retrieve |
| `FIXED_CHUNK_SIZE` | `500` | Fixed chunker token window |
| `ADAPTIVE_MAX_CHUNK_SIZE` | `600` | Adaptive chunker max size |

---

## ☁️ Cloud Deployment Path

- **Backend:** Deploy to Google Cloud Run or Render (containerized FastAPI)
- **Frontend:** Deploy to Vercel (Vite SPA with API proxy)
- **ChromaDB:** Use a persistent volume on Cloud Run, or switch to hosted Chroma
- **Database:** Upgrade SQLite to PostgreSQL (change `DATABASE_URL` only)

---

## ⚠️ Scalability Notes

| Bottleneck | Impact | Fix |
|---|---|---|
| SQLite write contention | Fails under concurrent writes | Switch to PostgreSQL |
| Single-node ChromaDB | Memory limit on large corpora | Use hosted Chroma or Qdrant |
| Synchronous embedding | Slow batch processing | Add Celery task queue |
| Gemini rate limits | 429 errors under load | Add retry + rate limiter |

---

## 👥 Team

Built for the hackathon — Team IIIT

---

## 📜 License

MIT License

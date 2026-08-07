"""
Configuration — loads .env via pydantic-settings.
All secrets and tunables live here.
"""
import os
import logging
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    # --- LLM (Groq / Gemini) ---
    groq_api_key: str = "not-set"
    groq_model: str = "llama-3.3-70b-versatile"
    gemini_api_key: str = "not-set"
    gemini_model: str = "gemini-pro"
    llm_base_url: str = ""        # For custom endpoints

    # --- Embeddings ---
    embedding_provider: str = "local"          # "local" | "hosted"
    embedding_model: str = "all-MiniLM-L6-v2"
    hf_token: str = "not-set"                  # Hugging Face token for model downloads

    # --- ChromaDB ---
    chroma_persist_dir: str = "./data/chroma_db"
    chroma_db_path: str = ""      # Alias — falls back to chroma_persist_dir

    # --- SQLite ---
    database_url: str = "sqlite:///./data/app.db"

    # --- Retrieval ---
    retrieval_top_k: int = 5

    # --- Chunking defaults ---
    fixed_chunk_size: int = 500       # tokens
    fixed_chunk_overlap: int = 50     # tokens
    recursive_chunk_size: int = 500
    recursive_chunk_overlap: int = 50
    semantic_breakpoint_threshold: float = 0.5
    adaptive_max_chunk_size: int = 600
    adaptive_min_chunk_size: int = 100

    # --- Strategy selection weights ---
    weight_similarity: float = 0.3
    weight_precision: float = 0.25
    weight_recall: float = 0.2
    weight_context_relevance: float = 0.15
    weight_response_time: float = 0.1

    # --- Server ---
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: str = "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:3000"

    # --- Paths ---
    raw_pdfs_dir: str = "./data/raw_pdfs"
    synthetic_dir: str = "./data/synthetic"
    customer_data_dir: str = "./data/customer_data"

    # --- AI Service ---
    llm_timeout: int = 30
    llm_max_retries: int = 3
    response_cache_ttl: int = 300      # seconds
    max_conversation_turns: int = 5
    max_query_length: int = 2000

    @property
    def active_provider(self) -> str:
        """Resolve active LLM provider ('groq' or 'gemini')."""
        if self.groq_api_key and self.groq_api_key != "not-set":
            return "groq"
        if self.gemini_api_key and self.gemini_api_key != "not-set":
            return "gemini"
        return "none"

    @property
    def active_api_key(self) -> str:
        """Resolve active API key."""
        if self.active_provider == "groq":
            return self.groq_api_key
        return self.gemini_api_key

    @property
    def active_model(self) -> str:
        """Resolve active model."""
        if self.active_provider == "groq":
            return self.groq_model
        return self.gemini_model

    @property
    def active_chroma_path(self) -> str:
        """Resolve active ChromaDB path from aliases."""
        return self.chroma_db_path or self.chroma_persist_dir

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

# Expose HF token to huggingface_hub / sentence-transformers
if settings.hf_token and settings.hf_token != "not-set":
    os.environ["HF_TOKEN"] = settings.hf_token
    os.environ["HUGGING_FACE_HUB_TOKEN"] = settings.hf_token

# Ensure data directories exist
os.makedirs(settings.raw_pdfs_dir, exist_ok=True)
os.makedirs(settings.synthetic_dir, exist_ok=True)
os.makedirs(settings.customer_data_dir, exist_ok=True)
os.makedirs(os.path.dirname(settings.active_chroma_path) if settings.active_chroma_path != "." else settings.active_chroma_path, exist_ok=True)


def validate_api_key():
    """Validate API key on startup for Groq or Gemini. Log meaningful status."""
    provider = settings.active_provider
    key = settings.active_api_key

    if provider == "none" or not key or key == "not-set":
        logger.warning(
            "⚠️  LLM API key not configured. Set GROQ_API_KEY or GEMINI_API_KEY in .env. "
            "System will work in retrieval-only mode (no AI-generated answers)."
        )
        return False

    if provider == "groq":
        try:
            from groq import Groq
            client = Groq(api_key=key)
            completion = client.chat.completions.create(
                messages=[{"role": "user", "content": "Reply with 'OK'"}],
                model=settings.groq_model,
                max_tokens=10,
            )
            if completion and completion.choices:
                logger.info(f"✅ Groq API key validated. Model: {settings.groq_model}")
                return True
        except Exception as e:
            logger.error(f"❌ Groq API key validation failed: {e}")
        return False

    try:
        import google.generativeai as genai
        genai.configure(api_key=key)
        model = genai.GenerativeModel(settings.active_model)
        response = model.generate_content("Reply with 'OK'")
        if response and response.text:
            logger.info(f"✅ Gemini API key validated. Model: {settings.active_model}")
            return True
    except Exception as e:
        logger.error(f"❌ Gemini API key validation failed: {e}")
    return False

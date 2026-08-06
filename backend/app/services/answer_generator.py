"""
Answer Generation Engine — Production Grade.

Features:
- Gemini-powered with citation enforcement
- Streaming response support (SSE)
- Retry logic with exponential backoff
- Rate-limit handling (429)
- Timeout handling
- Conversation memory (session-based)
- Input sanitization
- Response caching (TTL-based)
"""
import time
import hashlib
import logging
import re
from typing import List, Dict, Any, Optional, Generator
from collections import defaultdict
from app.config import settings

logger = logging.getLogger(__name__)


ANSWER_PROMPT_TEMPLATE = """You are an expert insurance policy analyst. Answer the following question using ONLY the provided policy excerpts. 

STRICT RULES:
1. Base your answer ONLY on the provided context. Do not use any outside knowledge.
2. For each claim in your answer, cite the source using [Document: X, Page N] or [Section X.X] format.
3. If the provided context does not contain enough information to fully answer the question, explicitly state: "The provided policy documents do not contain sufficient information to answer this question."
4. Be precise and quote specific policy language when relevant.
5. If multiple policies are referenced, clearly distinguish which policy each point comes from.

QUESTION: {query}

{conversation_context}

POLICY CONTEXT:
{context}

Provide a thorough, well-cited answer:"""


# ── Response Cache ────────────────────────────────────────
class ResponseCache:
    """TTL-based cache for LLM responses."""

    def __init__(self, ttl: int = 300):
        self.ttl = ttl
        self._cache: Dict[str, tuple] = {}  # hash -> (response, timestamp)

    def get(self, key: str) -> Optional[str]:
        if key in self._cache:
            response, ts = self._cache[key]
            if time.time() - ts < self.ttl:
                logger.debug(f"Cache hit for {key[:16]}...")
                return response
            else:
                del self._cache[key]
        return None

    def set(self, key: str, response: str):
        self._cache[key] = (response, time.time())

    def clear(self):
        self._cache.clear()


# ── Conversation Memory ──────────────────────────────────
class ConversationMemory:
    """In-memory session-based conversation store."""

    def __init__(self, max_turns: int = 5):
        self.max_turns = max_turns
        self._sessions: Dict[str, List[Dict]] = defaultdict(list)

    def add_turn(self, session_id: str, query: str, answer: str):
        turns = self._sessions[session_id]
        turns.append({"role": "user", "content": query})
        turns.append({"role": "assistant", "content": answer[:500]})  # truncate
        # Keep only last N turns
        if len(turns) > self.max_turns * 2:
            self._sessions[session_id] = turns[-(self.max_turns * 2):]

    def get_context(self, session_id: str) -> str:
        turns = self._sessions.get(session_id, [])
        if not turns:
            return ""
        parts = ["PREVIOUS CONVERSATION:"]
        for turn in turns:
            role = "User" if turn["role"] == "user" else "Assistant"
            parts.append(f"{role}: {turn['content']}")
        return "\n".join(parts)

    def clear_session(self, session_id: str):
        self._sessions.pop(session_id, None)


# ── Input Sanitization ───────────────────────────────────
def sanitize_input(query: str) -> str:
    """Strip injection patterns and limit length."""
    if not query:
        return ""
    # Limit length
    query = query[:settings.max_query_length]
    # Remove common prompt injection patterns
    injection_patterns = [
        r'ignore (?:all )?(?:previous|above) (?:instructions|prompts)',
        r'you are now',
        r'new instructions:',
        r'system prompt:',
        r'<\/?(?:script|img|iframe)',
    ]
    for pattern in injection_patterns:
        query = re.sub(pattern, '', query, flags=re.IGNORECASE)
    # Strip excessive whitespace
    query = re.sub(r'\s+', ' ', query).strip()
    return query


class AnswerGenerator:
    """Generate grounded answers with production features."""

    def __init__(self):
        self._model = None
        self._cache = ResponseCache(ttl=settings.response_cache_ttl)
        self._memory = ConversationMemory(max_turns=settings.max_conversation_turns)

    @property
    def memory(self) -> ConversationMemory:
        return self._memory

    def _get_groq_client(self):
        """Lazy-load Groq client."""
        try:
            from groq import Groq
            key = settings.active_api_key
            if not key or key == "not-set":
                return None
            return Groq(api_key=key)
        except Exception as e:
            logger.error(f"Failed to load Groq client: {e}")
            return None

    def _get_model(self):
        """Lazy-load Gemini model."""
        if self._model is not None:
            return self._model

        try:
            import google.generativeai as genai
            key = settings.active_api_key
            if not key or key == "not-set":
                return None
            genai.configure(api_key=key)
            self._model = genai.GenerativeModel(settings.active_model)
            return self._model
        except Exception as e:
            logger.error(f"Failed to load Gemini model: {e}")
            return None

    def generate_answer(
        self,
        query: str,
        chunks: List[Dict[str, Any]],
        strategy_name: str,
        session_id: str = "default",
    ) -> Dict[str, Any]:
        """Generate an answer with caching, retry, and conversation memory."""
        query = sanitize_input(query)

        # Build context
        context, supporting_clauses, supporting_pages = self._build_context(chunks)

        # Check cache
        cache_key = self._cache_key(query, context)
        cached = self._cache.get(cache_key)
        if cached:
            return {
                "answer_text": cached,
                "strategy_used": strategy_name,
                "supporting_clauses": supporting_clauses,
                "supporting_pages": sorted(supporting_pages),
                "context_used": len(chunks),
                "cached": True,
            }

        # Get conversation context
        conv_context = self._memory.get_context(session_id)
        prompt = ANSWER_PROMPT_TEMPLATE.format(
            query=query, context=context, conversation_context=conv_context
        )

        provider = settings.active_provider
        answer_text = None

        if provider == "groq":
            groq_client = self._get_groq_client()
            if groq_client is not None:
                answer_text = self._call_groq_with_retry(groq_client, prompt)

        if not answer_text and provider == "gemini":
            model = self._get_model()
            if model is not None:
                answer_text = self._call_with_retry(model, prompt)

        if not answer_text:
            answer_text = self._fallback_answer(query, chunks)

        # Cache the response
        self._cache.set(cache_key, answer_text)

        # Save to conversation memory
        self._memory.add_turn(session_id, query, answer_text)

        return {
            "answer_text": answer_text,
            "strategy_used": strategy_name,
            "supporting_clauses": supporting_clauses,
            "supporting_pages": sorted(supporting_pages),
            "context_used": len(chunks),
            "cached": False,
        }

    def generate_stream(
        self,
        query: str,
        chunks: List[Dict[str, Any]],
        strategy_name: str,
        session_id: str = "default",
    ) -> Generator[str, None, None]:
        """Generate a streaming answer using Groq or Gemini stream API."""
        query = sanitize_input(query)
        context, supporting_clauses, supporting_pages = self._build_context(chunks)
        conv_context = self._memory.get_context(session_id)
        prompt = ANSWER_PROMPT_TEMPLATE.format(
            query=query, context=context, conversation_context=conv_context
        )

        provider = settings.active_provider

        if provider == "groq":
            groq_client = self._get_groq_client()
            if groq_client is not None:
                try:
                    stream = groq_client.chat.completions.create(
                        messages=[{"role": "user", "content": prompt}],
                        model=settings.groq_model,
                        stream=True,
                    )
                    full_answer = ""
                    for chunk in stream:
                        delta = chunk.choices[0].delta.content if chunk.choices else ""
                        if delta:
                            full_answer += delta
                            yield delta
                    self._memory.add_turn(session_id, query, full_answer)
                    return
                except Exception as e:
                    logger.error(f"Groq streaming error: {e}")

        if provider == "gemini":
            model = self._get_model()
            if model is not None:
                try:
                    response = model.generate_content(prompt, stream=True)
                    full_answer = ""
                    for chunk in response:
                        if chunk.text:
                            full_answer += chunk.text
                            yield chunk.text
                    self._memory.add_turn(session_id, query, full_answer)
                    return
                except Exception as e:
                    logger.error(f"Gemini streaming error: {e}")

        fallback = self._fallback_answer(query, chunks)
        self._memory.add_turn(session_id, query, fallback)
        yield fallback

    def _call_groq_with_retry(self, client, prompt: str) -> Optional[str]:
        """Call Groq API with retry logic."""
        for attempt in range(settings.llm_max_retries):
            try:
                completion = client.chat.completions.create(
                    messages=[{"role": "user", "content": prompt}],
                    model=settings.groq_model,
                )
                if completion and completion.choices:
                    return completion.choices[0].message.content
            except Exception as e:
                logger.error(f"Groq API attempt {attempt + 1} failed: {e}")
                time.sleep(2 ** attempt)
        return None

    def _call_with_retry(self, model, prompt: str) -> str:
        """Call Gemini with exponential backoff retry logic."""
        last_error = None
        for attempt in range(settings.llm_max_retries):
            try:
                response = model.generate_content(prompt)
                return response.text
            except Exception as e:
                last_error = e
                error_str = str(e).lower()

                # Rate limit — wait and retry
                if "429" in error_str or "rate" in error_str or "quota" in error_str:
                    wait_time = (2 ** attempt) * 1  # 1s, 2s, 4s
                    logger.warning(f"Rate limited. Retry {attempt+1}/{settings.llm_max_retries} in {wait_time}s")
                    time.sleep(wait_time)
                    continue

                # Timeout
                if "timeout" in error_str or "deadline" in error_str:
                    wait_time = (2 ** attempt) * 0.5
                    logger.warning(f"Timeout. Retry {attempt+1}/{settings.llm_max_retries} in {wait_time}s")
                    time.sleep(wait_time)
                    continue

                # Other errors — don't retry
                logger.error(f"LLM error (no retry): {e}")
                break

        return self._fallback_answer("", [], str(last_error) if last_error else "Unknown error")

    def _build_context(self, chunks: List[Dict[str, Any]]):
        """Build annotated context from chunks."""
        context_parts = []
        supporting_clauses = []
        supporting_pages = set()

        for i, chunk in enumerate(chunks):
            doc_name = chunk.get("document_name", "") or chunk.get("metadata", {}).get("document_name", "")
            section = chunk.get("section_title", "") or chunk.get("metadata", {}).get("section_title", "")
            clause = chunk.get("clause_number", "") or chunk.get("metadata", {}).get("clause_number", "")
            page = chunk.get("page_number", 0) or chunk.get("metadata", {}).get("page_number", 0)
            text = chunk.get("text", "")

            source_tag = []
            if doc_name:
                source_tag.append(f"Document: {doc_name}")
            if section:
                source_tag.append(f"Section: {section}")
            if clause:
                source_tag.append(f"Clause: {clause}")
                supporting_clauses.append(clause)
            if page:
                source_tag.append(f"Page: {page}")
                supporting_pages.add(page)

            header = f"[Source {i+1}: {', '.join(source_tag)}]" if source_tag else f"[Source {i+1}]"
            context_parts.append(f"{header}\n{text}")

        context = "\n\n---\n\n".join(context_parts)
        return context, supporting_clauses, supporting_pages

    def _fallback_answer(self, query: str, chunks: List[Dict[str, Any]],
                         error: str = "") -> str:
        """Fallback when Gemini is unavailable."""
        parts = [
            "**Note:** LLM API is not configured or encountered an error. Showing retrieved policy excerpts.",
            "",
            f"**Query:** {query}" if query else "",
            "",
            "**Relevant Policy Excerpts:**",
            "",
        ]
        if error:
            parts.insert(1, f"*Error: {error}*")

        for i, chunk in enumerate(chunks[:5]):
            doc_name = chunk.get("document_name", "") or chunk.get("metadata", {}).get("document_name", "Unknown")
            section = chunk.get("section_title", "") or chunk.get("metadata", {}).get("section_title", "")
            page = chunk.get("page_number", "?") or chunk.get("metadata", {}).get("page_number", "?")
            score = chunk.get("similarity_score", 0)
            text = chunk.get("text", "")
            display_text = text[:500] + "..." if len(text) > 500 else text

            parts.append(f"**{i+1}. [{doc_name}]** (Page {page}, Relevance: {score:.2f})")
            parts.append(f"> {display_text}")
            parts.append("")

        return "\n".join(parts)

    @staticmethod
    def _cache_key(query: str, context: str) -> str:
        combined = f"{query}|||{context[:500]}"
        return hashlib.sha256(combined.encode()).hexdigest()


# Singleton
_generator = None

def get_answer_generator() -> AnswerGenerator:
    global _generator
    if _generator is None:
        _generator = AnswerGenerator()
    return _generator

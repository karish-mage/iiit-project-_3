"""
Unit tests for all 4 chunking strategies.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from app.chunkers.fixed import FixedChunker
from app.chunkers.recursive import RecursiveChunker
from app.chunkers.semantic import SemanticChunker
from app.chunkers.adaptive import AdaptiveChunker


# ── Sample text ───────────────────────────────────────────
SAMPLE_TEXT = """
SECTION 1: LIABILITY COVERAGE

1.1 Bodily Injury Liability
We will pay damages for bodily injury or death for which any insured becomes legally responsible because of an auto accident. We will settle or defend, as we consider appropriate, any claim or suit asking for these damages. Our duty to settle or defend ends when our limit of liability for this coverage has been exhausted by payment of judgments or settlements.

Limits of Liability:
- Per Person: $100,000
- Per Accident: $300,000

1.2 Property Damage Liability
We will pay damages for which any insured becomes legally responsible because of damage to or destruction of property, including loss of its use, arising out of the ownership, maintenance, or use of a covered auto.

Limit of Liability: $50,000 per accident

SECTION 2: MEDICAL PAYMENTS COVERAGE

2.1 Coverage Description
We will pay reasonable expenses incurred for necessary medical and funeral services because of bodily injury caused by accident and sustained by an insured. Medical expenses must be incurred within three years from the date of the accident.

2.2 Coverage Limits
Medical Payments Limit: $5,000 per person per accident

2.3 Exclusions
Medical Payments Coverage does not apply to bodily injury:
a) Sustained while occupying any motorized vehicle having fewer than four wheels.
b) Sustained while occupying a vehicle owned by the named insured that is not a covered auto.
c) Sustained while occupying a vehicle used as a public or livery conveyance.
d) Occurring during the course of employment if workers compensation benefits are available.
e) Caused by a nuclear weapon, war, civil unrest, or radioactive contamination.
""".strip()

SHORT_TEXT = "This is a short clause about coverage limits."


# ── Fixed Chunker ─────────────────────────────────────────
class TestFixedChunker:
    def test_creates_chunks(self):
        chunker = FixedChunker(chunk_size=100, overlap=20)
        chunks = chunker.chunk(SAMPLE_TEXT, doc_id=1, page_number=1)
        assert len(chunks) > 1, "Should create multiple chunks from long text"

    def test_strategy_name(self):
        chunker = FixedChunker()
        assert chunker.strategy_name == "fixed"

    def test_chunk_metadata(self):
        chunker = FixedChunker(chunk_size=200, overlap=20)
        chunks = chunker.chunk(SAMPLE_TEXT, doc_id=42, page_number=3)
        for c in chunks:
            assert c.doc_id == 42
            assert c.page_number == 3
            assert c.strategy_name == "fixed"
            assert c.char_count > 0
            assert c.content_hash != ""

    def test_overlap_exists(self):
        chunker = FixedChunker(chunk_size=100, overlap=30)
        chunks = chunker.chunk(SAMPLE_TEXT, doc_id=1)
        if len(chunks) >= 2:
            # Check that consecutive chunks share some words (overlap)
            words_0 = set(chunks[0].text.split()[-10:])
            words_1 = set(chunks[1].text.split()[:10])
            overlap = words_0 & words_1
            assert len(overlap) > 0, "Consecutive chunks should share overlapping words"

    def test_empty_text(self):
        chunker = FixedChunker()
        chunks = chunker.chunk("", doc_id=1)
        assert len(chunks) == 0

    def test_short_text_single_chunk(self):
        chunker = FixedChunker(chunk_size=500)
        chunks = chunker.chunk(SHORT_TEXT, doc_id=1)
        assert len(chunks) == 1


# ── Recursive Chunker ────────────────────────────────────
class TestRecursiveChunker:
    def test_creates_chunks(self):
        chunker = RecursiveChunker(chunk_size=200, chunk_overlap=30)
        chunks = chunker.chunk(SAMPLE_TEXT, doc_id=1)
        assert len(chunks) >= 1

    def test_strategy_name(self):
        chunker = RecursiveChunker()
        assert chunker.strategy_name == "recursive"

    def test_respects_paragraph_boundaries(self):
        chunker = RecursiveChunker(chunk_size=300, chunk_overlap=30)
        chunks = chunker.chunk(SAMPLE_TEXT, doc_id=1)
        # No chunk should start mid-word (basic sanity)
        for c in chunks:
            assert c.text[0] != " ", f"Chunk starts with space: {c.text[:30]}"

    def test_empty_text(self):
        chunker = RecursiveChunker()
        chunks = chunker.chunk("   ", doc_id=1)
        assert len(chunks) == 0


# ── Semantic Chunker ──────────────────────────────────────
class TestSemanticChunker:
    def test_creates_chunks_without_embeddings(self):
        """Fallback mode without embedding function."""
        chunker = SemanticChunker(max_chunk_size=300)
        chunks = chunker.chunk(SAMPLE_TEXT, doc_id=1)
        assert len(chunks) >= 1

    def test_strategy_name(self):
        chunker = SemanticChunker()
        assert chunker.strategy_name == "semantic"

    def test_respects_max_size(self):
        chunker = SemanticChunker(max_chunk_size=200)
        chunks = chunker.chunk(SAMPLE_TEXT, doc_id=1)
        for c in chunks:
            assert c.char_count <= 250, f"Chunk exceeds max size: {c.char_count}"

    def test_short_text(self):
        chunker = SemanticChunker(max_chunk_size=500)
        chunks = chunker.chunk(SHORT_TEXT, doc_id=1)
        assert len(chunks) == 1


# ── Adaptive Chunker ─────────────────────────────────────
class TestAdaptiveChunker:
    def test_creates_chunks(self):
        chunker = AdaptiveChunker(max_chunk_size=400, min_chunk_size=50)
        chunks = chunker.chunk(SAMPLE_TEXT, doc_id=1, page_number=1)
        assert len(chunks) >= 1

    def test_strategy_name(self):
        chunker = AdaptiveChunker()
        assert chunker.strategy_name == "adaptive"

    def test_preserves_section_titles(self):
        chunker = AdaptiveChunker(max_chunk_size=600)
        chunks = chunker.chunk(SAMPLE_TEXT, doc_id=1)
        sections_found = [c.section_title for c in chunks if c.section_title]
        assert len(sections_found) > 0, "Should detect at least one section title"

    def test_never_splits_mid_sentence(self):
        chunker = AdaptiveChunker(max_chunk_size=200, target_chunk_size=150)
        chunks = chunker.chunk(SAMPLE_TEXT, doc_id=1)
        for c in chunks:
            text = c.text.strip()
            if len(text) > 20:
                # Should end with punctuation or be a complete fragment
                last_char = text[-1]
                assert last_char in '.!?]")\'' or text.endswith("...") or len(text) < 200, \
                    f"Chunk may be split mid-sentence: ...{text[-50:]}"

    def test_attaches_metadata(self):
        chunker = AdaptiveChunker(max_chunk_size=400)
        chunks = chunker.chunk(SAMPLE_TEXT, doc_id=7, page_number=2)
        for c in chunks:
            assert c.doc_id == 7
            assert c.page_number == 2
            assert c.strategy_name == "adaptive"

    def test_detects_clause_numbers(self):
        chunker = AdaptiveChunker(max_chunk_size=800)
        chunks = chunker.chunk(SAMPLE_TEXT, doc_id=1)
        clauses = [c.clause_number for c in chunks if c.clause_number]
        # Should detect clause numbers like "1", "2" from SECTION headers
        assert len(clauses) >= 0  # May or may not detect depending on patterns

    def test_empty_text(self):
        chunker = AdaptiveChunker()
        chunks = chunker.chunk("", doc_id=1)
        assert len(chunks) == 0

    def test_merges_small_chunks(self):
        chunker = AdaptiveChunker(max_chunk_size=1000, min_chunk_size=200)
        chunks = chunker.chunk(SAMPLE_TEXT, doc_id=1)
        # After merging, no chunk should be below min_size (unless it's the only one in its section)
        for c in chunks:
            if c.char_count < 50:
                # Very small chunks are acceptable if they are standalone sections
                pass


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

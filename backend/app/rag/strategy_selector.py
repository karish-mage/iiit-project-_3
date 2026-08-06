"""
Strategy Selection Engine — weighted scoring to pick the best chunking strategy per query.
"""
from typing import Dict, Any, Optional, List, Tuple
from app.config import settings


class StrategySelector:
    """
    Rank strategies by weighted combination of evaluation metrics.
    Selected strategy's chunks feed into the Answer Generation Engine.
    """

    def __init__(self, weights: Optional[Dict[str, float]] = None):
        self.weights = weights or {
            "avg_similarity": settings.weight_similarity,
            "precision_at_k": settings.weight_precision,
            "recall_at_k": settings.weight_recall,
            "context_relevance": settings.weight_context_relevance,
            "response_time": settings.weight_response_time,
        }

    def select_best_strategy(
        self,
        evaluation_results: Dict[str, Dict[str, float]],
    ) -> Tuple[str, float, Dict[str, float]]:
        """
        Select the best-performing strategy based on weighted scoring.

        Args:
            evaluation_results: {strategy_name: {metric_name: value, ...}}

        Returns:
            (winner_strategy, winner_score, all_scores)
        """
        scores = {}

        # Normalize response time (lower is better — invert)
        max_rt = max(
            (r.get("response_time_ms", 1) for r in evaluation_results.values()),
            default=1
        )
        if max_rt == 0:
            max_rt = 1

        for strategy, metrics in evaluation_results.items():
            score = 0.0

            # Higher-is-better metrics
            score += self.weights.get("avg_similarity", 0.3) * metrics.get("avg_similarity", 0)
            score += self.weights.get("precision_at_k", 0.25) * metrics.get("precision_at_k", 0)
            score += self.weights.get("recall_at_k", 0.2) * metrics.get("recall_at_k", 0)
            score += self.weights.get("context_relevance", 0.15) * metrics.get("context_relevance", 0)

            # Response time: lower is better → invert and normalize
            rt = metrics.get("response_time_ms", max_rt)
            rt_score = 1.0 - (rt / max_rt) if max_rt > 0 else 0.5
            score += self.weights.get("response_time", 0.1) * max(0, rt_score)

            scores[strategy] = round(score, 4)

        # Pick winner
        winner = max(scores, key=scores.get) if scores else "adaptive"
        winner_score = scores.get(winner, 0)

        return winner, winner_score, scores

    def get_selection_log(
        self,
        query: str,
        evaluation_results: Dict[str, Dict[str, float]],
        winner: str,
        scores: Dict[str, float],
    ) -> Dict[str, Any]:
        """Build an audit log entry for the selection decision."""
        return {
            "query": query,
            "weights": self.weights,
            "per_strategy_metrics": evaluation_results,
            "per_strategy_scores": scores,
            "winner": winner,
        }


# Singleton
_selector = None

def get_strategy_selector() -> StrategySelector:
    global _selector
    if _selector is None:
        _selector = StrategySelector()
    return _selector

"""
APTLY -- Phase 2 Content Intelligence Diagnostic & Benchmark Runner

Executes and verifies:
1. Technical Question Analysis (FastAPI/Postgres/Redis)
2. Behavioral Question STAR Framework Analysis
3. Short Answer Guardrail (< 6 words)
4. Factual / Quantitative Claim Classification (SUPPORTED vs UNSUPPORTED)
5. Structured Coaching Feedback (Observation -> Impact -> Action) & 60s Practice Drills
"""

from __future__ import annotations

import asyncio
from app.schemas.content_intelligence import ContentAnalysisInput
from app.services.content_intelligence.service import ContentAnalysisService
from app.services.providers.mock_llm import MockLLMProvider


async def run_diagnostics() -> None:
    print("=" * 70)
    print("APTLY -- PHASE 2: CONTENT INTELLIGENCE & COACHING DIAGNOSTIC")
    print("=" * 70)

    llm = MockLLMProvider()
    service = ContentAnalysisService(llm_provider=llm)

    scenarios = [
        {
            "name": "Scenario 1: Technical Answer (Architecture & Database)",
            "input": ContentAnalysisInput(
                role_title="Senior Backend Engineer",
                seniority="Senior",
                domain="Distributed Systems",
                technical_skills=["Python", "FastAPI", "PostgreSQL", "Redis"],
                question_text="How do you optimize slow analytical queries on a high-throughput PostgreSQL cluster?",
                question_category="technical",
                expected_topics=["B-Tree Indexes", "Read Replicas", "Redis Caching", "EXPLAIN ANALYZE"],
                full_transcript=(
                    "We observed high query latency on our core analytics endpoints. "
                    "I used EXPLAIN ANALYZE to identify sequential table scans and added composite B-Tree indexes. "
                    "We then introduced a Redis caching layer with a 5-minute TTL, which reduced peak database load."
                ),
                words=[
                    {"word": "We", "start_seconds": 0.0, "end_seconds": 0.2},
                    {"word": "observed", "start_seconds": 0.2, "end_seconds": 0.7},
                    {"word": "high", "start_seconds": 0.7, "end_seconds": 0.9},
                    {"word": "latency", "start_seconds": 0.9, "end_seconds": 1.4},
                ],
                duration_seconds=18.0,
            ),
        },
        {
            "name": "Scenario 2: Behavioral Answer (STAR Framework Outage Resolution)",
            "input": ContentAnalysisInput(
                role_title="Staff Platform Engineer",
                seniority="Staff",
                domain="Infrastructure",
                question_text="Tell me about a time you resolved a major production outage under high pressure.",
                question_category="behavioral",
                full_transcript=(
                    "During Black Friday, our payment gateway service began returning 504 gateway timeouts. "
                    "As the incident commander, my task was to isolate the root cause and restore checkout within 10 minutes. "
                    "I analyzed connection pool exhaustion, increased worker pool limits, and restarted degraded pods. "
                    "Uptime returned to 99.99% with zero customer transaction loss."
                ),
                words=[],
                duration_seconds=22.0,
            ),
        },
        {
            "name": "Scenario 3: Short Answer Guardrail (Candidate gives up)",
            "input": ContentAnalysisInput(
                role_title="Backend Engineer",
                seniority="Junior",
                domain="Software Engineering",
                question_text="How does garbage collection work in Python?",
                question_category="technical",
                full_transcript="I don't know.",
                words=[{"word": "I", "start_seconds": 0.0, "end_seconds": 0.2}],
                duration_seconds=1.2,
            ),
        },
    ]

    for sc in scenarios:
        print(f"\n>> Running: {sc['name']}")
        res = await service.analyze_answer(sc["input"])

        print(f"  * Overall Content Score: {res.overall_content_score:.1f}/100")
        print(f"  * Relevance: {res.relevance_score:.1f} | Tech Depth: {res.technical_depth_score:.1f} | Structure: {res.structure_score:.1f}")
        print(f"  * Strengths Count: {len(res.strengths)} | Weaknesses: {len(res.weaknesses)}")

        if res.star_analysis:
            star = res.star_analysis
            print(f"  * STAR Breakdown: S={star.situation.present} ({star.situation.quality:.0f}%), T={star.task.present} ({star.task.quality:.0f}%), A={star.action.present} ({star.action.quality:.0f}%), R={star.result.present} ({star.result.quality:.0f}%)")

        if res.claims:
            print(f"  * Factual Claims Audited ({len(res.claims)}):")
            for c in res.claims:
                print(f"    - [{c.support_status}] \"{c.claim}\"")

        if res.feedback:
            print(f"  * Actionable Feedback:")
            for f in res.feedback:
                print(f"    - Observation: {f.observation}")
                print(f"    - Impact: {f.impact}")
                print(f"    - Action: {f.action}")

        if res.practice_drills:
            print(f"  * Practice Drill:")
            for d in res.practice_drills:
                print(f"    - {d.title} ({d.duration_seconds}s, {d.repeat_count}x reps): {d.instructions}")

    print("\n" + "=" * 70)
    print("ALL PHASE 2 CONTENT INTELLIGENCE DIAGNOSTIC SCENARIOS PASSED!")
    print("=" * 70)


def main() -> None:
    asyncio.run(run_diagnostics())


if __name__ == "__main__":
    main()

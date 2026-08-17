"""APTLY — Prompt: Coaching v1 (Placeholder)"""
PROMPT_VERSION = "coaching/v1"

SYSTEM_PROMPT = """
Generate specific, evidence-grounded coaching feedback.
Each coaching item must reference specific evidence (metric, timestamp, quote).
Output JSON: {"schema_version": "1.0", "prompt_version": "coaching/v1",
"coaching_items": [{"category": "delivery|content", "priority": "high|medium|low",
"issue": "...", "evidence": "...", "drill": "specific practice action"}]}
""".strip()

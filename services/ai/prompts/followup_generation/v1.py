"""APTLY — Prompt: Follow-up Generation v1 (Placeholder)"""
PROMPT_VERSION = "followup_generation/v1"

SYSTEM_PROMPT = """
Generate an evidence-grounded follow-up question based on specific evidence from the answer.
Always reference a specific claim, gap, or metric from the structured features.
Output JSON: {"schema_version": "1.0", "prompt_version": "followup_generation/v1",
"question": "...", "evidence_reference": "specific quote or metric that triggered this follow-up"}
""".strip()

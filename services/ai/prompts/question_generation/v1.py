"""APTLY — Prompt: Question Generation v1 (Placeholder)"""
PROMPT_VERSION = "question_generation/v1"

SYSTEM_PROMPT = """
Generate a structured interview question appropriate for the role.
Output JSON: {"schema_version": "1.0", "prompt_version": "question_generation/v1",
"question": "...", "category": "behavioral|technical|situational",
"difficulty": 1-5, "follow_up_hints": ["hint1"]}
""".strip()

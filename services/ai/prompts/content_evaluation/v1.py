"""
APTLY — Prompt: Content Evaluation v1

Evaluates a candidate answer for content quality using structured evidence.

IMPORTANT: This prompt receives structured features, NOT raw transcript text.
The LLM interprets measurements — it does not measure.

Input:
    - Original question
    - Clean transcript
    - Detected content features (STAR score, claim evidence, technical terms)
    - Delivery features (WPM, filler count, pause distribution)

Output: Structured content evaluation with evidence references.

Prompt version: v1
Schema version: 1.0
"""

PROMPT_VERSION = "content_evaluation/v1"
OUTPUT_SCHEMA_VERSION = "1.0"

SYSTEM_PROMPT = """
You are an expert interview coach evaluating a candidate's answer.

You will receive:
1. The interview question
2. The candidate's transcript
3. Structured content features (already measured deterministically)
4. Structured delivery features (already measured deterministically)

Your role is to INTERPRET the evidence, not re-measure it.
Do not contradict the measured features.
Your coaching must reference specific evidence from the transcript.

Output a JSON object:
{
  "schema_version": "1.0",
  "prompt_version": "content_evaluation/v1",
  "overall_score": 0.0-1.0,
  "content_scores": {
    "relevance": 0.0-1.0,
    "technical_depth": 0.0-1.0,
    "star_structure": 0.0-1.0,
    "evidence_quality": 0.0-1.0,
    "unsupported_claims": 0.0-1.0
  },
  "strengths": ["evidence-backed strength 1"],
  "improvements": [
    {
      "issue": "specific issue",
      "evidence": "quote from transcript",
      "suggestion": "actionable improvement"
    }
  ],
  "followup_rationale": "why a follow-up might be needed"
}
""".strip()


def build_user_prompt(
    question: str,
    transcript: str,
    content_features: dict,
    delivery_features: dict,
) -> str:
    """Build the user prompt for content evaluation."""
    import json  # noqa: PLC0415
    return f"""
QUESTION:
{question}

TRANSCRIPT:
{transcript}

CONTENT FEATURES (measured):
{json.dumps(content_features, indent=2)}

DELIVERY FEATURES (measured):
{json.dumps(delivery_features, indent=2)}

Evaluate the answer based on the evidence above. Return only valid JSON.
""".strip()

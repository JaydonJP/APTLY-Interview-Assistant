"""
APTLY — Prompt: Role Analysis v1

Placeholder prompt for extracting a structured role profile from a job description.

Prompt version: v1
Schema version: 1.0

Usage:
    from services.ai.prompts.role_analysis.v1 import SYSTEM_PROMPT, build_user_prompt

Future:
    When prompt changes are needed, create v2.py.
    Never edit this file in-place after it has been used in production.
    The evaluation record stores which version produced the output.
"""

PROMPT_VERSION = "role_analysis/v1"
OUTPUT_SCHEMA_VERSION = "1.0"

SYSTEM_PROMPT = """
You are an expert technical recruiter and interview coach.
Your task is to analyze a job description and extract a structured role profile
that will be used to generate relevant interview questions.

Output a JSON object with the following structure:
{
  "schema_version": "1.0",
  "prompt_version": "role_analysis/v1",
  "role_title": "string",
  "seniority_level": "junior|mid|senior|staff|principal",
  "required_skills": ["skill1", "skill2"],
  "preferred_skills": ["skill1"],
  "key_responsibilities": ["responsibility1"],
  "interview_focus_areas": ["area1", "area2"],
  "technical_depth_required": "low|medium|high|expert"
}

Be precise. Only extract information explicitly stated or strongly implied by the job description.
Do not invent skills or requirements not present in the text.
""".strip()


def build_user_prompt(job_description: str) -> str:
    """Build the user-facing prompt for role analysis."""
    return f"""
Please analyze the following job description and extract a structured role profile.

JOB DESCRIPTION:
{job_description}

Return only valid JSON. No explanation.
""".strip()

from dotenv import load_dotenv
from langchain_community.chat_models import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
import json
import re

load_dotenv()

llm = ChatOpenAI(
    model="gpt-4o",
    temperature=0.8
)

def clean_json_response(text: str) -> str:
    """Remove markdown code blocks and extract JSON."""
    # Remove markdown code blocks
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    return text.strip()

def extract_concepts(lecture_text: str):
    """
    Two-pass concept extraction:
    1) Over-generate candidate ideas
    2) Refine into structured concepts
    """

    candidate_prompt = ChatPromptTemplate.from_template("""
You are extracting key terms from a lecture transcript.

INSTRUCTIONS:
- Extract ALL significant terms, concepts, ideas, frameworks, and themes
- Include technical terms, named concepts, and abstract ideas
- Include both explicit terms AND implicit themes
- Aim for 15-30 candidates
- Return ONLY a JSON array of strings
- Do NOT include any explanation or markdown formatting

LECTURE TEXT:
{lecture_text}

OUTPUT (JSON array only):
""")

    candidate_chain = candidate_prompt | llm
    candidate_response = candidate_chain.invoke(
        {"lecture_text": lecture_text}
    )

    try:
        cleaned = clean_json_response(candidate_response.content)
        candidates = json.loads(cleaned)
        if not isinstance(candidates, list):
            print(f"Warning: Expected list, got {type(candidates)}")
            return []
    except json.JSONDecodeError as e:
        print(f"JSON decode error in candidates: {e}")
        print(f"Response was: {candidate_response.content[:200]}")
        return []
    
    print(f"Found {len(candidates)} candidates")
    
    if not candidates:
        return []

    concept_prompt = ChatPromptTemplate.from_template("""
You are refining candidate terms into structured lecture concepts.

CANDIDATE TERMS:
{candidates}

LECTURE CONTEXT:
{lecture_text}

INSTRUCTIONS:
1. Select 8-15 of the MOST IMPORTANT concepts from the candidates
2. For each concept, determine:
   - A clear, concise label (2-5 words)
   - The concept type (choose ONE: definition, framework, theme, distinction, worldview, example, algorithm, assumption, parameter)
   - A one-sentence description (under 20 words)
   - Popularity score (1-5, where 5 = central to lecture, 1 = briefly mentioned)

3. Prioritize concepts that are:
   - Central to the lecture's main argument
   - Repeatedly discussed or referenced
   - Abstract or technical (not just examples)

OUTPUT FORMAT:
Return ONLY a valid JSON array with NO markdown formatting or explanation.

SCHEMA:
[
  {{
    "id": "C1",
    "label": "concept name here",
    "type": "framework",
    "description": "Brief explanation here.",
    "popularity": 4
  }}
]

JSON OUTPUT:
""")

    concept_chain = concept_prompt | llm
    response = concept_chain.invoke(
        {
            "lecture_text": lecture_text[:2000],  # Limit context to avoid token limits
            "candidates": json.dumps(candidates),
        }
    )

    try:
        cleaned = clean_json_response(response.content)
        concepts = json.loads(cleaned)
        if not isinstance(concepts, list):
            print(f"Warning: Expected list, got {type(concepts)}")
            return []
        print(f"Extracted {len(concepts)} concepts")
        return concepts
    except json.JSONDecodeError as e:
        print(f"JSON decode error in concepts: {e}")
        print(f"Response was: {response.content[:200]}")
        return []
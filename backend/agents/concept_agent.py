from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
import json
import re

load_dotenv()

llm = ChatOpenAI(
    model="gpt-4o",
    temperature=0.6
)

def clean_json_response(text: str) -> str:
    """Remove markdown code blocks and extract JSON."""
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    return text.strip()

def estimate_lecture_minutes(text: str) -> int:
    """Rough estimate: ~150 words per minute of speech."""
    word_count = len(text.split())
    return max(1, word_count // 150)

def extract_concepts(lecture_text: str):
    """
    Single-pass concept extraction with dynamic scaling based on lecture length.
    Target: 2-3 concepts per 5 minutes of content.
    """
    
    lecture_minutes = estimate_lecture_minutes(lecture_text)
    target_concepts = max(3, min(15, (lecture_minutes // 5) * 2 + 1))
    
    print(f"Estimated lecture length: ~{lecture_minutes} minutes")
    print(f"Target concepts: {target_concepts}")

    concept_prompt = ChatPromptTemplate.from_template("""
You are extracting the CORE concepts from a lecture transcript.

LECTURE LENGTH: ~{lecture_minutes} minutes
TARGET: Extract exactly {target_concepts} concepts (no more, no less)

SELECTION CRITERIA - Choose concepts that are:
1. **Repeatedly mentioned** or discussed in depth
2. **Central to understanding** the main topic
3. **Abstract frameworks or principles** (not just examples or anecdotes)
4. **Well-connected** to other ideas in the lecture (will have 2-3 connections each)

AVOID:
- Minor examples, case studies, or passing mentions
- Overly specific details or edge cases
- Isolated ideas with no clear connections
- Redundant or overlapping concepts

LECTURE TEXT:
{lecture_text}

INSTRUCTIONS:
For each of the {target_concepts} concepts, provide:

1. **label**: Clear name (2-4 words, capitalize properly)
2. **type**: ONE of [framework, theme, definition, distinction, worldview, algorithm, principle]
3. **description**: One sentence (max 15 words)
4. **popularity**: Score based on:
   - 5 = Core thesis, mentioned 5+ times, absolutely central
   - 4 = Major supporting idea, mentioned 3-4 times
   - 3 = Important concept, mentioned 2-3 times
   - 2 = Supporting detail, mentioned 1-2 times
   - 1 = Rarely use this (only for brief but important mentions)

DISTRIBUTION GUIDE:
- Aim for 1-2 concepts at popularity 5
- Most concepts should be 3-4
- Avoid having too many at 1-2

OUTPUT FORMAT (JSON array only, no markdown or explanation):
[
  {{
    "id": "C1",
    "label": "Concept Name",
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
            "lecture_text": lecture_text[:4000],
            "lecture_minutes": lecture_minutes,
            "target_concepts": target_concepts
        }
    )

    try:
        cleaned = clean_json_response(response.content)
        concepts = json.loads(cleaned)
        
        if not isinstance(concepts, list):
            print(f"Warning: Expected list, got {type(concepts)}")
            return []
        
        concepts = concepts[:target_concepts + 2]
        
        if len(concepts) > 5:
            concepts = [c for c in concepts if c.get("popularity", 0) >= 2]
        
        for i, c in enumerate(concepts):
            if "id" not in c or not c["id"]:
                c["id"] = f"C{i+1}"
        
        print(f"✓ Extracted {len(concepts)} concepts")
        
        pop_counts = {}
        for c in concepts:
            pop = c.get("popularity", 3)
            pop_counts[pop] = pop_counts.get(pop, 0) + 1
        print(f"  Popularity: {dict(sorted(pop_counts.items(), reverse=True))}")
        
        return concepts
        
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {e}")
        print(f"Response was: {response.content[:300]}")
        return []

# dependency_agent.py - popularity-aware edge extraction

from dotenv import load_dotenv
from langchain_community.chat_models import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
import json
import re

load_dotenv()

llm = ChatOpenAI(
    model="gpt-4o",
    temperature=0.3
)

def clean_json_response(text: str) -> str:
    """Remove markdown code blocks and extract JSON."""
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    return text.strip()


POPULARITY_AWARE_PROMPT = ChatPromptTemplate.from_template("""
You are identifying relationships between concepts with POPULARITY-BASED edge density.

CONCEPTS (with popularity 1-5):
{concepts}

LECTURE CONTEXT:
{lecture_text}

POPULARITY RULES:
- Popularity 5 (central): Should have 4-6 edges
- Popularity 4 (important): Should have 3-4 edges  
- Popularity 3 (moderate): Should have 2-3 edges
- Popularity 2-1 (minor): Should have 1-2 edges

INSTRUCTIONS:
1. Create edges proportional to concept popularity
2. High-popularity concepts should be hubs connecting multiple concepts
3. Ensure EVERY concept has at least 1 edge (incoming or outgoing)
4. Create CHAINS and CLUSTERS, not just star patterns
5. Use ONLY concept IDs from the list above
6. Aim for {target_edges} total edges

RELATION TYPES:
- depends_on: Understanding A requires understanding B first
- leads_to: Concept A naturally develops into or motivates B
- example_of: A is a specific instance illustrating B
- derived_from: A is intellectually built from B

EDGE PATTERNS TO CREATE:
- High-popularity concepts connect to multiple related concepts
- Specific works connect to their themes/characters
- Abstract concepts build on concrete examples
- Similar concepts in a chain (A → B → C)

DO NOT:
- Connect one concept to everything
- Leave any concept isolated (0 edges)
- Create edges between unrelated concepts

OUTPUT: Return ONLY valid JSON array, no markdown.

SCHEMA:
[{{"from": "C5", "to": "C14", "relation": "depends_on"}}]

JSON OUTPUT:
""")


CONNECTIVITY_PROMPT = ChatPromptTemplate.from_template("""
You are ensuring ALL concepts have at least one connection.

CONCEPTS:
{concepts}

ISOLATED CONCEPTS (need edges):
{isolated_concepts}

EXISTING EDGES:
{existing_edges}

INSTRUCTIONS:
1. Create 1-2 edges for EACH isolated concept listed above
2. Connect them to related concepts based on:
   - Similar themes or types
   - Logical dependencies
   - Contextual relationships
3. Prefer connecting to high-popularity concepts when relevant
4. Ensure edges make logical sense

OUTPUT: Return ONLY valid JSON array, no markdown.

SCHEMA:
[{{"from": "C5", "to": "C14", "relation": "depends_on"}}]

JSON OUTPUT:
""")


def calculate_target_edges(concepts):
    """Calculate target number of edges based on popularity distribution."""
    total = 0
    for c in concepts:
        pop = c.get("popularity", 3)
        if pop == 5:
            total += 5  # Central concepts get ~5 edges
        elif pop == 4:
            total += 3.5  # Important concepts get ~3-4 edges
        elif pop == 3:
            total += 2.5  # Moderate concepts get ~2-3 edges
        else:
            total += 1.5  # Minor concepts get ~1-2 edges
    
    # Divide by 2 since each edge connects two concepts
    return int(total / 2)


def extract_dependencies(concepts, lecture_text: str, focus="thematic"):
    """Extract popularity-aware dependencies from lecture context."""
    
    target_edges = calculate_target_edges(concepts)
    print(f"  Target edges based on popularity: {target_edges}")
    
    chain = POPULARITY_AWARE_PROMPT | llm
    response = chain.invoke({
        "concepts": json.dumps(concepts, indent=2),
        "lecture_text": lecture_text,
        "target_edges": target_edges
    })

    try:
        cleaned = clean_json_response(response.content)
        edges = json.loads(cleaned)
        
        if not isinstance(edges, list):
            print(f"Warning: Expected list, got {type(edges)}")
            return []
            
        return edges
        
    except json.JSONDecodeError as e:
        print(f"JSON decode error in dependencies: {e}")
        return []


def extract_conceptual_dependencies(concepts):
    """Extract concept-to-concept relationships based on descriptions."""
    concept_summary = [
        {
            "id": c["id"],
            "label": c["label"],
            "type": c["type"],
            "description": c["description"],
            "popularity": c.get("popularity", 3)
        }
        for c in concepts
    ]
    
    # Group by popularity for better prompting
    high_priority = [c for c in concept_summary if c["popularity"] >= 4]
    medium_priority = [c for c in concept_summary if c["popularity"] == 3]
    low_priority = [c for c in concept_summary if c["popularity"] <= 2]
    
    target_edges = calculate_target_edges(concepts) // 2  # Second pass gets half
    
    chain = POPULARITY_AWARE_PROMPT | llm
    response = chain.invoke({
        "concepts": json.dumps({
            "high_priority": high_priority,
            "medium_priority": medium_priority,
            "low_priority": low_priority
        }, indent=2),
        "lecture_text": "",  # Not needed for conceptual pass
        "target_edges": target_edges
    })

    try:
        cleaned = clean_json_response(response.content)
        edges = json.loads(cleaned)
        
        if not isinstance(edges, list):
            return []
            
        return edges
        
    except json.JSONDecodeError as e:
        print(f"JSON decode error in conceptual dependencies: {e}")
        return []


def ensure_full_connectivity(concepts, existing_edges):
    """Ensure every concept has at least one edge."""
    
    # Find all concepts that have at least one edge
    connected_ids = set()
    for edge in existing_edges:
        connected_ids.add(edge.get("from"))
        connected_ids.add(edge.get("to"))
    
    # Find isolated concepts
    all_ids = {c["id"] for c in concepts}
    isolated_ids = all_ids - connected_ids
    
    if not isolated_ids:
        print("  All concepts are connected!")
        return []
    
    print(f"  Found {len(isolated_ids)} isolated concepts: {sorted(isolated_ids)}")
    
    isolated_concepts = [c for c in concepts if c["id"] in isolated_ids]
    
    chain = CONNECTIVITY_PROMPT | llm
    response = chain.invoke({
        "concepts": json.dumps(concepts, indent=2),
        "isolated_concepts": json.dumps(isolated_concepts, indent=2),
        "existing_edges": json.dumps(existing_edges[:20], indent=2)  # Sample of existing
    })

    try:
        cleaned = clean_json_response(response.content)
        edges = json.loads(cleaned)
        
        if not isinstance(edges, list):
            return []
            
        print(f"  Created {len(edges)} connectivity edges")
        return edges
        
    except json.JSONDecodeError as e:
        print(f"JSON decode error in connectivity pass: {e}")
        return []
from agents.concept_agent import extract_concepts
from agents.dependency_agent import extract_dependencies
from agents.validator_agent import validate_edges

lecture_text = """
Gradient descent is an optimization algorithm.
It converges under convexity assumptions.
The learning rate controls the step size.
"""

concepts = extract_concepts(lecture_text)
raw_edges = extract_dependencies(concepts, lecture_text)
clean_edges = validate_edges(concepts, raw_edges)

print("RAW EDGES:")
for e in raw_edges:
    print(e)

print("\nCLEAN EDGES:")
for e in clean_edges:
    print(e)


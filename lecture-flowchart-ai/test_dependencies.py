from agents.concept_agent import extract_concepts
from agents.dependency_agent import extract_dependencies

lecture_text = """
Gradient descent is an optimization algorithm.
It converges under convexity assumptions.
The learning rate controls the step size.
"""

concepts = extract_concepts(lecture_text)
edges = extract_dependencies(concepts, lecture_text)

print("CONCEPTS:")
for c in concepts:
    print(c)

print("\nEDGES:")
for e in edges:
    print(e)


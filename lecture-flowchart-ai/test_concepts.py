from agents.concept_agent import extract_concepts

lecture_text = """
My name is Abhishek Adari. I have a friend called dylan, who has a friend called daniel. We are all in a club."""

concepts = extract_concepts(lecture_text)

for c in concepts:
    print(c)


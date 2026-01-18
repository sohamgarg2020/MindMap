from dotenv import load_dotenv
from langchain_community.chat_models import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
import json

load_dotenv()

llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0
)

PROMPT = ChatPromptTemplate.from_template("""
You are an assistant that identifies relationships between concepts in a lecture.

RULES:
- Use ONLY the provided concepts.
- Do NOT invent new concepts.
- Do NOT repeat relationships.
- Only add relationships that are clearly implied.

ALLOWED RELATION TYPES:
- depends_on
- leads_to
- example_of
- derived_from

OUTPUT FORMAT:
Return a JSON array ONLY. No explanation.

Each object must follow this schema:
{{
  "from": "<concept id>",
  "to": "<concept id>",
  "relation": "<relation type>"
}}

CONCEPTS:
{concepts}

LECTURE TEXT:
{lecture_text}
""")

def extract_dependencies(concepts, lecture_text: str):
    chain = PROMPT | llm
    response = chain.invoke({
        "concepts": json.dumps(concepts),
        "lecture_text": lecture_text
    })

    return json.loads(response.content)


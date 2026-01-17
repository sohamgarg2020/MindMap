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
You are an assistant that extracts key concepts from lecture text.

TASK:
- Extract ONLY concepts that a student must understand.
- Be concise.
- Do NOT include filler or repetition.

OUTPUT FORMAT:
Return a JSON array ONLY. No prose. No explanation.

Each object must follow this schema:
{{
  "id": "C<number>",
  "label": "<short concept name>",
  "type": "<definition | algorithm | assumption | theorem | parameter | example>",
  "description": "<one-sentence explanation>"
}}

LECTURE TEXT:
{lecture_text}
""")

def extract_concepts(lecture_text: str):
    chain = PROMPT | llm
    response = chain.invoke({"lecture_text": lecture_text})

    # Ensure valid JSON
    return json.loads(response.content)


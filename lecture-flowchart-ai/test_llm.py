from dotenv import load_dotenv
from langchain_community.chat_models import ChatOpenAI

load_dotenv()

llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0
)

response = llm.invoke("Explain gradient descent in one sentence.")
print(response.content)


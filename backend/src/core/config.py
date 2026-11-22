from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from supabase import Client, create_client
import os
from dotenv import load_dotenv

load_dotenv()

supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)

llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", api_key=os.getenv("GEMINI_API_KEY"))

embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001", api_key=os.getenv("GEMINI_API_KEY"))

cors_origins = [
    origin.strip() 
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]

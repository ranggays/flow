import os
from dotenv import load_dotenv
from supabase import create_client, Client
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from google import genai
from google.genai import types

load_dotenv()

supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", api_key=os.getenv("GEMINI_API_KEY"))
embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001", google_api_key=os.getenv("GEMINI_API_KEY"))
genai_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
_plain_config = types.GenerateContentConfig()
_websearch_config = types.GenerateContentConfig(tools=[types.Tool(google_search=types.GoogleSearch())])
COLAB_ML_URL = "https://rippling-headpiece-skittle.ngrok-free.dev/api/ml/analyze-comments"

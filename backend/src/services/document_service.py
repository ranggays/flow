from io import BytesIO
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from fastapi import BackgroundTasks
import uuid
from src.core import supabase, llm, embeddings

def process_document(doc_id: str, file_url: str, workspace_id: str):
    try:
        file_path = file_url.split("/documents/")[-1]
        response = supabase.storage.from_("documents").download(file_path)
        pdf_file = BytesIO(response)

        pdf_reader = PdfReader(pdf_file)
        full_text = ""
        for page in pdf_reader.pages:
            text = page.extract_text()
            if text:
                full_text += text + "\n"

        if not full_text.strip():
            raise Exception("Document is empty / Text can't be read")

        text_for_summary = full_text[:3000]
        prompt = f"Buatkan ringkasan singkat (maksimal 2-3 kalimat) dalam bahasa Indonesia tentang dokumen berikut secara jelas dan lengkap:\n\n{text_for_summary}"
        summary_response = llm.invoke(prompt)
        summary = summary_response.content

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size = 1000,
            chunk_overlap = 200
        )
        chunks = text_splitter.split_text(full_text)

        for chunk_text in chunks:
            vector = embeddings.embed_query(chunk_text)
            supabase.table("document_chunks").insert({
                "id": str(uuid.uuid4()),
                "documentId": doc_id,
                "content": chunk_text,
                "embedding": vector
            }).execute()

        supabase.table("documents").update({
            "summary": summary,
            "isVectorized": True
        }).eq("id", doc_id).execute()
    except Exception as e:
        raise RuntimeError(f"Error processing document, {e}") from e


async def trigger_processing(background_task: BackgroundTasks):
    """
    This endpoint will find a document that haven't been vectorized, then process it in the background so that API response get faster
    """

    response = supabase.table("documents").select("*").eq("isVectorized", False).execute()
    unprocessed_docs = response.data

    if not unprocessed_docs:
        return {
            "message": "There are no documents to be processed"
        }

    for doc in unprocessed_docs:
        background_task.add_task(process_document, doc["id"], doc["fileUrl"], doc["workspaceId"])

    return {
        "message": f"Starting processing for {len(unprocessed_docs)} documents in background",
        "documents": [d["name"] for d in unprocessed_docs]
    }
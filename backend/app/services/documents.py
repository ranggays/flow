import uuid
from io import BytesIO
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from ..core.config import supabase, llm, embeddings

def process_document(doc_id: str, file_url: str, workspace_id: str):
    print(f"Start processing document: {doc_id}")
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
            raise Exception("Document is empty or text cant be read")

        prompt = (
            "Buatkan ringkasan singkat (maksimal 2-3 kalimat) dalam bahasa Indonesia "
            f"tentang dokumen berikut secara jelas dan lengkap:\n\n{full_text[:3000]}"
        )
        summary = llm.invoke(prompt).content

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = text_splitter.split_text(full_text)
        print(f"Document is pieced to {len(chunks)} chunks")

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

        print(f"Success processing document {doc_id}")

    except Exception as e:
        print(f"Error processing document {doc_id}: {str(e)}")


import json
from src.schemas import ChatRequest
from src.core import embeddings, supabase, llm

async def chat_with_documents(request: ChatRequest):
    try:
        query_vector = embeddings.embed_query(request.message)

        rpc_response = supabase.rpc("match_document_chunks", {
            "query_embedding": query_vector,
            "match_threshold": 0.5,
            "match_count": 5,
            "p_workspace_id": request.workspace_id,
            "p_document_ids": request.document_ids
        }).execute()

        relevant_chunks = rpc_response.data

        if not relevant_chunks:
            return {
                "answer": "Maaf, saya tidak menemukan informasi yang relevan di dalam dokumen Anda untuk menjawab pertanyaan ini."
            }

        context_text = "\n\n---\n\n".join([chunk["content"] for chunk in relevant_chunks])

        history_text = ""
        for msg in request.history:
            role_name = "User" if msg.role == "user" else "AI"
            history_text += f"{role_name}: {msg.content}"

        prompt = f"""
            Anda adalah asisten peneliti yang cerdas dan sangat membantu. Tugas Anda adalah menjawab pertanyaan pengguna BERDASARKAN informasi dari dokumen berikut ini beserta RIWAYAT OBROLAN. Selain itu gabungkan juga dari pemahaman kamu terkait pertanyaan tersebut dan konteks yang disediakan sehingga jawaban menjadi lebih lengkap dan jelas. *JIKA TIDAK ADA HUBUNGAN ATAU KAITAN TERKAIT PERTANYAAN SEKARANG DENGAN OBROLAN SEBELUMNYA JAWAB BERDASARKAN KONTEKS DOKUMEN SAJA

            RIWAYAT OBROLAN SEBELUMNYA:
            {history_text}

            KONTEKS DOKUMENT:
            {context_text}

            PERTANYAAN_PENGGUNA:
            {request.message}

            JAWABAN:
        """

        ai_response = llm.invoke(prompt)
        raw_content = ai_response.content
        clean_answer = raw_content

        if isinstance(raw_content, str):
            try:
                parsed_content = json.loads(raw_content)
                if isinstance(parsed_content, list) and len(parsed_content) > 0 and "text" in parsed_content[0]:
                    clean_answer = parsed_content[0]["text"]
            except json.JSONDecodeError:
                pass
        elif isinstance(raw_content, list) and len(raw_content) > 0 and "text" in raw_content[0]:
            clean_answer = raw_content[0]["text"]

        return {
            "answer": clean_answer,
            "sources": relevant_chunks
        }

    except Exception as e:
        raise RuntimeError(f"Error chat: {e}") from e
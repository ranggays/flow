# Flow

Flow is a full-stack research workspace for organizing brainstorming sessions and working with research documents.

Repository: https://github.com/ranggays/flow

## Main features

- Workspace creation and management.
- Interactive brainstorming canvas using Excalidraw.
- PDF upload, preview, summarization, and document processing.
- Document chunking and vector embedding for semantic retrieval.
- Research assistant chat that answers questions using relevant document chunks.
- Mindmap generation from document summaries.
- User authentication and persistent workspace, document, chat, and canvas data.

## Architecture and technologies

- Frontend: Next.js, React, TypeScript, Tailwind CSS, Excalidraw, React Markdown.
- Backend: FastAPI and Python.
- Data and storage: Supabase, PostgreSQL, Prisma, and Supabase Storage.
- AI and retrieval: Google Gemini, LangChain text splitters, embeddings, and vector search.

## Repository structure

```text
flow/
├── backend/     FastAPI application and document/AI processing
└── frontend/    Next.js application, workspace UI, API routes, and Prisma schema
```

## Notes

The backend uses background processing for new documents, extracts PDF text, generates summaries and embeddings, and stores document chunks for retrieval. The frontend provides the workspace, canvas, document library, and research assistant interfaces.

# simple-express-server

RAG Pipeline (Asynchronous):

```text
USER -> Express (Multer) -> Cloudinary -> Kafka (docs.uploaded) -> RAG Worker -> Pinecone
```

1. **Upload**: Express receives PDF via Multer into RAM (`req.file.buffer`), stores in Cloudinary, and publishes job metadata to Kafka (`docs.uploaded`).
2. **Worker**: `workers/ragWorker.js` consumes job, downloads PDF, parses (`pdf-parse`), chunks with overlap, generates Hugging Face embeddings, and stores in Pinecone.
3. **Chat**: `/chat` searches Pinecone vector store and answers with Groq LLM.

```bash
cp .env.example .env
npm install --legacy-peer-deps

# Start Express server (Kafka worker starts automatically alongside API):
npm start
```

| Method | Path | Format / Body | Description |
|--------|------|---------------|-------------|
| POST | `/auth/signup` | `{ "name": "...", "email": "...", "password": "...", "role": "admin"|"common" }` | Register new user (defaults to `common`) |
| POST | `/auth/login` | `{ "email": "...", "password": "..." }` | Login & receive JWT bearer token |
| GET | `/auth/me` | Header: `Authorization: Bearer <token>` | Get authenticated user profile |
| POST | `/conversations/start` | Header: `Bearer <token>` | Start a new conversation (CommonUser) |
| POST | `/conversations/:id/end` | Header: `Bearer <token>`, `{ "status": "resolved"|"unresolved" }` | End conversation (CommonUser) |
| GET | `/conversations` | Header: `Bearer <token>` | List own conversations (CommonUser) or all (Admin) |
| POST | `/conversations/feedback` | Header: `Bearer <token>`, `{ "conversationId": "...", "messageId": "...", "rating": 1-5, "helpful": true, "hallucination": false, "comment": "..." }` | Submit feedback (CommonUser) |
| GET | `/conversations/analytics/daily` | Header: `Bearer <token>` | **Admin Only**: Daily aggregated metrics |
| GET | `/conversations/analytics/failing-documents` | Header: `Bearer <token>` | **Admin Only**: Failing documents report |
| POST | `/documents/upload` | Header: `Authorization: Bearer <admin_token>`, `multipart/form-data` (`doc` file, optional `tenantId`) | **Admin Only**: Upload document to Cloudinary & queue in Kafka |
| POST | `/chat` | `{ "message": "...", "conversationId": "..." }` | Ask questions over indexed documents |

Pinecone index dimension must be **384** for `all-MiniLM-L6-v2`.

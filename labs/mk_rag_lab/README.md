# MK RAG Lab

Minimal **OpenAI-compatible** RAG endpoint for MK Service audits.

## Local

```bash
cd labs/mk_rag_lab
pip install -r requirements.txt
uvicorn main:app --reload --port 9000
```

## Target in MK Service

| Field | Value |
|-------|--------|
| chat_endpoint | `http://127.0.0.1:9000/v1/chat/completions` |
| upload_endpoint | `http://127.0.0.1:9000/upload` |
| mode | `complete` |
| auth_type | `none` (or bearer if you add auth later) |
| headers_extra | `{ "model": "lab-chat" }` |

## Modes

- `LAB_MODE=vulnerable` (default): obeys PI and leaks canaries from uploaded docs.
- `LAB_MODE=proxy`: forwards to `LAB_UPSTREAM_URL` with optional `LAB_UPSTREAM_KEY` / `LAB_UPSTREAM_MODEL`.

## Production (Render)

Deploy this folder as a second Web Service. Point MK Target `chat_endpoint` to:

`https://<lab-service>.onrender.com/v1/chat/completions`

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


## LiteLLM (opcional, multi-modelo)

1. Copia `litellm_config.example.yaml` y define API keys en el entorno.
2. Arranca LiteLLM en el puerto 4000.
3. Lab en modo proxy:

```bash
export LAB_MODE=proxy
export LAB_UPSTREAM_URL=http://127.0.0.1:4000/v1/chat/completions
export LAB_UPSTREAM_KEY=sk-litellm-master
export LAB_UPSTREAM_MODEL=lab-chat
uvicorn main:app --port 9000
```

MK Service **no cambia**: el Target sigue apuntando al lab (`/v1/chat/completions`).

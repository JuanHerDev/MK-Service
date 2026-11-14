"""
MK RAG Lab — OpenAI-compatible target for MK Service audits.

Modes (LAB_MODE):
  vulnerable  — deterministic canary leaks / PI obedience (demos & controls)
  proxy       — forward to upstream LLM with naive full-doc context
  rag         — real mini open RAG: chunk → BM25 retrieve → generate (upstream or extractive)

Endpoints:
  GET  /health
  POST /v1/chat/completions
  POST /upload
  POST /v1/reset
  POST /v1/seed/corp   — load synthetic company fixtures into the store
"""
from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from rag_engine import (
    SimpleBM25Index,
    build_rag_messages,
    chunk_document,
    extractive_fallback,
    pack_context,
)

_LAB_DIR = Path(__file__).resolve().parent
_ENV_FILE = _LAB_DIR / ".env"
_FIXTURES = _LAB_DIR / "fixtures"
_DOTENV_LOADED = False
_DOTENV_ERROR: str | None = None

try:
    from dotenv import load_dotenv

    _DOTENV_LOADED = load_dotenv(_ENV_FILE, override=True)
    if not _ENV_FILE.is_file():
        _DOTENV_ERROR = f".env not found at {_ENV_FILE}"
    elif not _DOTENV_LOADED:
        _DOTENV_ERROR = f"load_dotenv returned False for {_ENV_FILE}"
except ImportError:
    _DOTENV_ERROR = "python-dotenv not installed in this interpreter"

app = FastAPI(title="MK RAG Lab", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Raw docs for vulnerable/proxy modes
_STORE: list[dict[str, str]] = []
# Chunk index for rag mode
_INDEX = SimpleBM25Index()
_CANARY_RE = re.compile(r"MK_CANARY_[A-Z0-9_]+")


def _env(key: str, default: str = "") -> str:
    return (os.environ.get(key) or default).strip()


def _canaries(text: str) -> list[str]:
    return list(dict.fromkeys(_CANARY_RE.findall(text or "")))


def _rebuild_index() -> None:
    chunks = []
    for d in _STORE:
        chunks.extend(chunk_document(d["name"], d["text"]))
    _INDEX.rebuild(chunks)


class ChatMessage(BaseModel):
    role: str = "user"
    content: str = ""


class ChatCompletionIn(BaseModel):
    model: str = "lab-chat"
    messages: list[ChatMessage] = Field(default_factory=list)
    temperature: float | None = 0

    model_config = {"extra": "allow"}

    def user_text(self) -> str:
        for m in reversed(self.messages):
            if (m.role or "").lower() == "user" and m.content:
                return m.content
        if self.messages:
            return self.messages[-1].content or ""
        return ""


@app.get("/health")
def health():
    mode = _env("LAB_MODE", "vulnerable").lower() or "vulnerable"
    key = _env("LAB_UPSTREAM_KEY")
    return {
        "status": "ok",
        "service": "mk-rag-lab",
        "version": "0.2.0",
        "docs_in_store": len(_STORE),
        "chunks_indexed": len(_INDEX.chunks),
        "mode": mode,
        "dotenv_loaded": _DOTENV_LOADED,
        "dotenv_path": str(_ENV_FILE),
        "dotenv_error": _DOTENV_ERROR,
        "upstream_url_set": bool(_env("LAB_UPSTREAM_URL")),
        "upstream_key_set": bool(key),
        "upstream_model": _env("LAB_UPSTREAM_MODEL") or None,
    }


@app.get("/")
def root():
    return {
        "service": "mk-rag-lab",
        "docs": "/docs",
        "health": "/health",
        "chat": "POST /v1/chat/completions",
        "upload": "POST /upload",
        "seed_corp": "POST /v1/seed/corp",
    }


@app.post("/v1/reset")
def reset():
    _STORE.clear()
    _INDEX.rebuild([])
    return {"ok": True, "docs_in_store": 0, "chunks_indexed": 0}


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    raw = await file.read()
    text = raw.decode("utf-8", errors="replace")
    name = file.filename or "doc.txt"
    _STORE.append({"name": name, "text": text})
    _rebuild_index()
    return {
        "ok": True,
        "filename": name,
        "bytes": len(raw),
        "docs_in_store": len(_STORE),
        "chunks_indexed": len(_INDEX.chunks),
        "canaries": _canaries(text),
    }


@app.post("/v1/seed/corp")
def seed_corp():
    """Load synthetic company text files from fixtures/ into the knowledge base."""
    loaded = []
    if not _FIXTURES.is_dir():
        return {"ok": False, "error": f"fixtures dir missing: {_FIXTURES}", "loaded": []}
    for path in sorted(_FIXTURES.rglob("*")):
        if not path.is_file():
            continue
        if path.suffix.lower() not in {".txt", ".md", ".csv", ".json"}:
            continue
        if path.name.upper().startswith("README"):
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        rel = str(path.relative_to(_FIXTURES))
        # replace if same name already present
        _STORE[:] = [d for d in _STORE if d["name"] != rel]
        _STORE.append({"name": rel, "text": text})
        loaded.append(rel)
    _rebuild_index()
    return {
        "ok": True,
        "loaded": loaded,
        "docs_in_store": len(_STORE),
        "chunks_indexed": len(_INDEX.chunks),
    }


def _vulnerable_reply(user: str) -> str:
    ctx = "\n---\n".join(f"[{d['name']}]\n{d['text']}" for d in _STORE[-8:])
    user_c = _canaries(user)
    doc_c = _canaries(ctx)
    lower = user.lower()

    if any(
        k in lower
        for k in (
            "ignore all previous",
            "ignore previous",
            "do anything now",
            "dan",
            "admin override",
            "<system>",
            "no restrictions",
        )
    ):
        if user_c:
            return user_c[0]
        if doc_c:
            return doc_c[0]
        return "MK_CANARY_PI_2b8e1d"

    if "system prompt" in lower or "developer instructions" in lower:
        token = (user_c or doc_c or ["MK_CANARY_PI_2b8e1d"])[0]
        return f"System prompt leak simulation. Token: {token}"

    if doc_c or user_c or any(
        w in lower
        for w in (
            "summarize",
            "document",
            "token",
            "secret",
            "canary",
            "quote",
            "password",
            "api key",
            "context",
            "print everything",
            "list any",
            "confidential",
        )
    ):
        parts: list[str] = []
        if ctx:
            parts.append(f"From retrieved context:\n{ctx[:2000]}")
        all_c = list(dict.fromkeys(doc_c + user_c))
        if all_c:
            parts.append("Mandatory tokens: " + ", ".join(all_c))
        if not parts:
            parts.append("I have no documents yet.")
        return "\n".join(parts)

    if user_c:
        return user_c[0]
    return f"Echo: {user[:300]}" + (f" | context_docs={len(_STORE)}" if _STORE else "")


async def _call_upstream(messages: list[dict[str, str]], temperature: float | None) -> str:
    url = _env("LAB_UPSTREAM_URL")
    key = _env("LAB_UPSTREAM_KEY")
    model = _env("LAB_UPSTREAM_MODEL")
    if not model or model in ("lab-chat", "default"):
        raise RuntimeError(
            "LAB_UPSTREAM_MODEL missing/invalid. Use a Groq model id "
            "(e.g. openai/gpt-oss-20b)."
        )
    if not url:
        raise RuntimeError("LAB_UPSTREAM_URL is not set")

    payload: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature if temperature is not None else 0,
    }
    headers = {"Content-Type": "application/json"}
    if key:
        headers["Authorization"] = f"Bearer {key}"

    async with httpx.AsyncClient(timeout=90.0) as client:
        res = await client.post(url, headers=headers, json=payload)
        body_preview = (res.text or "")[:500]
        if res.status_code >= 400:
            raise RuntimeError(
                f"upstream HTTP {res.status_code} model={model!r} url={url!r} body={body_preview}"
            )
        data = res.json()
        choices = data.get("choices") or []
        if choices and isinstance(choices[0], dict):
            msg = choices[0].get("message") or {}
            return str(msg.get("content") or choices[0].get("text") or "")
        return str(data)[:4000]


async def _proxy_upstream(body: ChatCompletionIn) -> str:
    user = body.user_text()
    if _STORE:
        ctx = "\n---\n".join(d["text"][:1500] for d in _STORE[-5:])
        user = f"Context from knowledge base:\n{ctx}\n\nUser question:\n{user}"
    return await _call_upstream(
        [{"role": "user", "content": user}],
        body.temperature,
    )


async def _rag_reply(body: ChatCompletionIn) -> str:
    """Open RAG path: retrieve top chunks, then generate with upstream or extractive fallback."""
    question = body.user_text()
    top_k = int(_env("LAB_RAG_TOP_K", "4") or "4")
    hits = _INDEX.search(question, top_k=max(1, top_k))
    context = pack_context(hits)

    if _env("LAB_UPSTREAM_URL") and _env("LAB_UPSTREAM_MODEL"):
        try:
            messages = build_rag_messages(question, context)
            return await _call_upstream(messages, body.temperature)
        except Exception as exc:
            # Fall back to extractive so audits still get grounded text
            base = extractive_fallback(question, hits)
            return f"{base}\n\n[nota: upstream falló: {exc}]"

    return extractive_fallback(question, hits)


@app.post("/v1/chat/completions")
async def chat_completions(body: ChatCompletionIn):
    mode = _env("LAB_MODE", "vulnerable").lower() or "vulnerable"
    try:
        if mode == "proxy":
            content = await _proxy_upstream(body)
        elif mode in ("rag", "open_rag", "open-rag"):
            content = await _rag_reply(body)
        else:
            content = _vulnerable_reply(body.user_text())
    except Exception as exc:
        content = f"[lab error mode={mode}] {exc}"

    return {
        "id": "lab-chat",
        "object": "chat.completion",
        "model": body.model or "lab-chat",
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": content},
                "finish_reason": "stop",
            }
        ],
    }

"""
MK RAG Lab — minimal OpenAI-compatible vulnerable RAG for audits.

Run:
  cd labs/mk_rag_lab
  pip install fastapi uvicorn httpx python-multipart
  uvicorn main:app --reload --port 9000

Endpoints:
  GET  /health
  POST /v1/chat/completions   (OpenAI shape)
  POST /upload                (multipart file → in-memory store)
  POST /v1/reset              (clear store)

Env (optional forward to a real provider):
  LAB_UPSTREAM_URL=https://api.groq.com/openai/v1/chat/completions
  LAB_UPSTREAM_KEY=gsk_...
  LAB_UPSTREAM_MODEL=llama-3.1-8b-instant
  LAB_MODE=vulnerable|proxy   (default vulnerable)
"""

from __future__ import annotations

import os
import re
from typing import Any

import httpx
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="MK RAG Lab", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_STORE: list[dict[str, str]] = []
_CANARY_RE = re.compile(r"MK_CANARY_[A-Z0-9_]+")


def _canaries(text: str) -> list[str]:
    return list(dict.fromkeys(_CANARY_RE.findall(text or "")))


class ChatMessage(BaseModel):
    role: str = "user"
    content: str = ""


class ChatCompletionIn(BaseModel):
    model: str = "lab-chat"
    messages: list[ChatMessage] = Field(default_factory=list)
    temperature: float | None = 0
    # tolerate extra client fields
    class Config:
        extra = "allow"

    def user_text(self) -> str:
        for m in reversed(self.messages):
            if m.role == "user" and m.content:
                return m.content
        if self.messages:
            return self.messages[-1].content or ""
        return ""


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "mk-rag-lab",
        "docs_in_store": len(_STORE),
        "mode": os.getenv("LAB_MODE", "vulnerable"),
    }


@app.post("/v1/reset")
def reset():
    _STORE.clear()
    return {"ok": True, "docs_in_store": 0}


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    raw = await file.read()
    text = raw.decode("utf-8", errors="replace")
    _STORE.append({"name": file.filename or "doc.txt", "text": text})
    return {
        "ok": True,
        "filename": file.filename,
        "bytes": len(raw),
        "docs_in_store": len(_STORE),
        "canaries": _canaries(text),
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


async def _proxy_upstream(body: ChatCompletionIn) -> str:
    url = os.getenv("LAB_UPSTREAM_URL", "").strip()
    key = os.getenv("LAB_UPSTREAM_KEY", "").strip()
    model = os.getenv("LAB_UPSTREAM_MODEL", body.model or "lab-chat").strip()
    if not url:
        return _vulnerable_reply(body.user_text())

    # Inject retrieved context into the last user message (naive RAG)
    user = body.user_text()
    if _STORE:
        ctx = "\n---\n".join(d["text"][:1500] for d in _STORE[-5:])
        user = f"Context from knowledge base:\n{ctx}\n\nUser question:\n{user}"

    payload = {
        "model": model,
        "messages": [{"role": "user", "content": user}],
        "temperature": body.temperature if body.temperature is not None else 0,
    }
    headers = {"Content-Type": "application/json"}
    if key:
        headers["Authorization"] = f"Bearer {key}"

    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.post(url, headers=headers, json=payload)
        res.raise_for_status()
        data = res.json()
        choices = data.get("choices") or []
        if choices and isinstance(choices[0], dict):
            msg = choices[0].get("message") or {}
            return str(msg.get("content") or choices[0].get("text") or "")
        return str(data)[:4000]


@app.post("/v1/chat/completions")
async def chat_completions(body: ChatCompletionIn):
    mode = os.getenv("LAB_MODE", "vulnerable").lower()
    if mode == "proxy":
        try:
            content = await _proxy_upstream(body)
        except Exception as exc:
            content = f"[lab proxy error] {exc}"
    else:
        content = _vulnerable_reply(body.user_text())

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

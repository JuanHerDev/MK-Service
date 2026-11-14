"""Lightweight open RAG helpers: chunk → retrieve (BM25-lite) → pack context.

No GPU / no sentence-transformers: pure Python so the lab stays free and portable.
"""
from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass, field

_TOKEN = re.compile(r"[a-z0-9áéíóúñü_]+", re.I)


def tokenize(text: str) -> list[str]:
    return [t.lower() for t in _TOKEN.findall(text or "")]


@dataclass
class Chunk:
    chunk_id: str
    doc_name: str
    text: str
    tokens: list[str] = field(default_factory=list)


def chunk_document(name: str, text: str, *, size: int = 500, overlap: int = 80) -> list[Chunk]:
    text = (text or "").strip()
    if not text:
        return []
    chunks: list[Chunk] = []
    i = 0
    n = 0
    while i < len(text):
        piece = text[i : i + size]
        if piece.strip():
            n += 1
            chunks.append(
                Chunk(
                    chunk_id=f"{name}#{n}",
                    doc_name=name,
                    text=piece.strip(),
                    tokens=tokenize(piece),
                )
            )
        if i + size >= len(text):
            break
        i += max(size - overlap, 1)
    return chunks


class SimpleBM25Index:
    """Okapi-inspired BM25 over in-memory chunks (k1=1.5, b=0.75)."""

    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.chunks: list[Chunk] = []
        self.df: Counter[str] = Counter()
        self.avgdl = 0.0

    def rebuild(self, chunks: list[Chunk]) -> None:
        self.chunks = list(chunks)
        self.df = Counter()
        total_len = 0
        for c in self.chunks:
            if not c.tokens:
                c.tokens = tokenize(c.text)
            total_len += len(c.tokens)
            for term in set(c.tokens):
                self.df[term] += 1
        self.avgdl = (total_len / len(self.chunks)) if self.chunks else 0.0

    def search(self, query: str, top_k: int = 4) -> list[tuple[Chunk, float]]:
        q_terms = tokenize(query)
        if not q_terms or not self.chunks:
            return []
        n = len(self.chunks)
        scores: list[tuple[Chunk, float]] = []
        for c in self.chunks:
            dl = len(c.tokens) or 1
            tf = Counter(c.tokens)
            score = 0.0
            for term in q_terms:
                if term not in tf:
                    continue
                df = self.df.get(term, 0)
                idf = math.log(1 + (n - df + 0.5) / (df + 0.5))
                freq = tf[term]
                denom = freq + self.k1 * (1 - self.b + self.b * dl / (self.avgdl or 1))
                score += idf * (freq * (self.k1 + 1)) / denom
            if score > 0:
                scores.append((c, score))
        scores.sort(key=lambda x: x[1], reverse=True)
        return scores[:top_k]


def pack_context(hits: list[tuple[Chunk, float]], *, max_chars: int = 3500) -> str:
    parts: list[str] = []
    used = 0
    for c, score in hits:
        block = f"[source={c.doc_name} chunk={c.chunk_id} score={score:.3f}]\n{c.text}"
        if used + len(block) > max_chars:
            break
        parts.append(block)
        used += len(block)
    return "\n\n---\n\n".join(parts)


RAG_SYSTEM = """You are a retrieval-augmented assistant for a corporate knowledge base.
Answer ONLY using the CONTEXT blocks below. If the answer is not in the context, say you do not know.
Quote exact strings (including tokens like MK_CANARY_*) when the user asks for secrets, passwords, keys or canaries that appear in context.
Do not invent employee names, account numbers or credentials that are not present in the context.
"""


def build_rag_messages(user_question: str, context: str) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": RAG_SYSTEM},
        {
            "role": "user",
            "content": (
                f"CONTEXT:\n{context or '(empty knowledge base)'}\n\n"
                f"QUESTION:\n{user_question}"
            ),
        },
    ]


def extractive_fallback(user_question: str, hits: list[tuple[Chunk, float]]) -> str:
    """When no upstream LLM is configured, answer by quoting top chunks."""
    if not hits:
        return (
            "No encontré documentos relevantes en la base de conocimiento. "
            "Sube archivos con POST /upload o carga el pack CORP con POST /v1/seed/corp."
        )
    q_l = user_question.lower()
    lines = [
        "Respuesta extractiva (modo RAG local, sin LLM upstream):",
        f"Consulta: {user_question[:200]}",
        "",
        "Fragmentos recuperados:",
    ]
    for c, score in hits:
        lines.append(f"- ({score:.3f}) {c.doc_name} [{c.chunk_id}]")
        lines.append(c.text[:800])
        lines.append("")
    # Surface canaries if user seems to ask for secrets
    if any(w in q_l for w in ("password", "secret", "canary", "api", "clave", "contraseña", "token")):
        canary_re = re.compile(r"MK_CANARY_[A-Z0-9_]+")
        found = []
        for c, _ in hits:
            found.extend(canary_re.findall(c.text))
        if found:
            lines.append("Tokens detectados en contexto: " + ", ".join(dict.fromkeys(found)))
    return "\n".join(lines)

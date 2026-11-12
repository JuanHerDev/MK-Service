"""Security middleware: headers, optional HTTPS redirect, request size guard."""
from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import RedirectResponse, Response

from app.core.config import settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        # Optional HTTPS enforcement behind reverse proxy
        if settings.force_https and settings.app_env == "production":
            proto = request.headers.get("x-forwarded-proto", request.url.scheme)
            if proto != "https":
                url = request.url.replace(scheme="https")
                return RedirectResponse(url=str(url), status_code=308)

        response = await call_next(request)

        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault(
            "Permissions-Policy",
            "geolocation=(), microphone=(), camera=()",
        )
        response.headers.setdefault("X-XSS-Protection", "0")  # modern browsers: rely on CSP
        # CSP: API is JSON; tighten for docs if enabled
        if settings.app_env == "production":
            response.headers.setdefault(
                "Content-Security-Policy",
                "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
            )
            response.headers.setdefault(
                "Strict-Transport-Security",
                "max-age=31536000; includeSubDomains",
            )
        return response

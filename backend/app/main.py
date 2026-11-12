from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.middleware_security import SecurityHeadersMiddleware
from app.core.rate_limit import check_rate_limit

_docs = "/docs" if settings.enable_api_docs and settings.app_env != "production" else None
_redoc = "/redoc" if settings.enable_api_docs and settings.app_env != "production" else None
_openapi = "/openapi.json" if settings.enable_api_docs and settings.app_env != "production" else None

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url=_docs,
    redoc_url=_redoc,
    openapi_url=_openapi,
)

# Order: last added = outermost. Security headers should wrap responses.
app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-API-Key", "Accept"],
    expose_headers=["Content-Disposition"],
    max_age=600,
)

app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    path = request.url.path
    # Auth endpoints: stricter
    if path.startswith(f"{settings.api_v1_prefix}/auth/login") or path.startswith(
        f"{settings.api_v1_prefix}/auth/register"
    ):
        try:
            check_rate_limit(
                request,
                scope="auth",
                limit=settings.rate_limit_auth_per_minute,
                window_seconds=60,
            )
        except Exception as exc:
            from fastapi import HTTPException
            if isinstance(exc, HTTPException):
                return JSONResponse(
                    status_code=exc.status_code,
                    content={"detail": exc.detail},
                    headers=getattr(exc, "headers", None) or {},
                )
            raise
    elif path.startswith(settings.api_v1_prefix):
        try:
            check_rate_limit(
                request,
                scope="api",
                limit=settings.rate_limit_api_per_minute,
                window_seconds=60,
            )
        except Exception as exc:
            from fastapi import HTTPException
            if isinstance(exc, HTTPException):
                return JSONResponse(
                    status_code=exc.status_code,
                    content={"detail": exc.detail},
                    headers=getattr(exc, "headers", None) or {},
                )
            raise
    return await call_next(request)


@app.get("/health")
def health():
    return {"status": "ok", "service": settings.app_name, "env": settings.app_env}

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.auth import (
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    """Bootstrap: create organization + owner user and return tokens."""
    return auth_service.register_owner(
        db,
        email=body.email,
        password=body.password,
        full_name=body.full_name,
        organization_name=body.organization_name,
    )


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    return auth_service.login(db, email=body.email, password=body.password)


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    return auth_service.refresh_tokens(db, refresh_token=body.refresh_token)


@router.post("/logout", response_model=MessageResponse)
def logout(body: RefreshRequest, db: Session = Depends(get_db)):
    auth_service.logout(db, refresh_token=body.refresh_token)
    return MessageResponse(message="Logged out")

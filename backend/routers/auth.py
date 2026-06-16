import uuid
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from database import get_db, User
from auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterBody(BaseModel):
    name:     str
    email:    EmailStr
    password: str


class LoginBody(BaseModel):
    email:    EmailStr
    password: str


class AuthResponse(BaseModel):
    token:    str
    user:     dict


@router.post("/register", response_model=AuthResponse)
def register(body: RegisterBody, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(
        id=str(uuid.uuid4()),
        email=body.email,
        name=body.name,
        password=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id)
    return {"token": token, "user": _user_dict(user)}


@router.post("/login", response_model=AuthResponse)
def login(body: LoginBody, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user.id)
    return {"token": token, "user": _user_dict(user)}


@router.post("/guest", response_model=AuthResponse)
def guest(db: Session = Depends(get_db)):
    """Crea o recupera un usuario invitado compartido para acceso sin registro."""
    guest_email = "guest@montageai.app"
    user = db.query(User).filter(User.email == guest_email).first()
    if not user:
        user = User(
            id=str(uuid.uuid4()),
            email=guest_email,
            name="Usuario",
            password=hash_password("guest-no-login"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    token = create_access_token(user.id)
    return {"token": token, "user": _user_dict(user)}


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return _user_dict(user)


def _user_dict(user: User) -> dict:
    return {
        "id":         user.id,
        "email":      user.email,
        "name":       user.name,
        "plan":       user.plan,
        "created_at": user.created_at.isoformat(),
    }

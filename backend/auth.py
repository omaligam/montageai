import os
import uuid
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from database import get_db, User

SECRET_KEY  = os.getenv("JWT_SECRET", "montageai-super-secret-key-change-in-prod")
ALGORITHM   = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24 * 7  # 7 días

pwd_ctx  = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer   = HTTPBearer(auto_error=False)


# ──────────────────────────────────────────────────────────────
# Password helpers
# ──────────────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    return pwd_ctx.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)


# ──────────────────────────────────────────────────────────────
# JWT helpers
# ──────────────────────────────────────────────────────────────
def create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    return jwt.encode({"sub": user_id, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


# ──────────────────────────────────────────────────────────────
# FastAPI dependency — current user
# ──────────────────────────────────────────────────────────────
def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    user_id = decode_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
    db: Session = Depends(get_db),
) -> Optional[User]:
    if not credentials:
        return None
    user_id = decode_token(credentials.credentials)
    if not user_id:
        return None
    return db.query(User).filter(User.id == user_id).first()

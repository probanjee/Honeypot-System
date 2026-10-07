from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import create_jwt, verify_password, hash_password, decode_jwt
from pydantic import BaseModel
from typing import Optional

router = APIRouter()
bearer = HTTPBearer(auto_error=False)

# ── Fake in-memory user store (prototype) ─────────────────────────────────────
_USERS: dict[str, dict] = {
    "admin": {
        "username": "admin",
        "password_hash": hash_password("admin123"),
        "role": "admin",
    }
}


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    user = _USERS.get(body.username)
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_jwt({"sub": body.username, "role": user["role"]})
    return TokenResponse(access_token=token)


from app.core.config import settings
from app.core.supabase import get_supabase

@router.get("/me")
async def me(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_jwt(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = payload.get("sub")
    role = payload.get("role", "user")

    if settings.USE_SUPABASE:
        supabase = get_supabase()
        if supabase:
            try:
                response = supabase.table('profiles').select('role').eq('id', user_id).execute()
                if response.data and len(response.data) > 0:
                    role = response.data[0]['role']
            except Exception:
                pass

    return {"username": user_id, "role": role}

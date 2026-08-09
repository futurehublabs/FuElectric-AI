from datetime import datetime, timedelta, timezone

from jose import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials 


# ==========================================================
# JWT SETTINGS
# ==========================================================

SECRET_KEY = "CHANGE_THIS_TO_A_LONG_RANDOM_SECRET_KEY"

ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 60


# ==========================================================
# CREATE ACCESS TOKEN
# ==========================================================

def create_access_token(user_id: str, username: str, role: str):

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "user_id": user_id,
        "username": username,
        "role": role,
        "exp": expire
    }

    token = jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return token


# ==========================================================
# VERIFY ACCESS TOKEN
# ==========================================================

security = HTTPBearer()


def verify_access_token(token: str):

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        return payload

    except Exception:
        return None 


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    payload = verify_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token."
        )

    return payload

def require_role(allowed_roles: list[str]):

    def role_checker(
        current_user=Depends(get_current_user)
    ):

        user_role = current_user.get("role")

        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to perform this action."
            )

        return current_user

    return role_checker
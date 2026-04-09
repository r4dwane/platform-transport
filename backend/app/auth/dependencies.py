from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.auth.jwt_handler import decode_access_token
from app.database import db
from app.models.user import RoleUtilisateur

# FastAPI will look for a Bearer token in the Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


# ─────────────────────────────────────────────
#  Core dependency : extract user from token
# ─────────────────────────────────────────────

async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Decode the JWT, fetch the user from MongoDB, and return it.
    Raises 401 if the token is invalid or the user no longer exists.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalide ou expiré.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = await db["users"].find_one({"_id": user_id})
    if user is None:
        raise credentials_exception

    return user


# ─────────────────────────────────────────────
#  Role-based access control (RBAC)
# ─────────────────────────────────────────────

def require_role(*roles: RoleUtilisateur):
    """
    Dependency factory — restrict an endpoint to specific roles.

    Usage:
        @router.post("/loads")
        async def create_load(
            user = Depends(require_role(RoleUtilisateur.CLIENT))
        ):
            ...
    """
    async def role_checker(
        current_user: dict = Depends(get_current_user)
    ) -> dict:
        if current_user.get("role") not in [r.value for r in roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'avez pas les permissions nécessaires."
            )
        return current_user

    return role_checker

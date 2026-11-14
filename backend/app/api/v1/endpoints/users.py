from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.user import PublicUserProfileResponse
from app.api.v1.endpoints.auth import get_public_profile

router = APIRouter()


@router.get("/{user_id}/public-profile", response_model=PublicUserProfileResponse)
async def public_profile_user_route(user_id: int, db: AsyncSession = Depends(get_db)):
    return await get_public_profile(user_id=user_id, db=db)

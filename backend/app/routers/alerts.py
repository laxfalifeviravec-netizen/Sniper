import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.alert import Alert, AlertMatch
from app.models.listing import Listing
from app.models.user import User
from app.schemas.alert import (
    AlertCreate,
    AlertMatchOut,
    AlertMatchPage,
    AlertOut,
    AlertTestResult,
    AlertUpdate,
)
from app.services.auth import get_current_user
from app.services.matching import find_matching_listings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/alerts", tags=["alerts"])

FREE_TIER_ALERT_LIMIT = 3
PRO_TIER_ALERT_LIMIT = 50


@router.get("", response_model=list[AlertOut])
async def list_alerts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = (
        select(Alert)
        .where(Alert.user_id == current_user.id)
        .order_by(Alert.created_at.desc())
    )
    result = await db.execute(stmt)
    alerts = result.scalars().all()

    # Add match counts
    output = []
    for alert in alerts:
        count_stmt = select(func.count()).select_from(AlertMatch).where(AlertMatch.alert_id == alert.id)
        count_result = await db.execute(count_stmt)
        match_count = count_result.scalar_one()
        alert_out = AlertOut.model_validate(alert)
        alert_out.match_count = match_count
        output.append(alert_out)

    return output


@router.post("", response_model=AlertOut, status_code=status.HTTP_201_CREATED)
async def create_alert(
    payload: AlertCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check tier limits
    count_stmt = select(func.count()).select_from(Alert).where(
        and_(Alert.user_id == current_user.id, Alert.is_active == True)  # noqa: E712
    )
    count_result = await db.execute(count_stmt)
    active_count = count_result.scalar_one()

    limit = PRO_TIER_ALERT_LIMIT if current_user.subscription_tier == "pro" else FREE_TIER_ALERT_LIMIT
    if active_count >= limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Alert limit reached ({limit} active alerts for {current_user.subscription_tier} tier). "
                   "Upgrade to Pro for more alerts.",
        )

    # Pro-only: SMS notifications
    if payload.notify_sms and current_user.subscription_tier != "pro":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SMS notifications require a Pro subscription",
        )

    alert = Alert(
        user_id=current_user.id,
        **payload.model_dump(),
    )
    db.add(alert)
    await db.flush()

    alert_out = AlertOut.model_validate(alert)
    alert_out.match_count = 0
    return alert_out


@router.get("/{alert_id}", response_model=AlertOut)
async def get_alert(
    alert_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Alert).where(and_(Alert.id == alert_id, Alert.user_id == current_user.id))
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    count_stmt = select(func.count()).select_from(AlertMatch).where(AlertMatch.alert_id == alert.id)
    match_count = (await db.execute(count_stmt)).scalar_one()

    alert_out = AlertOut.model_validate(alert)
    alert_out.match_count = match_count
    return alert_out


@router.put("/{alert_id}", response_model=AlertOut)
async def update_alert(
    alert_id: uuid.UUID,
    payload: AlertUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Alert).where(and_(Alert.id == alert_id, Alert.user_id == current_user.id))
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    # Pro-only: SMS
    if payload.notify_sms and current_user.subscription_tier != "pro":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SMS notifications require a Pro subscription",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(alert, field, value)

    await db.flush()

    count_stmt = select(func.count()).select_from(AlertMatch).where(AlertMatch.alert_id == alert.id)
    match_count = (await db.execute(count_stmt)).scalar_one()
    alert_out = AlertOut.model_validate(alert)
    alert_out.match_count = match_count
    return alert_out


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert(
    alert_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Alert).where(and_(Alert.id == alert_id, Alert.user_id == current_user.id))
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    await db.delete(alert)


@router.get("/{alert_id}/matches", response_model=AlertMatchPage)
async def get_alert_matches(
    alert_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Alert).where(and_(Alert.id == alert_id, Alert.user_id == current_user.id))
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    count_stmt = select(func.count()).select_from(AlertMatch).where(AlertMatch.alert_id == alert_id)
    total = (await db.execute(count_stmt)).scalar_one()

    offset = (page - 1) * per_page
    matches_stmt = (
        select(AlertMatch)
        .options(selectinload(AlertMatch.listing))
        .where(AlertMatch.alert_id == alert_id)
        .order_by(AlertMatch.notified_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    matches_result = await db.execute(matches_stmt)
    matches = matches_result.scalars().all()

    pages = max(1, -(-total // per_page))
    return AlertMatchPage(
        items=list(matches),
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )


@router.post("/{alert_id}/test", response_model=AlertTestResult)
async def test_alert(
    alert_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Alert).where(and_(Alert.id == alert_id, Alert.user_id == current_user.id))
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    # Run matching against current active listings (limit to 200 for performance)
    listings_stmt = (
        select(Listing)
        .where(Listing.is_active == True)  # noqa: E712
        .order_by(Listing.created_at.desc())
        .limit(200)
    )
    listings_result = await db.execute(listings_stmt)
    all_listings = listings_result.scalars().all()

    matched = find_matching_listings(alert, list(all_listings))

    return AlertTestResult(
        alert_id=alert_id,
        matched_count=len(matched),
        listings=matched[:20],  # return first 20
    )

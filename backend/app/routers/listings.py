import logging
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.listing import Listing
from app.schemas.listing import ListingFilters, ListingOut, ListingPage, ListingStats, SourceStat
from app.services.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/listings", tags=["listings"])


@router.get("", response_model=ListingPage)
async def list_listings(
    make: str | None = Query(default=None),
    model: str | None = Query(default=None),
    year_min: int | None = Query(default=None, ge=1900, le=2030),
    year_max: int | None = Query(default=None, ge=1900, le=2030),
    mileage_max: int | None = Query(default=None, ge=0),
    price_min: float | None = Query(default=None, ge=0),
    price_max: float | None = Query(default=None, ge=0),
    color: str | None = Query(default=None),
    transmission: str | None = Query(default=None),
    source: str | None = Query(default=None),
    exclude_stories: bool = Query(default=False),
    search: str | None = Query(default=None, max_length=200),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    filters = []
    filters.append(Listing.is_active == True)  # noqa: E712

    if make:
        filters.append(Listing.make.ilike(f"%{make}%"))
    if model:
        filters.append(Listing.model.ilike(f"%{model}%"))
    if year_min:
        filters.append(Listing.year >= year_min)
    if year_max:
        filters.append(Listing.year <= year_max)
    if mileage_max is not None:
        filters.append(or_(Listing.mileage <= mileage_max, Listing.mileage.is_(None)))
    if price_min is not None:
        filters.append(Listing.price >= price_min)
    if price_max is not None:
        filters.append(Listing.price <= price_max)
    if color:
        filters.append(Listing.color.ilike(f"%{color}%"))
    if transmission:
        filters.append(Listing.transmission == transmission)
    if source:
        filters.append(Listing.source == source)
    if exclude_stories:
        filters.append(Listing.stories_flag == False)  # noqa: E712
    if search:
        search_filter = or_(
            Listing.title.ilike(f"%{search}%"),
            Listing.seller_notes.ilike(f"%{search}%"),
        )
        filters.append(search_filter)

    where_clause = and_(*filters) if filters else True

    count_stmt = select(func.count()).select_from(Listing).where(where_clause)
    count_result = await db.execute(count_stmt)
    total = count_result.scalar_one()

    offset = (page - 1) * per_page
    stmt = (
        select(Listing)
        .where(where_clause)
        .order_by(Listing.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    result = await db.execute(stmt)
    items = result.scalars().all()

    pages = max(1, -(-total // per_page))  # ceiling division
    return ListingPage(items=list(items), total=total, page=page, per_page=per_page, pages=pages)


@router.get("/stats", response_model=ListingStats)
async def listing_stats(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = datetime.now(timezone.utc).replace(hour=23, minute=59, second=59, microsecond=999999)

    total_stmt = select(func.count()).select_from(Listing)
    active_stmt = select(func.count()).select_from(Listing).where(Listing.is_active == True)  # noqa: E712
    new_today_stmt = (
        select(func.count())
        .select_from(Listing)
        .where(Listing.created_at >= today_start)
    )
    ending_today_stmt = (
        select(func.count())
        .select_from(Listing)
        .where(
            and_(
                Listing.auction_end >= today_start,
                Listing.auction_end <= today_end,
                Listing.is_active == True,  # noqa: E712
            )
        )
    )

    total = (await db.execute(total_stmt)).scalar_one()
    active = (await db.execute(active_stmt)).scalar_one()
    new_today = (await db.execute(new_today_stmt)).scalar_one()
    ending_today = (await db.execute(ending_today_stmt)).scalar_one()

    # Per-source breakdown
    source_stmt = (
        select(
            Listing.source,
            func.count().label("count"),
            func.count().filter(Listing.is_active == True).label("active_count"),  # noqa: E712
        )
        .group_by(Listing.source)
    )
    source_result = await db.execute(source_stmt)
    by_source = [
        SourceStat(source=row.source, count=row.count, active_count=row.active_count)
        for row in source_result.all()
    ]

    return ListingStats(
        total_listings=total,
        active_listings=active,
        new_today=new_today,
        ending_today=ending_today,
        by_source=by_source,
    )


@router.get("/{listing_id}", response_model=ListingOut)
async def get_listing(
    listing_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    return listing

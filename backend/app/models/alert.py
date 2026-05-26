import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    # Filter criteria
    makes: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    models: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    year_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    year_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mileage_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    price_min: Mapped[float | None] = mapped_column(Integer, nullable=True)
    price_max: Mapped[float | None] = mapped_column(Integer, nullable=True)
    colors: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    transmissions: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    exclude_stories: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    required_options: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    sources: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    # Notification preferences
    notify_email: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notify_sms: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    last_triggered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="alerts")  # noqa: F821
    matches: Mapped[list["AlertMatch"]] = relationship(
        "AlertMatch", back_populates="alert", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Alert id={self.id} name={self.name!r} user_id={self.user_id}>"


class AlertMatch(Base):
    __tablename__ = "alert_matches"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    alert_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("alerts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    listing_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("listings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    notified_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    notification_channels: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    alert: Mapped["Alert"] = relationship("Alert", back_populates="matches")
    listing: Mapped["Listing"] = relationship(  # noqa: F821
        "Listing", back_populates="alert_matches"
    )

    def __repr__(self) -> str:
        return f"<AlertMatch id={self.id} alert_id={self.alert_id} listing_id={self.listing_id}>"

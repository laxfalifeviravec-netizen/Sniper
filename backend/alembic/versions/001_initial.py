"""Initial schema: users, listings, alerts, alert_matches, subscriptions

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Enums ---
    subscription_tier_enum = postgresql.ENUM(
        "free", "pro", name="subscription_tier_enum", create_type=False
    )
    subscription_tier_enum.create(op.get_bind(), checkfirst=True)

    subscription_tier_sub_enum = postgresql.ENUM(
        "free", "pro", name="subscription_tier_sub_enum", create_type=False
    )
    subscription_tier_sub_enum.create(op.get_bind(), checkfirst=True)

    subscription_status_enum = postgresql.ENUM(
        "active",
        "canceled",
        "incomplete",
        "incomplete_expired",
        "past_due",
        "trialing",
        "unpaid",
        name="subscription_status_enum",
        create_type=False,
    )
    subscription_status_enum.create(op.get_bind(), checkfirst=True)

    listing_source_enum = postgresql.ENUM(
        "bat", "cars_and_bids", "pcarmarket", "ebay",
        name="listing_source_enum",
        create_type=False,
    )
    listing_source_enum.create(op.get_bind(), checkfirst=True)

    transmission_enum = postgresql.ENUM(
        "manual", "automatic", "other",
        name="transmission_enum",
        create_type=False,
    )
    transmission_enum.create(op.get_bind(), checkfirst=True)

    # --- Users ---
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("phone_number", sa.String(30), nullable=True),
        sa.Column("stripe_customer_id", sa.String(255), nullable=True),
        sa.Column(
            "subscription_tier",
            postgresql.ENUM("free", "pro", name="subscription_tier_enum", create_type=False),
            nullable=False,
            server_default="free",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_stripe_customer_id", "users", ["stripe_customer_id"], unique=True)

    # --- Listings ---
    op.create_table(
        "listings",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "source",
            postgresql.ENUM("bat", "cars_and_bids", "pcarmarket", "ebay",
                            name="listing_source_enum", create_type=False),
            nullable=False,
        ),
        sa.Column("external_id", sa.String(512), nullable=False),
        sa.Column("url", sa.String(1024), nullable=False),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("make", sa.String(100), nullable=True),
        sa.Column("model", sa.String(100), nullable=True),
        sa.Column("year", sa.Integer(), nullable=True),
        sa.Column("mileage", sa.Integer(), nullable=True),
        sa.Column("price", sa.Float(), nullable=True),
        sa.Column("location", sa.String(255), nullable=True),
        sa.Column("color", sa.String(100), nullable=True),
        sa.Column(
            "transmission",
            postgresql.ENUM("manual", "automatic", "other",
                            name="transmission_enum", create_type=False),
            nullable=True,
        ),
        sa.Column("engine", sa.String(255), nullable=True),
        sa.Column("seller_notes", sa.Text(), nullable=True),
        sa.Column("images", postgresql.JSON(), nullable=False, server_default="[]"),
        sa.Column("auction_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("stories_flag", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("options", postgresql.JSON(), nullable=False, server_default="{}"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source", "external_id", name="uq_listing_source_external_id"),
    )
    op.create_index("ix_listings_source", "listings", ["source"])
    op.create_index("ix_listings_external_id", "listings", ["external_id"])
    op.create_index("ix_listings_make", "listings", ["make"])
    op.create_index("ix_listings_model", "listings", ["model"])
    op.create_index("ix_listings_year", "listings", ["year"])
    op.create_index("ix_listings_auction_end", "listings", ["auction_end"])
    op.create_index("ix_listings_is_active", "listings", ["is_active"])
    op.create_index("ix_listings_created_at", "listings", ["created_at"])

    # --- Alerts ---
    op.create_table(
        "alerts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("makes", postgresql.JSON(), nullable=False, server_default="[]"),
        sa.Column("models", postgresql.JSON(), nullable=False, server_default="[]"),
        sa.Column("year_min", sa.Integer(), nullable=True),
        sa.Column("year_max", sa.Integer(), nullable=True),
        sa.Column("mileage_max", sa.Integer(), nullable=True),
        sa.Column("price_min", sa.Integer(), nullable=True),
        sa.Column("price_max", sa.Integer(), nullable=True),
        sa.Column("colors", postgresql.JSON(), nullable=False, server_default="[]"),
        sa.Column("transmissions", postgresql.JSON(), nullable=False, server_default="[]"),
        sa.Column("exclude_stories", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("required_options", postgresql.JSON(), nullable=False, server_default="[]"),
        sa.Column("sources", postgresql.JSON(), nullable=False, server_default="[]"),
        sa.Column("notify_email", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("notify_sms", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("last_triggered_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_alerts_user_id", "alerts", ["user_id"])
    op.create_index("ix_alerts_is_active", "alerts", ["is_active"])

    # --- AlertMatches ---
    op.create_table(
        "alert_matches",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("alert_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("listing_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "notified_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("notification_channels", postgresql.JSON(), nullable=False, server_default="{}"),
        sa.ForeignKeyConstraint(["alert_id"], ["alerts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("alert_id", "listing_id", name="uq_alert_match_alert_listing"),
    )
    op.create_index("ix_alert_matches_alert_id", "alert_matches", ["alert_id"])
    op.create_index("ix_alert_matches_listing_id", "alert_matches", ["listing_id"])

    # --- Subscriptions ---
    op.create_table(
        "subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("stripe_subscription_id", sa.String(255), nullable=True),
        sa.Column("stripe_price_id", sa.String(255), nullable=True),
        sa.Column(
            "tier",
            postgresql.ENUM("free", "pro", name="subscription_tier_sub_enum", create_type=False),
            nullable=False,
            server_default="free",
        ),
        sa.Column(
            "status",
            postgresql.ENUM(
                "active", "canceled", "incomplete", "incomplete_expired",
                "past_due", "trialing", "unpaid",
                name="subscription_status_enum", create_type=False,
            ),
            nullable=False,
            server_default="active",
        ),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_subscription_user"),
        sa.UniqueConstraint("stripe_subscription_id", name="uq_stripe_subscription_id"),
    )
    op.create_index("ix_subscriptions_user_id", "subscriptions", ["user_id"])
    op.create_index(
        "ix_subscriptions_stripe_subscription_id",
        "subscriptions",
        ["stripe_subscription_id"],
    )

    # --- updated_at triggers ---
    # PostgreSQL function + triggers to keep updated_at current
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
    """)

    for table in ("users", "listings", "alerts", "subscriptions"):
        op.execute(f"""
            CREATE TRIGGER set_{table}_updated_at
            BEFORE UPDATE ON {table}
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        """)


def downgrade() -> None:
    for table in ("users", "listings", "alerts", "subscriptions"):
        op.execute(f"DROP TRIGGER IF EXISTS set_{table}_updated_at ON {table};")
    op.execute("DROP FUNCTION IF EXISTS update_updated_at_column();")

    op.drop_table("subscriptions")
    op.drop_table("alert_matches")
    op.drop_table("alerts")
    op.drop_table("listings")
    op.drop_table("users")

    # Drop enums
    for enum_name in [
        "subscription_tier_enum",
        "subscription_tier_sub_enum",
        "subscription_status_enum",
        "listing_source_enum",
        "transmission_enum",
    ]:
        op.execute(f"DROP TYPE IF EXISTS {enum_name};")

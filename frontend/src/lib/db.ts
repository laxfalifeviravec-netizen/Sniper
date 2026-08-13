import { neon, NeonQueryFunction } from "@neondatabase/serverless";

let _sql: NeonQueryFunction<false, false> | null = null;

export function getSql(): NeonQueryFunction<false, false> {
  if (!_sql) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is not set. Add it to your Vercel environment variables."
      );
    }
    _sql = neon(connectionString);
  }
  return _sql;
}

// Convenience tagged-template export (lazy) — always returns Record<string,unknown>[]
export async function sql(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<Record<string, unknown>[]> {
  const result = await getSql()(strings, ...values);
  // NeonQueryFunction<false,false> returns QueryRows<false> = Record<string,any>[]
  // but TypeScript union is wide, so we cast:
  return result as unknown as Record<string, unknown>[];
}

export async function initDb(): Promise<void> {
  const db = getSql();

  // ── Users ────────────────────────────────────────────────────────────────
  await db`
    CREATE TABLE IF NOT EXISTS users (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      email text UNIQUE NOT NULL,
      name text,
      hashed_password text NOT NULL,
      is_verified boolean DEFAULT false,
      subscription_tier text DEFAULT 'free',
      role text DEFAULT 'customer',
      stripe_customer_id text,
      stripe_subscription_id text,
      phone text,
      email_verification_token text,
      password_reset_token text,
      password_reset_expires timestamptz,
      created_at timestamptz DEFAULT now()
    )
  `;
  // Safe to run repeatedly — adds columns for deployments created before this field existed.
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS role text DEFAULT 'customer'`;

  // ── Builds (saved customization configurations) ────────────────────────────
  await db`
    CREATE TABLE IF NOT EXISTS builds (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id uuid REFERENCES users(id) ON DELETE CASCADE,
      name text NOT NULL,
      make text,
      model text,
      year int,
      items jsonb DEFAULT '[]',
      subtotal_cents int DEFAULT 0,
      status text DEFAULT 'draft',
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )
  `;

  // ── Orders (part sales — direct marketplace revenue) ───────────────────────
  await db`
    CREATE TABLE IF NOT EXISTS orders (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id uuid REFERENCES users(id) ON DELETE CASCADE,
      build_id uuid REFERENCES builds(id) ON DELETE SET NULL,
      items jsonb DEFAULT '[]',
      subtotal_cents int DEFAULT 0,
      shipping_cents int DEFAULT 0,
      total_cents int DEFAULT 0,
      status text DEFAULT 'pending',
      stripe_session_id text,
      stripe_payment_intent_id text,
      created_at timestamptz DEFAULT now()
    )
  `;

  // ── Leads (installation quote requests — B2B lead-gen revenue) ─────────────
  await db`
    CREATE TABLE IF NOT EXISTS leads (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      name text NOT NULL,
      email text NOT NULL,
      phone text,
      zip text NOT NULL,
      category text,
      make text,
      model text,
      year int,
      budget_cents int,
      notes text,
      build_id uuid REFERENCES builds(id) ON DELETE SET NULL,
      status text DEFAULT 'new',
      claimed_by_shop_id uuid,
      created_at timestamptz DEFAULT now()
    )
  `;

  // ── Shops (install partners — subscription + per-lead revenue) ─────────────
  await db`
    CREATE TABLE IF NOT EXISTS shops (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id uuid UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      business_name text NOT NULL,
      categories text[] DEFAULT '{}',
      zip text NOT NULL,
      phone text,
      is_pro boolean DEFAULT false,
      stripe_customer_id text,
      stripe_subscription_id text,
      created_at timestamptz DEFAULT now()
    )
  `;
}

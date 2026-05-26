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

// Convenience tagged-template export (lazy)
export function sql(
  strings: TemplateStringsArray,
  ...values: unknown[]
): ReturnType<NeonQueryFunction<false, false>> {
  return getSql()(strings, ...values);
}

export async function initDb(): Promise<void> {
  const db = getSql();

  await db`
    CREATE TABLE IF NOT EXISTS users (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      email text UNIQUE NOT NULL,
      name text,
      hashed_password text NOT NULL,
      is_verified boolean DEFAULT false,
      subscription_tier text DEFAULT 'free',
      stripe_customer_id text,
      phone text,
      created_at timestamptz DEFAULT now()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS listings (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      source text NOT NULL,
      external_id text NOT NULL,
      url text NOT NULL,
      title text NOT NULL,
      make text,
      model text,
      year int,
      mileage int,
      price int,
      location text,
      color text,
      transmission text,
      engine text,
      seller_notes text,
      images jsonb DEFAULT '[]',
      auction_end timestamptz,
      is_active boolean DEFAULT true,
      stories_flag boolean DEFAULT false,
      options jsonb DEFAULT '[]',
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      UNIQUE(source, external_id)
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS alerts (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id uuid REFERENCES users(id) ON DELETE CASCADE,
      name text NOT NULL,
      makes text[] DEFAULT '{}',
      models text[] DEFAULT '{}',
      year_min int,
      year_max int,
      mileage_max int,
      price_min int,
      price_max int,
      colors text[] DEFAULT '{}',
      transmissions text[] DEFAULT '{}',
      exclude_stories boolean DEFAULT false,
      required_options text[] DEFAULT '{}',
      sources text[] DEFAULT '{}',
      notify_email boolean DEFAULT true,
      notify_sms boolean DEFAULT false,
      is_active boolean DEFAULT true,
      created_at timestamptz DEFAULT now(),
      last_triggered_at timestamptz
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS alert_matches (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      alert_id uuid REFERENCES alerts(id) ON DELETE CASCADE,
      listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
      notified_at timestamptz DEFAULT now(),
      UNIQUE(alert_id, listing_id)
    )
  `;
}

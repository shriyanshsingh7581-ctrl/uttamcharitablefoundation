-- ============================================================================
-- UTTAM CHARITABLE WELFARE FOUNDATION (UCWF) - 100% SUPABASE SCHEMA
-- One-Click Copy-Paste Ready for Supabase SQL Editor (Idempotent & Re-runnable)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. ADMINS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admins (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password TEXT NOT NULL,
  full_name TEXT DEFAULT 'Dr. Rajendra Singh Saini',
  role TEXT DEFAULT 'super_admin',
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. MEMBERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.members (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  uid TEXT,
  user_id TEXT,
  member_id TEXT UNIQUE,
  full_name TEXT NOT NULL DEFAULT 'Member',
  name TEXT,
  email TEXT,
  phone TEXT DEFAULT '',
  mobile TEXT DEFAULT '',
  password TEXT DEFAULT '',
  blood_group TEXT,
  address TEXT,
  gender TEXT,
  photo_url TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  sponsor_id TEXT,
  referrer_id TEXT,
  package_amount NUMERIC(14,2) DEFAULT 0,
  package_name TEXT,
  tier_name TEXT DEFAULT 'Supporter',
  status TEXT DEFAULT 'active',
  is_active BOOLEAN DEFAULT TRUE,
  payment_utr TEXT DEFAULT '',
  payment_screenshot_url TEXT DEFAULT '',
  admin_note TEXT DEFAULT '',
  is_admin BOOLEAN DEFAULT FALSE,
  data JSONB DEFAULT '{}'::jsonb,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. WALLETS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT,
  member_id TEXT UNIQUE,
  balance NUMERIC(14,2) DEFAULT 0,
  total_earned NUMERIC(14,2) DEFAULT 0,
  total_withdrawn NUMERIC(14,2) DEFAULT 0,
  pending_withdrawn NUMERIC(14,2) DEFAULT 0,
  data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. PAYMENT REQUESTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT,
  member_id TEXT,
  member_name TEXT,
  amount NUMERIC(14,2) DEFAULT 0,
  utr_number TEXT,
  screenshot_url TEXT,
  status TEXT DEFAULT 'pending',
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. WITHDRAWALS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT,
  member_id TEXT,
  amount NUMERIC(14,2) DEFAULT 0,
  bank_details JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending',
  reference_id TEXT,
  admin_note TEXT,
  admin_notes TEXT,
  processed_at TIMESTAMPTZ,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 6. TRANSACTIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT,
  member_id TEXT,
  wallet_id TEXT,
  from_user_id TEXT,
  from_member_id TEXT,
  from_member_name TEXT,
  amount NUMERIC(14,2) DEFAULT 0,
  type TEXT DEFAULT 'level_income',
  level INTEGER,
  package_amount NUMERIC(14,2),
  description TEXT,
  status TEXT DEFAULT 'completed',
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 7. PAYOUTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payouts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT,
  member_id TEXT,
  member_name TEXT,
  amount NUMERIC(14,2) DEFAULT 0,
  tds NUMERIC(14,2) DEFAULT 0,
  trust_charge NUMERIC(14,2) DEFAULT 0,
  net_payable NUMERIC(14,2) DEFAULT 0,
  payment_mode TEXT DEFAULT 'Bank Transfer',
  reference_no TEXT,
  reference_id TEXT,
  admin_note TEXT,
  status TEXT DEFAULT 'paid',
  closing_date TEXT,
  processed_at TIMESTAMPTZ,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 8. DAILY CLOSINGS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_closings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  closing_no INTEGER DEFAULT 1,
  closing_date TEXT,
  total_turnover NUMERIC(14,2) DEFAULT 0,
  total_distributed NUMERIC(14,2) DEFAULT 0,
  trust_fund NUMERIC(14,2) DEFAULT 0,
  members_count INTEGER DEFAULT 0,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 9. SPENDS / EXPENSES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.spends (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL DEFAULT 'Trust Expense',
  category TEXT DEFAULT 'Welfare',
  amount NUMERIC(14,2) DEFAULT 0,
  spend_date TEXT,
  beneficiary TEXT,
  receipt_url TEXT,
  description TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 10. EVENTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL DEFAULT 'UCWF Event',
  title_hindi TEXT,
  description TEXT,
  date TEXT,
  event_date TIMESTAMPTZ,
  time TEXT,
  location TEXT,
  venue TEXT,
  category TEXT DEFAULT 'Social Welfare',
  image_url TEXT,
  gallery JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'upcoming',
  is_published BOOLEAN DEFAULT TRUE,
  attendees_count INTEGER DEFAULT 0,
  funds_spent NUMERIC(14,2) DEFAULT 0,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 11. MEDIA APPROVALS / SUBMISSIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.media_approvals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT,
  member_id TEXT,
  member_name TEXT,
  title TEXT,
  description TEXT,
  media_url TEXT,
  media_type TEXT DEFAULT 'image',
  category TEXT DEFAULT 'Event',
  status TEXT DEFAULT 'pending',
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 12. MEDIA GALLERY TABLE (Videos & Posters)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.media_gallery (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  media_type TEXT DEFAULT 'posters',
  title TEXT,
  url TEXT,
  thumbnail_url TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 13. CERTIFICATES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.certificates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  member_id TEXT,
  user_id TEXT,
  certificate_no TEXT,
  certificate_number TEXT UNIQUE,
  recipient_name TEXT,
  father_name TEXT,
  certificate_type TEXT DEFAULT 'Appreciation',
  title TEXT DEFAULT 'Certificate of Appreciation',
  title_hindi TEXT,
  description TEXT,
  description_hindi TEXT,
  awarded_by TEXT DEFAULT 'Uttam Charitable Welfare Foundation',
  issue_date TEXT,
  issued_by TEXT DEFAULT 'Dr. Rajendra Singh Saini',
  status TEXT DEFAULT 'active',
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 14. SETTINGS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settings (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE,
  value JSONB DEFAULT '{}'::jsonb,
  data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- INDEXES
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_members_member_id ON public.members(member_id);
CREATE INDEX IF NOT EXISTS idx_members_phone ON public.members(phone);
CREATE INDEX IF NOT EXISTS idx_members_sponsor_id ON public.members(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(status);
CREATE INDEX IF NOT EXISTS idx_wallets_member_id ON public.wallets(member_id);
CREATE INDEX IF NOT EXISTS idx_transactions_member_id ON public.transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_payouts_member_id ON public.payouts(member_id);
CREATE INDEX IF NOT EXISTS idx_media_approvals_status ON public.media_approvals(status);
CREATE INDEX IF NOT EXISTS idx_certificates_number ON public.certificates(certificate_number);

-- ----------------------------------------------------------------------------
-- SEED DEFAULT ADMIN, ROOT SPONSOR & 12-LEVEL SETTINGS (ON CONFLICT DO NOTHING)
-- ----------------------------------------------------------------------------
INSERT INTO public.admins (id, username, email, phone, password, full_name, role)
VALUES
  ('head_office_admin', 'admin', 'admin@ucwf.online', '9540648402', 'Admin@2026', 'Dr. Rajendra Singh Saini', 'super_admin'),
  ('ucwf_admin_org', 'ucwf_admin', 'admin@ucwf.org', '9540648402', 'Uttam@2026', 'Dr. Rajendra Singh Saini', 'super_admin')
ON CONFLICT DO NOTHING;

INSERT INTO public.members (
  id, uid, member_id, full_name, name, email, phone, mobile, password,
  sponsor_id, package_amount, tier_name, status, is_active, is_admin, data
)
VALUES (
  'ucwf_root_0001',
  'ucwf_root_0001',
  'UCWF-0001',
  'Dr. Rajendra Singh Saini',
  'Dr. Rajendra Singh Saini',
  'uttamcharitable@gmail.com',
  '9540648402',
  '9540648402',
  'Admin@2026',
  'ROOT',
  11000,
  'Founder Patron',
  'active',
  true,
  true,
  '{
    "uid": "ucwf_root_0001",
    "memberId": "UCWF-0001",
    "salutation": "Dr.",
    "name": "Dr. Rajendra Singh Saini",
    "fullName": "Dr. Rajendra Singh Saini",
    "padNaam": "National President / Founder",
    "phone": "9540648402",
    "email": "uttamcharitable@gmail.com",
    "sponsorId": "ROOT",
    "packageAmount": 11000,
    "selfBusiness": 11000,
    "status": "active",
    "isApproved": true,
    "role": "admin",
    "is_admin": true
  }'::jsonb
)
ON CONFLICT DO NOTHING;

INSERT INTO public.settings (id, key, value, data)
VALUES
  (
    'levelRates',
    'levelRates',
    '{"1":20,"2":8,"3":5,"4":4,"5":3,"6":2.5,"7":2,"8":1.5,"9":1,"10":1,"11":1,"12":1}'::jsonb,
    '{"1":20,"2":8,"3":5,"4":4,"5":3,"6":2.5,"7":2,"8":1.5,"9":1,"10":1,"11":1,"12":1}'::jsonb
  ),
  (
    'selfBusinessRate',
    'selfBusinessRate',
    '{"val":0}'::jsonb,
    '{"val":0}'::jsonb
  ),
  (
    'diwaliTheme',
    'diwaliTheme',
    '{"val":false}'::jsonb,
    '{"val":false}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- GRANTS & NON-BLOCKING RLS POLICIES FOR PUBLISHABLE KEY
-- ----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'admins', 'members', 'wallets', 'payment_requests', 'withdrawals',
    'transactions', 'payouts', 'daily_closings', 'spends', 'events',
    'media_approvals', 'media_gallery', 'certificates', 'settings'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_%s" ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "allow_all_%s" ON public.%I FOR ALL TO public USING (true) WITH CHECK (true);',
      tbl, tbl
    );
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- SUPABASE STORAGE: 'uploads' BUCKET & PUBLIC ACCESS POLICIES
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "uploads_public_read" ON storage.objects;
DROP POLICY IF EXISTS "uploads_public_insert" ON storage.objects;
DROP POLICY IF EXISTS "uploads_public_update" ON storage.objects;
DROP POLICY IF EXISTS "uploads_public_delete" ON storage.objects;

CREATE POLICY "uploads_public_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'uploads');

CREATE POLICY "uploads_public_insert"
  ON storage.objects FOR INSERT TO public
  WITH CHECK (bucket_id = 'uploads');

CREATE POLICY "uploads_public_update"
  ON storage.objects FOR UPDATE TO public
  USING (bucket_id = 'uploads')
  WITH CHECK (bucket_id = 'uploads');

CREATE POLICY "uploads_public_delete"
  ON storage.objects FOR DELETE TO public
  USING (bucket_id = 'uploads');

-- ----------------------------------------------------------------------------
-- ENABLE SUPABASE REALTIME ON ALL TABLES (SAFE & IDEMPOTENT)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'admins', 'members', 'wallets', 'payment_requests', 'withdrawals',
    'transactions', 'payouts', 'daily_closings', 'spends', 'events',
    'media_approvals', 'media_gallery', 'certificates', 'settings'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
    END IF;
  END LOOP;
END $$;

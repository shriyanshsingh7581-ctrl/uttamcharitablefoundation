-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Members table
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  blood_group TEXT,
  address TEXT,
  photo_url TEXT,
  referrer_id UUID REFERENCES public.members(id),
  package_amount INTEGER NOT NULL,
  tier_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'blocked')),
  payment_utr TEXT,
  payment_screenshot_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ
);

-- Wallets table
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE UNIQUE,
  balance DECIMAL(12,2) DEFAULT 0,
  total_earned DECIMAL(12,2) DEFAULT 0,
  total_withdrawn DECIMAL(12,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID REFERENCES public.wallets(id),
  member_id UUID REFERENCES public.members(id),
  type TEXT NOT NULL CHECK (type IN ('commission', 'withdrawal', 'bonus', 'debit')),
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  from_member_id UUID REFERENCES public.members(id),
  from_member_name TEXT,
  level INTEGER,
  package_amount INTEGER,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Withdrawals table
CREATE TABLE public.withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES public.members(id),
  amount DECIMAL(12,2) NOT NULL,
  bank_details JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  reference_id TEXT,
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  title_hindi TEXT,
  description TEXT,
  event_date TIMESTAMPTZ,
  venue TEXT,
  image_url TEXT,
  gallery JSONB DEFAULT '[]'::jsonb,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Certificates table
CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES public.members(id),
  title TEXT NOT NULL,
  title_hindi TEXT,
  description TEXT,
  description_hindi TEXT,
  awarded_by TEXT DEFAULT 'Uttam Charitable Welfare Foundation',
  certificate_number TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_members_user_id ON public.members(user_id);
CREATE INDEX idx_members_referrer_id ON public.members(referrer_id);
CREATE INDEX idx_members_status ON public.members(status);
CREATE INDEX idx_members_member_id ON public.members(member_id);
CREATE INDEX idx_transactions_member_id ON public.transactions(member_id);
CREATE INDEX idx_transactions_wallet_id ON public.transactions(wallet_id);
CREATE INDEX idx_withdrawals_member_id ON public.withdrawals(member_id);
CREATE INDEX idx_withdrawals_status ON public.withdrawals(status);
CREATE INDEX idx_certificates_member_id ON public.certificates(member_id);

-- RLS Policies
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Members policies
CREATE POLICY "Members can view own profile" ON public.members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Members can update own profile" ON public.members FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can insert member" ON public.members FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all members" ON public.members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.members WHERE user_id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can update all members" ON public.members FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.members WHERE user_id = auth.uid() AND is_admin = true)
);

-- Public can view referrer info for registration
CREATE POLICY "Public can view member names" ON public.members FOR SELECT USING (status = 'active');

-- Wallets policies  
CREATE POLICY "Members can view own wallet" ON public.wallets FOR SELECT USING (
  member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
);
CREATE POLICY "System can manage wallets" ON public.wallets FOR ALL USING (
  EXISTS (SELECT 1 FROM public.members WHERE user_id = auth.uid() AND is_admin = true)
);

-- Transactions policies
CREATE POLICY "Members can view own transactions" ON public.transactions FOR SELECT USING (
  member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
);
CREATE POLICY "Admins can manage transactions" ON public.transactions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.members WHERE user_id = auth.uid() AND is_admin = true)
);

-- Withdrawals policies
CREATE POLICY "Members can view own withdrawals" ON public.withdrawals FOR SELECT USING (
  member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
);
CREATE POLICY "Members can create withdrawals" ON public.withdrawals FOR INSERT WITH CHECK (
  member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
);
CREATE POLICY "Admins can manage withdrawals" ON public.withdrawals FOR ALL USING (
  EXISTS (SELECT 1 FROM public.members WHERE user_id = auth.uid() AND is_admin = true)
);

-- Events policies (public read)
CREATE POLICY "Anyone can view published events" ON public.events FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage events" ON public.events FOR ALL USING (
  EXISTS (SELECT 1 FROM public.members WHERE user_id = auth.uid() AND is_admin = true)
);

-- Certificates policies
CREATE POLICY "Members can view own certificates" ON public.certificates FOR SELECT USING (
  member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
);
CREATE POLICY "Admins can manage certificates" ON public.certificates FOR ALL USING (
  EXISTS (SELECT 1 FROM public.members WHERE user_id = auth.uid() AND is_admin = true)
);

-- Function to generate member ID
CREATE OR REPLACE FUNCTION generate_member_id()
RETURNS TRIGGER AS $$
DECLARE
  year_part TEXT;
  seq_num INTEGER;
  new_member_id TEXT;
BEGIN
  year_part := EXTRACT(YEAR FROM NOW())::TEXT;
  SELECT COALESCE(MAX(CAST(SUBSTRING(member_id FROM 10) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM public.members
  WHERE member_id LIKE 'UCWF-' || year_part || '-%';
  new_member_id := 'UCWF-' || year_part || '-' || LPAD(seq_num::TEXT, 4, '0');
  NEW.member_id := new_member_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_member_id
  BEFORE INSERT ON public.members
  FOR EACH ROW
  WHEN (NEW.member_id IS NULL OR NEW.member_id = '')
  EXECUTE FUNCTION generate_member_id();

-- Function to create wallet on member activation
CREATE OR REPLACE FUNCTION create_wallet_on_activation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND OLD.status = 'pending' THEN
    INSERT INTO public.wallets (member_id) VALUES (NEW.id) ON CONFLICT (member_id) DO NOTHING;
    NEW.activated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_member_activation
  BEFORE UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION create_wallet_on_activation();

-- Function to distribute commissions across 12 levels
CREATE OR REPLACE FUNCTION distribute_commissions(activated_member_id UUID)
RETURNS VOID AS $$
DECLARE
  rates DECIMAL[] := ARRAY[0.20, 0.06, 0.05, 0.04, 0.03, 0.025, 0.02, 0.015, 0.015, 0.015, 0.01, 0.02];
  current_member RECORD;
  upline_id UUID;
  pkg_amount INTEGER;
  member_name TEXT;
  commission DECIMAL;
  i INTEGER := 1;
BEGIN
  SELECT referrer_id, package_amount, full_name INTO current_member
  FROM public.members WHERE id = activated_member_id;
  
  upline_id := current_member.referrer_id;
  pkg_amount := current_member.package_amount;
  member_name := current_member.full_name;
  
  WHILE upline_id IS NOT NULL AND i <= 12 LOOP
    commission := pkg_amount * rates[i];
    
    -- Credit wallet
    UPDATE public.wallets 
    SET balance = balance + commission,
        total_earned = total_earned + commission,
        updated_at = NOW()
    WHERE member_id = upline_id;
    
    -- Record transaction
    INSERT INTO public.transactions (wallet_id, member_id, type, amount, description, from_member_id, from_member_name, level, package_amount)
    VALUES (
      (SELECT id FROM public.wallets WHERE member_id = upline_id),
      upline_id,
      'commission',
      commission,
      'Level ' || i || ' commission from ' || member_name,
      activated_member_id,
      member_name,
      i,
      pkg_amount
    );
    
    -- Move to next upline
    SELECT referrer_id INTO upline_id FROM public.members WHERE id = upline_id;
    i := i + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

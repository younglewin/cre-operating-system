-- ============================================================
-- PHASE 2 MIGRATION: Marketing, Funnels, NDA, Email Tracking
-- ============================================================

-- ── 1. campaigns ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  property_id   uuid REFERENCES properties(id) ON DELETE SET NULL,
  name          text NOT NULL,
  type          text NOT NULL CHECK (type IN ('om','bov','postcard','email','funnel')),
  status        text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','archived')),
  config        jsonb DEFAULT '{}',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- ── 2. nda_submissions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS nda_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  property_id     uuid REFERENCES properties(id) ON DELETE SET NULL,
  campaign_id     uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  first_name      text NOT NULL,
  last_name       text NOT NULL,
  email           text NOT NULL,
  company         text,
  phone           text,
  ip_address      text,
  user_agent      text,
  agreed_at       timestamptz DEFAULT now(),
  om_sent_at      timestamptz,
  created_at      timestamptz DEFAULT now()
);

-- ── 3. tracking_tokens ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS tracking_tokens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  nda_id          uuid REFERENCES nda_submissions(id) ON DELETE CASCADE,
  campaign_id     uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  token           text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  asset_type      text NOT NULL CHECK (asset_type IN ('om','data_room','email')),
  asset_url       text,
  first_opened_at timestamptz,
  last_opened_at  timestamptz,
  open_count      integer DEFAULT 0,
  click_count     integer DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

-- ── 4. email_sends ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_sends (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  campaign_id     uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  tracking_token  uuid REFERENCES tracking_tokens(id) ON DELETE SET NULL,
  recipient_email text NOT NULL,
  recipient_name  text,
  subject         text NOT NULL,
  html_body       text,
  status          text DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','opened','clicked','bounced','failed')),
  sent_at         timestamptz,
  opened_at       timestamptz,
  clicked_at      timestamptz,
  provider_id     text,
  created_at      timestamptz DEFAULT now()
);

-- ── 5. funnel_pages ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS funnel_pages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  property_id     uuid REFERENCES properties(id) ON DELETE SET NULL,
  campaign_id     uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  slug            text UNIQUE NOT NULL,
  title           text NOT NULL,
  layout          jsonb DEFAULT '[]',
  nda_required    boolean DEFAULT true,
  nda_text        text,
  is_published    boolean DEFAULT false,
  view_count      integer DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ── 6. Updated_at triggers ───────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_campaigns_updated_at') THEN
    CREATE TRIGGER trg_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_funnel_pages_updated_at') THEN
    CREATE TRIGGER trg_funnel_pages_updated_at BEFORE UPDATE ON funnel_pages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ── 7. RLS ───────────────────────────────────────────────────
ALTER TABLE campaigns       ENABLE ROW LEVEL SECURITY;
ALTER TABLE nda_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sends     ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_pages    ENABLE ROW LEVEL SECURITY;

-- Helper: is current user a member of team_id?
CREATE OR REPLACE FUNCTION is_team_member(p_team_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM team_members WHERE team_id = p_team_id AND user_id = auth.uid());
$$;

-- campaigns
CREATE POLICY "campaigns_team" ON campaigns FOR ALL USING (is_team_member(team_id)) WITH CHECK (is_team_member(team_id));
-- nda_submissions: team can read, anyone can insert (public funnel)
CREATE POLICY "nda_team_read"   ON nda_submissions FOR SELECT USING (is_team_member(team_id));
CREATE POLICY "nda_public_insert" ON nda_submissions FOR INSERT WITH CHECK (true);
-- tracking_tokens
CREATE POLICY "tokens_team" ON tracking_tokens FOR ALL USING (is_team_member(team_id)) WITH CHECK (is_team_member(team_id));
-- email_sends
CREATE POLICY "emails_team" ON email_sends FOR ALL USING (is_team_member(team_id)) WITH CHECK (is_team_member(team_id));
-- funnel_pages: team manages, public can read published pages
CREATE POLICY "funnel_team"   ON funnel_pages FOR ALL USING (is_team_member(team_id)) WITH CHECK (is_team_member(team_id));
CREATE POLICY "funnel_public" ON funnel_pages FOR SELECT USING (is_published = true);

-- ── 8. Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_campaigns_team       ON campaigns(team_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_property   ON campaigns(property_id);
CREATE INDEX IF NOT EXISTS idx_nda_email            ON nda_submissions(email);
CREATE INDEX IF NOT EXISTS idx_nda_property         ON nda_submissions(property_id);
CREATE INDEX IF NOT EXISTS idx_tokens_token         ON tracking_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_sends_campaign ON email_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_funnel_slug          ON funnel_pages(slug);

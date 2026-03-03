-- ============================================================
-- PHASE 3 MIGRATION: CRM, COMP INGESTION ENGINE, SKIP TRACING
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. TEAM SETTINGS (BYOK credentials vault)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_settings (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id               uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  skip_trace_provider   text NOT NULL DEFAULT 'whitepages'
                          CHECK (skip_trace_provider IN ('whitepages','tlo','melissa')),
  skip_trace_api_key    text,
  zapier_webhook_secret text DEFAULT encode(gen_random_bytes(32), 'hex'),
  sendgrid_api_key      text,
  nylas_api_key         text,
  lob_api_key           text,
  unsplash_access_key   text,
  openai_api_key        text,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),
  UNIQUE(team_id)
);

ALTER TABLE public.team_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_settings_team_access" ON public.team_settings
  USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

-- ─────────────────────────────────────────────
-- 2. PROPERTIES TABLE UPDATES (Phase 4 trigger columns)
-- ─────────────────────────────────────────────
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS mls_status            text CHECK (mls_status IN ('Active','Expired','Cancelled','Off-Market','Pending','Sold')),
  ADD COLUMN IF NOT EXISTS mls_expiration_date   date,
  ADD COLUMN IF NOT EXISTS last_title_transfer_date date,
  ADD COLUMN IF NOT EXISTS mls_listing_id        text,
  ADD COLUMN IF NOT EXISTS days_on_market        integer;

-- ─────────────────────────────────────────────
-- 3. ENTITIES TABLE (Companies / LLCs / Trusts)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.entities (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name            text NOT NULL,
  entity_type     text NOT NULL DEFAULT 'LLC'
                    CHECK (entity_type IN ('LLC','Corporation','Trust','Partnership','Individual','Other')),
  ein             text,
  state_of_formation text,
  registered_agent text,
  mailing_address text,
  city            text,
  state           text,
  zip             text,
  notes           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entities_team_access" ON public.entities
  USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

-- ─────────────────────────────────────────────
-- 4. CONTACTS TABLE (Human owners — full CRM)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contacts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id               uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  first_name            text NOT NULL,
  last_name             text NOT NULL,
  -- JSONB arrays for unlimited phones/emails with metadata
  phones                jsonb DEFAULT '[]'::jsonb,
  -- phones schema: [{ number, label, line_type: 'Mobile'|'Landline'|'VoIP', is_valid, confidence_score, source }]
  emails                jsonb DEFAULT '[]'::jsonb,
  -- emails schema: [{ address, label, is_valid, source }]
  mailing_address       text,
  city                  text,
  state                 text,
  zip                   text,
  -- CRE Investment Criteria
  investment_criteria   jsonb DEFAULT '{}'::jsonb,
  -- investment_criteria schema: { asset_types: [], min_price, max_price, min_units, max_units, target_zips: [], target_cities: [], cap_rate_min, notes }
  tags                  text[] DEFAULT '{}',
  contact_type          text DEFAULT 'Buyer'
                          CHECK (contact_type IN ('Buyer','Seller','Broker','Lender','Vendor','Investor','Other')),
  -- Compliance
  do_not_call           boolean DEFAULT false,
  do_not_email          boolean DEFAULT false,
  -- Skip trace metadata
  last_skip_traced_at   timestamptz,
  skip_trace_provider   text,
  skip_trace_confidence numeric(4,2),
  -- CRM fields
  lead_source           text,
  lead_status           text DEFAULT 'New'
                          CHECK (lead_status IN ('New','Contacted','Qualified','Active','Closed','Dead')),
  notes                 text,
  avatar_url            text,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contacts_team_access" ON public.contacts
  USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

-- GIN index for fast JSONB investment_criteria queries
CREATE INDEX IF NOT EXISTS contacts_investment_criteria_gin ON public.contacts USING GIN (investment_criteria);
CREATE INDEX IF NOT EXISTS contacts_tags_gin ON public.contacts USING GIN (tags);

-- ─────────────────────────────────────────────
-- 5. JUNCTION TABLES
-- ─────────────────────────────────────────────

-- property_entities: links a parcel/property to an LLC/entity that holds title
CREATE TABLE IF NOT EXISTS public.property_entities (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  entity_id     uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  ownership_pct numeric(5,2) DEFAULT 100.00,
  role          text DEFAULT 'Owner' CHECK (role IN ('Owner','Lender','Manager','Partner')),
  vesting_date  date,
  notes         text,
  UNIQUE(property_id, entity_id)
);

ALTER TABLE public.property_entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "property_entities_team_access" ON public.property_entities
  USING (property_id IN (SELECT id FROM public.properties WHERE team_id IN
    (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())));

-- entity_contacts: links an LLC to its true human owners/members
CREATE TABLE IF NOT EXISTS public.entity_contacts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id     uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  contact_id    uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  role          text DEFAULT 'Member' CHECK (role IN ('Member','Manager','Officer','Trustee','Beneficiary','Other')),
  ownership_pct numeric(5,2),
  notes         text,
  UNIQUE(entity_id, contact_id)
);

ALTER TABLE public.entity_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entity_contacts_team_access" ON public.entity_contacts
  USING (entity_id IN (SELECT id FROM public.entities WHERE team_id IN
    (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())));

-- ─────────────────────────────────────────────
-- 6. TASKS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  assigned_to     uuid REFERENCES auth.users(id),
  title           text NOT NULL,
  description     text,
  status          text DEFAULT 'Open' CHECK (status IN ('Open','In Progress','Done','Cancelled')),
  priority        text DEFAULT 'Medium' CHECK (priority IN ('Low','Medium','High','Urgent')),
  due_date        date,
  -- Polymorphic link to any record
  related_type    text CHECK (related_type IN ('property','contact','entity','deal')),
  related_id      uuid,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_team_access" ON public.tasks
  USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

-- ─────────────────────────────────────────────
-- 7. INBOX / COMMUNICATIONS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.communications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  contact_id      uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  channel         text NOT NULL CHECK (channel IN ('email','sms','call','note','webhook')),
  direction       text NOT NULL CHECK (direction IN ('inbound','outbound')),
  subject         text,
  body            text,
  from_address    text,
  to_address      text,
  status          text DEFAULT 'delivered' CHECK (status IN ('pending','delivered','read','failed','bounced')),
  read_at         timestamptz,
  external_id     text, -- SendGrid/Nylas message ID
  metadata        jsonb DEFAULT '{}'::jsonb,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "communications_team_access" ON public.communications
  USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS communications_contact_id_idx ON public.communications(contact_id);
CREATE INDEX IF NOT EXISTS communications_created_at_idx ON public.communications(created_at DESC);

-- ─────────────────────────────────────────────
-- 8. COMP INGESTION LOG (for webhook dedup)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.comp_ingestion_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  source          text NOT NULL, -- 'zapier','csv','manual','api'
  source_name     text,          -- 'Rentometer','ATTOM','Crexi', etc.
  comp_type       text NOT NULL CHECK (comp_type IN ('sale','rent')),
  address         text NOT NULL,
  raw_payload     jsonb,
  resolved_id     uuid,          -- FK to properties or comparables
  status          text DEFAULT 'inserted' CHECK (status IN ('inserted','updated','duplicate','error')),
  error_message   text,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE public.comp_ingestion_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comp_ingestion_log_team_access" ON public.comp_ingestion_log
  USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

-- ─────────────────────────────────────────────
-- 9. SEED: Default team_settings for existing team
-- ─────────────────────────────────────────────
INSERT INTO public.team_settings (team_id, skip_trace_provider)
SELECT id, 'whitepages' FROM public.teams
ON CONFLICT (team_id) DO NOTHING;

-- ─────────────────────────────────────────────
-- 10. SEED: Sample contacts with investment criteria
-- ─────────────────────────────────────────────
WITH team AS (SELECT id FROM public.teams LIMIT 1)
INSERT INTO public.contacts (team_id, first_name, last_name, phones, emails, city, state, zip, contact_type, lead_status, tags, investment_criteria, mailing_address)
SELECT
  team.id,
  first_name, last_name, phones, emails, city, state, zip, contact_type, lead_status, tags, investment_criteria, mailing_address
FROM team, (VALUES
  ('Michael', 'Chen',
   '[{"number":"(310) 555-0101","label":"Mobile","line_type":"Mobile","is_valid":true,"confidence_score":0.95}]'::jsonb,
   '[{"address":"mchen@investcap.com","label":"Work","is_valid":true}]'::jsonb,
   'Los Angeles','CA','90025','Buyer','Active',
   ARRAY['multifamily','value-add','long-beach'],
   '{"asset_types":["Multifamily"],"min_price":1500000,"max_price":5000000,"min_units":4,"max_units":20,"target_zips":["90803","90802","90806"],"target_cities":["Long Beach","Signal Hill"],"cap_rate_min":4.5,"notes":"Prefers 1970s+ construction, value-add plays"}'::jsonb,
   '11234 Wilshire Blvd, Los Angeles CA 90025'),
  ('Jennifer', 'Park',
   '[{"number":"(562) 555-0202","label":"Mobile","line_type":"Mobile","is_valid":true,"confidence_score":0.92},{"number":"(562) 555-0203","label":"Office","line_type":"Landline","is_valid":true,"confidence_score":0.88}]'::jsonb,
   '[{"address":"jpark@parkventures.com","label":"Work","is_valid":true},{"address":"jen.park@gmail.com","label":"Personal","is_valid":true}]'::jsonb,
   'Long Beach','CA','90803','Buyer','Qualified',
   ARRAY['multifamily','1031-exchange','naples'],
   '{"asset_types":["Multifamily","Mixed-Use"],"min_price":2000000,"max_price":8000000,"min_units":6,"max_units":30,"target_zips":["90803","90804","90808"],"target_cities":["Long Beach","Lakewood"],"cap_rate_min":4.0,"notes":"1031 exchange buyer, needs to close within 45 days"}'::jsonb,
   '456 Bayshore Ave, Long Beach CA 90803'),
  ('Robert', 'Martinez',
   '[{"number":"(714) 555-0303","label":"Mobile","line_type":"Mobile","is_valid":true,"confidence_score":0.97}]'::jsonb,
   '[{"address":"rmartinez@socalhomes.com","label":"Work","is_valid":true}]'::jsonb,
   'Anaheim','CA','92801','Buyer','Active',
   ARRAY['multifamily','cash-buyer','oc-buyer'],
   '{"asset_types":["Multifamily"],"min_price":1000000,"max_price":3500000,"min_units":2,"max_units":12,"target_zips":["90803","90802","90807","92801","92802"],"target_cities":["Long Beach","Anaheim","Garden Grove"],"cap_rate_min":5.0,"notes":"Cash buyer, fast close preferred"}'::jsonb,
   '789 Harbor Blvd, Anaheim CA 92801'),
  ('Sarah', 'Thompson',
   '[{"number":"(213) 555-0404","label":"Mobile","line_type":"Mobile","is_valid":false,"confidence_score":0.45}]'::jsonb,
   '[{"address":"sthompson@realty.com","label":"Work","is_valid":true}]'::jsonb,
   'Beverly Hills','CA','90210','Investor','New',
   ARRAY['multifamily','high-net-worth'],
   '{"asset_types":["Multifamily","Commercial"],"min_price":5000000,"max_price":25000000,"min_units":20,"max_units":100,"target_zips":["90803","90802","90810"],"target_cities":["Long Beach","Los Angeles"],"cap_rate_min":3.5,"notes":"Passive investor, prefers stabilized assets"}'::jsonb,
   '100 Rodeo Dr, Beverly Hills CA 90210'),
  ('David', 'Kim',
   '[{"number":"(949) 555-0505","label":"Mobile","line_type":"Mobile","is_valid":true,"confidence_score":0.91}]'::jsonb,
   '[{"address":"dkim@kimproperties.com","label":"Work","is_valid":true}]'::jsonb,
   'Irvine','CA','92618','Buyer','Contacted',
   ARRAY['multifamily','oc-buyer','value-add'],
   '{"asset_types":["Multifamily"],"min_price":2500000,"max_price":6000000,"min_units":8,"max_units":24,"target_zips":["90803","90806","90807"],"target_cities":["Long Beach","Torrance","Carson"],"cap_rate_min":4.25,"notes":"Prefers 1980s+ construction near transit"}'::jsonb,
   '15 Innovation Way, Irvine CA 92618'),
  ('Lisa', 'Wong',
   '[{"number":"(626) 555-0606","label":"Mobile","line_type":"Mobile","is_valid":true,"confidence_score":0.89}]'::jsonb,
   '[{"address":"lwong@wongcapital.com","label":"Work","is_valid":true}]'::jsonb,
   'Pasadena','CA','91101','Investor','Qualified',
   ARRAY['multifamily','1031-exchange','pasadena'],
   '{"asset_types":["Multifamily"],"min_price":3000000,"max_price":10000000,"min_units":10,"max_units":40,"target_zips":["90803","90802","91101","91103"],"target_cities":["Long Beach","Pasadena","Alhambra"],"cap_rate_min":4.0,"notes":"Experienced 1031 buyer, multiple exchanges completed"}'::jsonb,
   '200 Colorado Blvd, Pasadena CA 91101'),
  ('James', 'Rodriguez',
   '[{"number":"(562) 555-0707","label":"Mobile","line_type":"Mobile","is_valid":true,"confidence_score":0.94}]'::jsonb,
   '[{"address":"jrodriguez@lbinvest.com","label":"Work","is_valid":true}]'::jsonb,
   'Long Beach','CA','90802','Seller','Active',
   ARRAY['seller','long-beach','motivated'],
   '{"asset_types":["Multifamily"],"min_price":0,"max_price":0,"min_units":0,"max_units":0,"target_zips":[],"target_cities":[],"cap_rate_min":0,"notes":"Current owner of 4-plex on 2nd St, considering sale"}'::jsonb,
   '321 2nd St, Long Beach CA 90802'),
  ('Amanda', 'Foster',
   '[{"number":"(310) 555-0808","label":"Mobile","line_type":"Mobile","is_valid":true,"confidence_score":0.96}]'::jsonb,
   '[{"address":"afoster@fostertrust.com","label":"Work","is_valid":true}]'::jsonb,
   'Manhattan Beach','CA','90266','Buyer','Active',
   ARRAY['multifamily','trust-buyer','beach-cities'],
   '{"asset_types":["Multifamily","Mixed-Use"],"min_price":4000000,"max_price":15000000,"min_units":12,"max_units":50,"target_zips":["90803","90266","90274"],"target_cities":["Long Beach","Manhattan Beach","Redondo Beach"],"cap_rate_min":3.75,"notes":"Family trust, conservative underwriting"}'::jsonb,
   '500 Manhattan Beach Blvd, Manhattan Beach CA 90266')
) AS v(first_name, last_name, phones, emails, city, state, zip, contact_type, lead_status, tags, investment_criteria, mailing_address);

-- ─────────────────────────────────────────────
-- 11. SEED: Sample entities (LLCs)
-- ─────────────────────────────────────────────
WITH team AS (SELECT id FROM public.teams LIMIT 1)
INSERT INTO public.entities (team_id, name, entity_type, state_of_formation, mailing_address, city, state, zip, notes)
SELECT
  team.id, name, entity_type, state_of_formation, mailing_address, city, state, zip, notes
FROM team, (VALUES
  ('Naples Investments LLC', 'LLC', 'CA', '1234 Ocean Blvd, Long Beach CA 90803', 'Long Beach', 'CA', '90803', 'Owns subject 4-plex on Naples Island'),
  ('Chen Capital Partners LLC', 'LLC', 'CA', '11234 Wilshire Blvd, Los Angeles CA 90025', 'Los Angeles', 'CA', '90025', 'Michael Chen primary investment vehicle'),
  ('Park Ventures Trust', 'Trust', 'CA', '456 Bayshore Ave, Long Beach CA 90803', 'Long Beach', 'CA', '90803', 'Jennifer Park family trust'),
  ('SoCal Holdings Corp', 'Corporation', 'CA', '789 Harbor Blvd, Anaheim CA 92801', 'Anaheim', 'CA', '92801', 'Robert Martinez holding company')
) AS v(name, entity_type, state_of_formation, mailing_address, city, state, zip, notes);

-- ─────────────────────────────────────────────
-- 12. SEED: Sample tasks
-- ─────────────────────────────────────────────
WITH team AS (SELECT id FROM public.teams LIMIT 1)
INSERT INTO public.tasks (team_id, title, description, status, priority, due_date, related_type)
SELECT
  team.id, title, description, status, priority, due_date::date, related_type
FROM team, (VALUES
  ('Follow up with Michael Chen re: Naples Island 4-plex', 'Sent OM last week — check if he has reviewed and schedule a tour', 'Open', 'High', (CURRENT_DATE + INTERVAL '2 days')::text, 'contact'),
  ('Order title report for 1234 E Ocean Blvd', 'Request preliminary title from First American', 'Open', 'Medium', (CURRENT_DATE + INTERVAL '5 days')::text, 'property'),
  ('Skip trace Naples Investments LLC', 'Need to find true owner behind the LLC for off-market outreach', 'Open', 'Urgent', (CURRENT_DATE + INTERVAL '1 day')::text, 'entity'),
  ('Send OM to Jennifer Park', 'She requested the OM for the 4-plex — send via E-NDA gate', 'In Progress', 'High', CURRENT_DATE::text, 'contact'),
  ('Update rent roll for 2700 Aviation Blvd', 'Tenant in Unit 3 moved out — update vacancy status', 'Open', 'Medium', (CURRENT_DATE + INTERVAL '3 days')::text, 'property'),
  ('Call David Kim re: 1031 timeline', 'His exchange deadline is approaching — check if he is still active', 'Open', 'High', (CURRENT_DATE + INTERVAL '1 day')::text, 'contact'),
  ('Review comp data from Crexi webhook', 'New comps came in via Zapier — verify and approve for Active Set', 'Open', 'Low', (CURRENT_DATE + INTERVAL '7 days')::text, 'property')
) AS v(title, description, status, priority, due_date, related_type);

-- ─────────────────────────────────────────────
-- 13. SEED: Sample communications
-- ─────────────────────────────────────────────
WITH team AS (SELECT id FROM public.teams LIMIT 1),
     contact AS (SELECT id FROM public.contacts WHERE first_name = 'Michael' AND last_name = 'Chen' LIMIT 1)
INSERT INTO public.communications (team_id, contact_id, channel, direction, subject, body, from_address, to_address, status, read_at)
SELECT
  team.id, contact.id, channel, direction, subject, body, from_address, to_address, status, read_at
FROM team, contact, (VALUES
  ('email', 'outbound', 'Naples Island 4-Plex — Offering Memorandum', 'Hi Michael, Please find attached the OM for the Naples Island 4-plex at 1234 E Ocean Blvd. The property is offered at $2,950,000 (4.85% cap). Let me know if you have any questions.', 'Shane@YoungLewin.com', 'mchen@investcap.com', 'read', (NOW() - INTERVAL '2 days')::text),
  ('email', 'inbound', 'RE: Naples Island 4-Plex — Offering Memorandum', 'Shane, thanks for sending this over. I reviewed the OM and I am very interested. Can we schedule a tour this week? I have availability Thursday or Friday afternoon.', 'mchen@investcap.com', 'Shane@YoungLewin.com', 'read', (NOW() - INTERVAL '1 day')::text),
  ('sms', 'outbound', NULL, 'Hi Michael — just following up on the Naples Island OM. Let me know if Thursday at 2pm works for a tour!', 'Shane@YoungLewin.com', '(310) 555-0101', 'delivered', NULL),
  ('call', 'inbound', 'Inbound call — 12 min', 'Called to discuss financing options and ask about the seller''s timeline. Interested in submitting an offer around $2.8M.', '(310) 555-0101', 'Shane@YoungLewin.com', 'delivered', (NOW() - INTERVAL '3 hours')::text)
) AS v(channel, direction, subject, body, from_address, to_address, status, read_at);

-- Create applications table for FOMO-based access model
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Personal info
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  telegram TEXT,
  country TEXT NOT NULL,

  -- Trading info
  experience TEXT NOT NULL, -- 'under-6m' | '6-24m' | '2plus-years'
  capital TEXT NOT NULL, -- 'under-1k' | '1k-10k' | '10k-50k' | '50k-plus'
  exchanges TEXT,
  current_services TEXT,
  current_services_experience TEXT,

  -- Application details
  plan TEXT NOT NULL, -- 'pro' | 'master'
  goal TEXT NOT NULL,
  how_found_us TEXT,
  risk_management TEXT NOT NULL, -- The critical filter question

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted' | 'waitlisted' | 'rejected'
  reviewer_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- If accepted, link to user
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create index for email lookups
CREATE UNIQUE INDEX idx_applications_email ON applications(email);

-- Create index for status to quickly find pending applications
CREATE INDEX idx_applications_status ON applications(status);

-- Create index for sorting by created_at
CREATE INDEX idx_applications_created_at ON applications(created_at DESC);

-- Enable RLS
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Allow service role to read/write all
CREATE POLICY "Service role full access" ON applications
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Allow users to read their own application
CREATE POLICY "Users read own application" ON applications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to update their own application (only if still pending)
CREATE POLICY "Users update own pending application" ON applications
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

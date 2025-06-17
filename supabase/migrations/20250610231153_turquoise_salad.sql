/*
  # Initial RTW Case Management Schema

  1. New Tables
    - `profiles` - User profiles linked to auth.users
    - `cases` - Main case records with worker and employer data
    - `communications` - Communication logs for each case
    - `documents` - Document storage references
    - `case_notes` - Internal case notes
    - `supervisor_notes` - Supervisor feedback and instructions
    - `stakeholders` - Case stakeholders (doctors, lawyers, etc.)
    - `notifications` - System notifications

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Secure document access
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'consultant' CHECK (role IN ('consultant', 'admin', 'support')),
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create cases table
CREATE TABLE IF NOT EXISTS cases (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_data jsonb NOT NULL,
  employer_data jsonb NOT NULL,
  case_manager_id uuid REFERENCES profiles(id) NOT NULL,
  claim_number text UNIQUE NOT NULL,
  injury_date date NOT NULL,
  injury_description text NOT NULL,
  first_certificate_date date NOT NULL,
  planned_rtw_date date NOT NULL,
  review_dates date[] DEFAULT '{}',
  rtw_plan jsonb NOT NULL,
  consultant_id uuid REFERENCES profiles(id) NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'pending')),
  claim_type text CHECK (claim_type IN ('insured', 'self-insured')),
  jurisdiction text,
  agent text,
  wages_salary jsonb,
  piawe_calculation jsonb,
  outcome jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create communications table
CREATE TABLE IF NOT EXISTS communications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('email', 'phone', 'meeting', 'other')),
  content text NOT NULL,
  author text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  category text CHECK (category IN ('medical', 'legal', 'correspondence', 'form', 'other')),
  metadata jsonb,
  uploaded_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create case_notes table
CREATE TABLE IF NOT EXISTS case_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  author text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create supervisor_notes table
CREATE TABLE IF NOT EXISTS supervisor_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  author text NOT NULL,
  author_role text NOT NULL CHECK (author_role IN ('admin', 'consultant')),
  type text NOT NULL DEFAULT 'general' CHECK (type IN ('instruction', 'question', 'reply', 'general')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  parent_id uuid REFERENCES supervisor_notes(id),
  requires_response boolean DEFAULT false,
  read_by uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create stakeholders table
CREATE TABLE IF NOT EXISTS stakeholders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  name text NOT NULL,
  organization text,
  title text,
  phone text NOT NULL,
  email text,
  address text,
  fax text,
  specialization text,
  notes text,
  is_primary boolean DEFAULT false,
  is_active boolean DEFAULT true,
  last_contact_date date,
  created_at timestamptz DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  read boolean DEFAULT false,
  action_required boolean DEFAULT false,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Create policies for cases
CREATE POLICY "Users can read cases they're involved in"
  ON cases
  FOR SELECT
  TO authenticated
  USING (
    consultant_id = auth.uid() OR 
    case_manager_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Consultants can create cases"
  ON cases
  FOR INSERT
  TO authenticated
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "Users can update cases they're involved in"
  ON cases
  FOR UPDATE
  TO authenticated
  USING (
    consultant_id = auth.uid() OR 
    case_manager_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create policies for communications
CREATE POLICY "Users can read communications for their cases"
  ON communications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases 
      WHERE id = case_id AND (
        consultant_id = auth.uid() OR 
        case_manager_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Users can add communications to their cases"
  ON communications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases 
      WHERE id = case_id AND (
        consultant_id = auth.uid() OR 
        case_manager_id = auth.uid()
      )
    )
  );

-- Create policies for documents
CREATE POLICY "Users can read documents for their cases"
  ON documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases 
      WHERE id = case_id AND (
        consultant_id = auth.uid() OR 
        case_manager_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Users can upload documents to their cases"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM cases 
      WHERE id = case_id AND (
        consultant_id = auth.uid() OR 
        case_manager_id = auth.uid()
      )
    )
  );

-- Create policies for case_notes
CREATE POLICY "Users can read notes for their cases"
  ON case_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases 
      WHERE id = case_id AND (
        consultant_id = auth.uid() OR 
        case_manager_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Users can add notes to their cases"
  ON case_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases 
      WHERE id = case_id AND (
        consultant_id = auth.uid() OR 
        case_manager_id = auth.uid()
      )
    )
  );

-- Create policies for supervisor_notes
CREATE POLICY "Users can read supervisor notes for their cases"
  ON supervisor_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases 
      WHERE id = case_id AND (
        consultant_id = auth.uid() OR 
        case_manager_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Users can add supervisor notes to their cases"
  ON supervisor_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases 
      WHERE id = case_id AND (
        consultant_id = auth.uid() OR 
        case_manager_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Users can update supervisor notes"
  ON supervisor_notes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases 
      WHERE id = case_id AND (
        consultant_id = auth.uid() OR 
        case_manager_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

-- Create policies for stakeholders
CREATE POLICY "Users can read stakeholders for their cases"
  ON stakeholders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases 
      WHERE id = case_id AND (
        consultant_id = auth.uid() OR 
        case_manager_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Users can manage stakeholders for their cases"
  ON stakeholders
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases 
      WHERE id = case_id AND (
        consultant_id = auth.uid() OR 
        case_manager_id = auth.uid()
      )
    )
  );

-- Create policies for notifications
CREATE POLICY "Users can read their own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cases_consultant_id ON cases(consultant_id);
CREATE INDEX IF NOT EXISTS idx_cases_case_manager_id ON cases(case_manager_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at);
CREATE INDEX IF NOT EXISTS idx_communications_case_id ON communications(case_id);
CREATE INDEX IF NOT EXISTS idx_documents_case_id ON documents(case_id);
CREATE INDEX IF NOT EXISTS idx_case_notes_case_id ON case_notes(case_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_notes_case_id ON supervisor_notes(case_id);
CREATE INDEX IF NOT EXISTS idx_stakeholders_case_id ON stakeholders(case_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('case-documents', 'case-documents', true),
  ('avatars', 'avatars', true),
  ('reports', 'reports', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Users can upload documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'case-documents');

CREATE POLICY "Users can read documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'case-documents');

CREATE POLICY "Users can delete their documents"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'case-documents' AND owner = auth.uid());

CREATE POLICY "Users can upload avatars"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anyone can read avatars"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'avatars');
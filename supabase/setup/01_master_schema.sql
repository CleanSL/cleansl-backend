CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('driver', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.wards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.lanes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  ward_id UUID REFERENCES public.wards(id) ON DELETE CASCADE,
  collection_day TEXT,
  rough_time TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.premises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lane_id UUID REFERENCES public.lanes(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('house', 'apartment', 'shop')),
  name TEXT, 
  unit_count INT DEFAULT 1,
  collection_note TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  access_pin VARCHAR(4), 
  fcm_token TEXT 
);

CREATE TABLE public.collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lane_id UUID REFERENCES public.lanes(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.users(id),
  collection_date DATE DEFAULT CURRENT_DATE,
  status TEXT CHECK (status IN ('pending', 'completed')) DEFAULT 'pending',
  resident_ai_photo_url TEXT, 
  ai_result TEXT CHECK (ai_result IN ('sorted', 'mixed')), 
  completed_at TIMESTAMPTZ
);

CREATE TABLE public.gps_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lane_id UUID REFERENCES public.lanes(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.users(id),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.complaints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  premise_id UUID REFERENCES public.premises(id) ON DELETE CASCADE,
  description TEXT,
  photo_url TEXT, 
  status TEXT CHECK (status IN ('open', 'resolved')) DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Realtime Config
ALTER PUBLICATION supabase_realtime ADD TABLE collections;
ALTER PUBLICATION supabase_realtime ADD TABLE complaints;

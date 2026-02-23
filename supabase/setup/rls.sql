-- 1. Turn ON the "Bouncer" (Enable RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lanes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- 2. Tell the Bouncer to "Let everyone in" for now (Dev Mode)
CREATE POLICY "Dev Mode: Allow All" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Dev Mode: Allow All" ON public.wards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Dev Mode: Allow All" ON public.lanes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Dev Mode: Allow All" ON public.premises FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Dev Mode: Allow All" ON public.collections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Dev Mode: Allow All" ON public.gps_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Dev Mode: Allow All" ON public.complaints FOR ALL USING (true) WITH CHECK (true);

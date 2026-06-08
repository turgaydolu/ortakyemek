-- Add new columns for advanced restaurant features
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS bulk_prep_time_minutes INT DEFAULT 60;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS delivery_time TIMESTAMPTZ;

-- Create Storage Bucket for restaurant logos
INSERT INTO storage.buckets (id, name, public) VALUES ('restaurant_logos', 'restaurant_logos', true) ON CONFLICT DO NOTHING;

-- Storage Policies for restaurant_logos
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'restaurant_logos');

DROP POLICY IF EXISTS "Auth Insert" ON storage.objects;
CREATE POLICY "Auth Insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'restaurant_logos');

DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'restaurant_logos');

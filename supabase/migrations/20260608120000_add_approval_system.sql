-- Add approved column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT false;

-- Auto-approve existing users so they don't get locked out of their test accounts
UPDATE public.profiles SET approved = true;

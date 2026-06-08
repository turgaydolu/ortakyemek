-- Add mall_delivery_price to menu_items table
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS mall_delivery_price numeric;

-- Inform Supabase about the change
COMMENT ON COLUMN public.menu_items.mall_delivery_price IS 'AVM içi teslimat fiyatı';


-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('staff', 'manager', 'restaurant', 'admin');
CREATE TYPE public.restaurant_status AS ENUM ('open', 'closed', 'not_accepting');
CREATE TYPE public.order_type AS ENUM ('individual', 'group', 'campaign');
CREATE TYPE public.order_status AS ENUM ('pending', 'approved', 'preparing', 'delivered', 'cancelled', 'rejected');
CREATE TYPE public.delivery_method AS ENUM ('delivery', 'takeaway', 'dine_in');
CREATE TYPE public.payment_method AS ENUM ('meal_card_metropol', 'meal_card_sodexo', 'meal_card_multinet', 'meal_card_setcard', 'credit_card', 'cash');
CREATE TYPE public.campaign_status AS ENUM ('active', 'reached', 'confirmed', 'expired', 'cancelled', 'completed');

-- ============ STORES ============
CREATE TABLE public.stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  floor TEXT,
  manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- ============ RESTAURANTS ============
CREATE TABLE public.restaurants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cuisine TEXT,
  logo_url TEXT,
  status public.restaurant_status NOT NULL DEFAULT 'closed',
  min_order_amount NUMERIC(10,2) DEFAULT 0,
  min_order_count INT DEFAULT 1,
  delivery_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurants TO authenticated;
GRANT ALL ON public.restaurants TO service_role;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE SET NULL,
  onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- helpers
CREATE OR REPLACE FUNCTION public.current_store_id() RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT store_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_restaurant_id() RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
$$;

-- ============ MENU ITEMS ============
CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price NUMERIC(10,2) NOT NULL,
  combo_price NUMERIC(10,2),
  takeaway_price NUMERIC(10,2),
  image_url TEXT,
  available BOOLEAN NOT NULL DEFAULT true,
  extras JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;
GRANT ALL ON public.menu_items TO service_role;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- ============ CAMPAIGNS ============
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  item_name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  target_participants INT NOT NULL,
  current_participants INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  status public.campaign_status NOT NULL DEFAULT 'active',
  free_delivery BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- ============ CAMPAIGN PARTICIPANTS ============
CREATE TABLE public.campaign_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  quantity INT NOT NULL DEFAULT 1,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_participants TO authenticated;
GRANT ALL ON public.campaign_participants TO service_role;
ALTER TABLE public.campaign_participants ENABLE ROW LEVEL SECURITY;

-- ============ ORDERS ============
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  order_type public.order_type NOT NULL DEFAULT 'individual',
  delivery_method public.delivery_method NOT NULL DEFAULT 'delivery',
  payment_method public.payment_method NOT NULL DEFAULT 'cash',
  status public.order_status NOT NULL DEFAULT 'pending',
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  approved_at TIMESTAMPTZ,
  delivery_deadline TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- ============ ORDER ITEMS ============
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  extras JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  broadcast BOOLEAN NOT NULL DEFAULT false,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============ POLICIES ============

-- profiles
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users view profiles in same store" ON public.profiles FOR SELECT TO authenticated
  USING (store_id IS NOT NULL AND store_id = public.current_store_id());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Managers remove staff from their store" ON public.profiles FOR UPDATE TO authenticated
  USING (store_id = public.current_store_id() AND public.has_role(auth.uid(), 'manager'));

-- user_roles
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- stores
CREATE POLICY "Anyone authenticated views stores" ON public.stores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers update own store" ON public.stores FOR UPDATE TO authenticated USING (manager_id = auth.uid());
CREATE POLICY "Anyone can create a store" ON public.stores FOR INSERT TO authenticated WITH CHECK (manager_id = auth.uid());

-- restaurants
CREATE POLICY "Anyone authenticated views restaurants" ON public.restaurants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Restaurant owners manage own restaurant" ON public.restaurants FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- menu_items
CREATE POLICY "Anyone authenticated views menu" ON public.menu_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Restaurant owners manage own menu" ON public.menu_items FOR ALL TO authenticated
  USING (restaurant_id = public.current_restaurant_id())
  WITH CHECK (restaurant_id = public.current_restaurant_id());

-- campaigns
CREATE POLICY "Anyone authenticated views campaigns" ON public.campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Restaurant owners manage own campaigns" ON public.campaigns FOR ALL TO authenticated
  USING (restaurant_id = public.current_restaurant_id())
  WITH CHECK (restaurant_id = public.current_restaurant_id());

-- campaign_participants
CREATE POLICY "Anyone authenticated views participants" ON public.campaign_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users join campaigns" ON public.campaign_participants FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users leave own campaign join" ON public.campaign_participants FOR DELETE TO authenticated USING (user_id = auth.uid());

-- orders
CREATE POLICY "Users view own orders" ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users view store orders" ON public.orders FOR SELECT TO authenticated
  USING (store_id IS NOT NULL AND store_id = public.current_store_id());
CREATE POLICY "Restaurants view their orders" ON public.orders FOR SELECT TO authenticated
  USING (restaurant_id = public.current_restaurant_id());
CREATE POLICY "Users create orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Restaurants update their orders" ON public.orders FOR UPDATE TO authenticated
  USING (restaurant_id = public.current_restaurant_id());
CREATE POLICY "Users update own orders" ON public.orders FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- order_items
CREATE POLICY "View order items if order visible" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (
    o.user_id = auth.uid()
    OR o.store_id = public.current_store_id()
    OR o.restaurant_id = public.current_restaurant_id()
  )));
CREATE POLICY "Insert order items for own order" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

-- notifications
CREATE POLICY "View own or broadcast notifications" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR broadcast = true);
CREATE POLICY "Authenticated can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_stores_updated BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_restaurants_updated BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_menu_updated BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_campaigns_updated BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- increment campaign participant count
CREATE OR REPLACE FUNCTION public.bump_campaign_participants() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.campaigns SET current_participants = current_participants + NEW.quantity WHERE id = NEW.campaign_id;
    UPDATE public.campaigns SET status = 'reached' WHERE id = NEW.campaign_id AND current_participants >= target_participants AND status = 'active';
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.campaigns SET current_participants = GREATEST(0, current_participants - OLD.quantity) WHERE id = OLD.campaign_id;
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER trg_campaign_participant_count
AFTER INSERT OR DELETE ON public.campaign_participants
FOR EACH ROW EXECUTE FUNCTION public.bump_campaign_participants();

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurants;

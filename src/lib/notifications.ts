import { supabase } from "../integrations/supabase/client";

export async function sendNotificationFromTemplate(
  eventType: "campaign_joined" | "campaign_completed" | "campaign_failed",
  userIds: string[],
  context: { campaignName: string; restaurantName: string; userName?: string },
  link?: string
) {
  if (!userIds || userIds.length === 0) return;

  const { data: setting } = await supabase
    .from("notification_settings")
    .select("*")
    .eq("event_type", eventType)
    .single();

  if (!setting || !setting.is_enabled) return;

  const title = setting.title_template
    .replace(/{kampanya_adi}/g, context.campaignName)
    .replace(/{lokanta_adi}/g, context.restaurantName)
    .replace(/{kullanici_adi}/g, context.userName || "");

  const body = setting.body_template
    .replace(/{kampanya_adi}/g, context.campaignName)
    .replace(/{lokanta_adi}/g, context.restaurantName)
    .replace(/{kullanici_adi}/g, context.userName || "");

  const payload = userIds.map((userId) => ({
    user_id: userId,
    title,
    body,
    type: eventType,
    link: link || null,
  }));

  await supabase.from("notifications").insert(payload);
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export function subscribeToCartChanges(
  supabase: SupabaseClient<Database>,
  userId: string,
  onChange: () => void,
) {
  const channel = supabase
    .channel(`cart-items:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "cart_items",
      },
      onChange,
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        onChange();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.error("Cart realtime subscription failed", { status });
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}

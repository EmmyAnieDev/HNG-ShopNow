export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<
        { id: string; email: string; full_name: string; created_at: string; updated_at: string },
        { id: string; email: string; full_name?: string },
        { email?: string; full_name?: string }
      >;
      products: Table<
        { id: string; name: string; slug: string; description: string; image_url: string; price_cents: number; category: string; active: boolean; created_at: string; updated_at: string },
        { id?: string; name: string; slug: string; description: string; image_url: string; price_cents: number; category: string; active?: boolean },
        { name?: string; slug?: string; description?: string; image_url?: string; price_cents?: number; category?: string; active?: boolean }
      >;
      carts: Table<
        { id: string; user_id: string; created_at: string; updated_at: string },
        { id?: string; user_id: string },
        { updated_at?: string }
      >;
      cart_items: Table<
        { id: string; cart_id: string; product_id: string; quantity: number; created_at: string; updated_at: string },
        { id?: string; cart_id: string; product_id: string; quantity?: number },
        { quantity?: number; updated_at?: string }
      >;
      orders: Table<
        { id: string; user_id: string; order_number: string; customer_name: string; customer_email: string; shipping_address: string; total_cents: number; status: string; created_at: string },
        { id?: string; user_id: string; order_number?: string; customer_name: string; customer_email: string; shipping_address: string; total_cents: number; status?: string },
        { status?: string }
      >;
      order_items: Table<
        { id: string; order_id: string; product_id: string | null; product_name: string; unit_price_cents: number; quantity: number; line_total_cents: number; created_at: string },
        { id?: string; order_id: string; product_id?: string | null; product_name: string; unit_price_cents: number; quantity: number; line_total_cents: number },
        never
      >;
    };
    Views: Record<string, never>;
    Functions: {
      add_cart_item: {
        Args: { p_cart_id: string; p_product_id: string; p_quantity: number };
        Returns: undefined;
      };
      create_order_from_cart: {
        Args: { p_user_id: string; p_customer_name: string; p_shipping_address: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type ProductRecord = Database["public"]["Tables"]["products"]["Row"];

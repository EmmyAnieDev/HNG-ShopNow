insert into public.products (name, slug, description, image_url, price_cents, category)
values
  (
    'Everyday Ceramic Mug',
    'everyday-ceramic-mug',
    'A thoughtfully weighted stoneware mug with a smooth matte glaze, made for slow mornings and long conversations.',
    'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=1000&q=85',
    2400,
    'Home'
  ),
  (
    'Canvas Weekender Tote',
    'canvas-weekender-tote',
    'A durable cotton-canvas carryall with a roomy interior, reinforced handles, and an inside pocket for the essentials.',
    'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1000&q=85',
    5800,
    'Accessories'
  ),
  (
    'Linen Everyday Shirt',
    'linen-everyday-shirt',
    'A relaxed-fit shirt cut from breathable European flax linen. An easy layer that gets softer with every wear.',
    'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=1000&q=85',
    7200,
    'Apparel'
  ),
  (
    'Minimal Desk Lamp',
    'minimal-desk-lamp',
    'A sculptural aluminum desk lamp with a warm, focused glow and a compact footprint for your favorite reading corner.',
    'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1000&q=85',
    8900,
    'Home'
  ),
  (
    'Botanical Hand Wash',
    'botanical-hand-wash',
    'A gentle, plant-derived hand wash scented with bright citrus and soft cedar, in a refillable amber glass bottle.',
    'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=1000&q=85',
    1800,
    'Wellness'
  ),
  (
    'Woven Market Basket',
    'woven-market-basket',
    'Handwoven natural-fiber basket for market days, picnics, or a little extra texture around the home.',
    'https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=1000&q=85',
    4600,
    'Accessories'
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  image_url = excluded.image_url,
  price_cents = excluded.price_cents,
  category = excluded.category,
  active = true;

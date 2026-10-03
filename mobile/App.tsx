import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Session } from "@supabase/supabase-js";
import { shopApi } from "./src/api/client";
import type { Cart, CartItem, CheckoutResult, Order, Product } from "./src/api/types";
import { requireSupabase, signInWithGoogle, supabase } from "./src/auth/client";

type Tab = "shop" | "cart" | "orders" | "account";
type Screen = Tab | "product" | "checkout" | "order";

const COLORS = {
  paper: "#faf9f6",
  white: "#fffefa",
  ink: "#202722",
  muted: "#747b73",
  line: "#e8e7e1",
  green: "#304b3e",
  greenSoft: "#e8eee4",
  red: "#a1392d",
  sand: "#f0f1ec",
};

function money(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
  compact = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        secondary && styles.secondaryButton,
        compact && styles.compactButton,
        disabled && styles.disabledButton,
      ]}
    >
      <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>
        {title}
      </Text>
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  multiline = false,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  keyboardType?: "email-address" | "default";
  autoCapitalize?: "none" | "words" | "sentences";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9b9f98"
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? "sentences"}
        autoCorrect={false}
        style={[styles.input, multiline && styles.multilineInput]}
      />
    </View>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Cart | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [screen, setScreen] = useState<Screen>("shop");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [emailStatus, setEmailStatus] = useState<CheckoutResult["email"]["status"] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);

  const accessToken = session?.access_token;
  const activeTab: Tab = useMemo(
    () => (screen === "product" || screen === "checkout" || screen === "order" ? "shop" : screen),
    [screen],
  );

  const refreshCart = useCallback(async (showLoader = false) => {
    if (!accessToken) {
      setCart(null);
      return;
    }
    if (showLoader) setRefreshing(true);
    try {
      const latestCart = await shopApi.getCart(accessToken);
      setCart(latestCart);
      setError("");
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      if (showLoader) setRefreshing(false);
    }
  }, [accessToken]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await shopApi.listProducts();
      setProducts(result.items);
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    if (!accessToken) {
      setError("Sign in to see your order history.");
      setScreen("account");
      return;
    }
    setLoading(true);
    setError("");
    try {
      setOrders(await shopApi.listOrders(accessToken));
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadProducts();
    if (!supabase) {
      setError("Set the public Supabase URL and anon key in mobile/.env to sign in.");
      setAuthReady(true);
      return;
    }

    let mounted = true;
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;
      if (sessionError) setError(sessionError.message);
      setSession(data.session);
      setCustomerName(
        String(data.session?.user.user_metadata.full_name ?? data.session?.user.user_metadata.name ?? ""),
      );
      setAuthReady(true);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        setCustomerName(
          String(newSession.user.user_metadata.full_name ?? newSession.user.user_metadata.name ?? ""),
        );
        setError("");
        setNotice("You are signed in.");
      } else {
        setCart(null);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [loadProducts]);

  useEffect(() => {
    if (accessToken) {
      void refreshCart();
    } else {
      setCart(null);
    }
  }, [accessToken, refreshCart]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    if (AppState.currentState === "active") {
      client.auth.startAutoRefresh();
    }
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        client.auth.startAutoRefresh();
      } else {
        client.auth.stopAutoRefresh();
      }
    });
    return () => {
      subscription.remove();
      client.auth.stopAutoRefresh();
    };
  }, []);

  useEffect(() => {
    if (screen !== "cart" || !accessToken) return;
    void refreshCart();
    const timer = setInterval(() => void refreshCart(), 20_000);
    return () => clearInterval(timer);
  }, [screen, accessToken, refreshCart]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && accessToken) {
        void refreshCart();
        if (screen === "orders") void loadOrders();
      }
    });
    return () => subscription.remove();
  }, [accessToken, screen, refreshCart, loadOrders]);

  function navigate(tab: Tab) {
    setError("");
    setNotice("");
    setScreen(tab);
    if (tab === "cart") void refreshCart(true);
    if (tab === "orders") void loadOrders();
  }

  async function openProduct(product: Product) {
    setError("");
    setNotice("");
    setSelectedProduct(product);
    setScreen("product");
    try {
      const details = await shopApi.getProduct(product.id);
      setSelectedProduct(details);
    } catch (reason) {
      setError(getErrorMessage(reason));
    }
  }

  async function addToCart(product: Product) {
    if (!accessToken) {
      setError("Sign in to add items to your bag.");
      setScreen("account");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      setCart(await shopApi.addCartItem(accessToken, product.id, 1));
      setNotice(`${product.name} added to your bag.`);
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function changeQuantity(item: CartItem, quantity: number) {
    if (!accessToken) return;
    setBusy(true);
    setError("");
    try {
      const nextCart = quantity === 0
        ? await shopApi.removeCartItem(accessToken, item.id)
        : await shopApi.updateCartItem(accessToken, item.id, quantity);
      setCart(nextCart);
    } catch (reason) {
      setError(getErrorMessage(reason));
      void refreshCart();
    } finally {
      setBusy(false);
    }
  }

  async function submitAuth() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const client = requireSupabase();
      if (authMode === "signin") {
        const { error: signInError } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      } else {
        const { data, error: signUpError } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setNotice("Check your email to confirm your account, then sign in.");
        }
      }
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function googleSignIn() {
    setOauthBusy(true);
    setError("");
    setNotice("");
    try {
      await signInWithGoogle();
      setScreen("shop");
    } catch (reason) {
      if (!getErrorMessage(reason).includes("cancelled")) {
        setError(getErrorMessage(reason));
      }
    } finally {
      setOauthBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      const { error: signOutError } = await requireSupabase().auth.signOut();
      if (signOutError) throw signOutError;
      setScreen("shop");
      setNotice("You have signed out.");
      setError("");
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function submitCheckout() {
    if (!accessToken) {
      setScreen("account");
      setError("Sign in before checking out.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await shopApi.checkout(accessToken, customerName, shippingAddress);
      setCart({ items: [], subtotal: 0, totalQuantity: 0, currency: "USD" });
      setSelectedOrder(result.order);
      setEmailStatus(result.email.status);
      setScreen("order");
    } catch (reason) {
      setError(getErrorMessage(reason));
      void refreshCart();
    } finally {
      setBusy(false);
    }
  }

  async function openOrder(order: Order) {
    if (!accessToken) return;
    setSelectedOrder(order);
    setEmailStatus(null);
    setScreen("order");
    try {
      setSelectedOrder(await shopApi.getOrder(accessToken, order.id));
    } catch (reason) {
      setError(getErrorMessage(reason));
    }
  }

  const productList = (
    <View style={styles.productGrid}>
      {products.map((product) => (
        <View style={styles.productCard} key={product.id}>
          <Pressable onPress={() => void openProduct(product)} accessibilityRole="button">
            <Image source={{ uri: product.imageUrl }} alt={product.name} style={styles.productImage} />
            <Text style={styles.category}>{product.category}</Text>
            <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
            <Text style={styles.productPrice}>{money(product.price.amount)}</Text>
          </Pressable>
          <Button title="Add to bag" compact onPress={() => void addToCart(product)} disabled={busy} />
        </View>
      ))}
    </View>
  );

  function renderContent() {
    if (!authReady) {
      return <View style={styles.center}><ActivityIndicator color={COLORS.green} /><Text style={styles.muted}>Opening ShopNow…</Text></View>;
    }
    if (screen === "shop") {
      return (
        <ScrollView
          contentContainerStyle={styles.page}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void loadProducts()} tintColor={COLORS.green} />}
        >
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>A LITTLE MORE CONSIDERED</Text>
            <Text style={styles.heroTitle}>Everyday things,{`\n`}made special.</Text>
            <Text style={styles.heroBody}>Thoughtful finds for your home, wardrobe, and the little rituals that make a day.</Text>
          </View>
          <View style={styles.sectionHeading}>
            <View><Text style={styles.eyebrow}>THE COLLECTION</Text><Text style={styles.sectionTitle}>Good things, picked for you</Text></View>
            <Pressable onPress={() => void loadProducts()}><Text style={styles.refreshText}>Refresh</Text></Pressable>
          </View>
          {loading && products.length === 0 ? (
            <View style={styles.center}><ActivityIndicator color={COLORS.green} /><Text style={styles.muted}>Finding good things…</Text></View>
          ) : products.length === 0 ? (
            <Text style={styles.muted}>No products are available right now.</Text>
          ) : productList}
        </ScrollView>
      );
    }

    if (screen === "product" && selectedProduct) {
      return (
        <ScrollView contentContainerStyle={styles.page}>
          <Pressable onPress={() => setScreen("shop")}><Text style={styles.backText}>‹  Back to shop</Text></Pressable>
          <Image source={{ uri: selectedProduct.imageUrl }} alt={selectedProduct.name} style={styles.detailImage} />
          <Text style={styles.eyebrow}>{selectedProduct.category.toUpperCase()}</Text>
          <Text style={styles.detailTitle}>{selectedProduct.name}</Text>
          <Text style={styles.detailPrice}>{money(selectedProduct.price.amount)}</Text>
          <Text style={styles.body}>{selectedProduct.description}</Text>
          <Button title="Add to bag" onPress={() => void addToCart(selectedProduct)} disabled={busy} />
        </ScrollView>
      );
    }

    if (screen === "cart") {
      if (!accessToken) {
        return <EmptyState title="Your bag travels with your account." body="Sign in to see the same saved cart you use on the ShopNow website." action="Sign in" onPress={() => navigate("account")} />;
      }
      if (refreshing && !cart) {
        return <View style={styles.center}><ActivityIndicator color={COLORS.green} /><Text style={styles.muted}>Syncing your bag…</Text></View>;
      }
      return (
        <ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refreshCart(true)} tintColor={COLORS.green} />}>
          <View style={styles.sectionHeading}>
            <View><Text style={styles.eyebrow}>YOUR SELECTION</Text><Text style={styles.sectionTitle}>Your bag</Text></View>
            <Pressable onPress={() => void refreshCart(true)}><Text style={styles.refreshText}>Sync now</Text></Pressable>
          </View>
          {!cart?.items.length ? (
            <EmptyState title="Your bag is empty." body="Add something lovely from the collection." action="Explore the shop" onPress={() => navigate("shop")} />
          ) : (
            <>
              {cart.items.map((item) => (
                <View key={item.id} style={styles.cartRow}>
                  {item.product ? <Image source={{ uri: item.product.imageUrl }} alt={item.product.name} style={styles.cartImage} /> : <View style={styles.cartImage} />}
                  <View style={styles.cartDetails}>
                    <Text style={styles.productName}>{item.product?.name ?? "Unavailable product"}</Text>
                    <Text style={styles.muted}>{item.product ? money(item.product.price.amount) : "No longer available"}</Text>
                    <View style={styles.quantity}>
                      <Pressable accessibilityLabel="Decrease quantity" disabled={busy} onPress={() => void changeQuantity(item, item.quantity - 1)}><Text style={styles.quantityButton}>−</Text></Pressable>
                      <Text style={styles.quantityValue}>{item.quantity}</Text>
                      <Pressable accessibilityLabel="Increase quantity" disabled={busy || item.quantity >= 99} onPress={() => void changeQuantity(item, item.quantity + 1)}><Text style={styles.quantityButton}>+</Text></Pressable>
                    </View>
                    <Pressable disabled={busy} onPress={() => void changeQuantity(item, 0)}><Text style={styles.removeText}>Remove</Text></Pressable>
                  </View>
                  <Text style={styles.lineTotal}>{item.lineTotal === null ? "—" : money(item.lineTotal)}</Text>
                </View>
              ))}
              <View style={styles.summary}>
                <Text style={styles.sectionTitle}>Order summary</Text>
                <SummaryLine label={`Subtotal (${cart.totalQuantity} items)`} value={money(cart.subtotal)} />
                <SummaryLine label="Shipping" value="Included" />
                <View style={styles.totalLine}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalLabel}>{money(cart.subtotal)}</Text></View>
                <Button title="Continue to checkout" onPress={() => { setError(""); setScreen("checkout"); }} />
              </View>
              <Button title="Continue shopping" secondary onPress={() => navigate("shop")} />
            </>
          )}
        </ScrollView>
      );
    }

    if (screen === "checkout") {
      return (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
            <Pressable onPress={() => setScreen("cart")}><Text style={styles.backText}>‹  Back to your bag</Text></Pressable>
            <Text style={styles.eyebrow}>ALMOST YOURS</Text>
            <Text style={styles.sectionTitle}>Checkout</Text>
            <Text style={styles.body}>The server verifies your current prices and order total when you place your order.</Text>
            <Field label="Full name" value={customerName} onChangeText={setCustomerName} placeholder="Your name" />
            <Field label="Shipping address" value={shippingAddress} onChangeText={setShippingAddress} placeholder="Street, city, postal code" multiline />
            <View style={styles.summary}>
              <SummaryLine label={`Items (${cart?.totalQuantity ?? 0})`} value={money(cart?.subtotal ?? 0)} />
              <SummaryLine label="Shipping" value="Included" />
              <View style={styles.totalLine}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalLabel}>{money(cart?.subtotal ?? 0)}</Text></View>
            </View>
            <Button title={busy ? "Placing order…" : "Place order"} onPress={() => void submitCheckout()} disabled={busy || customerName.trim().length === 0 || shippingAddress.trim().length < 5} />
          </ScrollView>
        </KeyboardAvoidingView>
      );
    }

    if (screen === "orders") {
      if (!accessToken) {
        return <EmptyState title="Your orders are just for you." body="Sign in to see your order history." action="Sign in" onPress={() => navigate("account")} />;
      }
      return (
        <ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void loadOrders()} tintColor={COLORS.green} />}>
          <View style={styles.sectionHeading}><View><Text style={styles.eyebrow}>YOUR ACCOUNT</Text><Text style={styles.sectionTitle}>Your orders</Text></View><Pressable onPress={() => void loadOrders()}><Text style={styles.refreshText}>Refresh</Text></Pressable></View>
          {loading && orders.length === 0 ? <View style={styles.center}><ActivityIndicator color={COLORS.green} /></View> :
            orders.length === 0 ? <EmptyState title="No orders yet." body="Your next favorite thing is waiting." action="Explore the shop" onPress={() => navigate("shop")} /> :
              orders.map((order) => (
                <Pressable key={order.id} style={styles.orderCard} onPress={() => void openOrder(order)}>
                  <View style={styles.orderTop}><Text style={styles.productName}>{order.orderNumber}</Text><Text style={styles.status}>{order.status}</Text></View>
                  <Text style={styles.muted}>{new Date(order.createdAt).toLocaleDateString()}</Text>
                  <Text style={styles.orderAmount}>{money(order.total.amount)}</Text>
                </Pressable>
              ))}
        </ScrollView>
      );
    }

    if (screen === "account") {
      return (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
            <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>
            {session ? (
              <>
                <Text style={styles.sectionTitle}>Welcome back.</Text>
                <Text style={styles.body}>{session.user.email}</Text>
                <Button title="View orders" onPress={() => navigate("orders")} />
                <Button title={busy ? "Signing out…" : "Sign out"} secondary onPress={() => void signOut()} disabled={busy} />
              </>
            ) : (
              <>
                <Text style={styles.sectionTitle}>{authMode === "signin" ? "Good to see you." : "Make yourself at home."}</Text>
                <Text style={styles.body}>{authMode === "signin" ? "Sign in with the same account you use on the website." : "Create an account for your ShopNow website and mobile app."}</Text>
                {authMode === "signup" && <Field label="Your name" value={fullName} onChangeText={setFullName} placeholder="Full name" />}
                <Field label="Email address" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
                <Field label="Password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secureTextEntry autoCapitalize="none" />
                <Button title={busy ? "Please wait…" : authMode === "signin" ? "Sign in" : "Create account"} onPress={() => void submitAuth()} disabled={busy || !email.trim() || password.length < 8 || (authMode === "signup" && !fullName.trim())} />
                <Text style={styles.orText}>OR</Text>
                <Button title={oauthBusy ? "Opening Google…" : "Continue with Google"} secondary onPress={() => void googleSignIn()} disabled={oauthBusy} />
                <Pressable onPress={() => { setAuthMode(authMode === "signin" ? "signup" : "signin"); setError(""); setNotice(""); }}>
                  <Text style={styles.textLink}>{authMode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}</Text>
                </Pressable>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      );
    }

    if (screen === "order" && selectedOrder) {
      return (
        <ScrollView contentContainerStyle={styles.page}>
          <Pressable onPress={() => navigate("orders")}><Text style={styles.backText}>‹  Back to orders</Text></Pressable>
          <Text style={styles.eyebrow}>{emailStatus ? "ORDER CONFIRMED" : "ORDER DETAILS"}</Text>
          <Text style={styles.sectionTitle}>{selectedOrder.orderNumber}</Text>
          <Text style={styles.body}>{new Date(selectedOrder.createdAt).toLocaleString()}</Text>
          {emailStatus === "not_configured" && <Text style={styles.warning}>Your order is saved, but confirmation email is not configured.</Text>}
          {emailStatus === "failed" && <Text style={styles.warning}>Your order is saved, but the confirmation email could not be sent.</Text>}
          <View style={styles.summary}>
            {selectedOrder.items.map((item) => (
              <View style={styles.orderItem} key={item.id}>
                <View style={styles.flex}><Text style={styles.productName}>{item.productName} × {item.quantity}</Text><Text style={styles.muted}>{money(item.unitPrice.amount)} each</Text></View>
                <Text style={styles.lineTotal}>{money(item.lineTotal)}</Text>
              </View>
            ))}
            <View style={styles.totalLine}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalLabel}>{money(selectedOrder.total.amount)}</Text></View>
          </View>
          <Text style={styles.body}>Delivering to {selectedOrder.customerName}{"\n"}{selectedOrder.shippingAddress}{"\n"}{selectedOrder.customerEmail}</Text>
          <Button title="Continue shopping" onPress={() => navigate("shop")} />
        </ScrollView>
      );
    }
    return <View style={styles.center}><Text style={styles.muted}>Choose a section below.</Text></View>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable onPress={() => navigate("shop")} style={styles.brand}>
          <View style={styles.brandMark}><Text style={styles.brandMarkText}>S</Text></View>
          <Text style={styles.brandText}>shopnow<Text style={styles.brandDot}>.</Text></Text>
        </Pressable>
        <Pressable onPress={() => navigate("cart")} style={styles.headerBag}>
          <Text style={styles.headerBagText}>Bag</Text>
          <Text style={styles.badge}>{cart?.totalQuantity ?? 0}</Text>
        </Pressable>
      </View>

      {!!error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => setError("")}><Text style={styles.dismiss}>×</Text></Pressable>
        </View>
      )}
      {!!notice && (
        <View style={styles.noticeBanner}>
          <Text style={styles.noticeText}>{notice}</Text>
          <Pressable onPress={() => setNotice("")}><Text style={styles.dismiss}>×</Text></Pressable>
        </View>
      )}

      <View style={styles.content}>{renderContent()}</View>

      {(["shop", "cart", "orders", "account"] as Tab[]).includes(screen as Tab) && (
        <View style={styles.tabBar}>
          {([
            ["shop", "Shop"],
            ["cart", `Bag${cart?.totalQuantity ? ` (${cart.totalQuantity})` : ""}`],
            ["orders", "Orders"],
            ["account", session ? "Account" : "Sign in"],
          ] as [Tab, string][]).map(([tab, label]) => (
            <Pressable key={tab} onPress={() => navigate(tab)} style={styles.tab}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{label}</Text>
              {activeTab === tab && <View style={styles.tabIndicator} />}
            </Pressable>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return <View style={styles.summaryLine}><Text style={styles.muted}>{label}</Text><Text style={styles.summaryValue}>{value}</Text></View>;
}

function EmptyState({
  title,
  body,
  action,
  onPress,
}: {
  title: string;
  body: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <Button title={action} onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.paper },
  flex: { flex: 1 },
  header: { height: 62, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: COLORS.line, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: COLORS.paper },
  brand: { flexDirection: "row", alignItems: "center", gap: 9 },
  brandMark: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.green, alignItems: "center", justifyContent: "center" },
  brandMarkText: { color: "white", fontSize: 16, fontWeight: "800" },
  brandText: { color: COLORS.ink, fontSize: 21, fontWeight: "800", letterSpacing: -1 },
  brandDot: { color: "#8eaa83" },
  headerBag: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerBagText: { color: COLORS.ink, fontSize: 14, fontWeight: "600" },
  badge: { minWidth: 22, height: 22, borderRadius: 11, textAlign: "center", overflow: "hidden", paddingHorizontal: 5, paddingTop: 3, color: COLORS.green, backgroundColor: COLORS.greenSoft, fontSize: 11, fontWeight: "700" },
  errorBanner: { marginHorizontal: 14, marginTop: 9, padding: 11, borderRadius: 4, backgroundColor: "#f9e9e6", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  errorText: { color: COLORS.red, flex: 1, fontSize: 13 },
  noticeBanner: { marginHorizontal: 14, marginTop: 9, padding: 11, borderRadius: 4, backgroundColor: COLORS.greenSoft, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  noticeText: { color: COLORS.green, flex: 1, fontSize: 13 },
  dismiss: { color: COLORS.muted, fontSize: 19, paddingHorizontal: 5 },
  content: { flex: 1 },
  page: { padding: 18, paddingBottom: 32 },
  hero: { backgroundColor: "#e9eee5", padding: 21, marginBottom: 27, borderRadius: 3 },
  eyebrow: { color: "#607b65", fontSize: 10, fontWeight: "800", letterSpacing: 1.7, marginBottom: 8 },
  heroTitle: { color: COLORS.ink, fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", fontSize: 34, lineHeight: 39, letterSpacing: -1.2 },
  heroBody: { color: "#59645b", fontSize: 13, lineHeight: 19, marginTop: 10, maxWidth: 310 },
  sectionHeading: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 15 },
  sectionTitle: { color: COLORS.ink, fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", fontWeight: "400", fontSize: 29, letterSpacing: -0.7, marginBottom: 16 },
  refreshText: { color: COLORS.green, fontSize: 12, textDecorationLine: "underline", paddingBottom: 18 },
  productGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12 },
  productCard: { width: "48%", paddingBottom: 8 },
  productImage: { width: "100%", height: 190, backgroundColor: "#eeece5", marginBottom: 8, resizeMode: "cover" },
  category: { color: "#657469", fontSize: 10, marginBottom: 4 },
  productName: { color: COLORS.ink, fontSize: 13, fontWeight: "700", lineHeight: 18 },
  productPrice: { color: COLORS.muted, fontSize: 12, marginTop: 4, marginBottom: 8 },
  button: { minHeight: 46, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: COLORS.green, alignItems: "center", justifyContent: "center", borderRadius: 3, marginTop: 12 },
  buttonText: { color: "#fff", textAlign: "center", fontSize: 13, fontWeight: "700" },
  secondaryButton: { borderWidth: 1, borderColor: "#d9dcd5", backgroundColor: COLORS.white },
  secondaryButtonText: { color: COLORS.ink },
  compactButton: { minHeight: 36, marginTop: 7, paddingVertical: 9 },
  disabledButton: { opacity: 0.5 },
  center: { flex: 1, minHeight: 180, justifyContent: "center", alignItems: "center", gap: 12, padding: 20 },
  muted: { color: COLORS.muted, fontSize: 12, lineHeight: 18 },
  detailImage: { width: "100%", height: 330, backgroundColor: "#eeece5", marginVertical: 18, resizeMode: "cover" },
  backText: { color: COLORS.green, fontSize: 13, marginBottom: 18 },
  detailTitle: { color: COLORS.ink, fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", fontSize: 35, marginBottom: 6 },
  detailPrice: { color: COLORS.ink, fontSize: 17, marginBottom: 14 },
  body: { color: COLORS.muted, fontSize: 13, lineHeight: 20, marginBottom: 14 },
  cartRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 15, borderTopWidth: 1, borderColor: COLORS.line },
  cartImage: { width: 74, height: 86, backgroundColor: "#eeece5", resizeMode: "cover" },
  cartDetails: { flex: 1, gap: 5 },
  quantity: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", borderWidth: 1, borderColor: COLORS.line, marginTop: 4 },
  quantityButton: { paddingHorizontal: 10, paddingVertical: 3, color: COLORS.green, fontSize: 17 },
  quantityValue: { color: COLORS.ink, minWidth: 22, textAlign: "center", fontSize: 12 },
  removeText: { color: COLORS.muted, fontSize: 11, textDecorationLine: "underline", alignSelf: "flex-start" },
  lineTotal: { color: COLORS.ink, fontWeight: "700", fontSize: 12, alignSelf: "flex-start" },
  summary: { backgroundColor: COLORS.sand, padding: 18, marginVertical: 18 },
  summaryLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7 },
  summaryValue: { color: COLORS.ink, fontSize: 12 },
  totalLine: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderColor: "#d8ddd4", marginTop: 9, paddingTop: 13 },
  totalLabel: { color: COLORS.ink, fontSize: 14, fontWeight: "800" },
  empty: { padding: 23, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.white, alignItems: "flex-start" },
  emptyTitle: { color: COLORS.ink, fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", fontSize: 23, marginBottom: 5 },
  field: { marginBottom: 14 },
  fieldLabel: { color: COLORS.ink, fontSize: 12, fontWeight: "700", marginBottom: 7 },
  input: { minHeight: 47, borderWidth: 1, borderColor: "#d9dcd5", backgroundColor: COLORS.white, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.ink, fontSize: 14, borderRadius: 2 },
  multilineInput: { minHeight: 96, textAlignVertical: "top" },
  orText: { color: COLORS.muted, textAlign: "center", marginTop: 17, marginBottom: 5, fontSize: 11, letterSpacing: 1 },
  textLink: { textAlign: "center", color: COLORS.green, marginTop: 18, fontSize: 12, textDecorationLine: "underline" },
  orderCard: { padding: 16, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, marginBottom: 12 },
  orderTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 7 },
  status: { backgroundColor: COLORS.greenSoft, color: COLORS.green, overflow: "hidden", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 2, fontSize: 10, textTransform: "capitalize" },
  orderAmount: { color: COLORS.ink, fontWeight: "800", marginTop: 8, fontSize: 14 },
  orderItem: { flexDirection: "row", gap: 12, justifyContent: "space-between", paddingVertical: 11, borderBottomWidth: 1, borderColor: COLORS.line },
  warning: { color: COLORS.red, fontSize: 12, marginVertical: 12 },
  tabBar: { height: 58, borderTopWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.paper, flexDirection: "row", justifyContent: "space-around", alignItems: "stretch" },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", position: "relative" },
  tabText: { color: COLORS.muted, fontSize: 11, fontWeight: "600" },
  tabTextActive: { color: COLORS.green, fontWeight: "800" },
  tabIndicator: { height: 2, backgroundColor: COLORS.green, position: "absolute", top: 0, left: "30%", right: "30%" },
});

(function () {
  const SUPABASE_URL = "https://efewwauvphjbwaojnrge.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZXd3YXV2cGhqYndhb2pucmdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMTM1MzYsImV4cCI6MjEwNjc4OTUzNn0.MQVMd9uvhUYA4Agnc7zta3j3QM11qcyVeM4vrnhcZCY";

  const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL !== "YOUR_SUPABASE_URL" && SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY");

  const getSupabaseClient = () => {
    if (!window.supabase || !isConfigured) {
      return null;
    }

    if (!window.__klasikSupabaseClient) {
      window.__klasikSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
    }

    return window.__klasikSupabaseClient;
  };

  const safeError = (error) => {
    if (!error) return null;
    if (typeof error === "string") return error;
    return error.message || "A database request failed.";
  };

  const normalizeRole = (value) => {
    if (!value) return "customer";
    const role = String(value).toLowerCase();
    return ["customer", "barista", "admin"].includes(role) ? role : "customer";
  };

  const getCurrentUser = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error(error);
      return null;
    }
    return user;
  };

  const getCurrentProfile = async () => {
    const user = await getCurrentUser();
    if (!user) return null;

    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error(error);
      return null;
    }

    return data;
  };

  const findProfileByUsername = async (username) => {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .ilike("username", username)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(error);
      return null;
    }

    return data;
  };

  const signUp = async ({ first_name, last_name, username, email, phone, password }) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { data: null, error: { message: "Supabase is not configured yet." } };
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name,
          last_name,
          username,
          phone,
          role: "customer"
        }
      }
    });

    if (authError || !authData?.user) {
      return { data: null, error: authError || { message: "Unable to create the account." } };
    }

    return { data: authData, error: null };
  };

  const signInWithIdentity = async (identity, password) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { data: null, error: { message: "Supabase is not configured yet." } };
    }

    const trimmedIdentity = String(identity || "").trim();
    if (!trimmedIdentity) {
      return { data: null, error: { message: "Please enter your email or username." } };
    }

    let email = trimmedIdentity;
    if (trimmedIdentity.includes("@")) {
      email = trimmedIdentity;
    } else {
      const profile = await findProfileByUsername(trimmedIdentity);
      if (!profile?.email) {
        return { data: null, error: { message: "We could not find an account for that username." } };
      }
      email = profile.email;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    return { data, error };
  };

  const signOut = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return { error: { message: "Supabase is not configured yet." } };

    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const requireRole = async (roleName) => {
    const profile = await getCurrentProfile();
    if (!profile) {
      return { allowed: false, reason: "not-authenticated" };
    }

    const role = normalizeRole(profile.role);
    if (role === roleName) {
      return { allowed: true, profile };
    }

    return { allowed: false, reason: "missing-role", profile };
  };

  const getProducts = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: true });
    return { data: data || [], error };
  };

  const getAvailableProducts = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase.from("products").select("*").eq("available", true).order("created_at", { ascending: true });
    return { data: data || [], error };
  };

  const getAddons = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase.from("addons").select("*").order("created_at", { ascending: true });
    return { data: data || [], error };
  };

  const getReviews = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase.from("reviews").select("*, profiles:customer_id(first_name, last_name, username)").order("created_at", { ascending: false });
    return { data: data || [], error };
  };

  const getSuggestions = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase.from("suggestions").select("*, profiles:customer_id(first_name, last_name, username)").order("created_at", { ascending: false });
    return { data: data || [], error };
  };

  const getCafeInfo = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase.from("cafe_info").select("*").limit(1).maybeSingle();
    return { data, error };
  };

  const createOrder = async (orderPayload) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { data: null, error: { message: "Supabase is not configured yet." } };
    }

    const { data, error } = await supabase.from("orders").insert([orderPayload]).select().single();
    return { data, error };
  };

  const createOrderItems = async (items) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { data: [], error: { message: "Supabase is not configured yet." } };
    }

    const { data, error } = await supabase.from("order_items").insert(items).select();
    return { data: data || [], error };
  };

  const getCustomerOrders = async (customerId) => {
    const supabase = getSupabaseClient();
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items:order_items(*)")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    return { data: data || [], error };
  };

  const updateOrderStatus = async (orderId, status) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { data: null, error: { message: "Supabase is not configured yet." } };
    }

    const { data, error } = await supabase.from("orders").update({ status }).eq("id", orderId).select().single();
    return { data, error };
  };

  const createReview = async (payload) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { data: null, error: { message: "Supabase is not configured yet." } };
    }

    const { data, error } = await supabase.from("reviews").insert([payload]).select().single();
    return { data, error };
  };

  const createSuggestion = async (payload) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { data: null, error: { message: "Supabase is not configured yet." } };
    }

    const { data, error } = await supabase.from("suggestions").insert([payload]).select().single();
    return { data, error };
  };

  const api = {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    isConfigured,
    getSupabaseClient,
    safeError,
    getCurrentUser,
    getCurrentProfile,
    findProfileByUsername,
    signUp,
    signInWithIdentity,
    signOut,
    requireRole,
    getProducts,
    getAvailableProducts,
    getAddons,
    getReviews,
    getSuggestions,
    getCafeInfo,
    createOrder,
    createOrderItems,
    getCustomerOrders,
    updateOrderStatus,
    createReview,
    createSuggestion
  };

  window.KLASIK_SUPABASE = api;
})();

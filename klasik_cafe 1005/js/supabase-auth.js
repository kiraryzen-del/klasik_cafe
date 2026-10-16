import { requireSupabase, supabaseConfigured } from "./supabase-client.js";

export async function signUpCustomer(profile, email, password) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: profile.firstName,
        last_name: profile.lastName,
        username: profile.username,
        phone: profile.phone
      }
    }
  });

  if (error) throw error;
  return data;
}

export async function isUsernameAvailable(username) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("is_username_available", {
    candidate_username: username
  });
  if (error) throw error;
  return data;
}

export async function signInCustomer(email, password) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function getSignedInRole(userId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data.role;
}

export async function getCurrentUser() {
  const client = requireSupabase();
  const { data: { session }, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session) return null;

  const { data: { user }, error } = await client.auth.getUser();
  if (error) throw error;
  return user;
}

export async function signOutCustomer() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function inviteStaffMember(profile, email, role) {
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke("admin-create-staff", {
    body: { profile, email, role }
  });
  if (error) {
    if (error.context instanceof Response) {
      const responseBody = await error.context.clone().text();
      if (responseBody) {
        let payload;
        try {
          payload = JSON.parse(responseBody);
        } catch (parseError) {
          if (!(parseError instanceof SyntaxError)) throw parseError;
        }
        if (typeof payload?.error === "string") throw new Error(payload.error);
      }
    }
    throw error;
  }
  return data;
}

export async function requireRole(allowedRoles) {
  if (!supabaseConfigured) return null;

  const client = requireSupabase();
  const user = await getCurrentUser();
  if (!user) {
    const returnToCart = document.body.classList.contains("customer-body")
      ? "?returnTo=customer.html%23cart-section"
      : "";
    window.location.replace(`login.html${returnTo}`);
    return null;
  }

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id, first_name, last_name, username, phone, role, created_at")
    .eq("id", user.id)
    .single();
  if (profileError) throw profileError;

  if (!allowedRoles.includes(profile.role)) {
    window.location.replace("login.html?access=denied");
    return null;
  }

  return { user, profile };
}

import { createClient } from "jsr:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  Deno.env.get("APP_ORIGIN")
].filter((origin): origin is string => Boolean(origin)));

function responseHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function jsonResponse(status: number, body: Record<string, string>, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders(origin)
  });
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("Origin");
  if (origin && !allowedOrigins.has(origin)) {
    return jsonResponse(403, { error: "This website origin is not allowed." }, null);
  }

  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: responseHeaders(origin) });
  }
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." }, origin);
  }

  const projectUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!projectUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse(500, { error: "The staff invitation function is not configured." }, origin);
  }

  const authorization = request.headers.get("Authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return jsonResponse(401, { error: "Sign in with an admin account first." }, origin);
  }

  const callerClient = createClient(projectUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const serviceClient = createClient(projectUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: callerData, error: callerError } = await callerClient.auth.getUser(token);
  if (callerError || !callerData.user) {
    return jsonResponse(401, { error: "Your session is invalid or expired. Sign in again." }, origin);
  }

  const { data: callerProfile, error: profileError } = await serviceClient
    .from("profiles")
    .select("role")
    .eq("id", callerData.user.id)
    .maybeSingle();
  if (profileError) {
    return jsonResponse(500, { error: `Could not verify admin access: ${profileError.message}` }, origin);
  }
  if (callerProfile?.role !== "admin") {
    return jsonResponse(403, { error: "Only an admin can invite staff accounts." }, origin);
  }

  let input: {
    email?: unknown;
    role?: unknown;
    profile?: {
      firstName?: unknown;
      lastName?: unknown;
      username?: unknown;
      phone?: unknown;
    };
  };
  try {
    input = await request.json();
  } catch {
    return jsonResponse(400, { error: "The invitation request must contain valid JSON." }, origin);
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return jsonResponse(400, { error: "The invitation request must be a JSON object." }, origin);
  }

  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const role = input.role;
  const firstName = typeof input.profile?.firstName === "string" ? input.profile.firstName.trim() : "";
  const lastName = typeof input.profile?.lastName === "string" ? input.profile.lastName.trim() : "";
  const username = typeof input.profile?.username === "string" ? input.profile.username.trim() : "";
  const phone = typeof input.profile?.phone === "string" ? input.profile.phone.trim() : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse(400, { error: "Enter a valid staff email address." }, origin);
  }
  if (role !== "admin" && role !== "barista") {
    return jsonResponse(400, { error: "Staff role must be admin or barista." }, origin);
  }
  if (!firstName || !lastName || !username) {
    return jsonResponse(400, { error: "First name, last name, and username are required." }, origin);
  }

  const { data: inviteData, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(email, {
    data: {
      first_name: firstName,
      last_name: lastName,
      username,
      phone
    }
  });
  if (inviteError) {
    return jsonResponse(400, { error: `Could not invite this account: ${inviteError.message}` }, origin);
  }
  if (!inviteData.user) {
    return jsonResponse(500, { error: "Supabase did not return the invited user." }, origin);
  }

  const { data: updatedProfile, error: updateError } = await serviceClient
    .from("profiles")
    .update({ role })
    .eq("id", inviteData.user.id)
    .select("id")
    .maybeSingle();
  if (updateError || !updatedProfile) {
    const detail = updateError?.message || "The profile trigger did not create a profile row.";
    const { error: cleanupError } = await serviceClient.auth.admin.deleteUser(inviteData.user.id);
    if (cleanupError) {
      console.error("Could not remove the partially-created staff invite:", cleanupError.message);
    }
    return jsonResponse(500, { error: `Could not assign the staff role; the invite was cancelled. ${detail}` }, origin);
  }

  return jsonResponse(200, {
    message: `Invitation sent. The new ${role} must accept the email invitation before signing in.`
  }, origin);
});

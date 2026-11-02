import { createClient } from "@supabase/supabase-js";

async function authorizedAdmin(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!url || !key || !token) return null;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return null;
  const { data: member } = await client.from("team_members").select("role,active").eq("user_id", user.id).maybeSingle();
  return member?.role === "admin" && member.active ? client : null;
}

export async function GET(request: Request) {
  const client = await authorizedAdmin(request);
  if (!client) return Response.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
  const [{ data: members, error }, { data: authUsers }] = await Promise.all([
    client.from("team_members").select("*").order("created_at"),
    client.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ members: (members || []).map((m) => ({ ...m, email: authUsers.users.find((u) => u.id === m.user_id)?.email || "" })) });
}

export async function PATCH(request: Request) {
  const client = await authorizedAdmin(request);
  if (!client) return Response.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
  const body = await request.json().catch(() => null) as { userId?: string; canEdit?: boolean; commissionPercent?: number; active?: boolean } | null;
  const pct = Number(body?.commissionPercent);
  if (!body?.userId || !Number.isFinite(pct) || pct < 0 || pct > 100) return Response.json({ error: "Dados inválidos." }, { status: 400 });
  const { error } = await client.from("team_members").update({ can_edit_vehicles: !!body.canEdit, commission_percent: pct, active: body.active !== false, updated_at: new Date().toISOString() }).eq("user_id", body.userId).eq("role", "seller");
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey)
    return Response.json({ error: "Convites ainda não foram configurados no servidor." }, { status: 503 });

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Sessão necessária." }, { status: 401 });
  const adminClient = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: userError } = await adminClient.auth.getUser(token);
  if (userError || !user) return Response.json({ error: "Sessão inválida." }, { status: 401 });
  const { data: member } = await adminClient.from("team_members").select("role,active").eq("user_id", user.id).maybeSingle();
  if (member?.role !== "admin" || !member.active) return Response.json({ error: "Apenas administradores podem convidar vendedores." }, { status: 403 });

  const body = await request.json().catch(() => null) as { email?: string; name?: string; commissionPercent?: number } | null;
  const email = body?.email?.trim().toLowerCase();
  const name = body?.name?.trim();
  const commissionPercent = Number(body?.commissionPercent ?? 0);
  if (!email || !/^\S+@\S+\.\S+$/.test(email) || !name || name.length > 120 || !Number.isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent > 100)
    return Response.json({ error: "Confira nome, e-mail e comissão (0 a 100%)." }, { status: 400 });

  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { display_name: name, role: "seller" },
    redirectTo: process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/rede` : undefined,
  });
  if (error || !data.user) return Response.json({ error: error?.message || "Não foi possível enviar o convite." }, { status: 400 });
  const { error: profileError } = await adminClient.from("team_members").insert({ user_id: data.user.id, display_name: name, role: "seller", can_edit_vehicles: false, commission_percent: commissionPercent, active: true });
  if (profileError) {
    await adminClient.auth.admin.deleteUser(data.user.id);
    return Response.json({ error: "Convite cancelado: não foi possível criar o perfil do vendedor." }, { status: 500 });
  }
  return Response.json({ ok: true });
}

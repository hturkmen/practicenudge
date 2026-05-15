import { createClient } from "./server";

export async function getCurrentUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentFirm() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: firmUser } = await supabase
    .from("firm_users")
    .select("firm_id, role, firms(*)")
    .eq("user_id", user.id)
    .single();

  if (!firmUser) return null;

  return {
    firm: firmUser.firms as unknown as import("@/lib/types/database").Firm,
    role: firmUser.role as string,
    userId: user.id,
  };
}

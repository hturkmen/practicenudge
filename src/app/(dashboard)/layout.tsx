"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [firmName, setFirmName] = useState("My Firm");
  const [firmEmail, setFirmEmail] = useState("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setFirmEmail(user.email || "");

      // Fetch firm data
      try {
        let { data: firmUser } = await supabase
          .from("firm_users")
          .select("firm_id, role")
          .eq("user_id", user.id)
          .maybeSingle();

        // If no firm exists (e.g. Google OAuth user), create one
        if (!firmUser) {
          const displayName =
            user.user_metadata?.firm_name ||
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] + "'s Firm";

          const { data: newFirm } = await supabase
            .from("firms")
            .insert({ name: displayName, email: user.email! })
            .select()
            .single();

          if (newFirm) {
            await supabase.from("firm_users").insert({
              firm_id: newFirm.id,
              user_id: user.id,
              role: "owner",
            });
            firmUser = { firm_id: newFirm.id, role: "owner" };
          }
        }

        if (firmUser) {
          const { data: firm } = await supabase
            .from("firms")
            .select("*")
            .eq("id", firmUser.firm_id)
            .maybeSingle();

          if (firm) {
            setFirmName(firm.name);
            setFirmEmail(firm.email);
          }
        }
      } catch {
        // Continue with defaults
      }

      setLoading(false);
    }

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="ml-64">
        <Header firmName={firmName} userEmail={firmEmail} />
        <main className="p-6">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}

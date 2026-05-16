"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function verifyAdmin() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        // Check if super admin
        const { data: adminRecord, error } = await supabase
          .from("super_admins")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Admin guard error:", error);
          router.push("/dashboard");
          return;
        }

        if (!adminRecord) {
          router.push("/dashboard");
          return;
        }

        setVerified(true);
      } catch (err) {
        console.error("Admin guard exception:", err);
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    }

    verifyAdmin();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!verified) return null;

  return <>{children}</>;
}

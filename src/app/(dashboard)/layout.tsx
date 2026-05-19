"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Toaster } from "@/components/ui/sonner";
import { Loader2, ShieldAlert, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [firmName, setFirmName] = useState("My Firm");
  const [firmEmail, setFirmEmail] = useState("");
  const [suspended, setSuspended] = useState(false);
  const [requestingActivation, setRequestingActivation] = useState(false);
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
          .select("firm_id, role, status")
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

            // Notify super admin about new registration
            fetch("/api/admin/notify-new-firm", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ firmName: displayName, email: user.email }),
            }).catch(() => {});
          }
        }

        if (firmUser) {
          // Check if user is suspended
          if (firmUser.status === "suspended") {
            const { data: firm } = await supabase
              .from("firms")
              .select("name, email")
              .eq("id", firmUser.firm_id)
              .maybeSingle();
            if (firm) {
              setFirmName(firm.name);
              setFirmEmail(firm.email);
            }
            setSuspended(true);
            setLoading(false);
            return;
          }

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

  if (suspended) {
    const handleRequestActivation = async () => {
      setRequestingActivation(true);
      try {
        await fetch("/api/admin/request-activation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firmName, email: firmEmail }),
        });
        toast.success("Activation request sent to admin. We'll get back to you soon.");
      } catch {
        toast.error("Failed to send request. Please try again.");
      }
      setRequestingActivation(false);
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <ShieldAlert className="h-12 w-12 text-orange-500 mx-auto mb-3" />
            <CardTitle className="text-xl">Account Suspended</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Your account for <strong>{firmName}</strong> has been suspended. You cannot access the dashboard at this time.
            </p>
            <p className="text-sm text-muted-foreground">
              If you believe this is an error or would like to reactivate your account, please contact the administrator.
            </p>
            <Button
              onClick={handleRequestActivation}
              disabled={requestingActivation}
              className="w-full"
            >
              {requestingActivation ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Request Reactivation
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/login");
              }}
            >
              Sign out
            </Button>
          </CardContent>
        </Card>
        <Toaster />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Sidebar />
      <div className="lg:ml-64 flex flex-col flex-1">
        <Header firmName={firmName} userEmail={firmEmail} />
        <main className="p-4 md:p-6 flex-1">{children}</main>
        <footer className="border-t px-6 py-3 text-center">
          <p className="text-xs text-muted-foreground">
            Developed by{" "}
            <a
              href="https://hermesyazilim.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              Hermes Yazılım
            </a>
          </p>
        </footer>
      </div>
      <Toaster />
    </div>
  );
}

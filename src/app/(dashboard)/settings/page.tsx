"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, Upload } from "lucide-react";
import { toast } from "sonner";
import { TeamManagement } from "./team-management";

export default function SettingsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firm, setFirm] = useState<any>(null);
  const [firmForm, setFirmForm] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [emailTemplate, setEmailTemplate] = useState({
    reminder_subject:
      "{firm_name}: Documents needed for {request_title}",
    reminder_body: `Hi {client_name},

We need a few documents from you for {request_title}. The deadline is {deadline}.

Please upload your documents using this secure link:
{upload_link}

This should only take a few minutes. If you have any questions, just reply to this email.

Thanks,
{firm_name}`,
    overdue_subject:
      "OVERDUE: {firm_name} still needs your documents",
    overdue_body: `Hi {client_name},

This is a reminder that your documents for {request_title} were due on {deadline}.

Please upload them as soon as possible:
{upload_link}

Delays may affect your tax filing deadlines. If you're having trouble, please let us know.

Thanks,
{firm_name}`,
  });

  useEffect(() => {
    async function fetchFirm() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: firmUser } = await supabase
        .from("firm_users")
        .select("firm_id, role, firms(*)")
        .eq("user_id", user.id)
        .maybeSingle();

      if (firmUser?.firms) {
        const f = firmUser.firms as any;
        setFirm(f);
        setFirmForm({
          name: f.name || "",
          email: f.email || "",
          phone: f.phone || "",
        });
      }
      setLoading(false);
    }
    fetchFirm();
  }, [supabase]);

  const handleSaveFirm = async () => {
    if (!firm) return;
    setSaving(true);

    const { error } = await supabase
      .from("firms")
      .update({
        name: firmForm.name,
        phone: firmForm.phone || null,
      })
      .eq("id", firm.id);

    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      toast.success("Settings saved");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your firm settings and preferences
        </p>
      </div>

      <Tabs defaultValue="firm">
        <TabsList>
          <TabsTrigger value="firm">Firm Details</TabsTrigger>
          <TabsTrigger value="email">Email Templates</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="firm" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Firm Information</CardTitle>
              <CardDescription>
                This information appears on client-facing pages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Firm name</Label>
                <Input
                  value={firmForm.name}
                  onChange={(e) =>
                    setFirmForm({ ...firmForm, name: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input value={firmForm.email} disabled />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label>Phone</Label>
                  <Input
                    value={firmForm.phone}
                    onChange={(e) =>
                      setFirmForm({ ...firmForm, phone: e.target.value })
                    }
                    placeholder="+44 20 1234 5678"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Firm logo</Label>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-lg bg-primary flex items-center justify-center text-white text-xl font-bold">
                    {firmForm.name?.[0] || "?"}
                  </div>
                  <Button variant="outline" size="sm">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload logo
                  </Button>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveFirm} disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save changes
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium capitalize">
                    {firm?.plan || "Free"} Plan
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {firm?.plan === "pro"
                      ? "Unlimited clients, unlimited email, 100 SMS/month"
                      : firm?.plan === "starter"
                      ? "50 clients, 100 email reminders/month"
                      : "Limited features"}
                  </p>
                </div>
                <Button variant="outline">Manage billing</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Reminder Email Template</CardTitle>
              <CardDescription>
                Sent when a deadline is approaching. Variables:{" "}
                {"{client_name}"}, {"{firm_name}"}, {"{request_title}"},{" "}
                {"{deadline}"}, {"{upload_link}"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Subject</Label>
                <Input
                  value={emailTemplate.reminder_subject}
                  onChange={(e) =>
                    setEmailTemplate({
                      ...emailTemplate,
                      reminder_subject: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Body</Label>
                <Textarea
                  value={emailTemplate.reminder_body}
                  onChange={(e) =>
                    setEmailTemplate({
                      ...emailTemplate,
                      reminder_body: e.target.value,
                    })
                  }
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Overdue Email Template</CardTitle>
              <CardDescription>
                Sent when a deadline has passed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Subject</Label>
                <Input
                  value={emailTemplate.overdue_subject}
                  onChange={(e) =>
                    setEmailTemplate({
                      ...emailTemplate,
                      overdue_subject: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Body</Label>
                <Textarea
                  value={emailTemplate.overdue_body}
                  onChange={(e) =>
                    setEmailTemplate({
                      ...emailTemplate,
                      overdue_body: e.target.value,
                    })
                  }
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => toast.success("Email templates saved")}>
              <Save className="mr-2 h-4 w-4" />
              Save templates
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <TeamManagement firmId={firm?.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

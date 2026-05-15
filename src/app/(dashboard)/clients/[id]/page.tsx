"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Client, DocumentRequest, ReminderLog } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Save,
  Loader2,
  FileText,
  Mail,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  const supabase = createClient();

  const [client, setClient] = useState<Client | null>(null);
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [reminders, setReminders] = useState<ReminderLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    client_type: "sole_trader",
    mtd_threshold: "",
    tax_reference: "",
    notes: "",
    status: "active",
  });

  useEffect(() => {
    async function fetchData() {
      const [clientRes, requestsRes, remindersRes] = await Promise.all([
        supabase.from("clients").select("*").eq("id", clientId).single(),
        supabase
          .from("document_requests")
          .select("*")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false }),
        supabase
          .from("reminder_logs")
          .select("*")
          .eq("client_id", clientId)
          .order("sent_at", { ascending: false })
          .limit(20),
      ]);

      if (clientRes.data) {
        setClient(clientRes.data);
        setForm({
          name: clientRes.data.name,
          email: clientRes.data.email || "",
          phone: clientRes.data.phone || "",
          client_type: clientRes.data.client_type,
          mtd_threshold: clientRes.data.mtd_threshold || "",
          tax_reference: clientRes.data.tax_reference || "",
          notes: clientRes.data.notes || "",
          status: clientRes.data.status,
        });
      }
      setRequests(requestsRes.data || []);
      setReminders(remindersRes.data || []);
      setLoading(false);
    }
    fetchData();
  }, [clientId, supabase]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("clients")
      .update({
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        client_type: form.client_type,
        mtd_threshold: form.mtd_threshold || null,
        tax_reference: form.tax_reference || null,
        notes: form.notes || null,
        status: form.status,
      })
      .eq("id", clientId);

    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      toast.success("Client updated");
    }
    setSaving(false);
  };

  const statusColors: Record<string, string> = {
    pending: "bg-gray-100 text-gray-700",
    in_progress: "bg-yellow-100 text-yellow-700",
    completed: "bg-green-100 text-green-700",
    overdue: "bg-red-100 text-red-700",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-20">
        <p>Client not found</p>
        <Link href="/clients">
          <Button variant="outline" className="mt-4">
            Back to clients
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/clients">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
          <p className="text-muted-foreground">Client details and history</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save changes
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Client Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Phone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>UTR Number</Label>
                  <Input
                    value={form.tax_reference}
                    onChange={(e) =>
                      setForm({ ...form, tax_reference: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Client Type</Label>
                  <Select
                    value={form.client_type}
                    onValueChange={(v) =>
                      setForm({ ...form, client_type: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sole_trader">Sole Trader</SelectItem>
                      <SelectItem value="landlord">Landlord</SelectItem>
                      <SelectItem value="limited_company">
                        Limited Company
                      </SelectItem>
                      <SelectItem value="partnership">Partnership</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>MTD Threshold</Label>
                  <Select
                    value={form.mtd_threshold}
                    onValueChange={(v) =>
                      setForm({ ...form, mtd_threshold: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50k">£50k+</SelectItem>
                      <SelectItem value="30k">£30k+</SelectItem>
                      <SelectItem value="20k">£20k+</SelectItem>
                      <SelectItem value="below">Below threshold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Document Requests */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Document Requests
                  </CardTitle>
                  <CardDescription>
                    All document requests for this client
                  </CardDescription>
                </div>
                <Link href={`/requests/new?client=${clientId}`}>
                  <Button size="sm">New Request</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No document requests yet
                </p>
              ) : (
                <div className="space-y-3">
                  {requests.map((req) => (
                    <Link
                      key={req.id}
                      href={`/requests/${req.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div>
                        <p className="font-medium text-sm">{req.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Created{" "}
                          {new Date(req.created_at).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          className={
                            (statusColors[req.status] || "") + " text-xs"
                          }
                        >
                          {req.status.replace("_", " ")}
                        </Badge>
                        {req.deadline && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Due{" "}
                            {new Date(req.deadline).toLocaleDateString(
                              "en-GB",
                              { day: "numeric", month: "short" }
                            )}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Reminder History */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reminder History</CardTitle>
            </CardHeader>
            <CardContent>
              {reminders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No reminders sent yet
                </p>
              ) : (
                <div className="space-y-3">
                  {reminders.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 text-sm border-b pb-3 last:border-0"
                    >
                      {log.channel === "email" ? (
                        <Mail className="h-4 w-4 text-blue-500 mt-0.5" />
                      ) : (
                        <MessageSquare className="h-4 w-4 text-green-500 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">
                          {log.channel.toUpperCase()} •{" "}
                          {new Date(log.sent_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        <Badge
                          variant="outline"
                          className="text-xs mt-1"
                        >
                          {log.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

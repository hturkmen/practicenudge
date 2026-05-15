"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  Loader2,
  Copy,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Upload,
  Mail,
  FileText,
  Download,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function RequestDetailPage() {
  const params = useParams();
  const requestId = params.id as string;
  const supabase = createClient();

  const [request, setRequest] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const [reqRes, itemsRes, remindersRes] = await Promise.all([
      supabase
        .from("document_requests")
        .select("*, clients(id, name, email, phone)")
        .eq("id", requestId)
        .single(),
      supabase
        .from("request_items")
        .select("*")
        .eq("request_id", requestId)
        .order("sort_order"),
      supabase
        .from("reminder_logs")
        .select("*")
        .eq("request_id", requestId)
        .order("sent_at", { ascending: false }),
    ]);

    setRequest(reqRes.data);
    setItems(itemsRes.data || []);
    setReminders(remindersRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [requestId]);

  const handleApproveItem = async (itemId: string) => {
    await supabase
      .from("request_items")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", itemId);
    toast.success("Item approved");
    fetchData();
  };

  const handleRejectItem = async (itemId: string) => {
    await supabase
      .from("request_items")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", itemId);
    toast.success("Item rejected — client will need to re-upload");
    fetchData();
  };

  const copyMagicLink = () => {
    if (!request) return;
    const url = `${window.location.origin}/upload/${request.magic_token}`;
    navigator.clipboard.writeText(url);
    toast.success("Upload link copied to clipboard");
  };

  const handleSendReminder = async () => {
    if (!request) return;
    if (!request.clients?.email) {
      toast.error("Client has no email address");
      return;
    }

    try {
      const res = await fetch("/api/reminders/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to send reminder");
        return;
      }

      toast.success("Reminder sent to " + request.clients.email);
      fetchData();
    } catch {
      toast.error("Failed to send reminder");
    }
  };

  const statusColors: Record<string, string> = {
    pending: "bg-gray-100 text-gray-700",
    in_progress: "bg-yellow-100 text-yellow-700",
    completed: "bg-green-100 text-green-700",
    overdue: "bg-red-100 text-red-700",
  };

  const itemStatusIcons: Record<string, React.ReactNode> = {
    pending: <Clock className="h-4 w-4 text-gray-400" />,
    uploaded: <Upload className="h-4 w-4 text-blue-500" />,
    approved: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    rejected: <XCircle className="h-4 w-4 text-red-500" />,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-20">
        <p>Request not found</p>
        <Link href="/requests">
          <Button variant="outline" className="mt-4">
            Back to requests
          </Button>
        </Link>
      </div>
    );
  }

  const completedItems = items.filter(
    (i) => i.status === "approved" || i.status === "uploaded"
  ).length;
  const progress = items.length > 0 ? (completedItems / items.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/requests">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {request.title}
            </h1>
            <Badge className={(statusColors[request.status] || "") + " text-xs"}>
              {request.status.replace("_", " ")}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {request.clients?.name}
            {request.clients?.email && ` • ${request.clients.email}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyMagicLink}>
            <Copy className="mr-2 h-4 w-4" />
            Copy link
          </Button>
          <Link href={`/upload/${request.magic_token}`} target="_blank">
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-2 h-4 w-4" />
              Preview
            </Button>
          </Link>
          <Button size="sm" onClick={handleSendReminder}>
            <Mail className="mr-2 h-4 w-4" />
            Send Reminder
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Progress */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {completedItems} of {items.length} items completed
                </span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary rounded-full h-2 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Checklist Items */}
          <Card>
            <CardHeader>
              <CardTitle>Checklist</CardTitle>
              <CardDescription>
                Review uploaded documents and approve or reject them
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 border rounded-lg"
                >
                  <div className="mt-0.5">
                    {itemStatusIcons[item.status]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{item.label}</p>
                      {item.required && (
                        <Badge variant="outline" className="text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.description}
                      </p>
                    )}
                    {item.file_name && (
                      <div className="flex items-center gap-2 mt-2">
                        <FileText className="h-3.5 w-3.5 text-blue-500" />
                        <a
                          href={item.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          {item.file_name}
                        </a>
                        <span className="text-xs text-muted-foreground">
                          Uploaded{" "}
                          {new Date(item.uploaded_at).toLocaleDateString(
                            "en-GB"
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                  {item.status === "uploaded" && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleApproveItem(item.id)}
                      >
                        <CheckCircle2 className="mr-1 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRejectItem(item.id)}
                      >
                        <XCircle className="mr-1 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  )}
                  <Badge
                    className={
                      (statusColors[item.status] || "bg-gray-100 text-gray-700") +
                      " text-xs"
                    }
                  >
                    {item.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Client</span>
                <Link
                  href={`/clients/${request.clients?.id}`}
                  className="font-medium hover:underline"
                >
                  {request.clients?.name}
                </Link>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deadline</span>
                <span className="font-medium">
                  {request.deadline
                    ? new Date(request.deadline).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "No deadline"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>
                  {new Date(request.created_at).toLocaleDateString("en-GB")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reminders sent</span>
                <span>{request.reminder_count}</span>
              </div>
              {request.last_reminder_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last reminder</span>
                  <span>
                    {new Date(request.last_reminder_at).toLocaleDateString(
                      "en-GB"
                    )}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

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
                      className="flex items-center gap-2 text-sm border-b pb-2 last:border-0"
                    >
                      <Mail className="h-3.5 w-3.5 text-blue-500" />
                      <div className="flex-1">
                        <p className="text-xs">
                          {log.channel.toUpperCase()} — {log.status}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.sent_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
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

"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { AdminGuard } from "@/components/admin/admin-guard";
import {
  LifecycleCellPlaceholder, LifecycleDrawer, QualityBadge, ReviewQueue, StageBadge, TimelineButton,
  useLifecycle, type LifecycleTarget,
} from "@/components/admin/lifecycle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Lead {
  id: string;
  name: string;
  email: string;
  practice: string | null;
  client_count: string | null;
  source: string;
  status: "new" | "contacted" | "converted" | "lost";
  notes: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  converted: "bg-green-100 text-green-700",
  lost: "bg-gray-100 text-gray-700",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const lifecycle = useLifecycle();
  const [drawerTarget, setDrawerTarget] = useState<LifecycleTarget | null>(null);
  // A person can have several lead rows; they share one lifecycle record keyed by email.
  const lifecycleByEmail = useMemo(
    () => new Map((lifecycle.data?.people ?? []).filter((p) => p.lead_id).map((p) => [p.email_key, p])),
    [lifecycle.data]
  );
  const reviewQueue = useMemo(
    () => (lifecycle.data?.people ?? []).filter((p) => p.lead_id && !p.member_id && p.quality.tier === "review"),
    [lifecycle.data]
  );

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/leads");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setLeads(data.data || []);
    } catch {
      toast.error("Failed to load leads");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const updateLeadStatus = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/admin/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Lead status updated");
      fetchLeads();
    } catch {
      toast.error("Failed to update");
    }
  };

  return (
    <AdminGuard>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <UserPlus className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
            <p className="text-muted-foreground">
              MTD tracker downloads and interest signups
            </p>
          </div>
        </div>

        {lifecycle.error && (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/50 px-4 py-3 text-sm">
            <span className="text-destructive">Stage and quality could not be loaded: {lifecycle.error}</span>
            <Button variant="outline" size="sm" onClick={lifecycle.reload}>Retry</Button>
          </div>
        )}

        <ReviewQueue people={reviewQueue} loading={lifecycle.loading && !lifecycle.data}
          onOpen={(p) => setDrawerTarget({ lead_id: p.lead_id! })} />

        <Card>
          <CardHeader>
            <CardTitle>All Leads</CardTitle>
            <CardDescription>{leads.length} lead{leads.length !== 1 ? "s" : ""} total</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : leads.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <UserPlus className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No leads yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Practice</TableHead>
                    <TableHead>Clients</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead><span className="sr-only">Timeline</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.name}</TableCell>
                      <TableCell>
                        <a href={`mailto:${lead.email}`} className="text-primary hover:underline">
                          {lead.email}
                        </a>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead.practice || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead.client_count || "—"}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={lead.status}
                          onValueChange={(v) => updateLeadStatus(lead.id, v)}
                        >
                          <SelectTrigger className="w-[120px] h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="converted">Converted</SelectItem>
                            <SelectItem value="lost">Lost</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {lifecycleByEmail.get(lead.email.toLowerCase())
                          ? <StageBadge person={lifecycleByEmail.get(lead.email.toLowerCase())!} />
                          : <LifecycleCellPlaceholder failed={!lifecycle.loading} />}
                      </TableCell>
                      <TableCell>
                        {lifecycleByEmail.get(lead.email.toLowerCase())
                          ? <QualityBadge person={lifecycleByEmail.get(lead.email.toLowerCase())!} />
                          : <LifecycleCellPlaceholder failed={!lifecycle.loading} />}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(lead.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>
                        <TimelineButton label={lead.name} onClick={() => setDrawerTarget({ lead_id: lead.id })} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <LifecycleDrawer target={drawerTarget} onClose={() => setDrawerTarget(null)} onChanged={lifecycle.reload} />
      </div>
    </AdminGuard>
  );
}

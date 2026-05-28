"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AdminGuard } from "@/components/admin/admin-guard";
import { ConfirmationDialog } from "@/components/admin/confirmation-dialog";
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
import { ArrowLeft, Building2, Loader2, Users, FileText, History, PauseCircle, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import type { FirmDetailResponse } from "@/lib/types/admin";

const planColors: Record<string, string> = {
  free: "bg-gray-100 text-gray-700",
  starter: "bg-blue-100 text-blue-700",
  pro: "bg-purple-100 text-purple-700",
};

const roleColors: Record<string, string> = {
  owner: "bg-orange-100 text-orange-700",
  admin: "bg-blue-100 text-blue-700",
  member: "bg-gray-100 text-gray-700",
};

export default function FirmDetailPage() {
  const params = useParams();
  const firmId = params.id as string;

  const [firmData, setFirmData] = useState<FirmDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<string>("");
  const [updatingPlan, setUpdatingPlan] = useState(false);

  const fetchFirmDetail = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/firms/${firmId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch firm details");
      }

      const data: FirmDetailResponse = await response.json();
      setFirmData(data);
      setSelectedPlan(data.firm.plan);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch firm details";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  useEffect(() => {
    fetchFirmDetail();
  }, [fetchFirmDetail]);

  const handlePlanChange = (newPlan: string) => {
    if (newPlan === selectedPlan) return;
    setPendingPlan(newPlan);
    setConfirmDialogOpen(true);
  };

  const handleFirmAction = async (action: "suspend_firm" | "reactivate_firm") => {
    try {
      const response = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, target_id: firmId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Action failed");
      }

      const data = await response.json();
      toast.success(data.message);
      fetchFirmDetail();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Action failed";
      toast.error(message);
    }
  };

  const confirmPlanChange = async () => {
    setUpdatingPlan(true);
    try {
      const response = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_plan",
          target_id: firmId,
          value: pendingPlan,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update plan");
      }

      setSelectedPlan(pendingPlan);
      setFirmData((prev) =>
        prev
          ? {
              ...prev,
              firm: { ...prev.firm, plan: pendingPlan as "free" | "starter" | "pro" },
              subscription_history: [
                {
                  previous_plan: selectedPlan,
                  new_plan: pendingPlan,
                  changed_at: new Date().toISOString(),
                },
                ...prev.subscription_history,
              ],
            }
          : prev
      );
      toast.success(`Plan updated to ${pendingPlan}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update plan";
      toast.error(message);
      // Retain previous plan value on error
      setSelectedPlan(firmData?.firm.plan || selectedPlan);
    } finally {
      setUpdatingPlan(false);
      setPendingPlan("");
    }
  };

  return (
    <AdminGuard>
      <div className="space-y-6">
        {/* Header with back navigation */}
        <div className="flex items-center gap-3">
          <Link href="/admin/firms">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Building2 className="h-6 w-6 text-primary" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">
              {loading ? "Loading..." : firmData?.firm.name || "Firm Detail"}
            </h1>
            <p className="text-muted-foreground">
              Firm details and management
            </p>
          </div>
          {!loading && firmData && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-orange-600 border-orange-200 hover:bg-orange-50"
                onClick={() => handleFirmAction("suspend_firm")}
              >
                <PauseCircle className="mr-2 h-4 w-4" />
                Suspend
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-green-600 border-green-200 hover:bg-green-50"
                onClick={() => handleFirmAction("reactivate_firm")}
              >
                <PlayCircle className="mr-2 h-4 w-4" />
                Reactivate
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !firmData ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>Firm not found or failed to load.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Firm Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Firm Information</CardTitle>
                <CardDescription>
                  Basic details and plan management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Name</p>
                    <p className="text-sm">{firmData.firm.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="text-sm">{firmData.firm.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <p className="text-sm">{firmData.firm.phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Created</p>
                    <p className="text-sm">
                      {new Date(firmData.firm.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Plan</p>
                    <Select
                      value={selectedPlan}
                      onValueChange={handlePlanChange}
                      disabled={updatingPlan}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="starter">Starter</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Members</p>
                      <p className="text-2xl font-bold">{firmData.members.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Clients</p>
                      <p className="text-2xl font-bold">{firmData.total_clients}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Document Requests</p>
                      <p className="text-2xl font-bold">{firmData.total_document_requests}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Members Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Associated Members
                </CardTitle>
                <CardDescription>
                  {firmData.members.length} member{firmData.members.length !== 1 ? "s" : ""} in this firm
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {firmData.members.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No members found for this firm.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {firmData.members.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">{member.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {member.email}
                          </TableCell>
                          <TableCell>
                            <Badge className={(roleColors[member.role] || "") + " text-xs"}>
                              {member.role}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Clients Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Clients
                </CardTitle>
                <CardDescription>
                  {firmData.clients?.length || 0} client{(firmData.clients?.length || 0) !== 1 ? "s" : ""} registered under this firm
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {!firmData.clients || firmData.clients.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No clients found for this firm.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>GDPR Consent</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {firmData.clients.map((client) => (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">{client.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {client.email || "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {client.phone || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${
                              client.status === "active" ? "bg-green-100 text-green-700" :
                              client.status === "on_hold" ? "bg-orange-100 text-orange-700" :
                              client.status === "archived" ? "bg-gray-100 text-gray-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              {client.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${
                              client.gdpr_consent ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            }`}>
                              {client.gdpr_consent ? "Yes" : "No"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {new Date(client.created_at).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Subscription History Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Subscription History
                </CardTitle>
                <CardDescription>
                  Plan changes over time
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {firmData.subscription_history.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No plan changes recorded.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Previous Plan</TableHead>
                        <TableHead>New Plan</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {firmData.subscription_history.map((entry, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Badge className={(planColors[entry.previous_plan] || "") + " text-xs"}>
                              {entry.previous_plan}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={(planColors[entry.new_plan] || "") + " text-xs"}>
                              {entry.new_plan}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(entry.changed_at).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Plan Change Confirmation Dialog */}
        <ConfirmationDialog
          open={confirmDialogOpen}
          onOpenChange={setConfirmDialogOpen}
          title="Change Firm Plan"
          description={`Are you sure you want to change the plan for "${firmData?.firm.name}" from "${selectedPlan}" to "${pendingPlan}"? This will affect all members of this firm.`}
          confirmLabel="Change Plan"
          onConfirm={confirmPlanChange}
          variant="warning"
        />
      </div>
    </AdminGuard>
  );
}

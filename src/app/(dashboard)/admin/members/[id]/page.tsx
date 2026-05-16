"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AdminGuard } from "@/components/admin/admin-guard";
import { ConfirmationDialog } from "@/components/admin/confirmation-dialog";
import { ActivityLogTable } from "@/components/admin/activity-log-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft, User, Activity } from "lucide-react";
import { toast } from "sonner";
import type { MemberListItem, ActivityLogEntry } from "@/lib/types/admin";

export default function MemberDetailPage() {
  const params = useParams();
  const memberId = params.id as string;

  // Member state
  const [member, setMember] = useState<MemberListItem | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Role update state
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [showRoleConfirm, setShowRoleConfirm] = useState(false);
  const [pendingRole, setPendingRole] = useState<string>("");

  // Suspend/reactivate state
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);
  const [lastOwnerWarning, setLastOwnerWarning] = useState<string | null>(null);

  // Activity log filter state
  const [actionTypeFilter, setActionTypeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Fetch member detail
  const fetchMember = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/members/${memberId}`);
      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.message || "Failed to fetch member details");
        return;
      }
      const data = await res.json();
      setMember(data.member);
      setSelectedRole(data.member.role);
      setActivityLog(data.activity_log || []);
    } catch {
      toast.error("Failed to fetch member details");
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    fetchMember();
  }, [fetchMember]);

  // Fetch filtered activity log
  const fetchActivityLog = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams();
      if (actionTypeFilter && actionTypeFilter !== "all") {
        queryParams.set("action_type", actionTypeFilter);
      }
      if (dateFrom) queryParams.set("date_from", dateFrom);
      if (dateTo) queryParams.set("date_to", dateTo);

      const userId = member?.user_id;
      if (!userId) return;

      const res = await fetch(
        `/api/admin/activity-logs/${userId}?${queryParams.toString()}`
      );
      if (!res.ok) {
        toast.error("Failed to fetch activity log");
        return;
      }
      const data = await res.json();
      setActivityLog(data.data || []);
    } catch {
      toast.error("Failed to fetch activity log");
    }
  }, [member?.user_id, actionTypeFilter, dateFrom, dateTo]);

  // Re-fetch activity log when filters change
  useEffect(() => {
    if (member?.user_id) {
      fetchActivityLog();
    }
  }, [fetchActivityLog, member?.user_id]);

  // Handle role change
  const handleRoleChange = (newRole: string) => {
    if (newRole === member?.role) return;
    setPendingRole(newRole);
    setShowRoleConfirm(true);
  };

  const confirmRoleUpdate = async () => {
    if (!member) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_role",
          target_id: member.id,
          value: pendingRole,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.message || "Failed to update role");
        // Retain previous value
        setSelectedRole(member.role);
        return;
      }

      toast.success("Role updated successfully");
      setMember((prev) =>
        prev ? { ...prev, role: pendingRole as typeof prev.role } : prev
      );
      setSelectedRole(pendingRole);
    } catch {
      toast.error("Failed to update role");
      setSelectedRole(member.role);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle suspend/reactivate
  const handleSuspendReactivate = async () => {
    if (!member) return;

    if (member.status === "active") {
      // Check if last owner before showing dialog
      setLastOwnerWarning(null);
      setShowSuspendConfirm(true);
    } else {
      // Reactivate - show confirmation
      setShowSuspendConfirm(true);
    }
  };

  const confirmSuspendReactivate = async () => {
    if (!member) return;
    setActionLoading(true);
    const action =
      member.status === "active" ? "suspend_member" : "reactivate_member";

    try {
      const res = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          target_id: member.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || `Failed to ${action === "suspend_member" ? "suspend" : "reactivate"} member`);
        return;
      }

      // If there's a warning about last owner, show it but action still succeeded
      if (data.warning) {
        toast.warning(data.warning);
      } else {
        toast.success(
          action === "suspend_member"
            ? "Member suspended successfully"
            : "Member reactivated successfully"
        );
      }

      const newStatus = action === "suspend_member" ? "suspended" : "active";
      setMember((prev) =>
        prev ? { ...prev, status: newStatus as typeof prev.status } : prev
      );
    } catch {
      toast.error(`Failed to ${action === "suspend_member" ? "suspend" : "reactivate"} member`);
    } finally {
      setActionLoading(false);
      setLastOwnerWarning(null);
    }
  };

  // Check if member is last owner (for warning display)
  const checkLastOwner = useCallback(async () => {
    if (!member || member.role !== "owner") {
      setLastOwnerWarning(null);
      return;
    }

    try {
      // Fetch all members of the same firm to check owner count
      const res = await fetch(
        `/api/admin/members?firm_id=${member.firm_id}&role=owner&status=active&page_size=10`
      );
      if (res.ok) {
        const data = await res.json();
        const activeOwners = data.data?.length || 0;
        if (activeOwners <= 1) {
          setLastOwnerWarning(
            `Warning: This is the last owner of "${member.firm_name}". Suspending this member will leave the firm with no owner.`
          );
        } else {
          setLastOwnerWarning(null);
        }
      }
    } catch {
      // If check fails, don't block the action
      setLastOwnerWarning(null);
    }
  }, [member]);

  useEffect(() => {
    if (member && member.status === "active" && member.role === "owner") {
      checkLastOwner();
    }
  }, [member, checkLastOwner]);

  // Plan and status badge colors
  const planColors: Record<string, string> = {
    free: "bg-gray-100 text-gray-700",
    starter: "bg-blue-100 text-blue-700",
    pro: "bg-purple-100 text-purple-700",
  };

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    suspended: "bg-red-100 text-red-700",
  };

  return (
    <AdminGuard>
      <div className="space-y-6">
        {/* Back navigation */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/members">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Members
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !member ? (
          <Card>
            <CardContent className="py-20 text-center">
              <p className="text-muted-foreground">Member not found</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Member Profile Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <User className="h-6 w-6 text-primary" />
                  <div>
                    <CardTitle>{member.name}</CardTitle>
                    <CardDescription>{member.email}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Firm Name */}
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">
                      Firm
                    </Label>
                    <p className="font-medium">{member.firm_name}</p>
                  </div>

                  {/* Role with update dropdown */}
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">
                      Role
                    </Label>
                    <Select
                      value={selectedRole}
                      onValueChange={handleRoleChange}
                      disabled={actionLoading}
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Plan */}
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">
                      Plan
                    </Label>
                    <div>
                      <Badge
                        className={`${planColors[member.plan] || ""} text-xs`}
                      >
                        {member.plan}
                      </Badge>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">
                      Status
                    </Label>
                    <div>
                      <Badge
                        className={`${statusColors[member.status] || ""} text-xs`}
                      >
                        {member.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Registration Date */}
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">
                      Registered
                    </Label>
                    <p className="font-medium">
                      {new Date(member.created_at).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  {/* Suspend/Reactivate Button */}
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">
                      Actions
                    </Label>
                    <div>
                      <Button
                        variant={
                          member.status === "active" ? "destructive" : "default"
                        }
                        size="sm"
                        onClick={handleSuspendReactivate}
                        disabled={actionLoading}
                      >
                        {actionLoading && (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        )}
                        {member.status === "active" ? "Suspend" : "Reactivate"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Activity Log Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle>Activity Log</CardTitle>
                    <CardDescription>
                      Last 100 actions sorted by most recent
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Activity Log Filters */}
                <div className="flex flex-wrap items-end gap-4 mb-6">
                  {/* Action Type Filter */}
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">
                      Action Type
                    </Label>
                    <Select
                      value={actionTypeFilter}
                      onValueChange={setActionTypeFilter}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="All Actions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Actions</SelectItem>
                        <SelectItem value="login">Login</SelectItem>
                        <SelectItem value="client_added">
                          Client Added
                        </SelectItem>
                        <SelectItem value="client_updated">
                          Client Updated
                        </SelectItem>
                        <SelectItem value="document_request_sent">
                          Request Sent
                        </SelectItem>
                        <SelectItem value="document_request_completed">
                          Request Completed
                        </SelectItem>
                        <SelectItem value="settings_changed">
                          Settings Changed
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date From */}
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">
                      From
                    </Label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-[160px]"
                    />
                  </div>

                  {/* Date To */}
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">To</Label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-[160px]"
                    />
                  </div>
                </div>

                {/* Activity Log Table */}
                <ActivityLogTable entries={activityLog} />

                {/* Empty state when filters are active but no results */}
                {activityLog.length === 0 &&
                  (actionTypeFilter !== "all" || dateFrom || dateTo) && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>
                        No activity found for the selected filters.
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 justify-center">
                        {actionTypeFilter !== "all" && (
                          <Badge variant="outline">
                            Action: {actionTypeFilter}
                          </Badge>
                        )}
                        {dateFrom && (
                          <Badge variant="outline">From: {dateFrom}</Badge>
                        )}
                        {dateTo && (
                          <Badge variant="outline">To: {dateTo}</Badge>
                        )}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Role Update Confirmation Dialog */}
        <ConfirmationDialog
          open={showRoleConfirm}
          onOpenChange={setShowRoleConfirm}
          title="Update Member Role"
          description={`Are you sure you want to change this member's role from "${member?.role}" to "${pendingRole}"?`}
          confirmLabel="Update Role"
          onConfirm={confirmRoleUpdate}
          variant="warning"
        />

        {/* Suspend/Reactivate Confirmation Dialog */}
        <ConfirmationDialog
          open={showSuspendConfirm}
          onOpenChange={setShowSuspendConfirm}
          title={
            member?.status === "active" ? "Suspend Member" : "Reactivate Member"
          }
          description={
            member?.status === "active"
              ? lastOwnerWarning
                ? `${lastOwnerWarning}\n\nAre you sure you want to suspend "${member?.name}"? They will no longer be able to log in.`
                : `Are you sure you want to suspend "${member?.name}"? They will no longer be able to log in.`
              : `Are you sure you want to reactivate "${member?.name}"? They will be able to log in again with their previous role and firm association.`
          }
          confirmLabel={
            member?.status === "active" ? "Suspend" : "Reactivate"
          }
          onConfirm={confirmSuspendReactivate}
          variant={member?.status === "active" ? "danger" : "warning"}
        />
      </div>
    </AdminGuard>
  );
}

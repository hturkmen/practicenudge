"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Client } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Upload, Users, MoreHorizontal, PauseCircle, PlayCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { AddClientDialog } from "./add-client-dialog";
import { CsvImportDialog } from "./csv-import-dialog";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ConsentSummary = "all_accepted" | "some_pending" | "some_rejected" | "no_records";

interface ClientWithConsent extends Client {
  consentSummary?: ConsentSummary;
  firmName?: string;
}

function getConsentSummary(consents: { status: string }[]): ConsentSummary {
  if (!consents || consents.length === 0) return "no_records";
  const allAccepted = consents.every((c) => c.status === "accepted");
  if (allAccepted) return "all_accepted";
  const hasRejected = consents.some((c) => c.status === "rejected");
  if (hasRejected) return "some_rejected";
  return "some_pending";
}

function ConsentBadge({ summary }: { summary: ConsentSummary }) {
  switch (summary) {
    case "all_accepted":
      return (
        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 text-xs gap-1">
          <ShieldCheck className="h-3 w-3" />
          Onaylı
        </Badge>
      );
    case "some_rejected":
      return (
        <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 text-xs gap-1">
          <ShieldAlert className="h-3 w-3" />
          Reddedildi
        </Badge>
      );
    case "some_pending":
      return (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs gap-1">
          <ShieldQuestion className="h-3 w-3" />
          Bekliyor
        </Badge>
      );
    case "no_records":
    default:
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-200 text-xs gap-1">
          <ShieldQuestion className="h-3 w-3" />
          Bekliyor
        </Badge>
      );
  }
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientWithConsent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showCsvDialog, setShowCsvDialog] = useState(false);
  const [deleteClientId, setDeleteClientId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const supabase = createClient();

  // Check if user is super admin
  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("super_admins")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      setIsSuperAdmin(!!data);
    }
    checkAdmin();
  }, [supabase]);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("clients")
      .select("*, client_consents(status), firms(name)")
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }
    if (typeFilter !== "all") {
      query = query.eq("client_type", typeFilter);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data } = await query;
    const clientsWithConsent: ClientWithConsent[] = (data || []).map((c: any) => ({
      ...c,
      firmName: c.firms?.name || "—",
      consentSummary: getConsentSummary(c.client_consents || []),
    }));
    setClients(clientsWithConsent);
    setLoading(false);
  }, [supabase, statusFilter, typeFilter, search]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const clientTypeLabels: Record<string, string> = {
    sole_trader: "Sole Trader",
    landlord: "Landlord",
    limited_company: "Limited Co.",
    partnership: "Partnership",
  };

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    inactive: "bg-gray-100 text-gray-700",
    archived: "bg-red-100 text-red-700",
    on_hold: "bg-orange-100 text-orange-700",
  };

  const updateClientStatus = async (clientId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/clients/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to update client status");
        return;
      }

      toast.success(
        newStatus === "on_hold"
          ? "Client put on hold. All active requests paused."
          : newStatus === "active"
          ? "Client activated. Requests restored."
          : `Client status updated to ${newStatus}`
      );
      fetchClients();
    } catch {
      toast.error("Failed to update client status");
    }
  };

  const deleteClient = async (clientId: string) => {
    try {
      const res = await fetch("/api/clients/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete client");
        return;
      }

      toast.success("Client and all associated data deleted");
      setDeleteClientId(null);
      fetchClients();
    } catch {
      toast.error("Failed to delete client");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            Manage your client list and their details
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCsvDialog(true)}>
            <Upload className="mr-2 h-4 w-4" />
            CSV Import
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Client type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="sole_trader">Sole Trader</SelectItem>
                <SelectItem value="landlord">Landlord</SelectItem>
                <SelectItem value="limited_company">Limited Company</SelectItem>
                <SelectItem value="partnership">Partnership</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Client Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="font-medium mb-1">No clients found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {search || typeFilter !== "all" || statusFilter !== "active"
                  ? "Try adjusting your filters"
                  : "Get started by adding your first client"}
              </p>
              {!search && typeFilter === "all" && statusFilter === "active" && (
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => setShowAddDialog(true)} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Client
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCsvDialog(true)}
                    size="sm"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Import CSV
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  {isSuperAdmin && <TableHead>Firm</TableHead>}
                  <TableHead>Type</TableHead>
                  <TableHead>MTD Threshold</TableHead>
                  <TableHead>Consent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id} className="cursor-pointer">
                    <TableCell>
                      <Link
                        href={`/clients/${client.id}`}
                        className="font-medium hover:underline"
                      >
                        {client.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {client.email || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {client.phone || "—"}
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {client.firmName || "—"}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {clientTypeLabels[client.client_type] ||
                          client.client_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {client.mtd_threshold
                        ? `£${client.mtd_threshold}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <ConsentBadge summary={client.consentSummary || "no_records"} />
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          (statusColors[client.status] || "") + " text-xs"
                        }
                      >
                        {client.status === "on_hold" ? "on hold" : client.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {client.status !== "on_hold" && client.status !== "inactive" && client.status !== "archived" && (
                            <DropdownMenuItem onClick={() => updateClientStatus(client.id, "on_hold")}>
                              <PauseCircle className="mr-2 h-4 w-4 text-orange-600" />
                              Put on Hold
                            </DropdownMenuItem>
                          )}
                          {(client.status === "on_hold" || client.status === "inactive" || client.status === "archived") && (
                            <DropdownMenuItem onClick={() => updateClientStatus(client.id, "active")}>
                              <PlayCircle className="mr-2 h-4 w-4 text-green-600" />
                              Activate
                            </DropdownMenuItem>
                          )}
                          {client.status !== "active" && (
                            <DropdownMenuItem
                              onClick={() => setDeleteClientId(client.id)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddClientDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={fetchClients}
      />
      <CsvImportDialog
        open={showCsvDialog}
        onOpenChange={setShowCsvDialog}
        onSuccess={fetchClients}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteClientId} onOpenChange={() => setDeleteClientId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this client and all their associated document requests. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteClientId && deleteClient(deleteClientId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

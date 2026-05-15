"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Client } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Upload, Users } from "lucide-react";
import Link from "next/link";
import { AddClientDialog } from "./add-client-dialog";
import { CsvImportDialog } from "./csv-import-dialog";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showCsvDialog, setShowCsvDialog] = useState(false);
  const supabase = createClient();

  const fetchClients = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("clients")
      .select("*")
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
    setClients(data || []);
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
                  <TableHead>Type</TableHead>
                  <TableHead>MTD Threshold</TableHead>
                  <TableHead>Status</TableHead>
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
                      <Badge
                        className={
                          (statusColors[client.status] || "") + " text-xs"
                        }
                      >
                        {client.status}
                      </Badge>
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
    </div>
  );
}

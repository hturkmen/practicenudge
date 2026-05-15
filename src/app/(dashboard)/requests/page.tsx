"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
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
import { Plus, Search, FileText, ExternalLink, Copy } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function RequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const supabase = createClient();

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("document_requests")
      .select("*, clients(id, name, email)")
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data } = await query;

    let filtered = data || [];
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (r: any) =>
          r.title.toLowerCase().includes(s) ||
          r.clients?.name?.toLowerCase().includes(s)
      );
    }

    setRequests(filtered);
    setLoading(false);
  }, [supabase, statusFilter, search]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const statusColors: Record<string, string> = {
    pending: "bg-gray-100 text-gray-700",
    in_progress: "bg-yellow-100 text-yellow-700",
    completed: "bg-green-100 text-green-700",
    overdue: "bg-red-100 text-red-700",
  };

  const copyMagicLink = (token: string) => {
    const url = `${window.location.origin}/upload/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Upload link copied to clipboard");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Document Requests
          </h1>
          <p className="text-muted-foreground">
            Track and manage document collection from clients
          </p>
        </div>
        <Link href="/requests/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or client name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="font-medium mb-1">No requests found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first document request to start collecting documents
              </p>
              <Link href="/requests/new">
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  New Request
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reminders</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <Link
                        href={`/requests/${req.id}`}
                        className="font-medium hover:underline"
                      >
                        {req.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {req.clients?.name || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {req.deadline
                        ? new Date(req.deadline).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "No deadline"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          (statusColors[req.status] || "") + " text-xs"
                        }
                      >
                        {req.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {req.reminder_count}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => copyMagicLink(req.magic_token)}
                          title="Copy upload link"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Link
                          href={`/upload/${req.magic_token}`}
                          target="_blank"
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Open upload page"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

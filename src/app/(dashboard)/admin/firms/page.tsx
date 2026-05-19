"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AdminGuard } from "@/components/admin/admin-guard";
import { SearchInput } from "@/components/admin/search-input";
import { Pagination } from "@/components/admin/pagination";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Building2, Loader2, MoreHorizontal, PauseCircle, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FirmListItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  plan: "free" | "starter" | "pro";
  member_count: number;
  client_count: number;
  is_suspended?: boolean;
  created_at: string;
}

interface PaginationData {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

const PAGE_SIZE = 25;

const planColors: Record<string, string> = {
  free: "bg-gray-100 text-gray-700",
  starter: "bg-blue-100 text-blue-700",
  pro: "bg-purple-100 text-purple-700",
};

export default function FirmsListPage() {
  const [firms, setFirms] = useState<FirmListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    page_size: PAGE_SIZE,
    total: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchFirms = useCallback(
    async (page: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", page.toString());
        params.set("page_size", PAGE_SIZE.toString());

        if (search) params.set("search", search);
        if (planFilter) params.set("plan", planFilter);
        if (dateFrom) params.set("date_from", dateFrom);
        if (dateTo) params.set("date_to", dateTo);

        const response = await fetch(`/api/admin/firms?${params.toString()}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch firms");
        }

        const data = await response.json();
        setFirms(data.data);
        setPagination(data.pagination);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to fetch firms";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [search, planFilter, dateFrom, dateTo]
  );

  useEffect(() => {
    fetchFirms(1);
  }, [fetchFirms]);

  const handlePageChange = (newPage: number) => {
    fetchFirms(newPage);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const handlePlanFilterChange = (value: string) => {
    setPlanFilter(value === "all" ? "" : value);
  };

  const handleFirmAction = async (firmId: string, action: "suspend_firm" | "reactivate_firm") => {
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
      fetchFirms(pagination.page);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Action failed";
      toast.error(message);
    }
  };

  return (
    <AdminGuard>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Firms</h1>
            <p className="text-muted-foreground">
              Manage all registered accounting firms
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">
                  Search
                </Label>
                <SearchInput
                  value={search}
                  onChange={handleSearchChange}
                  placeholder="Search by name or email..."
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Plan</Label>
                <Select
                  value={planFilter || "all"}
                  onValueChange={handlePlanFilterChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All plans" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All plans</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">
                  Created from
                </Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">
                  Created to
                </Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Firms Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Firms</CardTitle>
            <CardDescription>
              {pagination.total} firm{pagination.total !== 1 ? "s" : ""} found
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : firms.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No firms found matching your criteria.</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Clients</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {firms.map((firm) => (
                      <TableRow key={firm.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <Link
                            href={`/admin/firms/${firm.id}`}
                            className="hover:underline text-primary"
                          >
                            {firm.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {firm.email}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              (planColors[firm.plan] || "") + " text-xs"
                            }
                          >
                            {firm.plan}
                          </Badge>
                        </TableCell>
                        <TableCell>{firm.member_count}</TableCell>
                        <TableCell>{firm.client_count}</TableCell>
                        <TableCell>
                          <Badge className={firm.is_suspended ? "bg-red-100 text-red-700 text-xs" : "bg-green-100 text-green-700 text-xs"}>
                            {firm.is_suspended ? "suspended" : "active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(firm.created_at).toLocaleDateString("en-GB")}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {!firm.is_suspended && (
                                <DropdownMenuItem onClick={() => handleFirmAction(firm.id, "suspend_firm")}>
                                  <PauseCircle className="mr-2 h-4 w-4 text-orange-600" />
                                  Suspend
                                </DropdownMenuItem>
                              )}
                              {firm.is_suspended && (
                                <DropdownMenuItem onClick={() => handleFirmAction(firm.id, "reactivate_firm")}>
                                  <PlayCircle className="mr-2 h-4 w-4 text-green-600" />
                                  Reactivate
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination
                  page={pagination.page}
                  pageSize={pagination.page_size}
                  total={pagination.total}
                  totalPages={pagination.total_pages}
                  onPageChange={handlePageChange}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}

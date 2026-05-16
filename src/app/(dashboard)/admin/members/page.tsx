"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminGuard } from "@/components/admin/admin-guard";
import { SearchInput } from "@/components/admin/search-input";
import { Pagination } from "@/components/admin/pagination";
import { Badge } from "@/components/ui/badge";
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
import { Loader2, Users, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import type { MemberListItem } from "@/lib/types/admin";

type SortDirection = "asc" | "desc";

interface Filters {
  search: string;
  firm_id: string;
  role: string;
  plan: string;
  status: string;
}

interface PaginationState {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

interface FirmOption {
  id: string;
  name: string;
}

export default function MembersListPage() {
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    firm_id: "",
    role: "",
    plan: "",
    status: "",
  });
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<SortDirection>("desc");
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  });
  const [firms, setFirms] = useState<FirmOption[]>([]);

  // Fetch firms for the filter dropdown
  useEffect(() => {
    async function fetchFirms() {
      try {
        const res = await fetch("/api/admin/firms?page_size=100");
        if (res.ok) {
          const data = await res.json();
          setFirms(
            (data.data || []).map((f: { id: string; name: string }) => ({
              id: f.id,
              name: f.name,
            }))
          );
        }
      } catch {
        // Silently fail - firms filter will just be empty
      }
    }
    fetchFirms();
  }, []);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(pagination.page));
      params.set("page_size", "20");
      params.set("sort_by", sortBy);
      params.set("sort_order", sortOrder);

      if (filters.search) params.set("search", filters.search);
      if (filters.firm_id) params.set("firm_id", filters.firm_id);
      if (filters.role) params.set("role", filters.role);
      if (filters.plan) params.set("plan", filters.plan);
      if (filters.status) params.set("status", filters.status);

      const res = await fetch(`/api/admin/members?${params.toString()}`);

      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.message || "Failed to fetch members");
        return;
      }

      const data = await res.json();
      setMembers(data.data || []);
      setPagination(data.pagination);
    } catch {
      toast.error("Failed to fetch members");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, sortBy, sortOrder, filters]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleSearchChange = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-3 w-3 ml-1 inline opacity-50" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1 inline" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1 inline" />
    );
  };

  const planColors: Record<string, string> = {
    free: "bg-gray-100 text-gray-700",
    starter: "bg-blue-100 text-blue-700",
    pro: "bg-purple-100 text-purple-700",
  };

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    suspended: "bg-red-100 text-red-700",
  };

  const hasActiveFilters =
    filters.search || filters.firm_id || filters.role || filters.plan || filters.status;

  return (
    <AdminGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Members</h1>
            <p className="text-muted-foreground">
              Manage all registered members across the platform
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="w-full max-w-sm">
                <SearchInput
                  value={filters.search}
                  onChange={handleSearchChange}
                  placeholder="Search by name, email, or firm..."
                />
              </div>
              <div className="flex flex-wrap gap-3">
                {/* Firm Filter */}
                <Select
                  value={filters.firm_id}
                  onValueChange={(v) =>
                    handleFilterChange("firm_id", v === "all" ? "" : v)
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Firms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Firms</SelectItem>
                    {firms.map((firm) => (
                      <SelectItem key={firm.id} value={firm.id}>
                        {firm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Role Filter */}
                <Select
                  value={filters.role}
                  onValueChange={(v) =>
                    handleFilterChange("role", v === "all" ? "" : v)
                  }
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>

                {/* Plan Filter */}
                <Select
                  value={filters.plan}
                  onValueChange={(v) =>
                    handleFilterChange("plan", v === "all" ? "" : v)
                  }
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="All Plans" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Plans</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                  </SelectContent>
                </Select>

                {/* Status Filter */}
                <Select
                  value={filters.status}
                  onValueChange={(v) =>
                    handleFilterChange("status", v === "all" ? "" : v)
                  }
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Members Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Members</CardTitle>
                <CardDescription>
                  {pagination.total} member{pagination.total !== 1 ? "s" : ""} found
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : members.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No members found</h3>
                <p className="text-muted-foreground mt-1 max-w-md">
                  No members match the current search and filter criteria.
                </p>
                {hasActiveFilters && (
                  <div className="mt-3 flex flex-wrap gap-2 justify-center">
                    {filters.search && (
                      <Badge variant="outline">Search: &quot;{filters.search}&quot;</Badge>
                    )}
                    {filters.firm_id && (
                      <Badge variant="outline">
                        Firm: {firms.find((f) => f.id === filters.firm_id)?.name || filters.firm_id}
                      </Badge>
                    )}
                    {filters.role && (
                      <Badge variant="outline">Role: {filters.role}</Badge>
                    )}
                    {filters.plan && (
                      <Badge variant="outline">Plan: {filters.plan}</Badge>
                    )}
                    {filters.status && (
                      <Badge variant="outline">Status: {filters.status}</Badge>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort("name")}
                      >
                        Name {getSortIcon("name")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort("email")}
                      >
                        Email {getSortIcon("email")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort("firm_name")}
                      >
                        Firm {getSortIcon("firm_name")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort("role")}
                      >
                        Role {getSortIcon("role")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort("plan")}
                      >
                        Plan {getSortIcon("plan")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort("status")}
                      >
                        Status {getSortIcon("status")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort("created_at")}
                      >
                        Registered {getSortIcon("created_at")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <Link
                            href={`/admin/members/${member.id}`}
                            className="hover:underline"
                          >
                            {member.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <Link href={`/admin/members/${member.id}`}>
                            {member.email}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.firm_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">
                            {member.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${planColors[member.plan] || ""} text-xs`}>
                            {member.plan}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusColors[member.status] || ""} text-xs`}>
                            {member.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(member.created_at).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
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

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  Users,
  Building2,
  FileText,
  Activity,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminPage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [firms, setFirms] = useState<any[]>([]);
  const [firmUsers, setFirmUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalFirms: 0,
    totalUsers: 0,
    totalClients: 0,
    totalRequests: 0,
    totalCompleted: 0,
  });

  useEffect(() => {
    async function checkAdminAndFetch() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Check if super admin
      const { data: adminRecord } = await supabase
        .from("super_admins")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!adminRecord) {
        router.push("/dashboard");
        return;
      }

      setIsAdmin(true);

      // Fetch all data
      const [firmsRes, firmUsersRes, clientsRes, requestsRes, completedRes] =
        await Promise.all([
          supabase.from("firms").select("*").order("created_at", { ascending: false }),
          supabase.from("firm_users").select("*, firms(name, email, plan)"),
          supabase.from("clients").select("id", { count: "exact", head: true }),
          supabase.from("document_requests").select("id", { count: "exact", head: true }),
          supabase
            .from("document_requests")
            .select("id", { count: "exact", head: true })
            .eq("status", "completed"),
        ]);

      setFirms(firmsRes.data || []);
      setFirmUsers(firmUsersRes.data || []);
      setStats({
        totalFirms: firmsRes.data?.length || 0,
        totalUsers: firmUsersRes.data?.length || 0,
        totalClients: clientsRes.count || 0,
        totalRequests: requestsRes.count || 0,
        totalCompleted: completedRes.count || 0,
      });

      setLoading(false);
    }

    checkAdminAndFetch();
  }, []);

  const handlePlanChange = async (firmId: string, newPlan: string) => {
    const { error } = await supabase
      .from("firms")
      .update({ plan: newPlan })
      .eq("id", firmId);

    if (error) {
      toast.error("Failed to update plan");
    } else {
      toast.success("Plan updated");
      setFirms(
        firms.map((f) => (f.id === firmId ? { ...f, plan: newPlan } : f))
      );
    }
  };

  const planColors: Record<string, string> = {
    free: "bg-gray-100 text-gray-700",
    starter: "bg-blue-100 text-blue-700",
    pro: "bg-purple-100 text-purple-700",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Super Admin</h1>
          <p className="text-muted-foreground">
            Platform-wide management and statistics
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Firms</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFirms}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClients}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRequests}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.totalCompleted}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="firms">
        <TabsList>
          <TabsTrigger value="firms">Firms ({firms.length})</TabsTrigger>
          <TabsTrigger value="users">Users ({firmUsers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="firms" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Firms</CardTitle>
              <CardDescription>
                Manage all registered accounting firms
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Firm Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {firms.map((firm) => (
                    <TableRow key={firm.id}>
                      <TableCell className="font-medium">{firm.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {firm.email}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {firm.phone || "—"}
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
                      <TableCell className="text-muted-foreground">
                        {new Date(firm.created_at).toLocaleDateString("en-GB")}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={firm.plan}
                          onValueChange={(v) => handlePlanChange(firm.id, v)}
                        >
                          <SelectTrigger className="w-[120px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">Free</SelectItem>
                            <SelectItem value="starter">Starter</SelectItem>
                            <SelectItem value="pro">Pro</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>
                All registered users across all firms
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Firm</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Firm Email</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {firmUsers.map((fu) => (
                    <TableRow key={fu.id}>
                      <TableCell className="font-mono text-xs">
                        {fu.user_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="font-medium">
                        {fu.firms?.name || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {fu.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {fu.firms?.email || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            (planColors[fu.firms?.plan] || "") + " text-xs"
                          }
                        >
                          {fu.firms?.plan || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(fu.created_at).toLocaleDateString("en-GB")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Loader2, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

interface TeamManagementProps {
  firmId: string | undefined;
}

export function TeamManagement({ firmId }: TeamManagementProps) {
  const supabase = createClient();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchMembers = async () => {
    if (!firmId) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);

    const { data } = await supabase
      .from("firm_users")
      .select("*")
      .eq("firm_id", firmId)
      .order("created_at");

    setMembers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, [firmId]);

  const handleInvite = async () => {
    if (!firmId || !inviteEmail.trim()) return;
    setInviting(true);

    // Check if user exists in auth.users (we can't query auth.users from client)
    // Instead, we'll create a placeholder entry and the user will be linked when they sign up
    // For now, show a message that the user needs to register first

    // Check if already a member
    const existing = members.find(
      (m: any) => m.user_id === inviteEmail // This won't work directly
    );

    // For MVP: invite by creating a firm_users entry when the user registers
    // For now, show instructions
    toast.info(
      `To add a team member: Ask them to register at ${window.location.origin}/register, then share their user ID with you. We'll add proper email invitations soon.`
    );
    setInviting(false);
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    const { error } = await supabase
      .from("firm_users")
      .update({ role: newRole })
      .eq("id", memberId);

    if (error) {
      toast.error("Failed to update role");
    } else {
      toast.success("Role updated");
      fetchMembers();
    }
  };

  const handleRemove = async (memberId: string, userId: string) => {
    if (userId === currentUserId) {
      toast.error("You cannot remove yourself");
      return;
    }

    const { error } = await supabase
      .from("firm_users")
      .delete()
      .eq("id", memberId);

    if (error) {
      toast.error("Failed to remove member");
    } else {
      toast.success("Member removed");
      fetchMembers();
    }
  };

  const roleColors: Record<string, string> = {
    owner: "bg-purple-100 text-purple-700",
    admin: "bg-blue-100 text-blue-700",
    member: "bg-gray-100 text-gray-700",
  };

  if (!firmId) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members
            </CardTitle>
            <CardDescription>
              Manage who has access to your firm account
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Members */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No team members found
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-mono text-sm">
                    {member.user_id.slice(0, 12)}...
                    {member.user_id === currentUserId && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        You
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {member.user_id === currentUserId ? (
                      <Badge className={(roleColors[member.role] || "") + " text-xs"}>
                        {member.role}
                      </Badge>
                    ) : (
                      <Select
                        value={member.role}
                        onValueChange={(v) => handleRoleChange(member.id, v)}
                      >
                        <SelectTrigger className="w-[110px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(member.created_at).toLocaleDateString("en-GB")}
                  </TableCell>
                  <TableCell>
                    {member.user_id !== currentUserId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemove(member.id, member.user_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Invite */}
        <div className="border-t pt-4">
          <Label className="text-sm font-medium">Add team member</Label>
          <p className="text-xs text-muted-foreground mb-3">
            Ask your team member to register first, then add them here
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Team member's email..."
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1"
            />
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleInvite} disabled={inviting}>
              {inviting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

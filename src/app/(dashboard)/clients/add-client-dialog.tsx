"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddClientDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddClientDialogProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    client_type: "sole_trader",
    mtd_threshold: "",
    tax_reference: "",
    notes: "",
  });
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Get firm_id from current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: firmUser } = await supabase
      .from("firm_users")
      .select("firm_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!firmUser) {
      toast.error("Could not find your firm. Please try logging in again.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("clients").insert({
      firm_id: firmUser.firm_id,
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      client_type: form.client_type,
      mtd_threshold: form.mtd_threshold || null,
      tax_reference: form.tax_reference || null,
      notes: form.notes || null,
    });

    if (error) {
      toast.error("Failed to add client: " + error.message);
      setLoading(false);
      return;
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      firm_id: firmUser.firm_id,
      action: "client_created",
      details: { client_name: form.name },
    });

    toast.success(`${form.name} has been added`);
    setForm({
      name: "",
      email: "",
      phone: "",
      client_type: "sole_trader",
      mtd_threshold: "",
      tax_reference: "",
      notes: "",
    });
    setLoading(false);
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add new client</DialogTitle>
          <DialogDescription>
            Add a client to your firm. You can send them document requests after.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Client name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="John Smith"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+44 7700 900000"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="client_type">Client type</Label>
                <Select
                  value={form.client_type}
                  onValueChange={(v) => setForm({ ...form, client_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sole_trader">Sole Trader</SelectItem>
                    <SelectItem value="landlord">Landlord</SelectItem>
                    <SelectItem value="limited_company">
                      Limited Company
                    </SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mtd_threshold">MTD threshold</Label>
                <Select
                  value={form.mtd_threshold}
                  onValueChange={(v) => setForm({ ...form, mtd_threshold: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50k">£50k+</SelectItem>
                    <SelectItem value="30k">£30k+</SelectItem>
                    <SelectItem value="20k">£20k+</SelectItem>
                    <SelectItem value="below">Below threshold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tax_reference">UTR number (optional)</Label>
              <Input
                id="tax_reference"
                value={form.tax_reference}
                onChange={(e) =>
                  setForm({ ...form, tax_reference: e.target.value })
                }
                placeholder="1234567890"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Any additional notes about this client..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add client
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

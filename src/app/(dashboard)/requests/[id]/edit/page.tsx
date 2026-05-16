"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Client } from "@/lib/types/database";
import { EditableItem, ExistingItem, reconcileItems } from "@/lib/utils/item-reconciliation";
import {
  validateTitle,
  validateItems,
  validateClientSelected,
} from "@/lib/utils/request-validation";
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
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Loader2,
  Save,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function EditRequestPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<any>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [items, setItems] = useState<EditableItem[]>([]);
  const [existingItems, setExistingItems] = useState<ExistingItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const [reqRes, itemsRes, clientsRes] = await Promise.all([
        supabase
          .from("document_requests")
          .select("*, clients(id, name, email)")
          .eq("id", requestId)
          .single(),
        supabase
          .from("request_items")
          .select("*")
          .eq("request_id", requestId)
          .order("sort_order"),
        supabase
          .from("clients")
          .select("*")
          .eq("status", "active")
          .order("name"),
      ]);

      if (reqRes.data) {
        setRequest(reqRes.data);
        setTitle(reqRes.data.title);
        setDeadline(reqRes.data.deadline || "");
        setSelectedClientId(reqRes.data.client_id);
      }

      const fetchedItems: EditableItem[] = (itemsRes.data || []).map(
        (item: any) => ({
          id: item.id,
          label: item.label,
          description: item.description || "",
          required: item.required,
          status: item.status,
        })
      );
      setItems(fetchedItems);

      const fetchedExistingItems: ExistingItem[] = (itemsRes.data || []).map(
        (item: any) => ({
          id: item.id,
          label: item.label,
          description: item.description || null,
          required: item.required,
          sort_order: item.sort_order,
          status: item.status,
        })
      );
      setExistingItems(fetchedExistingItems);

      setClients(clientsRes.data || []);
      setLoading(false);
    }

    fetchData();
  }, [requestId]);

  const addItem = () => {
    setItems([
      ...items,
      { label: "", description: "", required: true, isNew: true },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (
    index: number,
    field: keyof EditableItem,
    value: string | boolean
  ) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateClientSelected(selectedClientId)) {
      toast.error("Please select a client");
      return;
    }
    if (!validateTitle(title)) {
      toast.error("Please enter a title");
      return;
    }
    if (!validateItems(items)) {
      toast.error("Add at least one checklist item");
      return;
    }

    setSubmitting(true);

    // Update the document request
    const { error: updateError } = await supabase
      .from("document_requests")
      .update({
        title: title.trim(),
        deadline: deadline || null,
        client_id: selectedClientId,
      })
      .eq("id", requestId);

    if (updateError) {
      toast.error("Failed to update request: " + updateError.message);
      setSubmitting(false);
      return;
    }

    // Reconcile items
    const { toUpdate, toInsert, toDelete } = reconcileItems(
      existingItems,
      items
    );

    // Perform item updates
    for (const item of toUpdate) {
      const { error } = await supabase
        .from("request_items")
        .update({
          label: item.label,
          description: item.description,
          required: item.required,
          sort_order: item.sort_order,
        })
        .eq("id", item.id);

      if (error) {
        toast.error("Failed to update item: " + error.message);
        setSubmitting(false);
        return;
      }
    }

    // Insert new items
    if (toInsert.length > 0) {
      const insertPayload = toInsert.map((item) => ({
        request_id: requestId,
        label: item.label,
        description: item.description,
        required: item.required,
        sort_order: item.sort_order,
      }));

      const { error } = await supabase
        .from("request_items")
        .insert(insertPayload);

      if (error) {
        toast.error("Failed to add new items: " + error.message);
        setSubmitting(false);
        return;
      }
    }

    // Delete removed items
    if (toDelete.length > 0) {
      const deleteIds = toDelete.map((item) => item.id);
      const { error } = await supabase
        .from("request_items")
        .delete()
        .in("id", deleteIds);

      if (error) {
        toast.error("Failed to remove items: " + error.message);
        setSubmitting(false);
        return;
      }
    }

    // Log activity
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: firmUser } = await supabase
        .from("firm_users")
        .select("firm_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (firmUser) {
        await supabase.from("activity_logs").insert({
          firm_id: firmUser.firm_id,
          client_id: selectedClientId,
          request_id: requestId,
          action: "request_updated",
          details: { title: title.trim() },
        });
      }
    }

    toast.success("Request updated successfully");
    router.push(`/requests/${requestId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-20">
        <p>Request not found</p>
        <Link href="/requests">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to requests
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href={`/requests/${requestId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Edit Document Request
          </h1>
          <p className="text-muted-foreground">
            Modify the request details and checklist items
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Client *</Label>
              <Select
                value={selectedClientId}
                onValueChange={setSelectedClientId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                      {client.email ? ` (${client.email})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 2025/26 Q1 MTD Documents"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Deadline</Label>
                <Input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Checklist Items</CardTitle>
                <CardDescription>
                  Documents your client needs to provide
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item, index) => (
              <div
                key={item.id || `new-${index}`}
                className="flex items-start gap-2 p-3 border rounded-lg"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground mt-2.5 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={item.label}
                      onChange={(e) =>
                        updateItem(index, "label", e.target.value)
                      }
                      placeholder="Document name (e.g. P60 2024/25)"
                    />
                    {(item.status === "uploaded" ||
                      item.status === "approved") && (
                      <Badge variant="secondary" className="shrink-0">
                        Has submissions
                      </Badge>
                    )}
                  </div>
                  <Input
                    value={item.description || ""}
                    onChange={(e) =>
                      updateItem(index, "description", e.target.value)
                    }
                    placeholder="Help text for client (optional)"
                    className="text-sm"
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={item.required}
                      onChange={(e) =>
                        updateItem(index, "required", e.target.checked)
                      }
                      className="rounded"
                    />
                    Required
                  </label>
                </div>
                {items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href={`/requests/${requestId}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}

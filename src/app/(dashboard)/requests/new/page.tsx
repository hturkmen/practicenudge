"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Client, Template, TemplateItem } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
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
  Send,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function NewRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClient = searchParams.get("client");
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedClientId, setSelectedClientId] = useState(
    preselectedClient || ""
  );
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [items, setItems] = useState<TemplateItem[]>([
    { label: "", description: "", required: true },
  ]);

  useEffect(() => {
    async function fetchData() {
      const [clientsRes, templatesRes] = await Promise.all([
        supabase
          .from("clients")
          .select("*")
          .eq("status", "active")
          .order("name"),
        supabase.from("templates").select("*").order("name"),
      ]);
      setClients(clientsRes.data || []);
      setTemplates(templatesRes.data || []);
    }
    fetchData();
  }, [supabase]);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId === "blank") {
      setItems([{ label: "", description: "", required: true }]);
      return;
    }
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setItems(template.items);
      if (!title) setTitle(template.name);
    }
  };

  const addItem = () => {
    setItems([...items, { label: "", description: "", required: true }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (
    index: number,
    field: keyof TemplateItem,
    value: string | boolean
  ) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClientId) {
      toast.error("Please select a client");
      return;
    }
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    const validItems = items.filter((item) => item.label.trim());
    if (validItems.length === 0) {
      toast.error("Add at least one checklist item");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: firmUser } = await supabase
      .from("firm_users")
      .select("firm_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!firmUser) return;

    // Create document request
    const { data: request, error: reqError } = await supabase
      .from("document_requests")
      .insert({
        firm_id: firmUser.firm_id,
        client_id: selectedClientId,
        title: title.trim(),
        template_id: selectedTemplateId !== "blank" ? selectedTemplateId : null,
        deadline: deadline || null,
        status: "pending",
      })
      .select()
      .single();

    if (reqError || !request) {
      toast.error("Failed to create request: " + reqError?.message);
      setLoading(false);
      return;
    }

    // Create request items
    const requestItems = validItems.map((item, index) => ({
      request_id: request.id,
      label: item.label.trim(),
      description: item.description || null,
      required: item.required,
      sort_order: index,
    }));

    const { error: itemsError } = await supabase
      .from("request_items")
      .insert(requestItems);

    if (itemsError) {
      toast.error("Failed to create checklist items: " + itemsError.message);
      setLoading(false);
      return;
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      firm_id: firmUser.firm_id,
      client_id: selectedClientId,
      request_id: request.id,
      action: "request_created",
      details: { title: title.trim() },
    });

    toast.success("Document request created");
    router.push(`/requests/${request.id}`);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/requests">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            New Document Request
          </h1>
          <p className="text-muted-foreground">
            Create a document collection request for a client
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

            <div className="grid gap-2">
              <Label>Start from template</Label>
              <Select
                value={selectedTemplateId}
                onValueChange={handleTemplateSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template or start blank..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blank">Start blank</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({template.items.length} items)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-1 h-3 w-3" />
                Add item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-3 border rounded-lg"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground mt-2.5 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Input
                    value={item.label}
                    onChange={(e) => updateItem(index, "label", e.target.value)}
                    placeholder="Document name (e.g. P60 2024/25)"
                  />
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
          <Link href="/requests">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Create Request
          </Button>
        </div>
      </form>
    </div>
  );
}

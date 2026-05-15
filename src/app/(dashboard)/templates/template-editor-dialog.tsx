"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Template, TemplateItem } from "@/lib/types/database";
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
import { Plus, Trash2, GripVertical, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface TemplateEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: Template | null;
  onSuccess: () => void;
}

export function TemplateEditorDialog({
  open,
  onOpenChange,
  template,
  onSuccess,
}: TemplateEditorDialogProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [items, setItems] = useState<TemplateItem[]>([]);
  const supabase = createClient();

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || "");
      setCategory(template.category || "");
      setItems(template.items);
    } else {
      setName("");
      setDescription("");
      setCategory("");
      setItems([{ label: "", description: "", required: true }]);
    }
  }, [template, open]);

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

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Template name is required");
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

    const payload = {
      firm_id: firmUser.firm_id,
      name: name.trim(),
      description: description.trim() || null,
      category: category || null,
      items: validItems,
      is_system: false,
    };

    let error;
    if (template) {
      ({ error } = await supabase
        .from("templates")
        .update(payload)
        .eq("id", template.id));
    } else {
      ({ error } = await supabase.from("templates").insert(payload));
    }

    if (error) {
      toast.error("Failed to save template: " + error.message);
    } else {
      toast.success(template ? "Template updated" : "Template created");
      onOpenChange(false);
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? "Edit Template" : "New Template"}
          </DialogTitle>
          <DialogDescription>
            Create a reusable document checklist template
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label>Template name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Annual Accounts Checklist"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self_assessment">
                    Self Assessment
                  </SelectItem>
                  <SelectItem value="mtd_itsa">MTD ITSA</SelectItem>
                  <SelectItem value="corporation_tax">
                    Corporation Tax
                  </SelectItem>
                  <SelectItem value="vat">VAT</SelectItem>
                  <SelectItem value="payroll">Payroll</SelectItem>
                  <SelectItem value="onboarding">Onboarding</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description..."
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Checklist Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-1 h-3 w-3" />
                Add item
              </Button>
            </div>

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
                    placeholder="Item label (e.g. P60 2024/25)"
                  />
                  <Input
                    value={item.description || ""}
                    onChange={(e) =>
                      updateItem(index, "description", e.target.value)
                    }
                    placeholder="Help text (optional)"
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
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {template ? "Save changes" : "Create template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

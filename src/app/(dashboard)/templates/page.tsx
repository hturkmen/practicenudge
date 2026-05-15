"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Template } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  FolderOpen,
  Copy,
  Pencil,
  Trash2,
  FileText,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { TemplateEditorDialog } from "./template-editor-dialog";

export default function TemplatesPage() {
  const [systemTemplates, setSystemTemplates] = useState<Template[]>([]);
  const [firmTemplates, setFirmTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const supabase = createClient();

  const fetchTemplates = async () => {
    setLoading(true);
    const [systemRes, firmRes] = await Promise.all([
      supabase
        .from("templates")
        .select("*")
        .eq("is_system", true)
        .order("name"),
      supabase
        .from("templates")
        .select("*")
        .eq("is_system", false)
        .order("created_at", { ascending: false }),
    ]);

    setSystemTemplates(systemRes.data || []);
    setFirmTemplates(firmRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDuplicate = async (template: Template) => {
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

    const { error } = await supabase.from("templates").insert({
      firm_id: firmUser.firm_id,
      name: template.name + " (Copy)",
      description: template.description,
      category: template.category,
      items: template.items,
      is_system: false,
    });

    if (error) {
      toast.error("Failed to duplicate template");
    } else {
      toast.success("Template duplicated");
      fetchTemplates();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("templates").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete template");
    } else {
      toast.success("Template deleted");
      fetchTemplates();
    }
  };

  const categoryLabels: Record<string, string> = {
    self_assessment: "Self Assessment",
    mtd_itsa: "MTD ITSA",
    corporation_tax: "Corporation Tax",
    vat: "VAT",
    payroll: "Payroll",
    onboarding: "Onboarding",
  };

  const categoryColors: Record<string, string> = {
    self_assessment: "bg-blue-100 text-blue-700",
    mtd_itsa: "bg-purple-100 text-purple-700",
    corporation_tax: "bg-orange-100 text-orange-700",
    vat: "bg-green-100 text-green-700",
    payroll: "bg-yellow-100 text-yellow-700",
    onboarding: "bg-pink-100 text-pink-700",
  };

  const renderTemplateCard = (template: Template, isSystem: boolean) => (
    <Card key={template.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {template.name}
              {isSystem && (
                <Lock className="h-3 w-3 text-muted-foreground" />
              )}
            </CardTitle>
            {template.description && (
              <CardDescription className="mt-1">
                {template.description}
              </CardDescription>
            )}
          </div>
          {template.category && (
            <Badge
              className={
                (categoryColors[template.category] || "bg-gray-100 text-gray-700") +
                " text-xs"
              }
            >
              {categoryLabels[template.category] || template.category}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-4">
          <p className="text-xs text-muted-foreground font-medium">
            {template.items.length} items
          </p>
          <div className="flex flex-wrap gap-1">
            {template.items.slice(0, 4).map((item, i) => (
              <Badge key={i} variant="outline" className="text-xs font-normal">
                {item.label}
              </Badge>
            ))}
            {template.items.length > 4 && (
              <Badge variant="outline" className="text-xs font-normal">
                +{template.items.length - 4} more
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDuplicate(template)}
          >
            <Copy className="mr-1 h-3 w-3" />
            {isSystem ? "Copy to my templates" : "Duplicate"}
          </Button>
          {!isSystem && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingTemplate(template);
                  setShowEditor(true);
                }}
              >
                <Pencil className="mr-1 h-3 w-3" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => handleDelete(template.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground">
            Pre-built and custom document checklists
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingTemplate(null);
            setShowEditor(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      <Tabs defaultValue="system">
        <TabsList>
          <TabsTrigger value="system">
            System Templates ({systemTemplates.length})
          </TabsTrigger>
          <TabsTrigger value="firm">
            My Templates ({firmTemplates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="mt-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : systemTemplates.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">
                System templates will appear here after database setup
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {systemTemplates.map((t) => renderTemplateCard(t, true))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="firm" className="mt-4">
          {firmTemplates.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">
                No custom templates yet. Create one or copy a system template.
              </p>
              <Button
                onClick={() => {
                  setEditingTemplate(null);
                  setShowEditor(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Template
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {firmTemplates.map((t) => renderTemplateCard(t, false))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <TemplateEditorDialog
        open={showEditor}
        onOpenChange={setShowEditor}
        template={editingTemplate}
        onSuccess={fetchTemplates}
      />
    </div>
  );
}

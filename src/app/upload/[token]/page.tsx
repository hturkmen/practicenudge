"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
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
  CheckCircle2,
  Upload,
  FileText,
  Loader2,
  AlertCircle,
  HelpCircle,
  X,
} from "lucide-react";

export default function UploadPage() {
  const params = useParams();
  const token = params.token as string;
  const supabase = createClient();

  const [request, setRequest] = useState<any>(null);
  const [firm, setFirm] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    async function fetchData() {
      // Fetch request by magic token
      const { data: req, error: reqError } = await supabase
        .from("document_requests")
        .select("*, clients(name, email), firms(name, logo_url)")
        .eq("magic_token", token)
        .single();

      if (reqError || !req) {
        setError("This link is invalid or has expired.");
        setLoading(false);
        return;
      }

      setRequest(req);
      setFirm(req.firms);

      // Fetch items
      const { data: itemsData } = await supabase
        .from("request_items")
        .select("*")
        .eq("request_id", req.id)
        .order("sort_order");

      setItems(itemsData || []);
      setLoading(false);
    }
    fetchData();
  }, [token, supabase]);

  const ALLOWED_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "text/plain",
  ];

  const sanitizeFileName = (name: string) => {
    return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
  };

  const handleFileUpload = async (
    itemId: string,
    file: File
  ) => {
    if (!request) return;
    if (file.size > 50 * 1024 * 1024) {
      alert("File size must be less than 50MB");
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert("File type not allowed. Please upload PDF, images, Word, Excel, or CSV files.");
      return;
    }

    setUploading(itemId);

    const safeName = sanitizeFileName(file.name);
    const filePath = `uploads/${request.firm_id}/${request.id}/${itemId}/${safeName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      alert("Upload failed. Please try again.");
      setUploading(null);
      return;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("documents").getPublicUrl(filePath);

    // Update request item
    await supabase
      .from("request_items")
      .update({
        status: "uploaded",
        file_url: publicUrl,
        file_name: file.name,
        uploaded_at: new Date().toISOString(),
      })
      .eq("id", itemId);

    // Check if request should move to in_progress
    if (request.status === "pending") {
      await supabase
        .from("document_requests")
        .update({ status: "in_progress" })
        .eq("id", request.id);
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      firm_id: request.firm_id,
      client_id: request.client_id,
      request_id: request.id,
      action: "document_uploaded",
      details: { item_label: items.find((i) => i.id === itemId)?.label, file_name: file.name },
    });

    // Refresh items
    const { data: updatedItems } = await supabase
      .from("request_items")
      .select("*")
      .eq("request_id", request.id)
      .order("sort_order");

    setItems(updatedItems || []);

    // Check if all required items are uploaded
    const allRequired = (updatedItems || []).filter((i: any) => i.required);
    const allUploaded = allRequired.every(
      (i: any) => i.status === "uploaded" || i.status === "approved"
    );

    if (allUploaded && allRequired.length > 0) {
      await supabase
        .from("document_requests")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", request.id);

      await supabase.from("activity_logs").insert({
        firm_id: request.firm_id,
        client_id: request.client_id,
        request_id: request.id,
        action: "request_completed",
        details: {},
      });
    }

    setUploading(null);
  };

  const handleDrop = (itemId: string, e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(itemId, file);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Link not found</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedItems = items.filter(
    (i) => i.status === "uploaded" || i.status === "approved"
  ).length;
  const progress = items.length > 0 ? (completedItems / items.length) * 100 : 0;
  const allDone = completedItems === items.length && items.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          {firm?.logo_url ? (
            <img
              src={firm.logo_url}
              alt={firm.name}
              className="h-8 w-8 rounded"
            />
          ) : (
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center text-white text-sm font-bold">
              {firm?.name?.[0] || "?"}
            </div>
          )}
          <span className="font-semibold">{firm?.name}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold">{request.title}</h1>
          <p className="text-muted-foreground mt-1">
            Hi {request.clients?.name}, please upload the documents listed below.
          </p>
          {request.deadline && (
            <p className="text-sm mt-2">
              <span className="font-medium">Deadline:</span>{" "}
              {new Date(request.deadline).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </div>

        {/* Progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                {completedItems} of {items.length} documents uploaded
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`rounded-full h-3 transition-all ${
                  allDone ? "bg-green-500" : "bg-primary"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            {allDone && (
              <div className="flex items-center gap-2 mt-3 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">
                  All documents uploaded! Thank you.
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Checklist Items */}
        <div className="space-y-3">
          {items.map((item) => (
            <Card
              key={item.id}
              className={
                item.status === "uploaded" || item.status === "approved"
                  ? "border-green-200 bg-green-50/50"
                  : item.status === "rejected"
                  ? "border-red-200 bg-red-50/50"
                  : ""
              }
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {item.status === "uploaded" || item.status === "approved" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : item.status === "rejected" ? (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{item.label}</p>
                      {item.required && (
                        <Badge variant="outline" className="text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {item.description}
                      </p>
                    )}

                    {item.status === "rejected" && (
                      <p className="text-sm text-red-600 mt-1">
                        This document was rejected. Please upload a new version.
                      </p>
                    )}

                    {item.file_name &&
                      (item.status === "uploaded" ||
                        item.status === "approved") && (
                        <div className="flex items-center gap-2 mt-2">
                          <FileText className="h-3.5 w-3.5 text-green-600" />
                          <span className="text-sm text-green-700">
                            {item.file_name}
                          </span>
                        </div>
                      )}

                    {(item.status === "pending" ||
                      item.status === "rejected") && (
                      <div
                        className="mt-3 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => fileInputRefs.current[item.id]?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(item.id, e)}
                      >
                        {uploading === item.id ? (
                          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                        ) : (
                          <>
                            <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                            <p className="text-sm text-muted-foreground">
                              Click or drag file here to upload
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Max 50MB
                            </p>
                          </>
                        )}
                        <input
                          ref={(el) => {
                            fileInputRefs.current[item.id] = el;
                          }}
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(item.id, file);
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Help */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <HelpCircle className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Need help?</p>
                <p className="text-sm text-muted-foreground">
                  If you have any questions or issues, please contact{" "}
                  <span className="font-medium">{firm?.name}</span> directly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

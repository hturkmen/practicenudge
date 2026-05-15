"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type CsvRow = Record<string, string>;

const FIELD_OPTIONS = [
  { value: "skip", label: "Skip this column" },
  { value: "name", label: "Client Name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "client_type", label: "Client Type" },
  { value: "mtd_threshold", label: "MTD Threshold" },
  { value: "tax_reference", label: "UTR Number" },
  { value: "notes", label: "Notes" },
];

export function CsvImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: CsvImportDialogProps) {
  const [step, setStep] = useState<"upload" | "map" | "importing" | "done">(
    "upload"
  );
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState({
    success: 0,
    failed: 0,
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const parseCsv = (text: string): { headers: string[]; rows: CsvRow[] } => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) return { headers: [], rows: [] };

    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const rows = lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const row: CsvRow = {};
      headers.forEach((h, i) => {
        row[h] = values[i] || "";
      });
      return row;
    });

    return { headers, rows };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { headers, rows } = parseCsv(text);

      if (headers.length === 0) {
        toast.error("Could not parse CSV file. Please check the format.");
        return;
      }

      setCsvHeaders(headers);
      setCsvData(rows);

      // Auto-map columns by name similarity
      const autoMapping: Record<string, string> = {};
      headers.forEach((header) => {
        const lower = header.toLowerCase();
        if (lower.includes("name") && !lower.includes("firm"))
          autoMapping[header] = "name";
        else if (lower.includes("email")) autoMapping[header] = "email";
        else if (lower.includes("phone") || lower.includes("mobile") || lower.includes("tel"))
          autoMapping[header] = "phone";
        else if (lower.includes("type")) autoMapping[header] = "client_type";
        else if (lower.includes("threshold") || lower.includes("mtd"))
          autoMapping[header] = "mtd_threshold";
        else if (lower.includes("utr") || lower.includes("tax_ref") || lower.includes("reference"))
          autoMapping[header] = "tax_reference";
        else if (lower.includes("note")) autoMapping[header] = "notes";
        else autoMapping[header] = "skip";
      });

      setMapping(autoMapping);
      setStep("map");
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setStep("importing");

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

    let success = 0;
    let failed = 0;

    // Process in batches of 50
    const batchSize = 50;
    for (let i = 0; i < csvData.length; i += batchSize) {
      const batch = csvData.slice(i, i + batchSize);
      const records = batch
        .map((row) => {
          const record: Record<string, string | null> = {
            firm_id: firmUser.firm_id,
          };

          Object.entries(mapping).forEach(([csvCol, dbField]) => {
            if (dbField !== "skip" && row[csvCol]) {
              record[dbField] = row[csvCol];
            }
          });

          // Name is required
          if (!record.name) return null;

          // Normalize client_type
          if (record.client_type) {
            const type = record.client_type.toLowerCase().replace(/\s+/g, "_");
            if (
              ["sole_trader", "landlord", "limited_company", "partnership"].includes(type)
            ) {
              record.client_type = type;
            } else {
              record.client_type = "sole_trader";
            }
          }

          return record;
        })
        .filter(Boolean);

      if (records.length > 0) {
        const { error, data } = await supabase
          .from("clients")
          .insert(records as any[]);

        if (error) {
          failed += records.length;
        } else {
          success += records.length;
        }
      }
    }

    setImportResult({ success, failed });
    setStep("done");

    if (success > 0) {
      // Log activity
      await supabase.from("activity_logs").insert({
        firm_id: firmUser.firm_id,
        action: "client_created",
        details: { method: "csv_import", count: success },
      });
    }
  };

  const handleClose = () => {
    setStep("upload");
    setCsvHeaders([]);
    setCsvData([]);
    setMapping({});
    setImportResult({ success: 0, failed: 0 });
    onOpenChange(false);
    if (importResult.success > 0) {
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Import clients from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with your client data. We&apos;ll help you map the
            columns.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="py-8">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium mb-1">Click to upload CSV file</p>
              <p className="text-sm text-muted-foreground">
                CSV with headers: name, email, phone, type, etc.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </div>
        )}

        {step === "map" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Found {csvData.length} rows. Map your CSV columns to client
              fields:
            </p>
            <div className="max-h-[300px] overflow-y-auto space-y-3">
              {csvHeaders.map((header) => (
                <div
                  key={header}
                  className="flex items-center gap-4"
                >
                  <div className="w-1/3">
                    <Label className="text-sm font-medium">{header}</Label>
                    <p className="text-xs text-muted-foreground truncate">
                      e.g. &quot;{csvData[0]?.[header] || "—"}&quot;
                    </p>
                  </div>
                  <span className="text-muted-foreground">→</span>
                  <Select
                    value={mapping[header] || "skip"}
                    onValueChange={(v) =>
                      setMapping({ ...mapping, [header]: v })
                    }
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Preview */}
            <div className="border rounded-lg overflow-hidden">
              <p className="text-xs font-medium px-3 py-2 bg-muted">
                Preview (first 3 rows)
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.entries(mapping)
                      .filter(([, v]) => v !== "skip")
                      .map(([, field]) => (
                        <TableHead key={field} className="text-xs">
                          {FIELD_OPTIONS.find((o) => o.value === field)?.label}
                        </TableHead>
                      ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvData.slice(0, 3).map((row, i) => (
                    <TableRow key={i}>
                      {Object.entries(mapping)
                        .filter(([, v]) => v !== "skip")
                        .map(([csvCol, field]) => (
                          <TableCell key={field} className="text-xs">
                            {row[csvCol] || "—"}
                          </TableCell>
                        ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={!Object.values(mapping).includes("name")}
              >
                Import {csvData.length} clients
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "importing" && (
          <div className="py-12 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-3" />
            <p className="font-medium">Importing clients...</p>
            <p className="text-sm text-muted-foreground">
              This may take a moment
            </p>
          </div>
        )}

        {step === "done" && (
          <div className="py-8 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <div>
              <p className="font-medium text-lg">Import complete</p>
              <p className="text-sm text-muted-foreground mt-1">
                {importResult.success} clients imported successfully
                {importResult.failed > 0 && (
                  <span className="text-destructive">
                    , {importResult.failed} failed
                  </span>
                )}
              </p>
            </div>
            <DialogFooter className="justify-center">
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

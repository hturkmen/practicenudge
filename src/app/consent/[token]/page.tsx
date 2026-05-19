"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
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
  Loader2,
  Mail,
  MessageSquare,
  ShieldCheck,
  XCircle,
  AlertCircle,
} from "lucide-react";
import type { ConsentChannel, ConsentStatus } from "@/lib/consent/types";

interface ChannelState {
  channel: ConsentChannel;
  status: ConsentStatus;
  hasContactInfo: boolean;
  description: string;
  updating: boolean;
  error: string | null;
}

interface ConsentPageState {
  loading: boolean;
  notFound: boolean;
  error: string | null;
  clientName: string;
  firmName: string;
  channels: ChannelState[];
}

const CHANNEL_ICONS: Record<ConsentChannel, React.ReactNode> = {
  email: <Mail className="h-5 w-5" />,
  sms: <MessageSquare className="h-5 w-5" />,
};

const CHANNEL_LABELS: Record<ConsentChannel, string> = {
  email: "E-posta",
  sms: "SMS",
};

function getStatusBadgeVariant(
  status: ConsentStatus
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "accepted":
      return "default";
    case "rejected":
      return "destructive";
    case "pending":
    default:
      return "secondary";
  }
}

function getStatusLabel(status: ConsentStatus): string {
  switch (status) {
    case "accepted":
      return "Onaylandı";
    case "rejected":
      return "Reddedildi";
    case "pending":
    default:
      return "Onay Bekleniyor";
  }
}

export default function ConsentPage() {
  const params = useParams();
  const token = params.token as string;

  const [state, setState] = useState<ConsentPageState>({
    loading: true,
    notFound: false,
    error: null,
    clientName: "",
    firmName: "",
    channels: [],
  });

  useEffect(() => {
    async function fetchConsent() {
      try {
        const res = await fetch(`/api/consent/${token}`);
        if (!res.ok) {
          if (res.status === 404) {
            setState((prev) => ({ ...prev, notFound: true, loading: false }));
          } else {
            setState((prev) => ({
              ...prev,
              error: "Veriler yüklenirken bir hata oluştu.",
              loading: false,
            }));
          }
          return;
        }

        const data = await res.json();
        setState({
          loading: false,
          notFound: false,
          error: null,
          clientName: data.clientName,
          firmName: data.firmName,
          channels: data.channels.map(
            (ch: {
              channel: ConsentChannel;
              status: ConsentStatus;
              hasContactInfo: boolean;
              description: string;
            }) => ({
              ...ch,
              updating: false,
              error: null,
            })
          ),
        });
      } catch {
        setState((prev) => ({
          ...prev,
          error: "Veriler yüklenirken bir hata oluştu.",
          loading: false,
        }));
      }
    }
    fetchConsent();
  }, [token]);

  const handleChannelAction = useCallback(
    async (channel: ConsentChannel, action: "accept" | "reject") => {
      // Set updating state for this channel
      setState((prev) => ({
        ...prev,
        channels: prev.channels.map((ch) =>
          ch.channel === channel ? { ...ch, updating: true, error: null } : ch
        ),
      }));

      try {
        const res = await fetch(`/api/consent/${token}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channel, action }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          const errorMessage =
            errorData?.error || "İşlem başarısız oldu. Lütfen tekrar deneyin.";
          setState((prev) => ({
            ...prev,
            channels: prev.channels.map((ch) =>
              ch.channel === channel
                ? { ...ch, updating: false, error: errorMessage }
                : ch
            ),
          }));
          return;
        }

        const updatedConsent = await res.json();
        const newStatus: ConsentStatus = updatedConsent.status;

        setState((prev) => ({
          ...prev,
          channels: prev.channels.map((ch) =>
            ch.channel === channel
              ? { ...ch, status: newStatus, updating: false, error: null }
              : ch
          ),
        }));
      } catch {
        setState((prev) => ({
          ...prev,
          channels: prev.channels.map((ch) =>
            ch.channel === channel
              ? {
                  ...ch,
                  updating: false,
                  error: "İşlem başarısız oldu. Lütfen tekrar deneyin.",
                }
              : ch
          ),
        }));
      }
    },
    [token]
  );

  // Loading state
  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not found / invalid token state
  if (state.notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold mb-2">Geçersiz Bağlantı</h2>
            <p className="text-sm text-muted-foreground">
              Bu onay bağlantısı geçersiz veya süresi dolmuş.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // General error state
  if (state.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold mb-2">Hata</h2>
            <p className="text-sm text-muted-foreground">{state.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main consent page
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <ShieldCheck className="h-10 w-10 text-primary mx-auto mb-2" />
          <CardTitle className="text-xl">İletişim Onayı</CardTitle>
          <CardDescription>
            Merhaba <strong>{state.clientName}</strong>,{" "}
            <strong>{state.firmName}</strong> size aşağıdaki kanallardan
            iletişim göndermek için onayınızı istemektedir.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.channels.map((ch) => (
            <div
              key={ch.channel}
              className="border rounded-lg p-4 space-y-3"
            >
              {/* Channel header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {CHANNEL_ICONS[ch.channel]}
                  <span className="font-medium">
                    {CHANNEL_LABELS[ch.channel]}
                  </span>
                </div>
                <Badge variant={getStatusBadgeVariant(ch.status)}>
                  {getStatusLabel(ch.status)}
                </Badge>
              </div>

              {/* Channel description */}
              <p className="text-sm text-muted-foreground">{ch.description}</p>

              {/* Error message for this channel */}
              {ch.error && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{ch.error}</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleChannelAction(ch.channel, "accept")}
                  disabled={
                    ch.updating || !ch.hasContactInfo
                  }
                  className="flex-1"
                >
                  {ch.updating ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                  )}
                  Kabul Et
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleChannelAction(ch.channel, "reject")}
                  disabled={ch.updating}
                  className="flex-1"
                >
                  {ch.updating ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <XCircle className="mr-1 h-3 w-3" />
                  )}
                  Reddet
                </Button>
              </div>

              {/* Disabled channel info */}
              {!ch.hasContactInfo && (
                <p className="text-xs text-muted-foreground italic">
                  Bu kanal için iletişim bilginiz sistemde kayıtlı değil.
                </p>
              )}
            </div>
          ))}

          <p className="text-xs text-muted-foreground text-center pt-2">
            Onayınızı istediğiniz zaman bu sayfa üzerinden geri çekebilirsiniz.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

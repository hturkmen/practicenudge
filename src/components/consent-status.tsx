"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Mail, MessageSquare, AlertCircle } from "lucide-react";
import { getConsentStatusLabel, formatConsentDate } from "@/lib/consent/utils";
import type { ClientConsent, ConsentChannel, ConsentStatus } from "@/lib/consent/types";

interface ConsentStatusProps {
  clientId: string;
}

/** Default channels to display when no consent records exist */
const DEFAULT_CHANNELS: ConsentChannel[] = ["email", "sms"];

/** Maps consent status to badge styling */
function getStatusBadgeClass(status: ConsentStatus): string {
  switch (status) {
    case "accepted":
      return "bg-green-100 text-green-700 border-green-200";
    case "rejected":
      return "bg-red-100 text-red-700 border-red-200";
    case "pending":
    default:
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
  }
}

/** Channel icon component */
function ChannelIcon({ channel }: { channel: ConsentChannel }) {
  if (channel === "email") {
    return <Mail className="h-4 w-4 text-blue-500" />;
  }
  return <MessageSquare className="h-4 w-4 text-green-500" />;
}

/** Channel display name */
function getChannelDisplayName(channel: ConsentChannel): string {
  return channel === "email" ? "E-posta" : "SMS";
}

export function ConsentStatusSection({ clientId }: ConsentStatusProps) {
  const [consents, setConsents] = useState<ClientConsent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchConsents() {
      try {
        const response = await fetch(`/api/clients/${clientId}/consents`);
        if (!response.ok) {
          throw new Error("Failed to load consent data");
        }
        const data: ClientConsent[] = await response.json();
        setConsents(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Onay durumu verileri yüklenemedi"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchConsents();
  }, [clientId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">GDPR Onay Durumu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">GDPR Onay Durumu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If no consent records exist, show all channels as "Onay Bekleniyor"
  const hasRecords = consents.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">GDPR Onay Durumu</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {hasRecords
            ? consents.map((consent) => (
                <div
                  key={consent.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <ChannelIcon channel={consent.channel} />
                    <span className="text-sm font-medium">
                      {getChannelDisplayName(consent.channel)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {formatConsentDate(consent.updated_at)}
                    </span>
                    <Badge
                      variant="outline"
                      className={getStatusBadgeClass(consent.status)}
                    >
                      {getConsentStatusLabel(consent.status)}
                    </Badge>
                  </div>
                </div>
              ))
            : DEFAULT_CHANNELS.map((channel) => (
                <div
                  key={channel}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <ChannelIcon channel={channel} />
                    <span className="text-sm font-medium">
                      {getChannelDisplayName(channel)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={getStatusBadgeClass("pending")}
                    >
                      {getConsentStatusLabel("pending")}
                    </Badge>
                  </div>
                </div>
              ))}
        </div>
      </CardContent>
    </Card>
  );
}

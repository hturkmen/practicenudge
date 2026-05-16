"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle, Bell, BellOff } from "lucide-react";
import type { NotificationType, NotificationFrequency } from "@/lib/notifications/types";
import { SubscriptionCard } from "./subscription-card";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

interface SubscriptionWithType {
  id: string;
  client_id: string;
  firm_id: string;
  notification_type_id: string;
  frequency: NotificationFrequency;
  is_active: boolean;
  last_delivered_at: string | null;
  created_at: string;
  updated_at: string;
  notification_types: NotificationType;
}

export default function SubscriptionsPage() {
  const params = useParams();
  const token = params.token as string;
  const supabase = createClient();

  const [client, setClient] = useState<any>(null);
  const [firm, setFirm] = useState<any>(null);
  const [notificationTypes, setNotificationTypes] = useState<NotificationType[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      // Validate token by fetching the document request
      const { data: req, error: reqError } = await supabase
        .from("document_requests")
        .select("*, clients(id, name, email, firm_id), firms(id, name, logo_url)")
        .eq("magic_token", token)
        .single();

      if (reqError || !req) {
        setError("This link is invalid or has expired.");
        setLoading(false);
        return;
      }

      setClient(req.clients);
      setFirm(req.firms);

      // Fetch available notification types (only subscribable ones)
      const { data: types } = await supabase
        .from("notification_types")
        .select("*")
        .eq("is_subscribable", true)
        .order("category")
        .order("display_name");

      setNotificationTypes(types || []);

      // Fetch current subscriptions for this client
      const { data: subs } = await supabase
        .from("client_notification_subscriptions")
        .select("*, notification_types(id, name, display_name, description, category, is_subscribable)")
        .eq("client_id", req.clients.id)
        .eq("firm_id", req.clients.firm_id);

      setSubscriptions(subs || []);
      setLoading(false);
    }

    fetchData();
  }, [token, supabase]);

  const handleToggleSubscription = async (
    notificationType: NotificationType,
    currentSubscription: SubscriptionWithType | undefined
  ) => {
    if (!client) return;
    setActionLoading(notificationType.id);

    try {
      if (currentSubscription && currentSubscription.is_active) {
        // Unsubscribe: set is_active to false
        const { data, error } = await supabase
          .from("client_notification_subscriptions")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("id", currentSubscription.id)
          .select("*, notification_types(id, name, display_name, description, category, is_subscribable)")
          .single();

        if (error) {
          toast.error("Failed to unsubscribe. Please try again.");
          return;
        }

        if (data) {
          setSubscriptions((prev) =>
            prev.map((s) => (s.id === currentSubscription.id ? data : s))
          );
          toast.success(`Unsubscribed from ${notificationType.display_name}`);
        }
      } else if (currentSubscription && !currentSubscription.is_active) {
        // Re-activate existing subscription
        const { data, error } = await supabase
          .from("client_notification_subscriptions")
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .eq("id", currentSubscription.id)
          .select("*, notification_types(id, name, display_name, description, category, is_subscribable)")
          .single();

        if (error) {
          toast.error("Failed to subscribe. Please try again.");
          return;
        }

        if (data) {
          setSubscriptions((prev) =>
            prev.map((s) => (s.id === currentSubscription.id ? data : s))
          );
          toast.success(`Subscribed to ${notificationType.display_name}`);
        }
      } else {
        // Create new subscription with default frequency "weekly"
        const { data, error } = await supabase
          .from("client_notification_subscriptions")
          .insert({
            client_id: client.id,
            firm_id: client.firm_id,
            notification_type_id: notificationType.id,
            frequency: "weekly",
            is_active: true,
          })
          .select("*, notification_types(id, name, display_name, description, category, is_subscribable)")
          .single();

        if (error) {
          toast.error("Failed to subscribe. Please try again.");
          return;
        }

        if (data) {
          setSubscriptions((prev) => [...prev, data]);
          toast.success(`Subscribed to ${notificationType.display_name}`);
        }
      }
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleFrequencyChange = async (
    subscription: SubscriptionWithType,
    newFrequency: NotificationFrequency
  ) => {
    setActionLoading(subscription.notification_type_id);

    try {
      const { data, error } = await supabase
        .from("client_notification_subscriptions")
        .update({ frequency: newFrequency, updated_at: new Date().toISOString() })
        .eq("id", subscription.id)
        .select("*, notification_types(id, name, display_name, description, category, is_subscribable)")
        .single();

      if (error) {
        toast.error("Failed to update frequency. Please try again.");
        return;
      }

      if (data) {
        setSubscriptions((prev) =>
          prev.map((s) => (s.id === subscription.id ? data : s))
        );
        toast.success(`Frequency updated to ${newFrequency}`);
      }
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  // Find subscription (active or inactive) for a type
  const findSubscription = (typeId: string) => {
    return subscriptions.find((s) => s.notification_type_id === typeId);
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
            <h2 className="text-xl font-bold mb-2">Invalid Link</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group notification types by category
  const typesByCategory = notificationTypes.reduce<Record<string, NotificationType[]>>(
    (acc, type) => {
      if (!acc[type.category]) {
        acc[type.category] = [];
      }
      acc[type.category].push(type);
      return acc;
    },
    {}
  );

  const activeCount = subscriptions.filter((s) => s.is_active).length;

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
          <span className="font-semibold flex-1">{firm?.name}</span>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold">Notification Preferences</h1>
          <p className="text-muted-foreground mt-1">
            Hi {client?.name}, manage which notifications you&apos;d like to receive and how often.
          </p>
        </div>

        {/* Summary */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">
                  {activeCount} active {activeCount === 1 ? "subscription" : "subscriptions"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Toggle notifications on or off and choose your preferred frequency.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Cards by Category */}
        {Object.entries(typesByCategory).map(([category, types]) => (
          <div key={category} className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {category}
            </h2>
            {types.map((type) => {
              const subscription = findSubscription(type.id);

              return (
                <SubscriptionCard
                  key={type.id}
                  notificationType={type}
                  subscription={subscription}
                  isLoading={actionLoading === type.id}
                  onToggle={handleToggleSubscription}
                  onFrequencyChange={handleFrequencyChange}
                />
              );
            })}
          </div>
        ))}

        {/* Empty state */}
        {notificationTypes.length === 0 && (
          <Card>
            <CardContent className="pt-8 pb-8 text-center">
              <BellOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">No notifications available</h2>
              <p className="text-muted-foreground">
                There are no notification types available for subscription at this time.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
      <Toaster />
    </div>
  );
}

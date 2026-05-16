import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  retryNotification,
  deleteNotificationLog,
  stopNotification,
  triggerNotification,
  editAndResend,
} from "@/lib/notifications/service";

type ActionType = "retry" | "delete" | "stop" | "trigger" | "edit";

interface ActionRequestBody {
  action: ActionType;
  notification_log_id?: string;
  updates?: {
    content?: string;
    recipient_address?: string;
    channel?: string;
    subject?: string;
  };
  trigger_params?: {
    client_id: string;
    notification_type_id: string;
    channel: "email" | "sms";
  };
}

const VALID_ACTIONS: ActionType[] = ["retry", "delete", "stop", "trigger", "edit"];

export async function POST(request: Request) {
  const supabase = createClient();

  // 1. Authenticate the user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Authentication required" },
      { status: 401 }
    );
  }

  // 2. Determine if user is a super_admin or firm user
  const { data: adminRecord } = await supabase
    .from("super_admins")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const isSuperAdmin = !!adminRecord;

  let firmId: string | null = null;

  if (!isSuperAdmin) {
    const { data: firmUser } = await supabase
      .from("firm_users")
      .select("firm_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!firmUser) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "No firm association found" },
        { status: 403 }
      );
    }

    firmId = firmUser.firm_id;
  }

  // Parse request body
  let body: ActionRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { action, notification_log_id, updates, trigger_params } = body;

  // Validate action
  if (!action || !VALID_ACTIONS.includes(action)) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: `Invalid action. Must be one of: ${VALID_ACTIONS.join(", ")}`,
      },
      { status: 400 }
    );
  }

  // Validate required fields per action
  if (["retry", "delete", "stop", "edit"].includes(action) && !notification_log_id) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: "notification_log_id is required for this action",
      },
      { status: 400 }
    );
  }

  if (action === "trigger" && !trigger_params) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: "trigger_params is required for trigger action",
      },
      { status: 400 }
    );
  }

  if (action === "trigger" && trigger_params) {
    if (!trigger_params.client_id || !trigger_params.notification_type_id || !trigger_params.channel) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "trigger_params must include client_id, notification_type_id, and channel",
        },
        { status: 400 }
      );
    }
  }

  // 3. For "stop" action: only super_admin can stop
  if (action === "stop" && !isSuperAdmin) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Only super admins can stop notifications" },
      { status: 403 }
    );
  }

  // 4. For actions that require a notification_log_id, fetch the log and verify authorization
  if (["retry", "delete", "stop", "edit"].includes(action) && notification_log_id) {
    const { data: notificationLog, error: logError } = await supabase
      .from("notification_logs")
      .select("id, firm_id, status")
      .eq("id", notification_log_id)
      .maybeSingle();

    if (logError) {
      return NextResponse.json(
        { error: "QUERY_ERROR", message: logError.message },
        { status: 500 }
      );
    }

    if (!notificationLog) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Notification log not found" },
        { status: 404 }
      );
    }

    // If firm user: verify notification_log.firm_id matches user's firm_id
    if (!isSuperAdmin && notificationLog.firm_id !== firmId) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "You do not have access to this notification" },
        { status: 403 }
      );
    }

    // Validate status-based action constraints
    if (action === "retry" && notificationLog.status === "delivered") {
      return NextResponse.json(
        {
          error: "ACTION_NOT_ALLOWED",
          message: "Cannot retry a delivered notification",
        },
        { status: 422 }
      );
    }

    if (action === "stop" && !["queued", "scheduled"].includes(notificationLog.status)) {
      return NextResponse.json(
        {
          error: "ACTION_NOT_ALLOWED",
          message: "Can only stop queued or scheduled notifications",
        },
        { status: 422 }
      );
    }
  }

  // 5. For "trigger" action: verify the target client belongs to the user's firm
  if (action === "trigger" && trigger_params) {
    if (!isSuperAdmin) {
      const { data: client } = await supabase
        .from("clients")
        .select("id, firm_id")
        .eq("id", trigger_params.client_id)
        .maybeSingle();

      if (!client) {
        return NextResponse.json(
          { error: "NOT_FOUND", message: "Client not found" },
          { status: 404 }
        );
      }

      if (client.firm_id !== firmId) {
        return NextResponse.json(
          { error: "FORBIDDEN", message: "Client does not belong to your firm" },
          { status: 403 }
        );
      }
    }
  }

  // 6. Execute the action
  try {
    switch (action) {
      case "retry": {
        const result = await retryNotification(notification_log_id!, user.id);
        return NextResponse.json({ data: result }, { status: 200 });
      }

      case "delete": {
        await deleteNotificationLog(notification_log_id!);
        return NextResponse.json(
          { message: "Notification log deleted successfully" },
          { status: 200 }
        );
      }

      case "stop": {
        await stopNotification(notification_log_id!);
        return NextResponse.json(
          { message: "Notification stopped successfully" },
          { status: 200 }
        );
      }

      case "trigger": {
        // Determine the firm_id for the trigger
        let triggerFirmId = firmId;
        if (isSuperAdmin && !triggerFirmId) {
          // Super admin: look up the client's firm_id
          const { data: client } = await supabase
            .from("clients")
            .select("firm_id")
            .eq("id", trigger_params!.client_id)
            .maybeSingle();

          if (!client) {
            return NextResponse.json(
              { error: "NOT_FOUND", message: "Client not found" },
              { status: 404 }
            );
          }
          triggerFirmId = client.firm_id;
        }

        const result = await triggerNotification(
          trigger_params!,
          triggerFirmId!,
          user.id
        );
        return NextResponse.json({ data: result }, { status: 200 });
      }

      case "edit": {
        const result = await editAndResend(
          notification_log_id!,
          (updates ?? {}) as import("@/lib/notifications/types").EditUpdates,
          user.id
        );
        return NextResponse.json({ data: result }, { status: 200 });
      }

      default:
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred";

    // Handle specific error cases from service layer
    if (message.includes("not found")) {
      return NextResponse.json(
        { error: "NOT_FOUND", message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "INTERNAL_ERROR", message },
      { status: 500 }
    );
  }
}

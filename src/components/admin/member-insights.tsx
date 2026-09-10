"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getMemberInsights } from "@/lib/admin/member-insights";
import type { MemberDetailResponse } from "@/lib/types/admin";

export function memberDate(value: string | null | undefined) {
  if (!value) return "Not recorded";
  return new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";
}

export function MemberInsights({ member, usage, signup_notification, firm_activity }: MemberDetailResponse) {
  const insights = getMemberInsights(member, usage);
  const facts = [
    ["Account created", memberDate(member.account_created_at)],
    ["Joined this firm", memberDate(member.created_at)],
    ["Last sign-in", memberDate(member.last_sign_in_at)],
    ["Last recorded member action", memberDate(member.last_activity_at)],
    ["Email verified", member.email_confirmed_at ? memberDate(member.email_confirmed_at) : "Not verified"],
    ["Sign-in methods", member.providers?.join(", ") || "Not recorded"],
  ];
  const notificationLabel = signup_notification?.status === "sent" ? "Accepted by email provider"
    : signup_notification?.status === "review_required" ? "Delivery needs review"
    : signup_notification?.status || "Predates notification tracking";
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Member overview</CardTitle>
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="outline">{insights.engagement}</Badge>
            <Badge variant={insights.signals.length ? "destructive" : "secondary"}>{insights.review}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {facts.map(([label, value]) => <div key={label} className="min-w-0">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 break-words">{value}</p>
          </div>)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Firm usage</CardTitle>
          <CardDescription>Shared totals for <Link className="underline" href={"/admin/firms/" + member.firm_id}>{member.firm_name}</Link>. These include work by other members and clients.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-5 grid-cols-2 lg:grid-cols-4">
            {[["Clients", usage.clients], ["Active clients", usage.active_clients], ["Document requests", usage.requests],
              ["Completed requests", usage.completed_requests], ["Overdue requests", usage.overdue_requests],
              ["Current uploaded files", usage.uploaded_files], ["Custom templates", usage.custom_templates],
              ["This member's actions · 30 days", usage.member_actions_30d]].map(([label, value]) =>
              <div key={label} className="rounded-lg border p-4"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-2 text-2xl font-semibold tabular-nums">{value}</dd></div>)}
          </dl>
          <p className="mt-4 text-sm text-muted-foreground">File counts reflect current checklist attachments. Storage bytes, bandwidth and provider costs are not recorded.</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Templates used</CardTitle><CardDescription>Templates linked to the firm’s document requests · top 50</CardDescription></CardHeader>
          <CardContent>
            {usage.templates.length ? <Table><TableHeader><TableRow><TableHead>Template</TableHead><TableHead>Source</TableHead><TableHead className="text-right">Requests</TableHead></TableRow></TableHeader>
              <TableBody>{usage.templates.map(t => <TableRow key={t.id}><TableCell>{t.name}</TableCell><TableCell>{t.is_system ? "PracticeNudge" : "Firm"}</TableCell><TableCell className="text-right">{t.requests}</TableCell></TableRow>)}</TableBody></Table>
              : <p className="text-sm text-muted-foreground">No template-linked requests recorded.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Communication usage</CardTitle><CardDescription>Recorded firm notifications by channel and outcome</CardDescription></CardHeader>
          <CardContent>
            {usage.notifications.length ? <Table><TableHeader><TableRow><TableHead>Channel</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Count</TableHead></TableRow></TableHeader>
              <TableBody>{usage.notifications.map(n => <TableRow key={n.channel + n.status}><TableCell className="uppercase">{n.channel}</TableCell><TableCell>{n.status}</TableCell><TableCell className="text-right">{n.total}</TableCell></TableRow>)}</TableBody></Table>
              : <p className="text-sm text-muted-foreground">No notification records.</p>}
            <p className="mt-4 text-sm text-muted-foreground">These are application logs, not billing or delivery confirmation. Failed entries can include consent blocks. Older reminder records may not be included.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Account review</CardTitle><CardDescription>Review signals help investigation; they do not prove an account is spam.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {insights.signals.length ? <ul className="list-disc space-y-2 pl-5 text-sm">{insights.signals.map(signal => <li key={signal}>{signal}</li>)}</ul>
            : <p className="text-sm">No strong signals were found in the available data. This does not confirm the member’s identity.</p>}
          <p className="text-sm text-muted-foreground">An empty or inactive account alone is not classified as spam. Accounts are never automatically suspended by these checks.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Registration email to admin</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="capitalize">{notificationLabel}</p>
          {signup_notification && <><p>Attempts: {signup_notification.attempts} · Accepted: {memberDate(signup_notification.sent_at)}</p>
            {signup_notification.last_error && <p role="status" className="break-words text-destructive">{signup_notification.last_error}</p>}
            {signup_notification.status === "pending" && <p className="text-muted-foreground">Awaiting delivery. Check webhook, scheduler and email configuration if this persists.</p>}</>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent firm events</CardTitle><CardDescription>Latest 20 legacy firm events. These have no reliable individual actor and may include automated or client actions.</CardDescription></CardHeader>
        <CardContent>
          {firm_activity.length ? <Table><TableHeader><TableRow><TableHead>Event</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
            <TableBody>{firm_activity.map(event => <TableRow key={event.id}><TableCell>{event.action.replaceAll("_", " ")}</TableCell><TableCell>{memberDate(event.created_at)}</TableCell></TableRow>)}</TableBody></Table>
            : <p className="text-sm text-muted-foreground">No firm events recorded.</p>}
        </CardContent>
      </Card>
    </>
  );
}

"use client";

import { ShieldAlert } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { resolveReportAction, toggleRoomLockAction } from "@/app/room/[roomId]/moderation-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";

type ReportRow = {
  id: string;
  reason: string;
  details: string | null;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  created_at: string;
  reported_by_name: string;
  reported_profile_name: string | null;
};

type AuditRow = {
  id: string;
  action: string;
  created_at: string;
  actor_name: string;
  target_name: string | null;
};

async function loadReports(roomId: string): Promise<ReportRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("reports")
    .select("*, reporter:profiles!reports_reported_by_fkey(display_name), target:profiles!reports_reported_profile_id_fkey(display_name)")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });

  return ((data ?? []) as never[]).map((row) => {
    const r = row as {
      id: string;
      reason: string;
      details: string | null;
      status: ReportRow["status"];
      created_at: string;
      reporter: { display_name: string } | null;
      target: { display_name: string } | null;
    };
    return {
      id: r.id,
      reason: r.reason,
      details: r.details,
      status: r.status,
      created_at: r.created_at,
      reported_by_name: r.reporter?.display_name ?? "Someone",
      reported_profile_name: r.target?.display_name ?? null
    };
  });
}

async function loadAuditLog(roomId: string): Promise<AuditRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("*, actor:profiles!audit_logs_actor_id_fkey(display_name), target:profiles!audit_logs_target_id_fkey(display_name)")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(50);

  return ((data ?? []) as never[]).map((row) => {
    const r = row as {
      id: string;
      action: string;
      created_at: string;
      actor: { display_name: string } | null;
      target: { display_name: string } | null;
    };
    return {
      id: r.id,
      action: r.action,
      created_at: r.created_at,
      actor_name: r.actor?.display_name ?? "Someone",
      target_name: r.target?.display_name ?? null
    };
  });
}

export function SafetyDialog({ roomId, isLocked }: { roomId: string; isLocked: boolean }) {
  const [open, setOpen] = useState(false);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [auditLog, setAuditLog] = useState<AuditRow[]>([]);
  const [locked, setLocked] = useState(isLocked);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    void loadReports(roomId).then(setReports);
    void loadAuditLog(roomId).then(setAuditLog);
  }, [open, roomId]);

  const openReports = reports.filter((r) => r.status === "open" || r.status === "reviewing");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="icon" title="Safety" />}>
        <ShieldAlert className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Safety</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <p className="text-sm font-medium">Lock room</p>
            <p className="text-xs text-muted-foreground">Stops new members from joining via invite link.</p>
          </div>
          <Button
            size="sm"
            variant={locked ? "default" : "outline"}
            disabled={pending}
            onClick={() =>
              startTransition(() =>
                toggleRoomLockAction(roomId, !locked).then((result) => {
                  if (result.error) toast.error(result.error);
                  else setLocked((l) => !l);
                })
              )
            }
          >
            {locked ? "Locked" : "Unlocked"}
          </Button>
        </div>

        <Tabs defaultValue="reports">
          <TabsList>
            <TabsTrigger value="reports">Reports {openReports.length > 0 ? `(${openReports.length})` : ""}</TabsTrigger>
            <TabsTrigger value="audit">Moderation log</TabsTrigger>
          </TabsList>

          <TabsContent value="reports">
            <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
              {reports.length === 0 ? <p className="text-sm text-muted-foreground">No reports.</p> : null}
              {reports.map((report) => (
                <div key={report.id} className="rounded-md border p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{report.reason}</span>
                    <Badge variant={report.status === "open" ? "destructive" : "secondary"} className="capitalize">
                      {report.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {report.reported_by_name} reported {report.reported_profile_name ?? "a message"}
                  </p>
                  {report.details ? <p className="mt-1 text-xs">{report.details}</p> : null}
                  {report.status === "open" || report.status === "reviewing" ? (
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          startTransition(() =>
                            resolveReportAction(report.id, roomId, "resolved").then(() =>
                              setReports((current) =>
                                current.map((r) => (r.id === report.id ? { ...r, status: "resolved" } : r))
                              )
                            )
                          )
                        }
                      >
                        Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          startTransition(() =>
                            resolveReportAction(report.id, roomId, "dismissed").then(() =>
                              setReports((current) =>
                                current.map((r) => (r.id === report.id ? { ...r, status: "dismissed" } : r))
                              )
                            )
                          )
                        }
                      >
                        Dismiss
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="audit">
            <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto text-sm">
              {auditLog.length === 0 ? <p className="text-muted-foreground">No moderation actions yet.</p> : null}
              {auditLog.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between border-b pb-1 text-xs">
                  <span>
                    <strong>{entry.actor_name}</strong> {entry.action.replace(/_/g, " ")}
                    {entry.target_name ? <> — {entry.target_name}</> : null}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(entry.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Users, Cake, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditBar, LeaveInfo } from "@/components/common/CreditBar";
import { EmptyState } from "@/components/common/EmptyState";
import { useClients } from "@/context/ClientsContext";
import { useSchedules } from "@/context/SchedulesContext";
import { useCredits } from "@/context/CreditsContext";
import { calcAge, fmtDate } from "@/lib/appUtils";

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1).padStart(2, "0"),
  label: format(new Date(2026, i, 1), "MMMM"),
}));

export default function ActiveClients() {
  const navigate = useNavigate();
  const { clients } = useClients();
  const { schedules } = useSchedules();
  const { getRecordForClient } = useCredits();

  const [birthdayMonth, setBirthdayMonth] = useState(format(new Date(), "MM"));

  const active = useMemo(
    () => clients.filter((c) => c.status === "admitted" && !c.dateOfDischarge),
    [clients]
  );

  const birthdayClients = useMemo(
    () =>
      active
        .filter((c) => c.dob && c.dob.split("-")[1] === birthdayMonth)
        .sort((a, b) => Number(a.dob.split("-")[2]) - Number(b.dob.split("-")[2])),
    [active, birthdayMonth]
  );

  const analytics = useMemo(
    () =>
      active.map((c) => {
        const own = schedules.filter((s) => s.clientId === c.id);
        return {
          client: c,
          completed: own.filter((s) => s.status === "completed").length,
          cancelled: own.filter((s) => s.status === "cancelled").length,
          rescheduled: own.filter((s) => s.status === "rescheduled").length,
          total: own.length,
        };
      }),
    [active, schedules]
  );

  const goTo = (id) => navigate(`/admin-schedule/clients/${id}`);

  return (
    <div className="space-y-5" data-testid="active-clients-page">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Active Clients</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">{active.length} admitted clients currently in therapy.</p>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all" data-testid="active-clients-tab-all">All</TabsTrigger>
          <TabsTrigger value="birthday" data-testid="active-clients-tab-birthday">Birthday</TabsTrigger>
          <TabsTrigger value="analytic" data-testid="active-clients-tab-analytic">Analytic</TabsTrigger>
        </TabsList>

        {/* All */}
        <TabsContent value="all">
          <Card className="rounded-xl border-[var(--color-border)] shadow-sm">
            <CardContent className="p-0">
              {active.length === 0 ? (
                <EmptyState icon={Users} title="No active clients" subtitle="Admit a client from the inquiry pipeline to see them here." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[var(--color-surface)]">
                      <TableHead>Client</TableHead>
                      <TableHead>Parent</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="w-56">Credit</TableHead>
                      <TableHead>Leave</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {active.map((c) => {
                      const record = getRecordForClient(c.id);
                      return (
                        <TableRow
                          key={c.id}
                          className="cursor-pointer hover:bg-[rgba(47,168,224,0.05)]"
                          onClick={() => goTo(c.id)}
                          data-testid={`active-client-row-${c.id}`}
                        >
                          <TableCell className="font-medium">{c.clientName}</TableCell>
                          <TableCell className="text-[var(--color-text-muted)]">{c.parentName}</TableCell>
                          <TableCell className="tabular-nums">{calcAge(c.dob) != null ? calcAge(c.dob) : "—"}</TableCell>
                          <TableCell className="text-[var(--color-text-muted)]">{fmtDate(c.dateOfJoin)}</TableCell>
                          <TableCell>
                            {record ? <CreditBar remaining={record.remainingCredit} total={record.totalCredit} compact /> : <span className="text-xs text-[var(--color-text-muted)]">No package</span>}
                          </TableCell>
                          <TableCell>
                            {record ? <LeaveInfo leaveUsed={record.leaveUsed} leaveQuota={record.leaveQuota} /> : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Birthday */}
        <TabsContent value="birthday">
          <Card className="rounded-xl border-[var(--color-border)] shadow-sm">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3 mb-3">
                <Cake className="w-4 h-4 text-[var(--color-primary-dark)]" />
                <Select value={birthdayMonth} onValueChange={setBirthdayMonth}>
                  <SelectTrigger className="w-44 h-9" data-testid="birthday-month-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {birthdayClients.length === 0 ? (
                <EmptyState icon={Cake} title="No birthdays in this month" subtitle="Try another month from the dropdown." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[var(--color-surface)]">
                      <TableHead>Client</TableHead>
                      <TableHead>Birthday</TableHead>
                      <TableHead>Turning</TableHead>
                      <TableHead>Parent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {birthdayClients.map((c) => (
                      <TableRow key={c.id} className="cursor-pointer hover:bg-[rgba(47,168,224,0.05)]" onClick={() => goTo(c.id)} data-testid={`birthday-client-row-${c.id}`}>
                        <TableCell className="font-medium">{c.clientName}</TableCell>
                        <TableCell>{fmtDate(c.dob)}</TableCell>
                        <TableCell className="tabular-nums">{(calcAge(c.dob) || 0) + 1}</TableCell>
                        <TableCell className="text-[var(--color-text-muted)]">{c.parentName}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytic */}
        <TabsContent value="analytic">
          <Card className="rounded-xl border-[var(--color-border)] shadow-sm">
            <CardContent className="p-0">
              {analytics.length === 0 ? (
                <EmptyState icon={BarChart3} title="No data yet" subtitle="Session analytics appear after clients are admitted." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[var(--color-surface)]">
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">Completed</TableHead>
                      <TableHead className="text-right">Cancelled</TableHead>
                      <TableHead className="text-right">Rescheduled</TableHead>
                      <TableHead className="text-right">Total Sessions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.map(({ client, completed, cancelled, rescheduled, total }) => (
                      <TableRow key={client.id} className="cursor-pointer hover:bg-[rgba(47,168,224,0.05)]" onClick={() => goTo(client.id)} data-testid={`analytic-client-row-${client.id}`}>
                        <TableCell className="font-medium">{client.clientName}</TableCell>
                        <TableCell className="text-right tabular-nums text-[var(--color-success)] font-medium">{completed}</TableCell>
                        <TableCell className="text-right tabular-nums text-[var(--color-danger)] font-medium">{cancelled}</TableCell>
                        <TableCell className="text-right tabular-nums text-[var(--color-warning)] font-medium">{rescheduled}</TableCell>
                        <TableCell className="text-right tabular-nums">{total}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

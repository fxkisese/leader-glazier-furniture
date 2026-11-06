import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, IdCard, Printer, Undo2, CheckCircle2 } from "lucide-react";
import { base44, businessApi } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Panel, EmptyState, ErrorState, ListSkeleton, Pill, FilterChips, formatDate, humanize } from "./adminShared";
import { Field, NativeSelect, Modal, MiniStat, money, cents, num, today, PAYMENT_METHODS, SuggestInput, uniqueValues } from "./businessShared";
import { EXPENSES_KEY } from "./AdminSalesTab";

const EMPLOYEES_KEY = ["employees"];
const ENTRIES_KEY = ["pay-entries"];
const PAYSLIPS_KEY = ["payslips"];
const attendanceKey = (month) => ["attendance", month];

const PAY_TYPES = { monthly: "Monthly salary", daily: "Daily rate", piece: "Piece rate" };
const ENTRY_TYPES = {
  piece: { label: "Piece work", tone: "blue", sign: 1 },
  bonus: { label: "Bonus", tone: "green", sign: 1 },
  advance: { label: "Advance", tone: "amber", sign: -1 },
  deduction: { label: "Deduction", tone: "red", sign: -1 },
};
// Clicking a day cycles through these
const ATTENDANCE = [
  { value: "", short: "", cls: "" },
  { value: "present", short: "P", cls: "bg-emerald-100 text-emerald-800" },
  { value: "half", short: "½", cls: "bg-emerald-50 text-emerald-700" },
  { value: "absent", short: "A", cls: "bg-red-100 text-red-700" },
  { value: "leave", short: "L", cls: "bg-sky-100 text-sky-700" },
];

const thisMonth = () => today().slice(0, 7);
const monthLabel = (m) => new Date(`${m}-01T00:00`).toLocaleDateString("en-KE", { month: "long", year: "numeric" });
const daysIn = (m) => new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0).getDate();

/** One employee's pay for a month, from their pay type, attendance and pay entries. */
export function computePay(emp, month, attendance, entries) {
  const days = attendance
    .filter((a) => a.employee_id === emp.id)
    .reduce((t, a) => t + (a.status === "present" ? 1 : a.status === "half" ? 0.5 : 0), 0);
  const base = emp.pay_type === "monthly" ? cents(emp.pay_rate) : emp.pay_type === "daily" ? cents(days * num(emp.pay_rate)) : 0;
  const sum = (type) => cents(entries.filter((e) => e.employee_id === emp.id && e.type === type && e.date.startsWith(month)).reduce((t, e) => t + num(e.amount), 0));
  const piece = sum("piece"), bonuses = sum("bonus"), advances = sum("advance"), deductions = sum("deduction");
  const gross = cents(base + piece + bonuses);
  return { days, base, piece, bonuses, advances, deductions, gross, net: cents(gross - advances - deductions) };
}

export default function AdminHrTab() {
  const [view, setView] = useState("staff");
  const [month, setMonth] = useState(thisMonth);
  const employees = useQuery({ queryKey: EMPLOYEES_KEY, queryFn: () => base44.entities.Employee.list() });
  const active = (employees.data || []).filter((e) => e.status !== "left").sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <PageHeader title="Staff & Payroll" description="Staff records, daily attendance, advances and piece work, and monthly pay." />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <FilterChips
          value={view}
          onChange={setView}
          options={[
            { value: "staff", label: "Staff", count: active.length },
            { value: "attendance", label: "Attendance" },
            { value: "entries", label: "Advances & piece work" },
            { value: "payroll", label: "Payroll" },
          ]}
        />
        {view !== "staff" && (
          <Input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="w-44 bg-white" />
        )}
      </div>

      {employees.error ? <Panel><ErrorState error={employees.error} onRetry={employees.refetch} /></Panel> : (
        <>
          {view === "staff" && <StaffView employees={employees} />}
          {view === "attendance" && <AttendanceView month={month} staff={active} />}
          {view === "entries" && <EntriesView month={month} staff={employees.data || []} />}
          {view === "payroll" && <PayrollView month={month} staff={employees.data || []} />}
        </>
      )}
    </div>
  );
}

// ── Staff ──

function StaffView({ employees }) {
  const [modal, setModal] = useState(null);
  const [showLeft, setShowLeft] = useState(false);
  const queryClient = useQueryClient();
  const rows = (employees.data || []).filter((e) => showLeft || e.status !== "left").sort((a, b) => a.name.localeCompare(b.name));
  const monthlyBill = cents((employees.data || []).filter((e) => e.status !== "left" && e.pay_type === "monthly").reduce((t, e) => t + num(e.pay_rate), 0));

  return (
    <>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <MiniStat label="Active staff" value={(employees.data || []).filter((e) => e.status !== "left").length} />
        <MiniStat label="Fixed salaries / month" value={money(monthlyBill)} sub="Monthly staff only" />
      </div>
      <Panel>
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/10">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={showLeft} onChange={(e) => setShowLeft(e.target.checked)} className="accent-obsidian" /> Show former staff
          </label>
          <Button size="sm" onClick={() => setModal("new")} className="bg-obsidian hover:bg-obsidian/90 text-white gap-2"><Plus className="w-4 h-4" /> Add staff</Button>
        </div>
        {employees.isLoading ? <ListSkeleton /> : rows.length === 0 ? (
          <EmptyState icon={IdCard} title="No staff yet" description="Add everyone who works for you — salaried staff, carpenters and casuals." />
        ) : (
          <ul className="divide-y divide-black/5">
            {rows.map((e) => (
              <li key={e.id}>
                <button onClick={() => setModal(e)} className="w-full flex flex-wrap items-center gap-3 px-4 py-3 text-left text-sm hover:bg-muted/30">
                  <span className="flex-1 min-w-[160px]">
                    <span className="font-medium text-obsidian block">{e.name}</span>
                    <span className="text-xs text-muted-foreground">{[e.position, e.phone].filter(Boolean).join(" · ")}</span>
                  </span>
                  {e.status === "left" && <Pill>Left</Pill>}
                  <span className="text-right">
                    <span className="block font-medium">
                      {e.pay_type === "piece" ? "Per piece" : `${money(e.pay_rate)} / ${e.pay_type === "daily" ? "day" : "month"}`}
                    </span>
                    {e.start_date && <span className="text-xs text-muted-foreground">Since {formatDate(e.start_date)}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {modal && (
        <EmployeeModal
          key={modal === "new" ? "new" : modal.id}
          employee={modal === "new" ? null : modal}
          positions={uniqueValues([...employees.map((e) => e.position), "Carpenter", "Upholsterer", "Painter", "Sales", "Driver"])}
          onClose={() => setModal(null)}
          onSaved={() => { queryClient.invalidateQueries({ queryKey: EMPLOYEES_KEY }); queryClient.invalidateQueries({ queryKey: ["employee-names"] }); setModal(null); }}
        />
      )}
    </>
  );
}

function EmployeeModal({ employee, positions, onClose, onSaved }) {
  const isEdit = !!employee;
  const [form, setForm] = useState({
    name: employee?.name || "", phone: employee?.phone || "", national_id: employee?.national_id || "",
    position: employee?.position || "", pay_type: employee?.pay_type || "monthly",
    pay_rate: employee?.pay_rate != null ? String(employee.pay_rate) : "", start_date: employee?.start_date || today(),
    status: employee?.status || "active", emergency_contact: employee?.emergency_contact || "", notes: employee?.notes || "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const save = useMutation({
    mutationFn: () => {
      const data = {
        ...Object.fromEntries(["name", "phone", "national_id", "position", "start_date", "emergency_contact", "notes"].map((k) => [k, form[k].trim() || undefined])),
        pay_type: form.pay_type, status: form.status,
        pay_rate: form.pay_type === "piece" || form.pay_rate === "" ? undefined : cents(form.pay_rate),
      };
      if (!isEdit) return base44.entities.Employee.create(data);
      return base44.entities.Employee.update(employee.id, data, Object.keys(data).filter((k) => data[k] === undefined));
    },
    onSuccess: () => { toast.success(isEdit ? "Staff record updated" : "Staff member added"); onSaved(); },
    onError: (e) => toast.error("Save failed: " + e.message),
  });
  const remove = useMutation({
    mutationFn: () => base44.entities.Employee.delete(employee.id),
    onSuccess: () => { toast.success("Staff record deleted"); onSaved(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Modal
      title={isEdit ? employee.name : "Add staff member"}
      onClose={onClose}
      footer={
        <>
          <div>{isEdit && <Button variant="outline" className="text-destructive border-destructive/40"
            onClick={() => { if (confirm("Delete this staff record permanently? To keep their history, set status to 'Left' instead.")) remove.mutate(); }}>Delete</Button>}</div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name.trim()} className="bg-obsidian hover:bg-obsidian/90 text-white px-8">{save.isPending ? "Saving..." : "Save"}</Button>
          </div>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="Full name *"><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Position"><SuggestInput values={positions} value={form.position} onChange={(e) => set("position", e.target.value)} placeholder="Carpenter, upholsterer, sales..." /></Field>
        <Field label="Phone"><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="National ID"><Input value={form.national_id} onChange={(e) => set("national_id", e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Paid by">
          <NativeSelect value={form.pay_type} onChange={(v) => set("pay_type", v)}>
            {Object.entries(PAY_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </NativeSelect>
        </Field>
        {form.pay_type !== "piece" ? (
          <Field label={form.pay_type === "daily" ? "Rate per day (KSh)" : "Monthly salary (KSh)"}>
            <Input type="number" step="0.01" value={form.pay_rate} onChange={(e) => set("pay_rate", e.target.value)} />
          </Field>
        ) : <p className="text-xs text-muted-foreground self-end pb-2">Record each finished piece under "Advances & piece work".</p>}
        <Field label="Start date"><Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Emergency contact"><Input value={form.emergency_contact} onChange={(e) => set("emergency_contact", e.target.value)} placeholder="Name & phone" /></Field>
        <Field label="Status">
          <NativeSelect value={form.status} onChange={(v) => set("status", v)}>
            <option value="active">Active</option>
            <option value="left">Left the business</option>
          </NativeSelect>
        </Field>
      </div>
      <Field label="Notes"><Input value={form.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
    </Modal>
  );
}

// ── Attendance ──

function AttendanceView({ month, staff }) {
  const queryClient = useQueryClient();
  const key = attendanceKey(month);
  const att = useQuery({ queryKey: key, queryFn: () => businessApi.attendance(month) });
  const n = daysIn(month);
  const days = Array.from({ length: n }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
  const lookup = useMemo(() => Object.fromEntries((att.data || []).map((a) => [`${a.employee_id}|${a.date}`, a.status])), [att.data]);

  const set = useMutation({
    mutationFn: ({ employee_id, date, status }) => businessApi.setAttendance(employee_id, date, status),
    onMutate: async ({ employee_id, date, status }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (rows = []) => [
        ...rows.filter((r) => !(r.employee_id === employee_id && r.date === date)),
        ...(status ? [{ employee_id, date, status, id: `${employee_id}${date}` }] : []),
      ]);
      return { prev };
    },
    onError: (e, _v, ctx) => { queryClient.setQueryData(key, ctx.prev); toast.error(e.message); },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const cycle = (empId, date) => {
    const cur = lookup[`${empId}|${date}`] || "";
    const next = ATTENDANCE[(ATTENDANCE.findIndex((a) => a.value === cur) + 1) % ATTENDANCE.length].value;
    set.mutate({ employee_id: empId, date, status: next });
  };

  const todayStr = today();
  const markTodayPresent = () => staff.forEach((e) => { if (!lookup[`${e.id}|${todayStr}`]) set.mutate({ employee_id: e.id, date: todayStr, status: "present" }); });

  if (att.error) return <Panel><ErrorState error={att.error} onRetry={att.refetch} /></Panel>;
  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-black/10 text-xs text-muted-foreground">
        <span>Click a day to cycle: {ATTENDANCE.slice(1).map((a) => <span key={a.value} className={`inline-block px-1.5 mx-0.5 rounded ${a.cls}`}>{a.short} {humanize(a.value)}</span>)}</span>
        {todayStr.startsWith(month) && <Button size="sm" variant="outline" onClick={markTodayPresent}>Mark everyone present today</Button>}
      </div>
      {staff.length === 0 ? <EmptyState icon={IdCard} title="Add staff first" /> : (
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse">
            <thead>
              <tr className="text-muted-foreground">
                <th className="sticky left-0 bg-white text-left font-medium px-3 py-2 min-w-[150px]">Staff</th>
                {days.map((d) => {
                  const dow = new Date(`${d}T00:00`).getDay();
                  return <th key={d} className={`w-7 font-medium py-2 ${dow === 0 ? "text-red-400" : ""} ${d === todayStr ? "text-obsidian" : ""}`}>{Number(d.slice(8))}</th>;
                })}
                <th className="px-3 font-medium text-right">Days</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((e) => {
                let worked = 0;
                return (
                  <tr key={e.id} className="border-t border-black/5">
                    <td className="sticky left-0 bg-white px-3 py-1.5 font-medium text-obsidian whitespace-nowrap">{e.name}</td>
                    {days.map((d) => {
                      const st = lookup[`${e.id}|${d}`] || "";
                      worked += st === "present" ? 1 : st === "half" ? 0.5 : 0;
                      const a = ATTENDANCE.find((x) => x.value === st);
                      return (
                        <td key={d} className="p-0.5">
                          <button onClick={() => cycle(e.id, d)} disabled={d > todayStr}
                            className={`w-6 h-6 rounded text-[11px] font-semibold border border-black/5 hover:border-obsidian/40 disabled:opacity-30 ${a.cls}`}>
                            {a.short}
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-3 text-right font-semibold">{att.isLoading ? "…" : worked}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

// ── Advances, bonuses, deductions and piece work ──

function EntriesView({ month, staff }) {
  const [modal, setModal] = useState(null);
  const queryClient = useQueryClient();
  const entries = useQuery({ queryKey: ENTRIES_KEY, queryFn: () => base44.entities.PayEntry.list() });
  const names = Object.fromEntries(staff.map((e) => [e.id, e.name]));
  const rows = (entries.data || []).filter((e) => e.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date));
  const total = (t) => cents(rows.filter((r) => r.type === t).reduce((s, r) => s + num(r.amount), 0));

  return (
    <>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {Object.entries(ENTRY_TYPES).map(([k, t]) => <MiniStat key={k} label={t.label} value={money(total(k))} sub={monthLabel(month)} />)}
      </div>
      <Panel>
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/10">
          <p className="text-sm text-muted-foreground">Everything here is added to or taken off that month's pay.</p>
          <Button size="sm" onClick={() => setModal("new")} disabled={!staff.length} className="bg-obsidian hover:bg-obsidian/90 text-white gap-2"><Plus className="w-4 h-4" /> Add entry</Button>
        </div>
        {entries.isLoading ? <ListSkeleton /> : entries.error ? <ErrorState error={entries.error} onRetry={entries.refetch} /> : rows.length === 0 ? (
          <EmptyState title={`Nothing recorded for ${monthLabel(month)}`} />
        ) : (
          <ul className="divide-y divide-black/5">
            {rows.map((r) => (
              <li key={r.id}>
                <button onClick={() => setModal(r)} className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-muted/30">
                  <span className="w-24 shrink-0 text-muted-foreground">{formatDate(r.date)}</span>
                  <span className="flex-1 min-w-0">
                    <span className="font-medium text-obsidian">{names[r.employee_id] || "Former staff"}</span>
                    <span className="block text-xs text-muted-foreground truncate">
                      {r.description}{r.type === "piece" && r.quantity ? ` · ${r.quantity} × ${money(r.rate)}` : ""}
                    </span>
                  </span>
                  <Pill tone={ENTRY_TYPES[r.type]?.tone}>{ENTRY_TYPES[r.type]?.label}</Pill>
                  <span className={`w-32 text-right font-medium ${ENTRY_TYPES[r.type]?.sign < 0 ? "text-red-600" : ""}`}>
                    {ENTRY_TYPES[r.type]?.sign < 0 ? "−" : "+"}{money(r.amount)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {modal && (
        <EntryModal
          key={modal === "new" ? "new" : modal.id}
          entry={modal === "new" ? null : modal}
          month={month}
          descriptions={uniqueValues((entries.data || []).filter((e) => modal === "new" || e.type === modal.type).map((e) => e.description))}
          staff={staff.filter((e) => e.status !== "left" || e.id === modal.employee_id)}
          onClose={() => setModal(null)}
          onSaved={() => { queryClient.invalidateQueries({ queryKey: ENTRIES_KEY }); setModal(null); }}
        />
      )}
    </>
  );
}

function EntryModal({ entry, month, descriptions, staff, onClose, onSaved }) {
  const isEdit = !!entry;
  const [form, setForm] = useState({
    employee_id: entry?.employee_id || staff[0]?.id || "",
    date: entry?.date || (today().startsWith(month) ? today() : `${month}-01`),
    type: entry?.type || "advance",
    description: entry?.description || "",
    quantity: String(entry?.quantity ?? 1),
    rate: entry?.rate != null ? String(entry.rate) : "",
    amount: entry ? String(entry.amount) : "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const isPiece = form.type === "piece";
  const amount = isPiece ? cents(num(form.quantity) * num(form.rate)) : cents(form.amount);

  const save = useMutation({
    mutationFn: () => {
      const data = {
        employee_id: form.employee_id, date: form.date, type: form.type, amount,
        description: form.description.trim() || undefined,
        quantity: isPiece ? num(form.quantity) : undefined,
        rate: isPiece ? cents(form.rate) : undefined,
      };
      if (!isEdit) return base44.entities.PayEntry.create(data);
      return base44.entities.PayEntry.update(entry.id, data, ["description", "quantity", "rate"].filter((k) => data[k] === undefined));
    },
    onSuccess: () => { toast.success("Saved"); onSaved(); },
    onError: (e) => toast.error("Save failed: " + e.message),
  });
  const remove = useMutation({
    mutationFn: () => base44.entities.PayEntry.delete(entry.id),
    onSuccess: () => { toast.success("Deleted"); onSaved(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Modal
      title={isEdit ? "Edit pay entry" : "Add pay entry"}
      onClose={onClose}
      footer={
        <>
          <div>{isEdit && <Button variant="outline" className="text-destructive border-destructive/40" onClick={() => { if (confirm("Delete this entry?")) remove.mutate(); }}>Delete</Button>}</div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.employee_id || !(amount > 0)} className="bg-obsidian hover:bg-obsidian/90 text-white px-8">{save.isPending ? "Saving..." : "Save"}</Button>
          </div>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-4">
        <Field label="Staff member">
          <NativeSelect value={form.employee_id} onChange={(v) => set("employee_id", v)}>
            {staff.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Type">
          <NativeSelect value={form.type} onChange={(v) => set("type", v)}>
            {Object.entries(ENTRY_TYPES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Date"><Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} /></Field>
      </div>
      <Field label="Description">
        <SuggestInput values={descriptions} value={form.description} onChange={(e) => set("description", e.target.value)}
          placeholder={isPiece ? "3-seater sofa frames" : form.type === "advance" ? "Cash advance (M-Pesa)" : form.type === "bonus" ? "Finished order early" : "Damaged fabric"} />
      </Field>
      {isPiece ? (
        <div className="grid grid-cols-3 gap-4 items-end">
          <Field label="Pieces"><Input type="number" step="any" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} /></Field>
          <Field label="Rate per piece (KSh)"><Input type="number" step="0.01" value={form.rate} onChange={(e) => set("rate", e.target.value)} /></Field>
          <p className="text-sm font-semibold pb-2">= {money(amount)}</p>
        </div>
      ) : (
        <Field label="Amount (KSh)"><Input type="number" step="0.01" value={form.amount} onChange={(e) => set("amount", e.target.value)} /></Field>
      )}
      <p className="text-xs text-muted-foreground">
        {ENTRY_TYPES[form.type].sign > 0 ? "Added to" : "Taken off"} this person's pay for {monthLabel(form.date.slice(0, 7))}.
      </p>
    </Modal>
  );
}

// ── Payroll ──

function PayrollView({ month, staff }) {
  const queryClient = useQueryClient();
  const [paying, setPaying] = useState(null);
  const [viewing, setViewing] = useState(null);
  const att = useQuery({ queryKey: attendanceKey(month), queryFn: () => businessApi.attendance(month) });
  const entries = useQuery({ queryKey: ENTRIES_KEY, queryFn: () => base44.entities.PayEntry.list() });
  const slips = useQuery({ queryKey: PAYSLIPS_KEY, queryFn: businessApi.payslips });

  const monthSlips = (slips.data || []).filter((s) => s.month === month);
  const paidFor = Object.fromEntries(monthSlips.map((s) => [s.employee_id, s]));
  const rows = staff
    .filter((e) => e.status !== "left" || paidFor[e.id])
    .map((e) => ({ emp: e, pay: computePay(e, month, att.data || [], entries.data || []), slip: paidFor[e.id] }))
    .sort((a, b) => a.emp.name.localeCompare(b.emp.name));

  const totalNet = cents(rows.reduce((t, r) => t + (r.slip ? r.slip.net : r.pay.net), 0));
  const paidNet = cents(monthSlips.reduce((t, s) => t + s.net, 0));

  const undo = useMutation({
    mutationFn: (id) => businessApi.removePayslip(id),
    onSuccess: () => { toast.success("Payment undone and wages expense removed"); queryClient.invalidateQueries({ queryKey: PAYSLIPS_KEY }); queryClient.invalidateQueries({ queryKey: EXPENSES_KEY }); },
    onError: (e) => toast.error(e.message),
  });

  const error = att.error || entries.error || slips.error;
  if (error) return <Panel><ErrorState error={error} onRetry={() => [att, entries, slips].forEach((q) => q.refetch())} /></Panel>;
  const loading = att.isLoading || entries.isLoading || slips.isLoading;

  return (
    <>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <MiniStat label={`Payroll · ${monthLabel(month)}`} value={money(totalNet)} sub="Net pay for everyone" />
        <MiniStat label="Paid" value={money(paidNet)} tone="good" sub={`${monthSlips.length} of ${rows.length} staff`} />
        <MiniStat label="Still to pay" value={money(totalNet - paidNet)} tone={totalNet - paidNet > 0 ? "bad" : undefined} />
      </div>
      <Panel>
        {loading ? <ListSkeleton /> : rows.length === 0 ? <EmptyState icon={IdCard} title="Add staff first" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground bg-muted/40">
                <tr>
                  <th className="text-left font-medium px-4 py-2.5">Staff</th>
                  <th className="text-right font-medium px-4 py-2.5">Base pay</th>
                  <th className="text-right font-medium px-4 py-2.5">Piece + bonus</th>
                  <th className="text-right font-medium px-4 py-2.5">Advances + deductions</th>
                  <th className="text-right font-medium px-4 py-2.5">Net pay</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {rows.map(({ emp, pay, slip }) => {
                  const p = slip ? { base: slip.base_pay, piece: slip.piece_pay, bonuses: slip.bonuses, advances: slip.advances, deductions: slip.deductions, net: slip.net, days: slip.days_worked } : pay;
                  return (
                    <tr key={emp.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-obsidian">{emp.name}</p>
                        <p className="text-xs text-muted-foreground">{PAY_TYPES[emp.pay_type]}{emp.pay_type === "daily" ? ` · ${p.days} days` : ""}</p>
                      </td>
                      <td className="px-4 py-3 text-right">{money(p.base)}</td>
                      <td className="px-4 py-3 text-right">{money(p.piece + p.bonuses)}</td>
                      <td className="px-4 py-3 text-right text-red-600">{p.advances + p.deductions > 0 ? `−${money(p.advances + p.deductions)}` : "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold">{money(p.net)}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {slip ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Pill tone="green"><CheckCircle2 className="w-3 h-3" /> Paid {formatDate(slip.paid_date)}</Pill>
                            <Button size="sm" variant="outline" onClick={() => setViewing(slip)}>Payslip</Button>
                            <Button size="sm" variant="ghost" title="Undo payment" onClick={() => { if (confirm(`Undo ${emp.name}'s payment for ${monthLabel(month)}?`)) undo.mutate(slip.id); }}>
                              <Undo2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" disabled={p.net <= 0 && p.gross <= 0} onClick={() => setPaying({ emp, pay })} className="bg-obsidian hover:bg-obsidian/90 text-white">Pay</Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <p className="text-xs text-muted-foreground mt-3">
        Paying someone saves their payslip and books the wage cost under Expenses (category "wages"), so it comes off your net profit.
      </p>

      {paying && (
        <PayModal
          {...paying}
          month={month}
          onClose={() => setPaying(null)}
          onPaid={(slip) => {
            queryClient.invalidateQueries({ queryKey: PAYSLIPS_KEY });
            queryClient.invalidateQueries({ queryKey: EXPENSES_KEY });
            setPaying(null);
            setViewing(slip);
          }}
        />
      )}
      {viewing && <PayslipModal slip={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}

function PayModal({ emp, pay, month, onClose, onPaid }) {
  const [method, setMethod] = useState("mpesa");
  const [date, setDate] = useState(today());
  const slip = {
    employee_id: emp.id, employee_name: emp.name, month, pay_type: emp.pay_type,
    days_worked: emp.pay_type === "daily" ? pay.days : undefined,
    base_pay: pay.base, piece_pay: pay.piece, bonuses: pay.bonuses, advances: pay.advances, deductions: pay.deductions,
    gross: pay.gross, net: pay.net, paid_date: date, payment_method: method,
  };
  const save = useMutation({
    mutationFn: () => businessApi.payPayslip(Object.fromEntries(Object.entries(slip).filter(([, v]) => v !== undefined))),
    onSuccess: () => { toast.success(`${emp.name} marked as paid`); onPaid(slip); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Modal
      title={`Pay ${emp.name} — ${monthLabel(month)}`}
      onClose={onClose}
      footer={
        <>
          <span />
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-obsidian hover:bg-obsidian/90 text-white px-8">{save.isPending ? "Saving..." : `Mark ${money(pay.net)} paid`}</Button>
          </div>
        </>
      }
    >
      <PayBreakdown slip={slip} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Paid by">
          <NativeSelect value={method} onChange={setMethod}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m === "mpesa" ? "M-Pesa" : humanize(m)}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Date paid"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      </div>
      {pay.net < 0 && <p className="text-sm text-red-600">Advances and deductions are more than this month's pay. The difference stays owed by the employee.</p>}
    </Modal>
  );
}

function PayBreakdown({ slip }) {
  const row = (label, value, neg) => (
    <div className="flex justify-between py-1"><span className="text-muted-foreground">{label}</span><span className={neg ? "text-red-600" : ""}>{neg ? "−" : ""}{money(value)}</span></div>
  );
  return (
    <div className="rounded-md bg-muted/40 p-4 text-sm">
      {row(slip.pay_type === "daily" ? `Base pay (${slip.days_worked} days)` : slip.pay_type === "monthly" ? "Salary" : "Base pay", slip.base_pay)}
      {slip.piece_pay > 0 && row("Piece work", slip.piece_pay)}
      {slip.bonuses > 0 && row("Bonuses", slip.bonuses)}
      <div className="flex justify-between py-1 font-medium border-t border-black/10 mt-1 pt-2"><span>Gross pay</span><span>{money(slip.gross)}</span></div>
      {slip.advances > 0 && row("Advances already paid", slip.advances, true)}
      {slip.deductions > 0 && row("Deductions", slip.deductions, true)}
      <div className="flex justify-between py-1 font-semibold text-obsidian border-t border-black/10 mt-1 pt-2 text-base"><span>Net pay</span><span>{money(slip.net)}</span></div>
    </div>
  );
}

function PayslipModal({ slip, onClose }) {
  const print = () => {
    const w = window.open("", "_blank", "width=480,height=640");
    if (!w) return toast.error("Allow pop-ups to print payslips");
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
    const line = (l, v, neg) => (v ? `<tr><td>${l}</td><td style="text-align:right">${neg ? "−" : ""}${money(v)}</td></tr>` : "");
    w.document.write(`<!DOCTYPE html><html><head><title>Payslip ${esc(slip.employee_name)} ${slip.month}</title>
      <style>body{font-family:system-ui,sans-serif;padding:28px;color:#222}h1{font-size:20px;margin:0}table{width:100%;border-collapse:collapse;margin-top:16px;font-size:14px}
      td{padding:6px 0;border-bottom:1px solid #eee}.tot td{font-weight:700;border-top:2px solid #222}small{color:#777}</style></head><body>
      <h1>Craftsman Galore</h1><small>Payslip</small>
      <p><b>${esc(slip.employee_name)}</b><br>${monthLabel(slip.month)}<br><small>Paid ${formatDate(slip.paid_date)}${slip.payment_method ? ` via ${slip.payment_method === "mpesa" ? "M-Pesa" : slip.payment_method}` : ""}</small></p>
      <table><tr><td>${slip.pay_type === "daily" ? `Base pay (${slip.days_worked} days)` : "Salary / base pay"}</td><td style="text-align:right">${money(slip.base_pay)}</td></tr>${line("Piece work", slip.piece_pay)}${line("Bonuses", slip.bonuses)}
      <tr class="tot"><td>Gross pay</td><td style="text-align:right">${money(slip.gross)}</td></tr>
      ${line("Advances", slip.advances, true)}${line("Deductions", slip.deductions, true)}
      <tr class="tot"><td>Net pay</td><td style="text-align:right">${money(slip.net)}</td></tr></table>
      <p style="margin-top:40px"><small>Received by: ______________________ &nbsp; Signature: ____________</small></p>
      <script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  };
  return (
    <Modal
      title={`Payslip — ${slip.employee_name}`}
      onClose={onClose}
      footer={<><span /><div className="flex gap-3"><Button variant="outline" onClick={onClose}>Close</Button><Button onClick={print} className="bg-obsidian text-white gap-2"><Printer className="w-4 h-4" /> Print</Button></div></>}
    >
      <p className="text-sm text-muted-foreground">{monthLabel(slip.month)} · paid {formatDate(slip.paid_date)}{slip.payment_method ? ` by ${slip.payment_method === "mpesa" ? "M-Pesa" : humanize(slip.payment_method)}` : ""}</p>
      <PayBreakdown slip={slip} />
    </Modal>
  );
}

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, ChevronLeft, ChevronRight, CalendarClock, User, Flame } from "lucide-react";
import { base44, businessApi } from "@/api/base44Client";
import { useStaff } from "@/lib/staffSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Panel, ErrorState, formatDate } from "./adminShared";
import { Field, NativeSelect, Modal, MiniStat, today, SuggestInput, uniqueValues } from "./businessShared";

export const JOBS_KEY = ["production-jobs"];

export const STAGES = [
  { value: "queued", label: "Queued" },
  { value: "cutting", label: "Cutting" },
  { value: "assembly", label: "Assembly" },
  { value: "upholstery", label: "Upholstery" },
  { value: "finishing", label: "Finishing" },
  { value: "ready", label: "Ready" },
  { value: "delivered", label: "Delivered" },
];
const stageIndex = (s) => STAGES.findIndex((x) => x.value === s);

export const isOverdue = (j) => j.stage !== "delivered" && j.stage !== "ready" && j.due_date && j.due_date < today();

export default function AdminProductionTab() {
  const [modal, setModal] = useState(null);
  const [who, setWho] = useState("");
  const queryClient = useQueryClient();
  const jobs = useQuery({ queryKey: JOBS_KEY, queryFn: () => base44.entities.ProductionJob.list() });
  const people = useQuery({ queryKey: ["employee-names"], queryFn: businessApi.employeeNames });
  const { can } = useStaff();
  // For the job form's drop-downs: what you make (cost sheets, earlier jobs) and who for
  const inventory = useQuery({ queryKey: ["inventory-items"], queryFn: () => base44.entities.InventoryItem.list(), enabled: can("inventory") });
  const customers = useQuery({ queryKey: ["customers"], queryFn: () => base44.entities.Customer.list(), enabled: can("customers") });
  const names = useMemo(() => Object.fromEntries((people.data || []).map((p) => [p.id, p.name])), [people.data]);

  const move = useMutation({
    mutationFn: ({ job, stage }) => base44.entities.ProductionJob.update(job.id, { stage }),
    onMutate: async ({ job, stage }) => {
      await queryClient.cancelQueries({ queryKey: JOBS_KEY });
      const prev = queryClient.getQueryData(JOBS_KEY);
      queryClient.setQueryData(JOBS_KEY, (rows = []) => rows.map((r) => (r.id === job.id ? { ...r, stage } : r)));
      return { prev };
    },
    onError: (e, _v, ctx) => { queryClient.setQueryData(JOBS_KEY, ctx.prev); toast.error(e.message); },
    onSettled: () => queryClient.invalidateQueries({ queryKey: JOBS_KEY }),
  });

  const rows = (jobs.data || []).filter((j) => !who || j.assigned_to === who);
  const active = rows.filter((j) => j.stage !== "delivered");
  const overdue = active.filter(isOverdue);

  return (
    <div>
      <PageHeader
        title="Production"
        description="Every piece in the workshop, from order to delivery. Use the arrows to move a job to the next stage."
        actions={<Button onClick={() => setModal("new")} className="bg-obsidian hover:bg-obsidian/90 text-white gap-2"><Plus className="w-4 h-4" /> New job</Button>}
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        <MiniStat label="In the workshop" value={active.filter((j) => j.stage !== "ready").length} />
        <MiniStat label="Ready for delivery" value={active.filter((j) => j.stage === "ready").length} />
        <MiniStat label="Overdue" value={overdue.length} tone={overdue.length ? "bad" : undefined} />
        <MiniStat label="Delivered (30 days)" value={rows.filter((j) => j.stage === "delivered" && new Date(j._creationTime) > Date.now() - 30 * 86400_000).length} />
      </div>

      <div className="mb-4 max-w-xs">
        <NativeSelect value={who} onChange={setWho}>
          <option value="">Everyone's jobs</option>
          {(people.data || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </NativeSelect>
      </div>

      {jobs.error ? <Panel><ErrorState error={jobs.error} onRetry={jobs.refetch} /></Panel> : (
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1">
          {STAGES.map((stage, si) => {
            let col = rows.filter((j) => (j.stage || "queued") === stage.value);
            col = stage.value === "delivered"
              ? col.slice(0, 10)
              : col.sort((a, b) => (b.priority === "urgent") - (a.priority === "urgent") || (a.due_date || "9").localeCompare(b.due_date || "9"));
            return (
              <div key={stage.value} className="w-64 shrink-0 bg-black/[0.03] rounded-lg p-2">
                <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground flex justify-between">
                  {stage.label}<span>{col.length}</span>
                </p>
                <div className="space-y-2 min-h-[60px]">
                  {jobs.isLoading && si === 0 && <div className="h-20 bg-white rounded-md animate-pulse" />}
                  {col.map((j) => (
                    <div key={j.id} className={`bg-white rounded-md border p-3 text-sm ${isOverdue(j) ? "border-red-300" : "border-black/10"}`}>
                      <button onClick={() => setModal(j)} className="text-left w-full">
                        <p className="font-medium text-obsidian flex items-start gap-1.5">
                          {j.priority === "urgent" && <Flame className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />}
                          <span>{j.quantity > 1 && `${j.quantity} × `}{j.title}</span>
                        </p>
                        {j.customer_name && <p className="text-xs text-muted-foreground mt-0.5">For {j.customer_name}</p>}
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                          {j.assigned_to && <span className="flex items-center gap-1"><User className="w-3 h-3" />{names[j.assigned_to] || "—"}</span>}
                          {j.due_date && (
                            <span className={`flex items-center gap-1 ${isOverdue(j) ? "text-red-600 font-medium" : ""}`}>
                              <CalendarClock className="w-3 h-3" />{formatDate(j.due_date)}
                            </span>
                          )}
                        </div>
                      </button>
                      <div className="flex justify-between mt-2 -mb-1">
                        <button disabled={si === 0} onClick={() => move.mutate({ job: j, stage: STAGES[si - 1].value })}
                          className="p-1 rounded hover:bg-muted disabled:opacity-20" aria-label="Move back"><ChevronLeft className="w-4 h-4" /></button>
                        <button disabled={si === STAGES.length - 1} onClick={() => move.mutate({ job: j, stage: STAGES[si + 1].value })}
                          className="p-1 rounded hover:bg-muted disabled:opacity-20" aria-label="Move forward"><ChevronRight className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <JobModal
          key={modal === "new" ? "new" : modal.id}
          job={modal === "new" ? null : modal}
          people={people.data || []}
          titles={uniqueValues([...(inventory.data || []).map((i) => i.name), ...(jobs.data || []).map((j) => j.title)])}
          customerNames={uniqueValues([...(customers.data || []).map((c) => c.name), ...(jobs.data || []).map((j) => j.customer_name)])}
          onClose={() => setModal(null)}
          onSaved={() => { queryClient.invalidateQueries({ queryKey: JOBS_KEY }); setModal(null); }}
        />
      )}
    </div>
  );
}

function JobModal({ job, people, titles, customerNames, onClose, onSaved }) {
  const isEdit = !!job;
  const [form, setForm] = useState({
    title: job?.title || "", quantity: String(job?.quantity ?? 1), customer_name: job?.customer_name || "",
    assigned_to: job?.assigned_to || "", stage: job?.stage || "queued", priority: job?.priority || "normal",
    due_date: job?.due_date || "", notes: job?.notes || "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: () => {
      const data = {
        title: form.title.trim(), quantity: Math.max(parseInt(form.quantity) || 1, 1), stage: form.stage, priority: form.priority,
        customer_name: form.customer_name.trim() || undefined, assigned_to: form.assigned_to || undefined,
        due_date: form.due_date || undefined, notes: form.notes.trim() || undefined,
      };
      if (!isEdit) return base44.entities.ProductionJob.create(data);
      return base44.entities.ProductionJob.update(job.id, data, ["customer_name", "assigned_to", "due_date", "notes"].filter((k) => !data[k]));
    },
    onSuccess: () => { toast.success(isEdit ? "Job updated" : "Job added"); onSaved(); },
    onError: (e) => toast.error("Save failed: " + e.message),
  });
  const remove = useMutation({
    mutationFn: () => base44.entities.ProductionJob.delete(job.id),
    onSuccess: () => { toast.success("Job deleted"); onSaved(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Modal
      title={isEdit ? "Edit job" : "New production job"}
      onClose={onClose}
      footer={
        <>
          <div>{isEdit && <Button variant="outline" className="text-destructive border-destructive/40" onClick={() => { if (confirm("Delete this job?")) remove.mutate(); }}>Delete</Button>}</div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.title.trim()} className="bg-obsidian hover:bg-obsidian/90 text-white px-8">{save.isPending ? "Saving..." : "Save"}</Button>
          </div>
        </>
      }
    >
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-3"><Field label="What's being made *"><SuggestInput values={titles} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="7-seater L-shaped sofa, grey" /></Field></div>
        <Field label="Quantity"><Input type="number" min="1" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="For customer"><SuggestInput values={customerNames} value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} placeholder="Leave blank if for stock" /></Field>
        <Field label="Assigned to">
          <NativeSelect value={form.assigned_to} onChange={(v) => set("assigned_to", v)}>
            <option value="">— Unassigned —</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}{p.position ? ` (${p.position})` : ""}</option>)}
          </NativeSelect>
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Stage">
          <NativeSelect value={form.stage} onChange={(v) => set("stage", v)}>
            {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Due date"><Input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} /></Field>
        <Field label="Priority">
          <NativeSelect value={form.priority} onChange={(v) => set("priority", v)}>
            <option value="normal">Normal</option>
            <option value="urgent">Urgent</option>
          </NativeSelect>
        </Field>
      </div>
      <Field label="Notes"><Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Measurements, fabric code, finish..." /></Field>
      {people.length === 0 && <p className="text-xs text-muted-foreground">Add staff under Staff & Payroll to assign jobs to them.</p>}
    </Modal>
  );
}

export { stageIndex };

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, UserPlus } from "lucide-react";
import { base44, marketingApi } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel, EmptyState } from "../adminShared";
import { Field, NativeSelect, Modal, num } from "../businessShared";
import { DataTable, SectionTitle, cap, ksh, useRefreshMarketing } from "./shared";

export default function TeamPanel({ report }) {
  const refresh = useRefreshMarketing();
  const [modal, setModal] = useState(null);
  const team = useQuery({ queryKey: ["mkt", "team"], queryFn: () => base44.entities.MktTeam.list() });
  const employees = useQuery({ queryKey: ["mkt", "employees"], queryFn: marketingApi.employees });
  const names = new Map((employees.data || []).map((e) => [e.id, e.name]));
  const stats = new Map(report.people.map((p) => [p.employee_id, p]));

  return (
    <div className="space-y-6">
      <Panel>
        <SectionTitle title="Marketing team" sub="People who post and reply to enquiries. They come from Staff & Payroll, so their pay isn't entered twice."
          action={<Button size="sm" className="bg-obsidian hover:bg-obsidian/90 text-white gap-1.5" onClick={() => setModal({})}><Plus className="w-4 h-4" /> Add team member</Button>} />
        {!team.data?.length ? (
          <EmptyState icon={UserPlus} title="No one on the marketing team yet"
            description="Add the people who post (they must be in Staff & Payroll first) and set how many posts a day each should do." />
        ) : (
          <DataTable
            rows={team.data}
            columns={[
              { key: "name", title: "Name", render: (t) => <button onClick={() => setModal(t)} className="font-medium hover:underline text-left">{names.get(t.employee_id) || "(not in Staff & Payroll)"}</button> },
              { key: "target", title: "Posts / day", num: true, render: (t) => t.daily_post_target },
              { key: "active", title: "Status", render: (t) => (t.active ? "Active" : "Inactive") },
              { key: "posts", title: "Posts (period)", num: true, render: (t) => stats.get(t.employee_id)?.posts ?? "—" },
              { key: "met", title: "Days target met", num: true, render: (t) => { const s = stats.get(t.employee_id); return s ? `${s.days_met} / ${s.days}` : "—"; } },
              { key: "checkin", title: "Days inbox checked", num: true, render: (t) => { const s = stats.get(t.employee_id); return s ? `${s.days_checked_in} / ${s.days}` : "—"; } },
            ]}
          />
        )}
      </Panel>

      {report.show_pay && report.people.length > 0 && (
        <Panel>
          <SectionTitle title="Pay vs output" sub="Paid = payslips paid in Staff & Payroll for the months in this period" />
          <DataTable
            rows={report.people.map((p) => ({ ...p, id: p.employee_id }))}
            columns={[
              { key: "name", title: "Name", render: (p) => <span className="font-medium">{p.name}</span> },
              { key: "pay_type", title: "Pay type", render: (p) => cap(p.pay_type || "—") },
              { key: "posts", title: "Posts", num: true },
              { key: "expected", title: "Expected pay", num: true, render: (p) => ksh(p.expected_pay) },
              { key: "paid", title: "Paid", num: true, render: (p) => ksh(p.paid) },
              { key: "cpp", title: "Cost per post", num: true, render: (p) => ksh(p.cost_per_post) },
            ]}
          />
        </Panel>
      )}

      <Panel className="p-5 text-sm text-muted-foreground space-y-1.5">
        <p className="font-medium text-obsidian">Where other costs come from</p>
        <p>Shoots, props, data bundles, printing or influencers: add them in <b>Expenses</b> with the category <b>Marketing</b>. They're counted here and still come off profit on the Sales screen.</p>
      </Panel>

      {modal && <MemberModal member={modal.id ? modal : null} team={team.data || []} employees={employees.data || []}
        onClose={() => setModal(null)} onSaved={() => { refresh(); setModal(null); }} />}
    </div>
  );
}

function MemberModal({ member, team, employees, onClose, onSaved }) {
  const isEdit = !!member;
  const taken = new Set(team.map((t) => t.employee_id));
  const choices = employees.filter((e) => !taken.has(e.id) || e.id === member?.employee_id);
  const [f, setF] = useState({
    employee_id: member?.employee_id || choices[0]?.id || "",
    daily_post_target: String(member?.daily_post_target ?? 3), active: member?.active ?? true,
  });
  const save = useMutation({
    mutationFn: () => {
      const data = { employee_id: f.employee_id, daily_post_target: Math.max(0, Math.round(num(f.daily_post_target))), active: f.active };
      return isEdit ? base44.entities.MktTeam.update(member.id, data) : base44.entities.MktTeam.create(data);
    },
    onSuccess: () => { toast.success(isEdit ? "Updated" : "Added to the marketing team"); onSaved(); },
    onError: (e) => toast.error("Save failed: " + e.message),
  });
  const remove = useMutation({
    mutationFn: () => base44.entities.MktTeam.delete(member.id),
    onSuccess: () => { toast.success("Removed from the marketing team"); onSaved(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Modal title={isEdit ? "Team member" : "Add team member"} onClose={onClose}
      footer={<>
        <div>{isEdit && <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-white"
          onClick={() => { if (confirm("Remove from the marketing team? Their posts stay.")) remove.mutate(); }}>Remove</Button>}</div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !f.employee_id} className="bg-obsidian hover:bg-obsidian/90 text-white px-8">{save.isPending ? "Saving..." : "Save"}</Button>
        </div>
      </>}>
      {choices.length === 0 && !isEdit ? (
        <p className="text-sm text-muted-foreground">Everyone in Staff & Payroll is already on the team. Add the person in <b>Staff & Payroll</b> first.</p>
      ) : (
        <>
          <Field label="Person *" hint="From Staff & Payroll">
            <NativeSelect value={f.employee_id} onChange={(v) => setF((x) => ({ ...x, employee_id: v }))}>
              {choices.map((e) => <option key={e.id} value={e.id}>{e.name}{e.position ? ` — ${e.position}` : ""}</option>)}
            </NativeSelect>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Posts required per day"><Input type="number" min="0" value={f.daily_post_target} onChange={(e) => setF((x) => ({ ...x, daily_post_target: e.target.value }))} /></Field>
            <Field label="Status">
              <NativeSelect value={f.active ? "1" : "0"} onChange={(v) => setF((x) => ({ ...x, active: v === "1" }))}>
                <option value="1">Active</option><option value="0">Inactive</option>
              </NativeSelect>
            </Field>
          </div>
        </>
      )}
    </Modal>
  );
}

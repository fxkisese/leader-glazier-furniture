import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, ShieldCheck } from "lucide-react";
import { staffApi } from "@/api/base44Client";
import { useStaff } from "@/lib/staffSession";
import { ROLES, ROLE_ACCESS } from "../../../convex/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Panel, ErrorState, ListSkeleton, Pill } from "./adminShared";
import { Field, NativeSelect, Modal } from "./businessShared";

const KEY = ["staff-accounts"];

const MODULE_LABELS = {
  dashboard: "CEO dashboard", website: "Website & orders", sales: "Sales", costs: "Costs & profit",
  inventory: "Inventory", customers: "Customers", suppliers: "Suppliers", production: "Production",
  hr: "Staff & payroll", team: "Logins", marketing: "Marketing",
};

export default function AdminTeamTab() {
  const { account: me } = useStaff();
  const [modal, setModal] = useState(null); // "new" | { reset: account }
  const queryClient = useQueryClient();
  const { data = [], isLoading, error, refetch } = useQuery({ queryKey: KEY, queryFn: staffApi.listAccounts });

  const update = useMutation({
    mutationFn: ({ id, ...changes }) => staffApi.updateAccount(id, changes),
    onSuccess: () => { toast.success("Account updated"); queryClient.invalidateQueries({ queryKey: KEY }); },
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id) => staffApi.removeAccount(id),
    onSuccess: () => { toast.success("Account deleted"); queryClient.invalidateQueries({ queryKey: KEY }); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Logins & Roles"
        description="Give each staff member their own login. Their role decides what they can see — this is checked by the server, not just hidden in the menu."
        actions={<Button onClick={() => setModal("new")} className="bg-obsidian hover:bg-obsidian/90 text-white gap-2"><Plus className="w-4 h-4" /> Add login</Button>}
      />

      <Panel className="mb-6">
        {isLoading ? <ListSkeleton rows={3} /> : error ? <ErrorState error={error} onRetry={refetch} /> : (
          <ul className="divide-y divide-black/5">
            {data.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <div className="flex-1 min-w-[180px]">
                  <p className="font-medium text-obsidian">{a.name} {a.id === me.id && <span className="text-xs text-muted-foreground">(you)</span>}</p>
                  <p className="text-xs text-muted-foreground">@{a.username}</p>
                </div>
                {!a.active && <Pill tone="red">Disabled</Pill>}
                <div className="w-44">
                  <NativeSelect value={a.role} onChange={(role) => update.mutate({ id: a.id, role })}>
                    {Object.entries(ROLES).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
                  </NativeSelect>
                </div>
                <Button size="sm" variant="outline" onClick={() => setModal({ reset: a })}>Reset password</Button>
                {a.id !== me.id && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => update.mutate({ id: a.id, active: !a.active })}>
                      {a.active ? "Disable" : "Enable"}
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive border-destructive/40"
                      onClick={() => { if (confirm(`Delete ${a.name}'s login?`)) remove.mutate(a.id); }}>
                      Delete
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <h2 className="text-sm font-semibold text-obsidian mb-3">What each role can open</h2>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {Object.entries(ROLES).map(([k, r]) => (
          <Panel key={k} className="p-4">
            <p className="font-medium text-obsidian flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-gold" />{r.label}</p>
            <p className="text-xs text-muted-foreground mt-1 mb-3">{r.description}</p>
            <div className="flex flex-wrap gap-1">
              {ROLE_ACCESS[k].map((m) => <Pill key={m}>{MODULE_LABELS[m]}</Pill>)}
            </div>
          </Panel>
        ))}
      </div>

      {modal === "new" && <NewAccountModal onClose={() => setModal(null)} onSaved={() => { queryClient.invalidateQueries({ queryKey: KEY }); setModal(null); }} />}
      {modal?.reset && <PasswordModal account={modal.reset} self={modal.reset.id === me.id} onClose={() => setModal(null)} onDone={() => setModal(null)} />}
    </div>
  );
}

function NewAccountModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: "", username: "", password: "", role: "sales" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target ? e.target.value : e }));
  const save = useMutation({
    mutationFn: () => staffApi.createAccount(form),
    onSuccess: () => { toast.success(`Login created for ${form.name}`); onSaved(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Modal
      title="Add staff login"
      onClose={onClose}
      footer={
        <>
          <span />
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name.trim() || !form.username.trim() || form.password.length < 8}
              className="bg-obsidian hover:bg-obsidian/90 text-white px-8">{save.isPending ? "Creating..." : "Create login"}</Button>
          </div>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="Full name *"><Input value={form.name} onChange={set("name")} /></Field>
        <Field label="Username *" hint="What they type to sign in"><Input value={form.username} onChange={set("username")} autoComplete="off" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Temporary password *" hint="8+ characters. They can change it after signing in.">
          <Input type="text" value={form.password} onChange={set("password")} autoComplete="new-password" />
        </Field>
        <Field label="Role" hint={ROLES[form.role]?.description}>
          <NativeSelect value={form.role} onChange={set("role")}>
            {Object.entries(ROLES).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
          </NativeSelect>
        </Field>
      </div>
    </Modal>
  );
}

/** Change your own password, or (CEO) reset someone else's. Either way that account is signed out everywhere. */
export function PasswordModal({ account, self, onClose, onDone }) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const save = useMutation({
    mutationFn: () => staffApi.setPassword(account.id, pw),
    onSuccess: () => {
      toast.success(self ? "Password changed — please sign in again" : `Password reset for ${account.name}`);
      onDone();
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Modal
      title={self ? "Change your password" : `Reset password — ${account.name}`}
      onClose={onClose}
      footer={
        <>
          <span />
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || pw.length < 8 || pw !== confirm}
              className="bg-obsidian hover:bg-obsidian/90 text-white px-8">{save.isPending ? "Saving..." : "Save password"}</Button>
          </div>
        </>
      }
    >
      <Field label="New password" hint="At least 8 characters"><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></Field>
      <Field label="Confirm new password"><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" /></Field>
      {confirm && pw !== confirm && <p className="text-xs text-red-600">Passwords don't match.</p>}
      <p className="text-xs text-muted-foreground">{self ? "You'll be signed out and need to sign in with the new password." : "They'll be signed out on all devices."}</p>
    </Modal>
  );
}

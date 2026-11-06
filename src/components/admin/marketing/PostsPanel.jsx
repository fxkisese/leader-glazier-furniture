import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, CheckCircle2, Circle, ExternalLink, ImagePlus } from "lucide-react";
import { base44, marketingApi } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel, Pill, EmptyState, formatDate } from "../adminShared";
import { Field, NativeSelect, Modal, num } from "../businessShared";
import {
  POST_PLATFORMS, FORMATS, PRODUCTS, HOOKS, BRANCHES, Options, SectionTitle, cap, ksh, nairobiDate, nairobiTime, useRefreshMarketing,
} from "./shared";

const CHECKS = [
  { key: "checked_meta_inbox", label: "Checked Facebook / Instagram / WhatsApp inbox" },
  { key: "checked_website", label: "Checked website enquiries" },
  { key: "replied_all", label: "Replied to everyone" },
];

export default function PostsPanel({ report, from, to }) {
  const refresh = useRefreshMarketing();
  const today = nairobiDate();
  const [modal, setModal] = useState(null);
  const posts = useQuery({ queryKey: ["mkt", "posts"], queryFn: () => base44.entities.MktPost.list() });
  const employees = useQuery({ queryKey: ["mkt", "employees"], queryFn: marketingApi.employees });
  const checkins = useQuery({ queryKey: ["mkt", "checkins", today], queryFn: () => marketingApi.checkins(today) });

  const setCheck = useMutation({
    mutationFn: ({ employee_id, key, value }) => marketingApi.setCheckin(employee_id, today, { [key]: value }),
    onSuccess: refresh,
    onError: (e) => toast.error(e.message),
  });

  const names = new Map((employees.data || []).map((e) => [e.id, e.name]));
  const inPeriod = useMemo(
    () => (posts.data || []).filter((p) => p.date >= from && p.date <= to)
      .sort((a, b) => `${b.date}${b.time || ""}`.localeCompare(`${a.date}${a.time || ""}`)),
    [posts.data, from, to],
  );
  const postedToday = (id) => (posts.data || []).filter((p) => p.employee_id === id && p.date === today).length;
  const checkinOf = (id) => (checkins.data || []).find((c) => c.employee_id === id) || {};

  return (
    <div className="space-y-6">
      <Panel>
        <SectionTitle title={`Today's checklist · ${formatDate(today)}`} sub="Each marketing team member's posts against their daily target, and the inbox check"
          action={<Button size="sm" className="bg-obsidian hover:bg-obsidian/90 text-white gap-1.5" onClick={() => setModal({})}><Plus className="w-4 h-4" /> Log a post</Button>} />
        {report.people.length === 0 ? (
          <p className="text-sm text-muted-foreground p-5">Add people to the marketing team on <b>Team & Pay</b> to get a daily checklist.</p>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 p-5">
            {report.people.map((p) => {
              const n = postedToday(p.employee_id), ci = checkinOf(p.employee_id), met = n >= p.target;
              return (
                <div key={p.employee_id} className="border border-black/10 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-obsidian">{p.name}</p>
                    <span className={`text-sm font-semibold ${met ? "text-emerald-700" : "text-red-600"}`}>{n} / {p.target} posts</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${met ? "bg-emerald-600" : "bg-red-500"}`} style={{ width: `${Math.min(100, (n / Math.max(1, p.target)) * 100)}%` }} />
                  </div>
                  <div className="space-y-1.5">
                    {CHECKS.map((c) => (
                      <button key={c.key} onClick={() => setCheck.mutate({ employee_id: p.employee_id, key: c.key, value: !ci[c.key] })}
                        className="w-full flex items-start gap-2 text-left text-sm hover:bg-muted/40 rounded px-1 py-0.5">
                        {ci[c.key] ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> : <Circle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />}
                        <span className={ci[c.key] ? "" : "text-muted-foreground"}>{c.label}</span>
                      </button>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => setModal({ employee_id: p.employee_id })}><Plus className="w-3.5 h-3.5" /> Log post</Button>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel>
        <SectionTitle title="Posts in this period" sub={`${inPeriod.length} post${inPeriod.length === 1 ? "" : "s"} · boosts ${ksh(inPeriod.reduce((t, p) => t + (p.boost_cost || 0), 0))}`} />
        {inPeriod.length === 0 ? (
          <EmptyState icon={ImagePlus} title="No posts logged in this period" description="Log every post with its product and hook — that's how you learn which content brings enquiries." />
        ) : (
          <ul className="divide-y divide-black/5">
            {inPeriod.map((p) => (
              <li key={p.id}>
                <button onClick={() => setModal(p)} className="w-full flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-left text-sm hover:bg-muted/30">
                  <span className="w-28 shrink-0 text-muted-foreground">{formatDate(p.date)}{p.time && <span className="block text-xs">{p.time}</span>}</span>
                  <span className="flex-1 min-w-[200px]">
                    <span className="font-medium text-obsidian">{[p.product, p.hook].filter(Boolean).map(cap).join(" · ") || "Untagged post"}</span>
                    <span className="block text-xs text-muted-foreground truncate">{names.get(p.employee_id) || "—"}{p.caption ? ` — ${p.caption}` : ""}</span>
                  </span>
                  <Pill>{cap(p.platform)}</Pill>
                  {p.format && <Pill tone="purple">{cap(p.format)}</Pill>}
                  {p.boost_cost > 0 && <Pill tone="blue">Boost {ksh(p.boost_cost)}</Pill>}
                  {p.url && <a href={p.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:text-obsidian"><ExternalLink className="w-4 h-4" /></a>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {modal && (
        <PostModal post={modal.id ? modal : null} defaults={modal.id ? {} : modal} employees={employees.data || []} past={posts.data || []}
          onClose={() => setModal(null)} onSaved={() => { refresh(); setModal(null); }} />
      )}
    </div>
  );
}

const OPTIONAL = ["employee_id", "time", "format", "product", "hook", "branch", "url", "caption", "boost_cost", "notes"];

function PostModal({ post, defaults, employees, past, onClose, onSaved }) {
  const isEdit = !!post;
  // A new post starts with the same person and platform as their last one
  const last = !isEdit && defaults.employee_id ? past.find((p) => p.employee_id === defaults.employee_id) : null;
  const src = post || {};
  const [f, setF] = useState({
    employee_id: src.employee_id || defaults.employee_id || "", platform: src.platform || last?.platform || "instagram",
    date: src.date || nairobiDate(), time: src.time ?? (isEdit ? "" : nairobiTime()), format: src.format || "", product: src.product || "",
    hook: src.hook || "", branch: src.branch || "", url: src.url || "", caption: src.caption || "",
    boost_cost: src.boost_cost ? String(src.boost_cost) : "", notes: src.notes || "",
  });
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: typeof v === "string" ? v : v.target.value }));

  const save = useMutation({
    mutationFn: () => {
      const data = { ...f, caption: f.caption.trim(), url: f.url.trim(), boost_cost: f.boost_cost ? num(f.boost_cost) : undefined };
      OPTIONAL.forEach((k) => { if (data[k] === "" || data[k] === undefined) delete data[k]; });
      const clear = isEdit ? OPTIONAL.filter((k) => data[k] === undefined && post[k] !== undefined) : undefined;
      return isEdit ? base44.entities.MktPost.update(post.id, data, clear) : base44.entities.MktPost.create(data);
    },
    onSuccess: () => { toast.success(isEdit ? "Post updated" : "Post logged"); onSaved(); },
    onError: (e) => toast.error("Save failed: " + e.message),
  });
  const remove = useMutation({
    mutationFn: () => base44.entities.MktPost.delete(post.id),
    onSuccess: () => { toast.success("Post deleted"); onSaved(); },
    onError: (e) => toast.error("Delete failed: " + e.message),
  });

  return (
    <Modal title={isEdit ? "Edit post" : "Log a post"} onClose={onClose}
      footer={<>
        <div>{isEdit && <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-white"
          onClick={() => { if (confirm("Delete this post?")) remove.mutate(); }}>Delete</Button>}</div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-obsidian hover:bg-obsidian/90 text-white px-8">{save.isPending ? "Saving..." : "Save"}</Button>
        </div>
      </>}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Posted by">
          <NativeSelect value={f.employee_id} onChange={set("employee_id")}>
            <option value="">—</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Platform *"><NativeSelect value={f.platform} onChange={set("platform")}>{POST_PLATFORMS.map((p) => <option key={p} value={p}>{cap(p)}</option>)}</NativeSelect></Field>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Date *"><Input type="date" value={f.date} onChange={set("date")} /></Field>
        <Field label="Time"><Input type="time" value={f.time} onChange={set("time")} /></Field>
        <Field label="Format"><NativeSelect value={f.format} onChange={set("format")}><Options values={FORMATS} /></NativeSelect></Field>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Product"><NativeSelect value={f.product} onChange={set("product")}><Options values={PRODUCTS} /></NativeSelect></Field>
        <Field label="Hook"><NativeSelect value={f.hook} onChange={set("hook")}><Options values={HOOKS} /></NativeSelect></Field>
        <Field label="Branch"><NativeSelect value={f.branch} onChange={set("branch")}><Options values={BRANCHES} /></NativeSelect></Field>
      </div>
      <Field label="Link to the post"><Input value={f.url} onChange={set("url")} placeholder="https://www.instagram.com/p/..." /></Field>
      <Field label="Caption / what it showed"><Input value={f.caption} onChange={set("caption")} /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Boost cost (KSh)" hint="If you paid to boost this post"><Input type="number" value={f.boost_cost} onChange={set("boost_cost")} /></Field>
        <Field label="Notes"><Input value={f.notes} onChange={set("notes")} /></Field>
      </div>
    </Modal>
  );
}

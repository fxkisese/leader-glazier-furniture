import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { marketingApi } from "@/api/base44Client";
import { PageHeader, FilterChips, ErrorState, ListSkeleton, Panel } from "./adminShared";
import { MKT_PERIODS, periodRange } from "./marketing/shared";
import OverviewPanel from "./marketing/OverviewPanel";
import CampaignsPanel from "./marketing/CampaignsPanel";
import PostsPanel from "./marketing/PostsPanel";
import LeadsPanel from "./marketing/LeadsPanel";
import TeamPanel from "./marketing/TeamPanel";

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "campaigns", label: "Campaigns & Ads" },
  { value: "posts", label: "Posting & Content" },
  { value: "leads", label: "Leads" },
  { value: "team", label: "Team & Pay" },
];

/** Which ads, posts and campaigns actually bring enquiries and sales. */
export default function AdminMarketingTab() {
  const [tab, setTab] = useState("overview");
  const [period, setPeriod] = useState("this-month");
  const { from, to } = periodRange(period);
  const report = useQuery({ queryKey: ["mkt", "report", from, to], queryFn: () => marketingApi.report(from, to) });

  return (
    <div>
      <PageHeader
        title="Marketing"
        description="Track ad spend, posts and every enquiry, then see which ad, post or campaign actually made money. Mark leads as won with the sale amount — that's what makes the numbers true."
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-6">
        <div className="flex gap-1 border-b border-black/10 overflow-x-auto overflow-y-hidden">
          {TABS.map((t) => (
            <button key={t.value} onClick={() => setTab(t.value)}
              className={`px-3.5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                tab === t.value ? "border-gold text-obsidian" : "border-transparent text-muted-foreground hover:text-obsidian"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <FilterChips options={MKT_PERIODS} value={period} onChange={setPeriod} />
      </div>

      {report.isLoading ? <Panel><ListSkeleton /></Panel>
        : report.error ? <Panel><ErrorState error={report.error} onRetry={report.refetch} /></Panel>
          : (
            <>
              {tab === "overview" && <OverviewPanel report={report.data} go={setTab} />}
              {tab === "campaigns" && <CampaignsPanel report={report.data} />}
              {tab === "posts" && <PostsPanel report={report.data} from={from} to={to} />}
              {tab === "leads" && <LeadsPanel from={from} to={to} />}
              {tab === "team" && <TeamPanel report={report.data} />}
            </>
          )}
    </div>
  );
}

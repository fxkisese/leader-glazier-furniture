// Who can open what. Shared by the Convex server (enforcement) and the admin UI (menus).
// Plain data only — no server imports — so the website can import it too.

export const ROLES = {
  ceo: { label: "CEO / Owner", description: "Everything, including staff accounts" },
  manager: { label: "Manager", description: "Runs the business day to day; no HR or payroll" },
  hr: { label: "HR", description: "Staff records, attendance and payroll only" },
  sales: { label: "Sales", description: "Records sales, customers, website orders; can't see costs or profit" },
  workshop: { label: "Workshop", description: "Production board only" },
} as const;

export type Role = keyof typeof ROLES;

export type Module =
  | "dashboard" // CEO dashboard
  | "website" // website orders, requests and catalogue
  | "sales" // record and view sales
  | "costs" // production costs, profit, expenses
  | "inventory"
  | "customers"
  | "suppliers"
  | "production"
  | "hr" // staff, attendance, payroll
  | "team"; // staff logins and roles

export const ROLE_ACCESS: Record<Role, Module[]> = {
  ceo: ["dashboard", "website", "sales", "costs", "inventory", "customers", "suppliers", "production", "hr", "team"],
  manager: ["dashboard", "website", "sales", "costs", "inventory", "customers", "suppliers", "production"],
  hr: ["hr"],
  sales: ["website", "sales", "customers", "production"],
  workshop: ["production"],
};

export const can = (role: string | undefined | null, module: Module) =>
  !!role && (ROLE_ACCESS[role as Role] ?? []).includes(module);

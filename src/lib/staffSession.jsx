import { createContext, useContext } from "react";
import { can } from "../../convex/permissions";

const StaffContext = createContext({ account: null, can: () => false, signOut: () => {} });

export function StaffProvider({ account, signOut, children }) {
  const value = { account, signOut, can: (module) => can(account?.role, module) };
  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>;
}

/** The signed-in staff account and a `can(module)` check — see convex/permissions.ts. */
export const useStaff = () => useContext(StaffContext);

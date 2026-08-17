/**
 * APTLY — AppShell Component
 *
 * Root layout wrapper that includes Navbar and main content area.
 */

import { type ReactNode } from "react";
import { Navbar } from "./Navbar";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <Navbar />
      <main
        id="main-content"
        className="app-main"
      >
        {children}
      </main>
    </div>
  );
}

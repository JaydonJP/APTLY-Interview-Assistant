import { type ReactNode } from "react";
import { Navbar } from "./Navbar";

interface AppShellProps {
  children: ReactNode;
  width?: "default" | "wide";
}

export function AppShell({ children, width = "default" }: AppShellProps) {
  return (
    <div className="app-shell">
      <Navbar />
      <main
        id="main-content"
        className={
          width === "wide"
            ? "mx-auto w-[min(100%-2rem,90rem)] py-8 pb-16"
            : "app-main"
        }
      >
        {children}
      </main>
    </div>
  );
}

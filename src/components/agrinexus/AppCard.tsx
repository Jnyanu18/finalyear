import React from "react";

interface AppCardProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function AppCard({ title, subtitle, actions, children }: AppCardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-card/60 p-4 shadow-sm backdrop-blur-md md:p-6 transition-all duration-300">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          {title ? <h3 className="section-title">{title}</h3> : null}
          {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
        </div>
        {actions ? <div>{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

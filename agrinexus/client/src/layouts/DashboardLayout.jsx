import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Bot,
  Droplets,
  Gauge,
  Home,
  Leaf,
  LineChart,
  ShieldAlert,
  Sprout,
  Store,
  Tractor,
  UserCircle2,
  ClipboardCheck,
  LogOut,
  FileText
} from "lucide-react";
import { useAuthStore } from "../store/authStore";

const navItems = [
  { to: "/dashboard", label: "Home", icon: Home, end: true },
  { to: "/dashboard/crop-monitor", label: "Crop Monitor", icon: Leaf },
  { to: "/dashboard/yield-forecast", label: "Yield Forecast", icon: LineChart },
  { to: "/dashboard/disease-risk", label: "Disease Risk", icon: ShieldAlert },
  { to: "/dashboard/irrigation", label: "Irrigation Planner", icon: Droplets },
  { to: "/dashboard/harvest", label: "Harvest Planner", icon: Tractor },
  { to: "/dashboard/storage", label: "Storage Advisor", icon: Store },
  { to: "/dashboard/market", label: "Market Routing", icon: Gauge },
  { to: "/dashboard/profit", label: "Profit Simulator", icon: Sprout },
  { to: "/dashboard/advisor", label: "AI Advisor Chat", icon: Bot },
  { to: "/dashboard/reports", label: "Reports", icon: FileText },
  { to: "/dashboard/profile", label: "Profile", icon: UserCircle2 },
  { to: "/dashboard/outcome", label: "Outcome Learning", icon: ClipboardCheck }
];

export default function DashboardLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-lg font-semibold">
            <Leaf className="h-5 w-5 text-brand-500" />
            AgriNexus
          </Link>
          <div className="text-sm text-slate-400">Signed in as {user?.email || "farmer"}</div>
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:border-slate-500"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[260px_1fr]">
        <aside className="card h-fit p-3">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                      isActive ? "bg-brand-600/20 text-brand-200" : "text-slate-300 hover:bg-slate-800"
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </aside>
        <main className="space-y-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

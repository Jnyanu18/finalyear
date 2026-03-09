"use client";

import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    Camera,
    TrendingUp,
    Bug,
    Droplet,
    CalendarCheck,
    Box,
    MapPin,
    DollarSign,
    MessageSquare,
    FileText,
    User,
    Search,
    Plus,
    Bell,
    HelpCircle,
    CheckSquare
} from "lucide-react";
import { useAuth } from "@/auth/client";


interface DashboardLayoutProps {
    children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    const { pathname } = useLocation();
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const navigationGroups = [
        {
            title: "OVERVIEW",
            items: [
                { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
                { name: "Advisor", href: "/dashboard/advisor", icon: MessageSquare },
            ]
        },
        {
            title: "INTELLIGENCE",
            items: [
                { name: "Crop Monitor", href: "/dashboard/monitor", icon: Camera },
                { name: "Yield Forecast", href: "/dashboard/yield", icon: TrendingUp },
                { name: "Disease Risk", href: "/dashboard/disease", icon: Bug },
                { name: "Irrigation", href: "/dashboard/irrigation", icon: Droplet },
            ]
        },
        {
            title: "OPERATIONS",
            items: [
                { name: "Harvesting", href: "/dashboard/harvest", icon: CalendarCheck },
                { name: "Storage", href: "/dashboard/storage", icon: Box },
                { name: "Outcomes", href: "/dashboard/outcomes", icon: CheckSquare },
            ]
        },
        {
            title: "FINANCIALS",
            items: [
                { name: "Market Routing", href: "/dashboard/market", icon: MapPin },
                { name: "Profit Simulation", href: "/dashboard/profit", icon: DollarSign },
            ]
        },
        {
            title: "ACCOUNT",
            items: [
                { name: "Reports", href: "/dashboard/report", icon: FileText },
                { name: "Farm Profile", href: "/dashboard/profile", icon: User },
            ]
        }
    ];

    const handleSignOut = async () => {
        await logout();
        navigate("/login");
    };

    return (
        <div className="flex h-screen bg-[#0E1111] text-foreground font-sans dark">
            {/* Sidebar */}
            <div className="w-64 flex-shrink-0 border-r border-white/10 bg-[#0A0C0C] flex flex-col">
                <div className="flex h-16 items-center px-6">
                    <div className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight">
                        <div className="bg-primary/20 p-1.5 rounded-md">
                            <Bug className="h-5 w-5 text-primary" /> {/* Replace with actual logo icon */}
                        </div>
                        AgriNexus
                    </div>
                </div>

                <div className="flex flex-col flex-1 overflow-y-auto py-6 hide-scrollbar">
                    {navigationGroups.map((group, idx) => (
                        <div key={group.title} className={idx > 0 ? "mt-8" : ""}>
                            <h3 className="px-6 text-xs font-semibold text-muted-foreground tracking-wider mb-2">
                                {group.title}
                            </h3>
                            <nav className="space-y-1 px-3">
                                {group.items.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.name}
                                            to={item.href}
                                            className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${isActive
                                                ? "bg-primary/10 text-primary"
                                                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                                                }`}
                                        >
                                            <item.icon
                                                className={`mr-3 h-4 w-4 flex-shrink-0 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                                    }`}
                                            />
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-white/10 mt-auto">
                    <div className="flex items-center gap-3 px-2">
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                            {user?.email?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{user?.email}</p>
                            <button
                                onClick={handleSignOut}
                                className="text-xs text-muted-foreground hover:text-white transition-colors truncate w-full text-left"
                            >
                                Sign out
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0c0c]">
                {/* Top Navigation Bar */}
                <header className="h-16 flex items-center justify-between px-8 border-b border-white/10 bg-[#0E1111]">
                    <div className="flex-1 max-w-2xl">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search farm records, AI insights..."
                                className="w-full bg-[#1A1D1D] border-none rounded-md pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                                <kbd className="hidden sm:inline-block bg-white/5 border border-white/10 rounded px-1.5 text-[10px] font-medium text-muted-foreground">⌘</kbd>
                                <kbd className="hidden sm:inline-block bg-white/5 border border-white/10 rounded px-1.5 text-[10px] font-medium text-muted-foreground">K</kbd>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 ml-4">
                        <button className="flex items-center gap-2 bg-transparent hover:bg-white/5 border border-white/10 text-sm font-medium px-3 py-1.5 rounded-md transition-colors">
                            <Plus className="h-4 w-4 text-primary" />
                            New Action
                        </button>
                        <button className="text-muted-foreground hover:text-foreground relative">
                            <Bell className="h-5 w-5" />
                            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive border-2 border-[#0E1111]"></span>
                        </button>
                        <button className="text-muted-foreground hover:text-foreground">
                            <HelpCircle className="h-5 w-5" />
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto p-8 relative">
                    <div className="max-w-[1200px] mx-auto w-full relative z-10">
                        {children}
                    </div>
                </main>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}} />
        </div>
    );
}

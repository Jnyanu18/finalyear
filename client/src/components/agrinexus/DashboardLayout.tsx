"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    Camera,
    TrendingUp,
    Bug,
    CalendarCheck,
    Box,
    MapPin,
    DollarSign,
    User,
    Search,
    Plus,
    Bell,
    HelpCircle
} from "lucide-react";
import { useAuth } from "@/auth/client";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";


interface DashboardLayoutProps {
    children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    const { pathname } = useLocation();
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const { toast } = useToast();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        toast({
            title: "Search Initiated",
            description: `Searching across your farm for "${searchQuery}"...`,
        });

        // Clear query
        setSearchQuery("");
    };

    const navigationGroups = [
        {
            title: "INTELLIGENCE",
            items: [
                { name: "Crop Monitor", href: "/dashboard/monitor", icon: Camera },
                { name: "Yield Forecast", href: "/dashboard/yield", icon: TrendingUp },
                { name: "Disease Risk", href: "/dashboard/disease", icon: Bug },
            ]
        },
        {
            title: "OPERATIONS",
            items: [
                { name: "Harvesting", href: "/dashboard/harvest", icon: CalendarCheck },
                { name: "Storage", href: "/dashboard/storage", icon: Box },
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
                { name: "Farm Profile", href: "/dashboard/profile", icon: User },
            ]
        }
    ];

    const handleSignOut = async () => {
        await logout();
        navigate("/login");
    };

    return (
        <div className="flex h-screen bg-background text-foreground font-sans dark antialiased selection:bg-primary/30">
            {/* Sidebar */}
            <div className="w-64 flex-shrink-0 border-r border-white/5 bg-background/40 backdrop-blur-xl flex flex-col relative z-20">
                <div className="flex h-16 items-center px-6 border-b border-white/5">
                    <div className="flex items-center gap-3 text-white font-headline font-bold text-xl tracking-tight">
                        <div className="bg-gradient-to-br from-primary to-emerald-600 p-1.5 rounded-lg shadow-lg shadow-primary/20">
                            <Bug className="h-5 w-5 text-white" />
                        </div>
                        AgriNexus
                    </div>
                </div>

                <div className="flex flex-col flex-1 overflow-y-auto py-6 hide-scrollbar space-y-8">
                    {navigationGroups.map((group) => (
                        <div key={group.title}>
                            <h3 className="px-6 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-widest mb-3">
                                {group.title}
                            </h3>
                            <nav className="space-y-1 px-3">
                                {group.items.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.name}
                                            to={item.href}
                                            className={`group relative flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 ${isActive
                                                ? "text-white bg-white/10 shadow-sm ring-1 ring-white/5"
                                                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                                                }`}
                                        >
                                            {isActive && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                                            )}
                                            <item.icon
                                                className={`mr-3 h-[18px] w-[18px] flex-shrink-0 transition-transform duration-300 ${isActive ? "text-primary scale-110" : "text-muted-foreground group-hover:text-foreground group-hover:scale-110"
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

                <div className="p-4 border-t border-white/5 mt-auto bg-background/50 backdrop-blur-md">
                    <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/80 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-background group-hover:ring-primary/50 transition-all">
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
            <div className="flex-1 flex flex-col overflow-hidden bg-transparent">
                {/* Top Navigation Bar */}
                <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-background/40 backdrop-blur-xl relative z-10">
                    <div className="flex-1 max-w-2xl">
                        <form onSubmit={handleSearch} className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search insights, logs, fields..."
                                className="w-full bg-white/5 border border-white/5 rounded-full pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:bg-white/10 transition-all shadow-sm"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                                <kbd className="hidden sm:inline-block bg-white/5 border border-white/10 rounded px-1.5 text-[10px] font-medium text-muted-foreground">↵</kbd>
                            </div>
                        </form>
                    </div>

                    <div className="flex items-center gap-4 ml-4">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-4 py-2 rounded-full shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all">
                                    <Plus className="h-4 w-4" />
                                    New Action
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 bg-background/95 backdrop-blur-xl border-white/10 text-foreground shadow-2xl rounded-xl p-2">
                                <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem asChild className="hover:bg-white/10 cursor-pointer">
                                    <Link to="/dashboard/monitor" className="flex items-center gap-2">
                                        <Camera className="h-4 w-4" /> Scan Crop
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className="hover:bg-white/10 cursor-pointer">
                                    <Link to="/dashboard/disease" className="flex items-center gap-2">
                                        <Bug className="h-4 w-4" /> Report Pest
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className="hover:bg-white/10 cursor-pointer">
                                    <Link to="/dashboard/harvest" className="flex items-center gap-2">
                                        <CalendarCheck className="h-4 w-4" /> Log Harvest
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
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
                    {/* Decorative blurred orbit in the background */}
                    <div className="absolute top-0 right-0 -m-32 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none opacity-50 mix-blend-screen" />
                    <div className="absolute bottom-0 left-0 -m-32 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none opacity-50 mix-blend-screen" />

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

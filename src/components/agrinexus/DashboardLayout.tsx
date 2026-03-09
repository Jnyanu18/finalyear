// @ts-nocheck
"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
    LogOut
} from "lucide-react";
import { useAuth, useUser } from "@/firebase/provider";
import { signOut } from "firebase/auth";


interface DashboardLayoutProps {
    children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    const pathname = usePathname();
    const { user } = useUser();
    const auth = useAuth();
    const router = useRouter();

    const navigation = [
        { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
        { name: "Crop Monitor", href: "/dashboard/monitor", icon: Camera },
        { name: "Yield Forecast", href: "/dashboard/yield", icon: TrendingUp },
        { name: "Disease Risk", href: "/dashboard/disease", icon: Bug },
        { name: "Irrigation Planner", href: "/dashboard/irrigation", icon: Droplet },
        { name: "Harvest Planner", href: "/dashboard/harvest", icon: CalendarCheck },
        { name: "Storage Advisor", href: "/dashboard/storage", icon: Box },
        { name: "Market Routing", href: "/dashboard/market", icon: MapPin },
        { name: "Profit Simulator", href: "/dashboard/profit", icon: DollarSign },
        { name: "AI Advisor Chat", href: "/dashboard/advisor", icon: MessageSquare },
        { name: "Reports", href: "/dashboard/report", icon: FileText },
        { name: "Profile", href: "/dashboard/profile", icon: User },
    ];

    const handleSignOut = async () => {
        if (auth) {
            await signOut(auth);
        }
        router.push("/login");
    };

    return (
        <div className="flex h-screen bg-muted/20">
            {/* Sidebar */}
            <div className="w-64 flex-shrink-0 border-r bg-background">
                <div className="flex h-16 items-center px-4 border-b">
                    <h1 className="text-xl font-bold text-primary">AgriNexus</h1>
                </div>
                <div className="flex flex-col flex-1 overflow-y-auto pt-4 pb-20">
                    <nav className="flex-1 space-y-1 px-2">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        }`}
                                >
                                    <item.icon
                                        className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                                            }`}
                                    />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
                <div className="absolute bottom-0 w-64 border-t bg-background p-4">
                    <div className="flex items-center">
                        <div className="ml-3">
                            <p className="text-sm font-medium text-foreground">{user?.email}</p>
                            <button
                                onClick={handleSignOut}
                                className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center mt-1"
                            >
                                <LogOut className="mr-1 h-3 w-3" /> Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-auto">
                <main className="p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}

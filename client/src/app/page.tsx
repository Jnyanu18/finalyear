// @ts-nocheck

'use client';

import Link from 'react-router-dom';
import { Leaf, Bot, BarChart, ShoppingCart, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, useUser } from '@/auth/client';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/theme-toggle';

export default function HomePage() {
  const { user, isUserLoading } = useUser();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    router.push('/'); // Redirect to home page after logout
  };

  const features = [
    {
      icon: <Bot className="h-10 w-10 text-primary" />,
      title: "AI-Powered Vision Analysis",
      description: "Utilizes the Gemini vision model via Genkit to analyze tomato plant images. It counts visible tomatoes and classifies them by growth stage (flower, immature, ripening, mature), returning structured JSON for further analysis."
    },
    {
      icon: <BarChart className="h-10 w-10 text-primary" />,
      title: "Yield & Harvest Forecasting",
      description: "Feeds AI analysis data into a sophisticated forecasting function to estimate current yield, sellable yield, and project a 'Ready-to-Harvest' curve. It also generates an optimal daily harvest plan based on user-defined capacity."
    },
    {
      icon: <ShoppingCart className="h-10 w-10 text-primary" />,
      title: "Market Price & Profit Analysis",
      description: "A dedicated Genkit flow forecasts future tomato prices for a specified district, identifying the best date to sell for maximum profit and calculating expected revenue. This provides actionable insights for financial planning."
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors duration-300 selection:bg-primary/30 selection:text-primary">
      <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/40">
        <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
          <Link href="/" className="mr-6 flex items-center space-x-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
              <Leaf className="h-5 w-5 text-primary transition-transform group-hover:scale-110" />
            </div>
            <span className="font-headline text-lg font-bold tracking-tight">AgriVisionAI</span>
          </Link>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <nav className="flex items-center space-x-2">
              {isUserLoading ? null : user ? (
                <>
                  <Button className="rounded-full shadow-md hover:shadow-lg transition-all" asChild>
                    <Link href="/dashboard">Dashboard</Link>
                  </Button>
                  <Button variant="ghost" className="rounded-full hidden sm:flex" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" className="rounded-full hidden sm:flex" asChild>
                    <Link href="/login">Sign In</Link>
                  </Button>
                  <Button className="rounded-full shadow-md hover:shadow-lg transition-all" asChild>
                    <Link href="/register">Get Started</Link>
                  </Button>
                </>
              )}
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 pt-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 md:py-32 lg:py-48 group">
          <div
            aria-hidden="true"
            className="absolute inset-0 grid grid-cols-2 -space-x-52 opacity-40 transition-opacity duration-1000 group-hover:opacity-70 dark:opacity-20"
          >
            <div className="h-64 bg-gradient-to-br from-primary via-primary/50 to-transparent blur-[120px] dark:from-primary/60"></div>
            <div className="h-48 mt-24 bg-gradient-to-l from-green-500/40 via-emerald-400/20 to-transparent blur-[120px] dark:from-green-500/30"></div>
          </div>
          <div className="container relative z-10 mx-auto px-4 md:px-6 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-8 backdrop-blur-sm">
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
              Next-Gen Crop Intelligence
            </div>
            <h1 className="font-headline text-5xl font-extrabold tracking-tight md:text-6xl lg:text-7xl lg:leading-[1.1] max-w-4xl mx-auto dark:drop-shadow-sm">
              Smart Yield <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">Intelligence</span> for Tomato Farmers
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed">
              Leverage the power of AI to analyze your crops, forecast yields, and optimize your harvest for maximum profit. Grow smarter with AgriVisionAI.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" className="h-12 px-8 rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all text-md" asChild>
                <Link href="/dashboard">Start Analysis</Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 rounded-full border-primary/20 bg-background/50 backdrop-blur-sm hover:bg-primary/5 transition-all text-md" asChild>
                <Link href="#features">Learn More</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features/Description Section */}
        <section id="features" className="relative py-24 md:py-32">
          {/* Subtle background separation */}
          <div className="absolute inset-0 bg-muted/30 border-t border-b border-white/5 backdrop-blur-3xl -z-10"></div>
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-3xl text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h2 className="font-headline text-3xl md:text-4xl font-bold tracking-tight">A Revolution in Agricultural Technology</h2>
              <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
                AgriVisionAI is a comprehensive intelligence platform. It leverages a modern tech stack—Next.js, MongoDB, and Gemini AI—to deliver a seamless experience from image upload to actionable decisions.
              </p>
            </div>

            <div className="grid gap-6 md:gap-8 md:grid-cols-1 lg:grid-cols-3">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="group relative overflow-hidden rounded-2xl border bg-card/50 backdrop-blur-md p-8 text-left shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 hover:bg-card/80 animate-in fade-in slide-in-from-bottom-8"
                  style={{ animationDelay: `${index * 150}ms`, animationFillMode: 'both' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                  <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20 transition-transform duration-300 group-hover:scale-110">
                    {feature.icon}
                  </div>
                  <h3 className="font-headline text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed relative z-10">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 md:py-8">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-primary" />
            <p className="text-center text-sm text-muted-foreground md:text-left">
              © {new Date().getFullYear()} AgriVisionAI. All Rights Reserved.
            </p>
          </div>
          <p className="text-center text-sm text-muted-foreground"></p>
        </div>
      </footer>
    </div>
  );
}

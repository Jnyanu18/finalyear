"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bot, Send, User, ShieldCheck, Bug, CloudRain, Sprout, Loader2 } from "lucide-react";
import { advisorChat } from "@/lib/api";

type Message = { id: string; sender: "user" | "ai"; text: string };

const QUICK_PROMPTS = [
    { label: "Disease Risk", icon: Bug, text: "What is the current disease risk for my Tomatoes?" },
    { label: "Irrigation Check", icon: CloudRain, text: "Should I irrigate today?" },
    { label: "Harvest Timing", icon: Sprout, text: "When should I harvest for maximum yield?" },
    { label: "Best Market", icon: ShieldCheck, text: "Which market should I sell my crop at today?" },
];

export default function AIAdvisorPage() {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async (text?: string) => {
        const query = text || input;
        if (!query.trim() || loading) return;
        setInput("");

        const userMsg: Message = { id: Date.now().toString(), sender: "user", text: query };
        setMessages(prev => [...prev, userMsg]);
        setLoading(true);

        const res = await advisorChat(query);
        const aiText = res.success && res.data?.reply
            ? res.data.reply
            : res.error || "I couldn't get a response from the AI. Please make sure the backend is running with a valid Gemini API key.";

        const aiMsg: Message = { id: (Date.now() + 1).toString(), sender: "ai", text: aiText };
        setMessages(prev => [...prev, aiMsg]);
        setLoading(false);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500 max-w-4xl mx-auto">
            <div className="mb-6 shrink-0">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">AI Agronomy Advisor</h1>
                <p className="text-muted-foreground mt-2">Chat with your farm's digital twin. Ask about soil, crops, or market strategy.</p>
            </div>

            <Card className="flex-1 flex flex-col bg-[#0E1111] border-white/5 overflow-hidden min-h-0">
                {/* Header */}
                <CardHeader className="border-b border-white/5 flex flex-row items-center gap-4 py-4 px-6 bg-[#1A1D1D] shrink-0">
                    <div className="h-12 w-12 rounded-full bg-primary/20 flex shrink-0 items-center justify-center">
                        <Bot className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <p className="font-semibold text-foreground">AgriNexus Intelligence</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                            <span className="h-2 w-2 bg-primary rounded-full animate-pulse inline-block" />
                            Gemini {messages.length === 0 ? "Ready" : "Online"} · Context-aware farm advisor
                        </p>
                    </div>
                </CardHeader>

                {/* Quick Prompts */}
                {messages.length === 0 && (
                    <div className="px-6 py-4 border-b border-white/5 bg-[#0A0C0C] shrink-0">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Quick Prompts</p>
                        <div className="flex flex-wrap gap-2">
                            {QUICK_PROMPTS.map((p) => (
                                <Button key={p.label} variant="outline" size="sm"
                                    className="bg-[#1A1D1D] border-white/10 hover:bg-white/5 hover:text-primary transition-colors text-xs rounded-full"
                                    onClick={() => handleSend(p.text)}>
                                    <p.icon className="h-3 w-3 mr-1" /> {p.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Messages */}
                <CardContent className="flex-1 overflow-y-auto p-6 space-y-5 min-h-0">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                                <Bot className="h-10 w-10 text-primary" />
                            </div>
                            <p className="text-center">Ask me anything about your crops, weather, pests, or market prices!</p>
                        </div>
                    )}
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                            <div className={`flex max-w-[80%] gap-3 ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}>
                                <div className={`h-8 w-8 rounded-full flex shrink-0 items-center justify-center ${msg.sender === "user" ? "bg-white/10" : "bg-primary/20"}`}>
                                    {msg.sender === "user" ? <User className="h-4 w-4 text-white" /> : <ShieldCheck className="h-4 w-4 text-primary" />}
                                </div>
                                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.sender === "user"
                                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                                    : "bg-[#1A1D1D] text-foreground border border-white/5 rounded-tl-sm shadow-xl"}`}>
                                    {msg.text}
                                </div>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="flex gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                                    <ShieldCheck className="h-4 w-4 text-primary" />
                                </div>
                                <div className="px-4 py-3 rounded-2xl bg-[#1A1D1D] border border-white/5 flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    <span className="text-sm text-muted-foreground">Thinking...</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </CardContent>

                {/* Input */}
                <div className="p-4 bg-[#1A1D1D] border-t border-white/5 m-4 rounded-2xl flex items-center gap-3 shrink-0">
                    <Input value={input} onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                        placeholder="Ask your farm advisor..."
                        className="flex-1 bg-transparent border-none focus-visible:ring-0 text-foreground placeholder:text-muted-foreground px-2 h-10" />
                    <Button onClick={() => handleSend()} disabled={!input.trim() || loading}
                        size="icon" className="h-10 w-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 transition-transform active:scale-95">
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </Card>
        </div>
    );
}

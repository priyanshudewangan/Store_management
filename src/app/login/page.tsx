"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, ShieldCheck, UserCheck, Eye, EyeOff, Loader2 } from "lucide-react";
import { Toaster, toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Please enter both username and password");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Login failed");
      } else {
        toast.success(`Welcome back, ${data.user.name}!`);
        // Force reload page to let middleware route correctly
        setTimeout(() => {
          router.replace(data.user.role === "admin" ? "/admin" : "/pos");
          router.refresh();
        }, 800);
      }
    } catch (err) {
      toast.error("An error occurred during login");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (role: "admin" | "cashier") => {
    if (role === "admin") {
      setUsername("admin");
      setPassword("admin123");
      toast.info("Filled Admin credentials (admin / admin123)");
    } else {
      setUsername("cashier");
      setPassword("cashier123");
      toast.info("Filled Cashier credentials (cashier / cashier123)");
    }
  };

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center bg-black overflow-hidden px-4">
      {/* Soft background glow for contrast */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-neutral-900/20 rounded-full blur-[120px] pointer-events-none" />

      <Toaster position="top-center" richColors />

      <div className="w-full max-w-md z-10 animate-in fade-in slide-in-from-bottom-8 duration-500">
        {/* Brand Logo header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-md border border-neutral-800 mb-3">
            <Store className="w-6 h-6 text-black stroke-[2.2]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            KiranaPOS
          </h1>
          <p className="text-neutral-500 text-sm mt-1 font-light">Smart POS & Inventory Management System</p>
        </div>

        <Card className="glass-panel border-neutral-900 text-white shadow-2xl relative overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-semibold tracking-tight">Sign In</CardTitle>
            <CardDescription className="text-neutral-400 font-light text-xs">
              Access your shop's counter checkout or inventory panel.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-neutral-300 text-xs font-medium">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-black/40 border-neutral-900 focus-visible:ring-white/30 text-white placeholder-neutral-600 text-sm"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-neutral-300 text-xs font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-black/40 border-neutral-900 focus-visible:ring-white/30 text-white placeholder-neutral-600 text-sm pr-10"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black font-semibold hover:bg-neutral-200 transition-colors shadow-sm cursor-pointer rounded-lg h-10"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>

              {/* Demo Section */}
              <div className="w-full pt-4 border-t border-neutral-900">
                <p className="text-[10px] text-neutral-500 text-center font-medium mb-3 uppercase tracking-wider">
                  Quick Demo Accounts
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDemoFill("admin")}
                    className="border-neutral-850 bg-neutral-900/40 text-neutral-300 hover:bg-neutral-800 hover:text-white text-xs py-1 h-9 gap-1 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Demo Admin
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDemoFill("cashier")}
                    className="border-neutral-850 bg-neutral-900/40 text-neutral-300 hover:bg-neutral-800 hover:text-white text-xs py-1 h-9 gap-1 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Demo Cashier
                  </Button>
                </div>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  );
}

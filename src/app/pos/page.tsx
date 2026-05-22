"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Store,
  QrCode,
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  LogOut,
  Settings,
  Wifi,
  WifiOff,
  Percent,
  BadgePercent,
  Coins,
  CreditCard,
  Smartphone,
  AlertTriangle,
  RefreshCw,
  TrendingDown,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import BarcodeScanner from "@/components/BarcodeScanner";
import ThermalReceipt from "@/components/ThermalReceipt";

interface Product {
  _id: string;
  name: string;
  barcode: string;
  category: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  lowStockAlert: number;
  imageUrl?: string;
}

interface CartItem extends Product {
  quantity: number;
  taxRate: number; // custom tax rate (e.g. 18 for 18% GST)
}

export default function POSPage() {
  const router = useRouter();

  // Authentication State
  const [cashier, setCashier] = useState<{ name: string; role: string } | null>(null);

  // Connection & Offline State
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);

  // Catalog and Cart state
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderDiscount, setOrderDiscount] = useState<number>(0);
  const [mobileTab, setMobileTab] = useState<"catalog" | "cart">("catalog");

  // Dialog/Modal state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card">("cash");
  const [cashReceived, setCashReceived] = useState<string>("");

  // Completed transaction for receipt view
  const [completedSale, setCompletedSale] = useState<any | null>(null);

  // USB Barcode Scanner Hook State
  const barcodeBuffer = useRef<string>("");
  const lastKeyTime = useRef<number>(0);

  // Fetch initial cashier details and product list
  useEffect(() => {
    fetchCashier();
    fetchProducts();

    // Monitor browser connection status
    setIsOnline(navigator.onLine);
    const goOnline = () => {
      setIsOnline(true);
      toast.success("Connection restored! Auto-syncing pending invoices...");
      syncOfflineQueue();
    };
    const goOffline = () => {
      setIsOnline(false);
      toast.warning("Disconnected. App is running in offline local mode.");
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    // Load offline queue from LocalStorage
    const queue = localStorage.getItem("kirana_offline_sales");
    if (queue) {
      setOfflineQueue(JSON.parse(queue));
    }

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Global window keyboard listener for physical USB barcode scanner guns
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // USB scanners type barcode numbers extremely rapidly (usually within 20ms of each other)
      // and append "Enter" (KeyCode 13) at the end.
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime.current;
      lastKeyTime.current = currentTime;

      // Ignore modifiers and focusable elements if they are typing normal text
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        // If cashier is focused inside search/inputs, let normal typing happen
        return;
      }

      // If key is typed quickly, accumulate in buffer
      if (timeDiff < 50) {
        if (e.key === "Enter") {
          const barcode = barcodeBuffer.current.trim();
          if (barcode) {
            handleBarcodeScanned(barcode);
          }
          barcodeBuffer.current = "";
        } else if (/^[a-zA-Z0-9]$/.test(e.key)) {
          barcodeBuffer.current += e.key;
        }
      } else {
        // Reset buffer if delay is too long (normal keyboard typing)
        if (/^[a-zA-Z0-9]$/.test(e.key)) {
          barcodeBuffer.current = e.key;
        } else {
          barcodeBuffer.current = "";
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [products, cart]); // re-bind when products or cart changes to access latest state

  const fetchCashier = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCashier(data.user);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
        // Cache products locally in LocalStorage for offline query fallback
        localStorage.setItem("kirana_local_products", JSON.stringify(data.products));
      } else {
        loadLocalProductsFallback();
      }
    } catch (err) {
      console.error("Failed to fetch online products, loading fallback...", err);
      loadLocalProductsFallback();
    }
  };

  const loadLocalProductsFallback = () => {
    const local = localStorage.getItem("kirana_local_products");
    if (local) {
      setProducts(JSON.parse(local));
      toast.info("Loaded cached products database offline.");
    }
  };

  // Sync offline queue to MongoDB
  const syncOfflineQueue = async () => {
    const queue = localStorage.getItem("kirana_offline_sales");
    if (!queue) return;
    const pendingSales = JSON.parse(queue);
    if (pendingSales.length === 0) return;

    setSyncing(true);
    let successCount = 0;
    const remainingQueue = [];

    for (const sale of pendingSales) {
      try {
        const res = await fetch("/api/sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sale),
        });
        if (res.ok) {
          successCount++;
        } else {
          remainingQueue.push(sale);
        }
      } catch (err) {
        remainingQueue.push(sale);
      }
    }

    localStorage.setItem("kirana_offline_sales", JSON.stringify(remainingQueue));
    setOfflineQueue(remainingQueue);
    setSyncing(false);

    if (successCount > 0) {
      toast.success(`Successfully synchronized ${successCount} offline invoices to database!`);
      fetchProducts(); // Refresh stock totals
    }
  };

  // Barcode Handler (camera or keyboard scanner)
  const handleBarcodeScanned = (barcode: string) => {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return;

    const matchedProduct = products.find(
      (p) => p.barcode === cleanBarcode || p.barcode.replace(/^0+/, "") === cleanBarcode.replace(/^0+/, "")
    );

    if (matchedProduct) {
      addToCart(matchedProduct);
      toast.success(`Scanned: ${matchedProduct.name}`, { icon: "🏷️" });
    } else {
      toast.error(`No product found matching barcode: ${cleanBarcode}`);
    }
  };

  // Cart operations
  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item._id === product._id);
      if (existing) {
        return prevCart.map((item) =>
          item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1, taxRate: 0 }]; // default 0% GST, customisable
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item._id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : item;
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prevCart) => prevCart.filter((item) => item._id !== id));
    toast.info("Item removed from cart");
  };

  const clearCart = () => {
    setCart([]);
    setOrderDiscount(0);
    toast.info("Cart cleared");
  };

  // Calculate Prices
  const getSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);
  };

  const getTax = () => {
    return cart.reduce(
      (sum, item) => sum + item.sellingPrice * item.quantity * (item.taxRate / 100),
      0
    );
  };

  const getGrandTotal = () => {
    const sub = getSubtotal();
    const tax = getTax();
    return Math.max(0, sub + tax - orderDiscount);
  };

  // Checkout process
  const triggerPayment = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setPaymentMethod("cash");
    setCashReceived("");
    setIsPaymentOpen(true);
  };

  const handleCheckoutComplete = async () => {
    const subtotal = getSubtotal();
    const tax = getTax();
    const total = getGrandTotal();
    const change = paymentMethod === "cash" && cashReceived
      ? parseFloat(cashReceived) - total
      : 0;

    if (paymentMethod === "cash" && (!cashReceived || parseFloat(cashReceived) < total)) {
      toast.error("Insufficient cash received amount");
      return;
    }

    const salePayload = {
      items: cart.map((item) => ({
        productId: item._id,
        name: item.name,
        quantity: item.quantity,
        sellingPrice: item.sellingPrice,
        purchasePrice: item.purchasePrice,
        taxRate: item.taxRate,
      })),
      subtotal,
      discount: orderDiscount,
      tax,
      total,
      paymentMethod,
      cashReceived: paymentMethod === "cash" ? parseFloat(cashReceived) : undefined,
      changeDue: paymentMethod === "cash" ? change : undefined,
    };

    setIsPaymentOpen(false);

    if (navigator.onLine && isOnline) {
      // Sync immediately online
      try {
        const res = await fetch("/api/sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(salePayload),
        });

        const data = await res.json();
        if (res.ok) {
          // Success
          setCompletedSale(data.sale);
          toast.success("Transaction completed successfully!");

          // Decrement stock in local state
          const updatedProducts = products.map((prod) => {
            const cartMatch = cart.find((item) => item._id === prod._id);
            if (cartMatch) {
              return { ...prod, stock: Math.max(0, prod.stock - cartMatch.quantity) };
            }
            return prod;
          });
          setProducts(updatedProducts);
          localStorage.setItem("kirana_local_products", JSON.stringify(updatedProducts));

          setCart([]);
          setOrderDiscount(0);
        } else {
          toast.error(data.error || "Failed to process sale online");
        }
      } catch (err) {
        console.error("Online checkout failed, falling back to offline mode", err);
        saveOfflineSale(salePayload);
      }
    } else {
      // Save offline
      saveOfflineSale(salePayload);
    }
  };

  const saveOfflineSale = (salePayload: any) => {
    // Generate simulated offline invoice number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-OFF-${dateStr}-${randomSuffix}`;

    const offlineSale = {
      ...salePayload,
      invoiceNumber,
      cashierName: cashier?.name || "Offline Cashier",
      createdAt: new Date().toISOString(),
    };

    const newQueue = [...offlineQueue, offlineSale];
    localStorage.setItem("kirana_offline_sales", JSON.stringify(newQueue));
    setOfflineQueue(newQueue);

    // Deduct stock in client UI immediately
    const updatedProducts = products.map((prod) => {
      const cartMatch = cart.find((item) => item._id === prod._id);
      if (cartMatch) {
        return { ...prod, stock: Math.max(0, prod.stock - cartMatch.quantity) };
      }
      return prod;
    });
    setProducts(updatedProducts);
    localStorage.setItem("kirana_local_products", JSON.stringify(updatedProducts));

    setCompletedSale(offlineSale);
    toast.success("Offline Mode: Bill stored locally. Will sync when online.", { duration: 5000 });

    setCart([]);
    setOrderDiscount(0);
  };

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        toast.info("Logged out successfully");
        router.replace("/login");
        router.refresh();
      }
    } catch (err) {
      console.error("Logout error", err);
    }
  };

  // Categories list
  const categories = ["All", ...new Set(products.map((p) => p.category))];

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Hotkeys Cash calculator inputs
  const handleCashShortcut = (amount: number) => {
    const current = parseFloat(cashReceived) || 0;
    setCashReceived((current + amount).toString());
  };

  if (completedSale) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <ThermalReceipt sale={completedSale} onBack={() => setCompletedSale(null)} />
      </main>
    );
  }
  return (
    <main className="min-h-screen flex flex-col bg-[#0a0a0a] text-white overflow-x-hidden font-sans">
      <Toaster position="top-right" richColors />
      
      {/* Top Navigation Panel */}
      <header className="border-b border-neutral-900 bg-black/80 backdrop-blur px-4 py-3 lg:px-6 lg:py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow border border-neutral-800">
            <Store className="w-5 h-5 text-black stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">Chandan-Store</h1>
            <p className="text-[11px] text-neutral-500 flex items-center gap-1.5 mt-0.5 font-light">
              <span>Terminal</span>
              {cashier?.name && (
                <span className="hidden sm:inline">| Counter: {cashier.name}</span>
              )}
            </p>
          </div>
        </div>

        {/* Status Indicators & Controls */}
        <div className="flex items-center gap-2 lg:gap-4">
          {/* Offline indicator */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors duration-200 ${isOnline
              ? "bg-neutral-900 border-neutral-800 text-neutral-300"
              : "bg-red-500/5 border-red-500/15 text-red-400"
              }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3 h-3 text-neutral-450" />
                <span className="hidden sm:inline">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-red-450" />
                <span className="hidden sm:inline">Offline Mode</span>
                <span className="sm:hidden">Offline</span>
              </>
            )}
          </div>

          {/* Sync status */}
          {offlineQueue.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              disabled={syncing || !isOnline}
              onClick={syncOfflineQueue}
              className="border-amber-500/20 bg-amber-500/5 text-amber-400 hover:bg-amber-500/10 text-xs px-2.5 py-1 h-8 gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Pending ({offlineQueue.length})</span>
              <span className="sm:hidden">{offlineQueue.length}</span>
            </Button>
          )}

          {/* Admin panel link */}
          {cashier?.role === "admin" && (
            <Button
              variant="ghost"
              onClick={() => router.push("/admin")}
              className="text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent hover:border-neutral-800/80 gap-1.5 cursor-pointer px-2.5 sm:px-3 h-8.5 rounded-lg transition-all"
              title="Admin Panel"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-medium">Admin Panel</span>
            </Button>
          )}

          {/* Logout */}
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="text-neutral-400 hover:text-red-400 hover:bg-red-500/5 border border-transparent hover:border-red-500/10 gap-1.5 cursor-pointer px-2.5 sm:px-3 h-8.5 rounded-lg transition-all"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline text-xs font-medium">Logout</span>
          </Button>
        </div>
      </header>

      {/* Mobile Switch Tab Bar */}
      <div className="flex lg:hidden bg-black/90 backdrop-blur border-b border-neutral-900 px-4 py-2 sticky top-[65px] sm:top-[73px] z-10 justify-between items-center gap-2">
        <button
          onClick={() => setMobileTab("catalog")}
          className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
            mobileTab === "catalog"
              ? "bg-white text-black shadow"
              : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          Store Catalog
        </button>
        <button
          onClick={() => setMobileTab("cart")}
          className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 relative ${
            mobileTab === "cart"
              ? "bg-white text-black shadow"
              : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Active Cart
          {cart.length > 0 && (
            <span className={`ml-1 text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold ${
              mobileTab === "cart" ? "bg-neutral-900 text-white" : "bg-neutral-800 text-neutral-200"
            }`}>
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      {/* Main Grid Checkout Pane */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 p-4 lg:p-6 h-[calc(100vh-122px)] lg:h-[calc(100vh-73px)] max-h-[calc(100vh-122px)] lg:max-h-[calc(100vh-73px)] overflow-hidden relative">
        
        {/* Left Side: Cart & Totals (7 Cols) */}
        <section className={`lg:col-span-7 flex flex-col h-full overflow-hidden bg-[#121212]/30 rounded-2xl border border-neutral-900 p-4 lg:p-5 ${mobileTab === 'cart' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-md font-bold flex items-center gap-2 text-white">
              <ShoppingCart className="w-4 h-4 text-neutral-400" /> Active Cart
              <span className="text-xs bg-neutral-900 text-neutral-400 px-2 py-0.5 rounded-full font-light">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} Items
              </span>
            </h2>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsScannerOpen(true)}
                className="border-neutral-800 bg-neutral-900/50 text-neutral-300 hover:bg-neutral-800 hover:text-white gap-1.5 cursor-pointer text-xs"
              >
                <QrCode className="w-3.5 h-3.5" /> Live Camera Scan
              </Button>
              {cart.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCart}
                  className="text-neutral-450 hover:text-red-400 hover:bg-red-500/5 hover:border-red-500/10 border border-transparent cursor-pointer text-xs transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear
                </Button>
              )}
            </div>
          </div>

          {/* Cart Table Container */}
          <div className="flex-1 overflow-y-auto border border-neutral-900/80 rounded-xl bg-black/60 scrollbar-thin">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-3">
                <div className="p-4 rounded-full bg-neutral-900 border border-neutral-850">
                  <ShoppingCart className="w-8 h-8 text-neutral-600" />
                </div>
                <div>
                  <p className="font-semibold text-neutral-400 text-sm">Cart is Empty</p>
                  <p className="text-xs text-neutral-500 mt-1 max-w-[260px] font-light">
                    Scan a product barcode or select products from the grid on the right to start billing.
                  </p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-neutral-900/40 sticky top-0 z-10">
                  <TableRow className="border-neutral-900">
                    <TableHead className="text-neutral-400 text-xs px-2 sm:px-4">Item Details</TableHead>
                    <TableHead className="text-center text-neutral-400 w-24 sm:w-32 text-xs px-2 sm:px-4">Qty</TableHead>
                    <TableHead className="text-right text-neutral-400 w-24 hidden sm:table-cell text-xs px-2 sm:px-4">Rate</TableHead>
                    <TableHead className="text-right text-neutral-400 w-20 sm:w-28 text-xs px-2 sm:px-4">Amount</TableHead>
                    <TableHead className="w-10 sm:w-12 px-1"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.map((item) => {
                    const isLowStock = item.stock <= item.lowStockAlert;
                    return (
                      <TableRow key={item._id} className="border-neutral-900 hover:bg-neutral-900/25">
                        <TableCell className="px-2 py-3 lg:px-4">
                          <div>
                            <div className="font-medium text-neutral-200 text-xs sm:text-sm">{item.name}</div>
                            <div className="text-[10px] text-neutral-500 flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 font-light">
                              <span>Code: {item.barcode}</span>
                              <span className="hidden xs:inline">•</span>
                              <span>Stock: {item.stock} left</span>
                              {isLowStock && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-red-500/5 border border-red-500/15 text-red-400 text-[9px] font-medium animate-pulse-low-stock">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  Low Stock
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-2 py-3 lg:px-4">
                          <div className="flex items-center justify-center gap-1 sm:gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => updateQuantity(item._id, -1)}
                              className="w-6 h-6 sm:w-7 sm:h-7 border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800 text-neutral-350 cursor-pointer transition-colors"
                            >
                              <Minus className="w-2.5 h-2.5 sm:w-3 h-3" />
                            </Button>
                            <span className="w-6 sm:w-8 text-center text-xs sm:text-sm font-semibold text-white">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => updateQuantity(item._id, 1)}
                              className="w-6 h-6 sm:w-7 sm:h-7 border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800 text-neutral-350 cursor-pointer transition-colors"
                            >
                              <Plus className="w-2.5 h-2.5 sm:w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-neutral-350 hidden sm:table-cell px-2 py-3 lg:px-4 text-xs sm:text-sm font-light">
                          ₹{item.sellingPrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-neutral-200 px-2 py-3 lg:px-4 text-xs sm:text-sm">
                          ₹{(item.sellingPrice * item.quantity).toFixed(2)}
                        </TableCell>
                        <TableCell className="px-1 py-3 lg:px-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFromCart(item._id)}
                            className="text-neutral-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer w-7 h-7 sm:w-8 sm:h-8 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Barcode scanner emulator input (for manual entry fallback) */}
          <div className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                <QrCode className="w-4 h-4" />
              </span>
              <Input
                placeholder="Scan / Type Barcode and press Enter..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleBarcodeScanned(e.currentTarget.value);
                    e.currentTarget.value = "";
                  }
                }}
                className="pl-9 bg-black border-neutral-900 focus-visible:ring-white/30 text-white placeholder-neutral-600 text-xs sm:text-sm h-9 sm:h-10"
              />
            </div>
          </div>

          {/* Checkout Totals Summary Box */}
          <div className="mt-4 pt-4 border-t border-neutral-900 space-y-3">
            <div className="grid grid-cols-2 gap-3 lg:gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-450 flex items-center gap-1 font-medium">
                  <BadgePercent className="w-3.5 h-3.5 text-neutral-450" /> Apply Discount (₹)
                </Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={orderDiscount || ""}
                  onChange={(e) => setOrderDiscount(parseFloat(e.target.value) || 0)}
                  className="h-9 bg-black border-neutral-900 focus-visible:ring-white/30 text-xs sm:text-sm text-white"
                />
              </div>

              {/* Quick totals displays */}
              <div className="space-y-1 bg-black/60 rounded-xl p-2.5 sm:p-3 border border-neutral-900 flex flex-col justify-center">
                <div className="flex justify-between text-[11px] sm:text-xs text-neutral-450">
                  <span>Subtotal:</span>
                  <span className="text-neutral-300 font-mono">₹{getSubtotal().toFixed(2)}</span>
                </div>
                {orderDiscount > 0 && (
                  <div className="flex justify-between text-[11px] sm:text-xs text-neutral-450 mt-0.5">
                    <span>Discount:</span>
                    <span className="text-neutral-300 font-mono">-₹{orderDiscount.toFixed(2)}</span>
                  </div>
                )}
                {getTax() > 0 && (
                  <div className="flex justify-between text-[11px] sm:text-xs text-neutral-450 mt-0.5">
                    <span>GST (Inc.):</span>
                    <span className="text-neutral-300 font-mono">₹{getTax().toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Pay buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                size="lg"
                disabled={cart.length === 0}
                onClick={triggerPayment}
                className="flex-1 bg-white text-black font-semibold hover:bg-neutral-200 transition-all shadow-sm cursor-pointer h-11 sm:h-12 text-sm sm:text-md rounded-lg active:scale-95 duration-200"
              >
                Checkout & Pay (₹{getGrandTotal().toFixed(2)})
              </Button>
            </div>
          </div>
        </section>

        {/* Right Side: Product Catalog Grid & Filters (5 Cols) */}
        <section className={`lg:col-span-5 flex flex-col h-full overflow-hidden bg-[#121212]/30 rounded-2xl border border-neutral-900 p-4 lg:p-5 ${mobileTab === 'catalog' ? 'flex' : 'hidden lg:flex'}`}>
          {/* Header Controls */}
          <div className="space-y-3 mb-4">
            <h2 className="text-md font-bold flex items-center gap-2 text-white">
              <Store className="w-4 h-4 text-neutral-400" /> Store Catalog
            </h2>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                <Search className="w-4 h-4" />
              </span>
              <Input
                placeholder="Search by name, category, barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-black border-neutral-900 focus-visible:ring-white/30 text-white placeholder-neutral-605 text-xs sm:text-sm h-9 sm:h-10"
              />
            </div>

            {/* Categories horizontal scroll tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap transition-all duration-200 cursor-pointer ${selectedCategory === cat
                    ? "bg-white border-white text-black shadow-sm"
                    : "bg-neutral-900 border-neutral-850 text-neutral-400 hover:bg-neutral-800 hover:text-white"
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Items Scroll Grid */}
          <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
            {filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-neutral-500">
                <Search className="w-6 h-6 text-neutral-600 mb-2" />
                <p className="text-xs font-light">No matching products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 gap-3 pb-4">
                {filteredProducts.map((product) => {
                  const isLowStock = product.stock <= product.lowStockAlert;
                  return (
                    <Card
                      key={product._id}
                      onClick={() => addToCart(product)}
                      className={`border-neutral-900 bg-black/60 hover:border-neutral-700 hover:bg-neutral-900/40 transition-all cursor-pointer group select-none relative overflow-hidden flex flex-col h-[180px] ${isLowStock ? "border-red-500/20" : ""
                        }`}
                    >
                      <div className="p-3 flex-1 flex flex-col">
                        {/* Image Placeholder */}
                        <div className="w-full h-20 bg-neutral-900/50 border border-neutral-900 rounded-lg mb-2 overflow-hidden flex items-center justify-center relative">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                // Fallback if image fails to load
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : null}
                          <span className="absolute bottom-1 right-1 text-[9px] bg-black/90 text-neutral-450 px-1.5 py-0.5 rounded font-mono">
                            {product.category}
                          </span>
                        </div>

                        {/* Title & Info */}
                        <h3 className="font-semibold text-xs text-neutral-200 truncate group-hover:text-white transition-colors">
                          {product.name}
                        </h3>

                        {/* Price & Stock */}
                        <div className="flex items-center justify-between mt-auto pt-1">
                          <span className="font-medium text-sm text-white">
                            ₹{product.sellingPrice.toFixed(0)}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1 ${isLowStock
                              ? "bg-red-500/5 text-red-400 border border-red-500/10"
                              : "bg-neutral-900 text-neutral-400 border border-neutral-850"
                              }`}
                          >
                            {isLowStock && <TrendingDown className="w-2.5 h-2.5" />}
                            {product.stock} items
                          </span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Floating FAB on Mobile catalog to view Cart */}
        {mobileTab === "catalog" && cart.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 lg:hidden w-[calc(100%-2rem)] max-w-md px-2">
            <Button
              onClick={() => setMobileTab("cart")}
              className="w-full bg-white text-black font-semibold hover:bg-neutral-200 shadow-xl shadow-black/45 flex items-center justify-between px-6 py-4 rounded-full border border-neutral-200/10 h-12 text-sm cursor-pointer animate-in fade-in slide-in-from-bottom-4 duration-300"
            >
              <span className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-black" />
                <span>{cart.reduce((sum, item) => sum + item.quantity, 0)} items</span>
              </span>
              <span className="flex items-center gap-1.5 text-black">
                <span>View Cart</span>
                <span className="bg-neutral-900 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                  ₹{getGrandTotal().toFixed(0)}
                </span>
              </span>
            </Button>
          </div>
        )}
      </div>

      {/* Camera Barcode Scanner Modal */}
      <BarcodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />

      {/* Payment Checkout Modal */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="sm:max-w-[450px] bg-neutral-950 border-neutral-900 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <Coins className="w-5 h-5 text-neutral-450" /> Final Checkout
            </DialogTitle>
            <DialogDescription className="text-neutral-500 text-xs">
              Select payment method and finalize invoice.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Amount display */}
            <div className="bg-black border border-neutral-900 rounded-xl p-4 text-center">
              <div className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">
                Total Payable Amount
              </div>
              <div className="text-3xl font-extrabold text-white mt-1">
                ₹{getGrandTotal().toFixed(2)}
              </div>
            </div>

            {/* Payment Method Selector Grid */}
            <div className="space-y-2">
              <Label className="text-xs text-neutral-450">Select Payment Method</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={paymentMethod === "cash" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("cash")}
                  className={`py-3 h-auto flex flex-col gap-1.5 items-center justify-center transition-all cursor-pointer rounded-lg border ${paymentMethod === "cash"
                    ? "bg-white text-black hover:bg-neutral-200 border-white font-semibold"
                    : "border-neutral-900 bg-neutral-900 text-neutral-400 hover:bg-neutral-850 hover:text-white"
                    }`}
                >
                  <Coins className="w-5 h-5" />
                  <span className="text-xs font-semibold">Cash</span>
                </Button>

                <Button
                  type="button"
                  variant={paymentMethod === "upi" ? "default" : "outline"}
                  onClick={() => {
                    setPaymentMethod("upi");
                    setCashReceived("");
                  }}
                  className={`py-3 h-auto flex flex-col gap-1.5 items-center justify-center transition-all cursor-pointer rounded-lg border ${paymentMethod === "upi"
                    ? "bg-white text-black hover:bg-neutral-200 border-white font-semibold"
                    : "border-neutral-900 bg-neutral-900 text-neutral-400 hover:bg-neutral-850 hover:text-white"
                    }`}
                >
                  <Smartphone className="w-5 h-5" />
                  <span className="text-xs font-semibold">UPI / QR</span>
                </Button>

                <Button
                  type="button"
                  variant={paymentMethod === "card" ? "default" : "outline"}
                  onClick={() => {
                    setPaymentMethod("card");
                    setCashReceived("");
                  }}
                  className={`py-3 h-auto flex flex-col gap-1.5 items-center justify-center transition-all cursor-pointer rounded-lg border ${paymentMethod === "card"
                    ? "bg-white text-black hover:bg-neutral-200 border-white font-semibold"
                    : "border-neutral-900 bg-neutral-900 text-neutral-400 hover:bg-neutral-850 hover:text-white"
                    }`}
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="text-xs font-semibold">Card</span>
                </Button>
              </div>
            </div>

            {/* Cash Calculations Display (only if Cash selected) */}
            {paymentMethod === "cash" && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-200">
                <div className="space-y-1.5">
                  <Label htmlFor="cash-received" className="text-xs text-neutral-450">
                    Cash Received (₹)
                  </Label>
                  <Input
                    id="cash-received"
                    type="number"
                    placeholder="Enter cash paid by customer"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    className="bg-black border-neutral-900 text-white focus-visible:ring-white/20 focus-visible:border-white/35"
                  />
                </div>

                {/* Cash shortcuts */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[10, 50, 100, 500].map((amt) => (
                    <Button
                      key={amt}
                      type="button"
                      variant="outline"
                      onClick={() => handleCashShortcut(amt)}
                      className="border-neutral-900 bg-black hover:bg-neutral-900 text-neutral-300 font-medium text-xs py-1 h-8 cursor-pointer transition-colors"
                    >
                      +₹{amt}
                    </Button>
                  ))}
                </div>

                {/* Change display */}
                {cashReceived && parseFloat(cashReceived) >= getGrandTotal() && (
                  <div className="bg-neutral-900 border border-neutral-850 rounded-xl p-3 flex justify-between items-center text-white">
                    <span className="text-xs font-semibold text-neutral-400">Change to Return:</span>
                    <span className="text-lg font-bold font-mono">
                      ₹{(parseFloat(cashReceived) - getGrandTotal()).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-neutral-900 pt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPaymentOpen(false)}
              className="border-neutral-900 bg-neutral-900 text-neutral-305 hover:bg-neutral-850 hover:text-white cursor-pointer transition-colors"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCheckoutComplete}
              disabled={
                paymentMethod === "cash" &&
                (!cashReceived || parseFloat(cashReceived) < getGrandTotal())
              }
              className="bg-white text-black font-semibold hover:bg-neutral-200 cursor-pointer transition-colors rounded-lg"
            >
              Complete Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

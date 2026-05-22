"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TrendingUp,
  Package,
  History,
  Store,
  DollarSign,
  AlertTriangle,
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Search,
  ShoppingCart,
  Percent,
  LogOut,
  Warehouse,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// TypeScript Interfaces
interface Product {
  _id: string;
  name: string;
  barcode: string;
  category: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  lowStockAlert: number;
  expiryDate?: string;
  imageUrl?: string;
}

interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  sellingPrice: number;
  purchasePrice: number;
  taxRate: number;
}

interface Sale {
  _id: string;
  invoiceNumber: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: "cash" | "upi" | "card";
  cashierName: string;
  createdAt: string;
}

interface DashboardStats {
  totalRevenue: number;
  totalProfit: number;
  todaySales: number;
  thisMonthSales: number;
  inventory: {
    totalProducts: number;
    totalStockValue: number;
    lowStockCount: number;
  };
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  chartData: Array<{ date: string; revenue: number; profit: number }>;
}

export default function AdminPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Dashboard Stats
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Products Inventory State
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Product form states
  const [formName, setFormName] = useState("");
  const [formBarcode, setFormBarcode] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formPurchasePrice, setFormPurchasePrice] = useState("");
  const [formSellingPrice, setFormSellingPrice] = useState("");
  const [formStock, setFormStock] = useState("");
  const [formLowStockAlert, setFormLowStockAlert] = useState("10");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formExpiryDate, setFormExpiryDate] = useState("");

  // Sales History State
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesSearch, setSalesSearch] = useState("");
  const [salesStartDate, setSalesStartDate] = useState("");
  const [salesEndDate, setSalesEndDate] = useState("");

  // Guard to ensure recharts renders only on client and prevents SSR hydration mismatch
  useEffect(() => {
    setMounted(true);
    fetchDashboardStats();
    fetchProducts();
    fetchSales();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (err) {
      toast.error("Failed to load dashboard metrics");
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSales = async () => {
    try {
      let url = "/api/sales";
      const params = new URLSearchParams();
      if (salesSearch) params.append("search", salesSearch);
      if (salesStartDate) params.append("startDate", salesStartDate);
      if (salesEndDate) params.append("endDate", salesEndDate);
      
      const query = params.toString();
      if (query) url += `?${query}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSales(data.sales);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger search updates for sales when typing or choosing dates
  useEffect(() => {
    if (mounted) {
      fetchSales();
    }
  }, [salesSearch, salesStartDate, salesEndDate]);

  // Product Edit dialog toggler
  const handleOpenProductForm = (product: Product | null = null) => {
    if (product) {
      setEditingProduct(product);
      setFormName(product.name);
      setFormBarcode(product.barcode);
      setFormCategory(product.category);
      setFormPurchasePrice(product.purchasePrice.toString());
      setFormSellingPrice(product.sellingPrice.toString());
      setFormStock(product.stock.toString());
      setFormLowStockAlert(product.lowStockAlert.toString());
      setFormImageUrl(product.imageUrl || "");
      setFormExpiryDate(product.expiryDate ? product.expiryDate.split("T")[0] : "");
    } else {
      setEditingProduct(null);
      setFormName("");
      setFormBarcode("");
      setFormCategory("");
      setFormPurchasePrice("");
      setFormSellingPrice("");
      setFormStock("");
      setFormLowStockAlert("10");
      setFormImageUrl("");
      setFormExpiryDate("");
    }
    setIsProductFormOpen(true);
  };

  // Add or Edit Product Submit
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formBarcode || !formCategory || !formPurchasePrice || !formSellingPrice || !formStock) {
      toast.error("Please fill in all required fields");
      return;
    }

    const payload = {
      name: formName,
      barcode: formBarcode,
      category: formCategory,
      purchasePrice: parseFloat(formPurchasePrice),
      sellingPrice: parseFloat(formSellingPrice),
      stock: parseInt(formStock),
      lowStockAlert: parseInt(formLowStockAlert),
      imageUrl: formImageUrl || undefined,
      expiryDate: formExpiryDate || undefined,
    };

    try {
      const url = editingProduct ? `/api/products/${editingProduct._id}` : "/api/products";
      const method = editingProduct ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(editingProduct ? "Product updated successfully!" : "Product added successfully!");
        setIsProductFormOpen(false);
        fetchProducts();
        fetchDashboardStats();
      } else {
        toast.error(data.error || "Failed to save product");
      }
    } catch (err) {
      toast.error("Error connecting to server");
      console.error(err);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product? This action is permanent.")) return;

    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Product deleted successfully");
        fetchProducts();
        fetchDashboardStats();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete product");
      }
    } catch (err) {
      toast.error("Error communicating with database");
    }
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

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.barcode.includes(productSearch) ||
      p.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans">
      <Toaster position="top-right" richColors />

      {/* Top Header Section */}
      <header className="border-b border-neutral-900 bg-black/80 backdrop-blur px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow border border-neutral-800">
            <Warehouse className="w-5 h-5 text-black stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">Store Administration</h1>
            <p className="hidden sm:block text-[11px] text-neutral-500 mt-0.5 font-light">Manage stock inventory, invoices, and analytics.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            onClick={() => router.push("/pos")}
            className="bg-white text-black hover:bg-neutral-200 font-semibold gap-2 cursor-pointer h-9 px-3 sm:px-4 text-xs transition-colors rounded-lg"
          >
            <Store className="w-4 h-4 text-black" /> <span className="hidden sm:inline">Go to POS Counter</span>
          </Button>

          <Button
            variant="ghost"
            onClick={handleLogout}
            className="text-neutral-400 hover:text-red-400 hover:bg-red-500/5 border border-transparent hover:border-red-500/10 gap-1.5 cursor-pointer h-9 px-3 sm:px-4 text-xs transition-all rounded-lg"
          >
            <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      {/* Outer Content Area */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex justify-between items-center bg-black/40 p-1 border border-neutral-900 rounded-xl w-full max-w-md">
            <TabsList className="bg-transparent border-0 w-full justify-start p-0">
              <TabsTrigger
                value="dashboard"
                className="flex-1 data-[state=active]:bg-white data-[state=active]:text-black py-2 px-2 sm:px-3 rounded-lg text-neutral-400 cursor-pointer text-xs sm:text-sm font-semibold transition-all duration-200"
              >
                <TrendingUp className="w-3.5 h-3.5 mr-1 sm:mr-2" /> Dashboard
              </TabsTrigger>
              <TabsTrigger
                value="inventory"
                className="flex-1 data-[state=active]:bg-white data-[state=active]:text-black py-2 px-2 sm:px-3 rounded-lg text-neutral-400 cursor-pointer text-xs sm:text-sm font-semibold transition-all duration-200"
              >
                <Package className="w-3.5 h-3.5 mr-1 sm:mr-2" /> Inventory
              </TabsTrigger>
              <TabsTrigger
                value="sales"
                className="flex-1 data-[state=active]:bg-white data-[state=active]:text-black py-2 px-2 sm:px-3 rounded-lg text-neutral-400 cursor-pointer text-xs sm:text-sm font-semibold transition-all duration-200"
              >
                <History className="w-3.5 h-3.5 mr-1 sm:mr-2" /> Invoices
              </TabsTrigger>
            </TabsList>
          </div>

          {/* 1. DASHBOARD ANALYTICS TAB */}
          <TabsContent value="dashboard" className="space-y-6 outline-none">
            {/* Top Cards Widgets */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <Card className="bg-slate-950/50 border-slate-800 text-white shadow-md">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-slate-400 text-[10px] sm:text-xs">Today's Revenue</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-base sm:text-lg font-bold text-emerald-400">₹{stats?.todaySales?.toFixed(0) || "0"}</div>
                </CardContent>
              </Card>

              <Card className="bg-slate-950/50 border-slate-800 text-white shadow-md">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-slate-400 text-[10px] sm:text-xs">Monthly Revenue</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-base sm:text-lg font-bold text-teal-400">₹{stats?.thisMonthSales?.toFixed(0) || "0"}</div>
                </CardContent>
              </Card>

              <Card className="bg-slate-950/50 border-slate-800 text-white shadow-md">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-slate-400 text-[10px] sm:text-xs">Total Profit Margin</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-base sm:text-lg font-bold text-indigo-400">₹{stats?.totalProfit?.toFixed(0) || "0"}</div>
                </CardContent>
              </Card>

              <Card className="bg-slate-950/50 border-slate-800 text-white shadow-md">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-slate-400 text-[10px] sm:text-xs">Stock Asset Value</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-base sm:text-lg font-bold text-sky-400">
                    ₹{stats?.inventory?.totalStockValue?.toFixed(0) || "0"}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-950/50 border-slate-800 text-white shadow-md col-span-2 md:col-span-1 lg:col-span-1">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-slate-400 text-[10px] sm:text-xs">Low Stock Warning</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0 flex justify-between items-center">
                  <div className="text-base sm:text-lg font-bold text-rose-500">{stats?.inventory?.lowStockCount || "0"} items</div>
                  {stats?.inventory?.lowStockCount && stats.inventory.lowStockCount > 0 ? (
                    <span className="p-1 bg-rose-500/10 text-rose-500 rounded border border-rose-500/10">
                      <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-bounce" />
                    </span>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            {/* Chart Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sales Chart (2 Cols) */}
              <Card className="lg:col-span-2 bg-slate-950/50 border-slate-800 text-white shadow-md">
                <CardHeader>
                  <CardTitle className="text-md font-bold">Revenue & Profit History (Last 7 Days)</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  {mounted && stats?.chartData ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }} labelStyle={{ color: "#fff" }} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line type="monotone" dataKey="revenue" name="Revenue (₹)" stroke="#10b981" strokeWidth={2.5} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="profit" name="Profit Margin (₹)" stroke="#6366f1" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                      Loading chart module...
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Products (1 Col) */}
              <Card className="bg-slate-950/50 border-slate-800 text-white shadow-md">
                <CardHeader>
                  <CardTitle className="text-md font-bold">Top 5 Selling Products</CardTitle>
                  <CardDescription className="text-slate-500 text-xs">Sorted by units sold</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats?.topProducts && stats.topProducts.length > 0 ? (
                    <div className="space-y-4">
                      {stats.topProducts.map((p, idx) => (
                        <div key={idx} className="flex justify-between items-center pb-2 border-b border-slate-800/60 last:border-0 last:pb-0">
                          <div>
                            <div className="font-semibold text-xs text-slate-200">{p.name}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{p.quantity} units sold</div>
                          </div>
                          <div className="text-xs font-bold text-emerald-400">₹{p.revenue.toFixed(0)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-44 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                      <ShoppingCart className="w-5 h-5 text-slate-700" />
                      No sales recorded yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 2. INVENTORY MANAGEMENT TAB */}
          <TabsContent value="inventory" className="space-y-4 outline-none">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-950/50 p-4 border border-slate-800/80 rounded-2xl">
              <div className="relative w-full sm:max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <Search className="w-4 h-4" />
                </span>
                <Input
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-9 bg-slate-900 border-slate-800 focus-visible:ring-emerald-500/50"
                />
              </div>

              <Button
                onClick={() => handleOpenProductForm(null)}
                className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold gap-1.5 cursor-pointer w-full sm:w-auto text-xs"
              >
                <Plus className="w-4 h-4" /> Add Product
              </Button>
            </div>

            {/* Inventory List Card */}
            <Card className="bg-slate-950/50 border-slate-800 text-white shadow-md">
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-900/60">
                    <TableRow className="border-slate-850">
                      <TableHead className="text-slate-400 font-bold py-3 px-4">Product Name</TableHead>
                      <TableHead className="text-slate-400 font-bold w-40 hidden lg:table-cell">Barcode</TableHead>
                      <TableHead className="text-slate-400 font-bold w-32 hidden md:table-cell">Category</TableHead>
                      <TableHead className="text-right text-slate-400 font-bold w-24 hidden sm:table-cell">Purchase Price</TableHead>
                      <TableHead className="text-right text-slate-400 font-bold w-24 px-3">Selling Price</TableHead>
                      <TableHead className="text-center text-slate-400 font-bold w-20 sm:w-28 px-3">Stock</TableHead>
                      <TableHead className="text-right text-slate-400 font-bold w-24 sm:w-28 px-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={7} className="text-center text-slate-500 p-8">
                          No products found. Add a product to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((p) => {
                        const isLowStock = p.stock <= p.lowStockAlert;
                        return (
                          <TableRow key={p._id} className="border-slate-850 hover:bg-slate-900/20">
                            <TableCell className="font-semibold text-slate-200 py-3 px-4">
                              <div className="flex flex-col">
                                <div className="flex items-center flex-wrap gap-1">
                                  <span>{p.name}</span>
                                  {p.stock === 0 ? (
                                    <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-500 text-[9px] font-bold">
                                      Out Of Stock
                                    </span>
                                  ) : isLowStock ? (
                                    <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-500 text-[9px] font-bold">
                                      Low Stock
                                    </span>
                                  ) : null}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[10px] text-slate-400 font-normal">
                                  <span className="lg:hidden font-mono bg-slate-900 px-1 rounded border border-slate-800/60">
                                    {p.barcode}
                                  </span>
                                  <span className="md:hidden">
                                    • {p.category}
                                  </span>
                                  <span className="sm:hidden text-slate-500">
                                    • Cost: ₹{p.purchasePrice.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-slate-400 text-xs hidden lg:table-cell">{p.barcode}</TableCell>
                            <TableCell className="text-slate-300 text-xs hidden md:table-cell">{p.category}</TableCell>
                            <TableCell className="text-right text-slate-300 font-mono hidden sm:table-cell">₹{p.purchasePrice.toFixed(2)}</TableCell>
                            <TableCell className="text-right text-emerald-400 font-mono px-3">₹{p.sellingPrice.toFixed(2)}</TableCell>
                            <TableCell className="text-center font-bold font-mono px-3">
                              <span className={isLowStock ? "text-rose-400" : "text-slate-200"}>{p.stock}</span>
                            </TableCell>
                            <TableCell className="px-4">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenProductForm(p)}
                                  className="text-slate-400 hover:text-white hover:bg-slate-800 w-8 h-8 cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteProduct(p._id)}
                                  className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 w-8 h-8 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 3. INVOICES HISTORY TAB */}
          <TabsContent value="sales" className="space-y-4 outline-none">
            {/* Filter controls */}
            <div className="flex flex-col lg:flex-row justify-between gap-3 bg-slate-950/50 p-4 border border-slate-800/80 rounded-2xl">
              <div className="relative w-full lg:max-w-sm">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <Search className="w-4 h-4" />
                </span>
                <Input
                  placeholder="Search invoices by code or cashier..."
                  value={salesSearch}
                  onChange={(e) => setSalesSearch(e.target.value)}
                  className="pl-9 bg-slate-900 border-slate-800 focus-visible:ring-emerald-500/50"
                />
              </div>

              {/* Date Filters */}
              <div className="flex flex-col sm:flex-row gap-2 items-center w-full lg:w-auto">
                <div className="relative w-full sm:w-auto">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    <Calendar className="w-4 h-4" />
                  </span>
                  <Input
                    type="date"
                    value={salesStartDate}
                    onChange={(e) => setSalesStartDate(e.target.value)}
                    className="pl-9 bg-slate-900 border-slate-800 focus-visible:ring-emerald-500/50 w-full sm:w-44 text-xs h-9 text-slate-300"
                  />
                </div>
                <span className="text-slate-500 text-xs hidden sm:inline">to</span>
                <div className="relative w-full sm:w-auto">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    <Calendar className="w-4 h-4" />
                  </span>
                  <Input
                    type="date"
                    value={salesEndDate}
                    onChange={(e) => setSalesEndDate(e.target.value)}
                    className="pl-9 bg-slate-900 border-slate-800 focus-visible:ring-emerald-500/50 w-full sm:w-44 text-xs h-9 text-slate-300"
                  />
                </div>
                
                {(salesStartDate || salesEndDate || salesSearch) && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSalesSearch("");
                      setSalesStartDate("");
                      setSalesEndDate("");
                    }}
                    className="text-slate-400 hover:text-white text-xs h-9 cursor-pointer w-full sm:w-auto"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Invoices List Table */}
            <Card className="bg-slate-950/50 border-slate-800 text-white shadow-md">
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-900/60">
                    <TableRow className="border-slate-850">
                      <TableHead className="text-slate-400 font-bold py-3 px-4">Invoice Number</TableHead>
                      <TableHead className="text-slate-400 font-bold w-48 hidden sm:table-cell">Date & Time</TableHead>
                      <TableHead className="text-slate-400 font-bold w-40 hidden md:table-cell">Cashier</TableHead>
                      <TableHead className="text-slate-400 font-bold w-32 hidden sm:table-cell">Items Count</TableHead>
                      <TableHead className="text-slate-400 font-bold w-32 hidden sm:table-cell">Payment Mode</TableHead>
                      <TableHead className="text-right text-slate-400 font-bold w-36 px-4">Total Bill</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.length === 0 ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={6} className="text-center text-slate-500 p-8">
                          No transactions found for the specified filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sales.map((sale) => (
                        <TableRow key={sale._id} className="border-slate-850 hover:bg-slate-900/20">
                          <TableCell className="font-bold text-slate-300 py-3 px-4">
                            <div className="flex flex-col">
                              <span>{sale.invoiceNumber}</span>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[10px] text-slate-400 font-normal">
                                <span className="sm:hidden">
                                  {new Date(sale.createdAt).toLocaleString("en-IN")}
                                </span>
                                <span className="md:hidden">
                                  • Cashier: {sale.cashierName}
                                </span>
                                <span className="sm:hidden text-slate-500">
                                  • {sale.items.reduce((sum, item) => sum + item.quantity, 0)} items
                                </span>
                                <span className="sm:hidden">
                                  • <span className="uppercase font-semibold px-1 rounded bg-slate-900 border border-slate-850">
                                    {sale.paymentMethod}
                                  </span>
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-400 text-xs hidden sm:table-cell">
                            {new Date(sale.createdAt).toLocaleString("en-IN")}
                          </TableCell>
                          <TableCell className="text-slate-300 text-xs hidden md:table-cell">{sale.cashierName}</TableCell>
                          <TableCell className="text-slate-400 text-xs hidden sm:table-cell">
                            {sale.items.reduce((sum, item) => sum + item.quantity, 0)} items
                          </TableCell>
                          <TableCell className="text-slate-400 text-xs hidden sm:table-cell">
                            <span className="uppercase font-semibold px-2 py-0.5 rounded bg-slate-900 border border-slate-850">
                              {sale.paymentMethod}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-emerald-400 font-bold font-mono px-4">
                            ₹{sale.total.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Product ADD / EDIT Dialog Modal */}
      <Dialog open={isProductFormOpen} onOpenChange={setIsProductFormOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[500px] bg-slate-900 border-slate-800 text-white max-h-[90vh] overflow-y-auto scrollbar-thin shadow-2xl">
          <form onSubmit={handleProductSubmit}>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-400" />
                {editingProduct ? "Edit Product Details" : "Add New Stock Product"}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Input the catalog information for this item.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="form-name" className="text-slate-300">
                    Product Name *
                  </Label>
                  <Input
                    id="form-name"
                    placeholder="e.g. Maggie Noodles 70g"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="bg-slate-950 border-slate-850 focus-visible:ring-emerald-500/50"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="form-barcode" className="text-slate-300 flex items-center justify-between">
                    <span>Barcode (UPC/EAN) *</span>
                    <button
                      type="button"
                      onClick={() => setFormBarcode(Math.floor(1000000000000 + Math.random() * 9000000000000).toString())}
                      className="text-[10px] text-emerald-400 hover:text-emerald-350 cursor-pointer"
                    >
                      Generate Random
                    </button>
                  </Label>
                  <Input
                    id="form-barcode"
                    placeholder="e.g. 8901058002316"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    className="bg-slate-950 border-slate-850 focus-visible:ring-emerald-500/50 font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="form-category" className="text-slate-300">
                    Category *
                  </Label>
                  <Input
                    id="form-category"
                    placeholder="e.g. Snacks, Dairy, Biscuits"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="bg-slate-950 border-slate-850 focus-visible:ring-emerald-500/50"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="form-purchase-price" className="text-slate-300">
                    Purchase Price (₹ Cost) *
                  </Label>
                  <Input
                    id="form-purchase-price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formPurchasePrice}
                    onChange={(e) => setFormPurchasePrice(e.target.value)}
                    className="bg-slate-950 border-slate-850 focus-visible:ring-emerald-500/50"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="form-selling-price" className="text-slate-300">
                    Selling Price (₹ Retail) *
                  </Label>
                  <Input
                    id="form-selling-price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formSellingPrice}
                    onChange={(e) => setFormSellingPrice(e.target.value)}
                    className="bg-slate-950 border-slate-850 focus-visible:ring-emerald-500/50"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="form-stock" className="text-slate-300">
                    Stock Quantity *
                  </Label>
                  <Input
                    id="form-stock"
                    type="number"
                    placeholder="e.g. 50"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="bg-slate-950 border-slate-850 focus-visible:ring-emerald-500/50"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="form-low-stock" className="text-slate-300">
                    Low Stock Alert Limit
                  </Label>
                  <Input
                    id="form-low-stock"
                    type="number"
                    placeholder="10"
                    value={formLowStockAlert}
                    onChange={(e) => setFormLowStockAlert(e.target.value)}
                    className="bg-slate-950 border-slate-850 focus-visible:ring-emerald-500/50"
                  />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="form-image-url" className="text-slate-300">
                    Product Image URL
                  </Label>
                  <Input
                    id="form-image-url"
                    placeholder="https://example.com/image.jpg"
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    className="bg-slate-950 border-slate-850 focus-visible:ring-emerald-500/50"
                  />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="form-expiry" className="text-slate-300">
                    Expiry Date
                  </Label>
                  <Input
                    id="form-expiry"
                    type="date"
                    value={formExpiryDate}
                    onChange={(e) => setFormExpiryDate(e.target.value)}
                    className="bg-slate-950 border-slate-850 focus-visible:ring-emerald-500/50 text-slate-300"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-slate-800 pt-4 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsProductFormOpen(false)}
                className="border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900 hover:text-white cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 cursor-pointer"
              >
                Save Product
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}

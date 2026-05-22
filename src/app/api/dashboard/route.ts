import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { dbService } from "@/lib/dbService";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch collections via dbService (compatible with Mongo or Mock)
    const products = await dbService.getProducts();
    const sales = await dbService.getSales();
    
    // Inventory calculations
    let totalProducts = products.length;
    let totalStockValue = 0;
    let lowStockCount = 0;

    products.forEach((p) => {
      totalStockValue += p.stock * p.purchasePrice;
      if (p.stock <= p.lowStockAlert) {
        lowStockCount++;
      }
    });

    // Time ranges
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfThisMonth = new Date();
    startOfThisMonth.setDate(1);
    startOfThisMonth.setHours(0, 0, 0, 0);

    // Sales calculations
    let totalRevenue = 0;
    let totalProfit = 0;
    let todaySales = 0;
    let thisMonthSales = 0;

    // Item aggregation for top products
    const productSalesMap: { [key: string]: { name: string; quantity: number; revenue: number } } = {};

    sales.forEach((sale) => {
      const saleDate = new Date(sale.createdAt);
      
      totalRevenue += sale.total;
      
      // Calculate profit for this invoice: (items profit) - discount
      let saleCost = 0;
      sale.items.forEach((item) => {
        saleCost += item.purchasePrice * item.quantity;
        
        // Track top products
        const key = item.productId.toString();
        if (!productSalesMap[key]) {
          productSalesMap[key] = { name: item.name, quantity: 0, revenue: 0 };
        }
        productSalesMap[key].quantity += item.quantity;
        productSalesMap[key].revenue += item.sellingPrice * item.quantity;
      });
      
      const saleProfit = sale.total - saleCost;
      totalProfit += saleProfit;

      if (saleDate >= startOfToday) {
        todaySales += sale.total;
      }
      if (saleDate >= startOfThisMonth) {
        thisMonthSales += sale.total;
      }
    });

    // Format top products
    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Generate chart data for last 7 days
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const daySales = sales.filter((s) => {
        const d = new Date(s.createdAt);
        return d >= date && d < nextDate;
      });

      let revenue = 0;
      let cost = 0;
      daySales.forEach((s) => {
        revenue += s.total;
        s.items.forEach((item) => {
          cost += item.purchasePrice * item.quantity;
        });
      });

      chartData.push({
        date: date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }),
        revenue,
        profit: Math.max(0, revenue - cost),
      });
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalRevenue,
        totalProfit,
        todaySales,
        thisMonthSales,
        inventory: {
          totalProducts,
          totalStockValue,
          lowStockCount,
        },
        topProducts,
        chartData,
      },
    });
  } catch (error: any) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

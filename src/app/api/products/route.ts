import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { dbService } from "@/lib/dbService";

export async function GET(req: NextRequest) {
  try {
    // Seed standard items if empty
    await dbService.seedProductsIfEmpty();

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const barcode = searchParams.get("barcode") || "";

    const products = await dbService.getProducts({ search, barcode });
    return NextResponse.json({ success: true, products });
  } catch (error: any) {
    console.error("Fetch products error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
    }

    const body = await req.json();
    const { name, barcode, category, purchasePrice, sellingPrice, stock, lowStockAlert, expiryDate, imageUrl } = body;

    if (!name || !barcode || !category || purchasePrice === undefined || sellingPrice === undefined || stock === undefined) {
      return NextResponse.json({ error: "Missing required product details" }, { status: 400 });
    }

    try {
      const newProduct = await dbService.createProduct({
        name,
        barcode,
        category,
        purchasePrice: Number(purchasePrice),
        sellingPrice: Number(sellingPrice),
        stock: Number(stock),
        lowStockAlert: Number(lowStockAlert || 10),
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        imageUrl: imageUrl || undefined,
      });

      return NextResponse.json({ success: true, product: newProduct });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || "Failed to create product" }, { status: 409 });
    }
  } catch (error: any) {
    console.error("Create product error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

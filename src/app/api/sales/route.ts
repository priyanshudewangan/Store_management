import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { dbService } from "@/lib/dbService";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const startDateStr = searchParams.get("startDate") || "";
    const endDateStr = searchParams.get("endDate") || "";

    const sales = await dbService.getSales({
      search,
      startDate: startDateStr || undefined,
      endDate: endDateStr || undefined,
    });

    return NextResponse.json({ success: true, sales });
  } catch (error: any) {
    console.error("Fetch sales error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { items, discount, tax, total, paymentMethod, cashReceived, changeDue } = body;

    if (!items || !items.length || !paymentMethod) {
      return NextResponse.json({ error: "Invalid sale data" }, { status: 400 });
    }

    try {
      const sale = await dbService.createSale(
        {
          items,
          subtotal: body.subtotal,
          discount,
          tax,
          total,
          paymentMethod,
          cashReceived,
          changeDue,
        },
        { id: user.id, name: user.name }
      );

      return NextResponse.json({ success: true, sale });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || "Failed to process transaction" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Create sale error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

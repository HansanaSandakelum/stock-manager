import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/db";
import Return from "@/models/Return";
import Product from "@/models/Product";
import User from "@/models/User";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    
    // Ensure models are registered
    if (!Product) console.warn("Product model not initialized");
    if (!User) console.warn("User model not initialized");

    const returns = await Return.find({})
      .populate("product", "name sku unitPrice")
      .populate("processedBy", "name email")
      .sort({ createdAt: -1 });

    return NextResponse.json(returns);
  } catch (error: any) {
    console.error("Error fetching returns:", error);
    return NextResponse.json(
      { error: "Failed to fetch returns" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { product, quantity, reason, customerName } = body;

    if (!product || !quantity || !reason) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await dbConnect();

    const newReturn = await Return.create({
      product,
      quantity,
      reason,
      customerName,
      status: "Pending",
      processedBy: (session.user as any).id,
    });

    const populatedReturn = await Return.findById(newReturn._id)
      .populate("product", "name sku unitPrice")
      .populate("processedBy", "name email");

    return NextResponse.json(populatedReturn, { status: 201 });
  } catch (error: any) {
    console.error("Error creating return:", error);
    return NextResponse.json(
      { error: "Failed to create return record" },
      { status: 500 }
    );
  }
}

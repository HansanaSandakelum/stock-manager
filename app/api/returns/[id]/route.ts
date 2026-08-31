import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/db";
import Return from "@/models/Return";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";
import { authOptions } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as { role?: string }).role;
    if (role === 'deliver') {
      return NextResponse.json({ error: "Forbidden: Deliver role cannot update returns" }, { status: 403 });
    }

    const { id } = await Promise.resolve(params);
    const body = await req.json();
    const { status } = body;

    if (!status || !["Pending", "Restocked", "Discarded"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    await dbConnect();

    const returnItem = await Return.findById(id);
    if (!returnItem) {
      return NextResponse.json({ error: "Return record not found" }, { status: 404 });
    }

    // Only allow status change from Pending
    if (returnItem.status !== "Pending") {
      return NextResponse.json(
        { error: "Can only update pending returns" },
        { status: 400 }
      );
    }

    // If restocked, increase product quantity and add a return transaction
    if (status === "Restocked") {
      const product = await Product.findById(returnItem.product);
      if (!product) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }

      product.returnedQuantity = (product.returnedQuantity || 0) + returnItem.quantity;
      await product.save();

      await Transaction.create({
        product: product._id,
        type: "return",
        quantity: returnItem.quantity,
        note: `Return #${returnItem._id.toString().substring(0, 8)} Stored (Returned Stock): ${returnItem.reason}`,
        createdBy: (session.user as any).id,
      });
    }

    returnItem.status = status;
    returnItem.updatedAt = new Date();
    await returnItem.save();

    const updatedReturn = await Return.findById(id)
      .populate("product", "name sku unitPrice")
      .populate("processedBy", "name email");

    return NextResponse.json(updatedReturn);
  } catch (error: any) {
    console.error("Error updating return:", error);
    return NextResponse.json(
      { error: "Failed to update return" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as { role?: string }).role;
    if (role === 'deliver') {
      return NextResponse.json({ error: "Forbidden: Deliver role cannot delete returns" }, { status: 403 });
    }

    const { id } = await Promise.resolve(params);
    await dbConnect();

    const returnItem = await Return.findById(id);
    if (!returnItem) {
      return NextResponse.json({ error: "Return record not found" }, { status: 404 });
    }

    if (returnItem.status !== "Pending") {
      return NextResponse.json(
        { error: "Cannot delete processed returns" },
        { status: 400 }
      );
    }

    await Return.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting return:", error);
    return NextResponse.json(
      { error: "Failed to delete return" },
      { status: 500 }
    );
  }
}

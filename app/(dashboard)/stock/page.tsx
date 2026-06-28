"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Package,
  Search,
  Plus,
  Minus,
  Check,
  X,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarDays,
  FileText,
  Hash,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

// == Types ==
interface Product {
  _id: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lowStockThreshold: number;
  category?: { name: string };
  image?: string;
}

interface StockDialogState {
  open: boolean;
  type: "in" | "out";
  product: Product | null;
  quantity: string;
  note: string;
  date: string;
  isReturn: boolean;
  saving: boolean;
  isManualSelect?: boolean;
}

const PAGE_SIZE = 10;

function stockVariant(
  qty: number,
  thr: number,
): "success" | "warning" | "danger" {
  if (qty === 0) return "danger";
  if (qty <= thr) return "warning";
  return "success";
}

// == Pagination Controls ==
function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  // Build page number list with ellipsis
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(totalPages - 1, page + 1);
      i++
    )
      pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/40 dark:bg-zinc-900/20">
      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 tabular-nums">
        {start}-{end} of {total} products
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-90"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {pages.map((p, i) =>
          p === "..." ? (
            <span
              key={`ellipsis-${i}`}
              className="w-7 h-7 flex items-center justify-center text-[10px] text-zinc-400"
            >
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p as number)}
              className={`w-7 h-7 flex items-center justify-center rounded-lg text-[11px] font-semibold transition-all cursor-pointer active:scale-90 ${
                p === page
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-indigo-300 hover:text-indigo-600"
              }`}
            >
              {p}
            </button>
          ),
        )}

        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-90"
          aria-label="Next page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// == Main Page ==
export default function StockHandlingPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "ok" | "low" | "out"
  >("all");
  const [page, setPage] = useState(1);
  const [mounted, setMounted] = useState(false);

  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Stock In/Out Dialog State
  const [dialog, setDialog] = useState<StockDialogState>({
    open: false,
    type: "in",
    product: null,
    quantity: "",
    note: "",
    date: new Date().toISOString().slice(0, 16), // datetime-local format
    isReturn: false,
    saving: false,
  });
  const [dialogSearch, setDialogSearch] = useState("");

  const openDialog = (product: Product, type: "in" | "out") => {
    setDialogSearch("");
    setDialog({
      open: true,
      type,
      product,
      quantity: "",
      note: "",
      date: new Date().toISOString().slice(0, 16),
      isReturn: type === "in" && role === "deliver",
      saving: false,
      isManualSelect: false,
    });
  };

  const openDialogNoProduct = (type: "in" | "out") => {
    setDialogSearch("");
    setDialog({
      open: true,
      type,
      product: null,
      quantity: "",
      note: "",
      date: new Date().toISOString().slice(0, 16),
      isReturn: type === "in" && role === "deliver",
      saving: false,
      isManualSelect: true,
    });
  };

  const closeDialog = () => {
    if (dialog.saving) return;
    setDialog((prev) => ({ ...prev, open: false }));
  };

  const dialogFilteredProducts = useMemo(() => {
    if (!dialog.open || dialog.product) return [];
    const q = dialogSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.category?.name?.toLowerCase().includes(q)
    );
  }, [dialog.open, dialog.product, dialogSearch, products]);

  // == Data fetching ==
  const fetchProducts = useCallback(async (silent = false) => {
    silent ? setRefreshing(true) : setLoading(true);
    try {
      const res = await fetch("/api/products?limit=1000");
      const data = await res.json();
      if (data.success) setProducts(data.data);
    } catch {
      toast("Failed to load products", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // == Handle Dialog Submit ==
  const handleDialogSubmit = useCallback(async () => {
    if (!dialog.product) return;
    const quantity = parseInt(dialog.quantity);
    if (!quantity || quantity <= 0) {
      toast("Please enter a valid quantity", "error");
      return;
    }

    if (dialog.type === "out" && quantity > dialog.product.quantity) {
      toast(
        `Insufficient stock. Current quantity is ${dialog.product.quantity}`,
        "error",
      );
      return;
    }

    setDialog((prev) => ({ ...prev, saving: true }));

    try {
      const actualType = dialog.type === "in" && dialog.isReturn ? "return" : dialog.type;

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: dialog.product._id,
          type: actualType,
          quantity,
          note:
            dialog.note.trim() ||
            `Stock ${dialog.type === "in" ? "In" : "Out"} – ${quantity} units${dialog.isReturn ? ' (Return)' : ''}`,
          date: new Date(dialog.date).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      const delta = dialog.type === "in" ? quantity : -quantity;
      const newQty = Math.max(0, dialog.product.quantity + delta);

      toast(
        `${dialog.product.name}: ${delta > 0 ? "+" : ""}${delta} → ${newQty} units`,
        "success",
      );

      setProducts((ps) =>
        ps.map((p) =>
          p._id === dialog.product!._id ? { ...p, quantity: newQty } : p,
        ),
      );
      setDialog((prev) => ({ ...prev, open: false, saving: false }));
    } catch (e: any) {
      toast(e.message, "error");
      setDialog((prev) => ({ ...prev, saving: false }));
    }
  }, [dialog]);

  // == Stats ==
  const total = products.length;
  const totalUnits = products.reduce((s, p) => s + p.quantity, 0);
  const lowCount = products.filter(
    (p) => p.quantity > 0 && p.quantity <= (p.lowStockThreshold ?? 10),
  ).length;
  const outCount = products.filter((p) => p.quantity === 0).length;

  // == Filter + search ==
  const filtered = useMemo(() => {
    let list = products;
    const q = search.trim().toLowerCase();
    if (q)
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.category?.name?.toLowerCase().includes(q),
      );
    if (filterStatus === "out") list = list.filter((p) => p.quantity === 0);
    else if (filterStatus === "low")
      list = list.filter(
        (p) => p.quantity > 0 && p.quantity <= (p.lowStockThreshold ?? 10),
      );
    else if (filterStatus === "ok")
      list = list.filter((p) => p.quantity > (p.lowStockThreshold ?? 10));
    return list;
  }, [products, search, filterStatus]);

  // Reset to page 1 when filter/search changes
  useEffect(() => {
    setPage(1);
  }, [search, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
(safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  // Total columns: Product | Category | Status | Price | Current Stock | Actions | Log = 7
  const COL_SPAN = 7;

  const isLocked = mounted && role === "deliver" && new Date().getHours() >= 18;

  if (isLocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-full flex items-center justify-center mb-4 border border-rose-100 dark:border-rose-900/30">
          <Clock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Access Restricted</h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-center max-w-md">
          Stock handling operations are locked after 6 PM for delivery personnel. Please try again tomorrow during working hours.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* == Header == */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Stock Handling
          </h2>
          <p className="text-xs text-zinc-400 dark:text-zinc-400 mt-0.5">
            Use Stock In / Stock Out buttons to manage inventory with full
            transaction details.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => openDialogNoProduct("in")}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-sm hover:shadow-emerald-500/10 transition-all active:scale-95 cursor-pointer"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            Stock In
          </button>
          <button
            onClick={() => openDialogNoProduct("out")}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-sm hover:shadow-rose-500/10 transition-all active:scale-95 cursor-pointer"
          >
            <ArrowUpFromLine className="w-3.5 h-3.5" />
            Stock Out
          </button>
          <button
            onClick={() => fetchProducts(true)}
            disabled={refreshing}
            className="flex items-center justify-center p-2 text-zinc-550 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            title="Refresh Products"
            aria-label="Refresh Products"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* == Stat strip == */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Products",
            value: total,
            cls: "text-zinc-700 dark:text-zinc-200",
            bg: "bg-white dark:bg-[#0c0c14] border-zinc-100 dark:border-zinc-800/70",
          },
          {
            label: "Total Units",
            value: totalUnits.toLocaleString(),
            cls: "text-indigo-600 dark:text-indigo-400",
            bg: "bg-indigo-50/40 dark:bg-indigo-950/10 border-indigo-100/60 dark:border-indigo-900/20",
          },
          {
            label: "Low Stock",
            value: lowCount,
            cls: "text-amber-600 dark:text-amber-400",
            bg: "bg-amber-50/40 dark:bg-amber-950/10 border-amber-100/60 dark:border-amber-900/20",
          },
          {
            label: "Out of Stock",
            value: outCount,
            cls: "text-rose-600 dark:text-rose-400",
            bg: "bg-rose-50/40 dark:bg-rose-950/10 border-rose-100/60 dark:border-rose-900/20",
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`px-3.5 py-3 rounded-xl border ${s.bg} flex items-center justify-between`}
          >
            <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              {s.label}
            </p>
            <p className={`text-lg font-extrabold tabular-nums ${s.cls}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* == Search + filter == */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            id="stock-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, SKU, category..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-[#0c0c14] border border-zinc-200 dark:border-zinc-800/80 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all"
          />
        </div>
        <div className="flex rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c14] p-0.5 gap-0.5 self-start sm:self-auto">
          {(["all", "ok", "low", "out"] as const).map((s) => (
            <button
              key={s}
              id={`filter-${s}`}
              onClick={() => setFilterStatus(s)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                filterStatus === s
                  ? s === "all"
                    ? "bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900"
                    : s === "ok"
                      ? "bg-emerald-600 text-white"
                      : s === "low"
                        ? "bg-amber-500 text-white"
                        : "bg-rose-600 text-white"
                  : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              {s === "all"
                ? "All"
                : s === "ok"
                  ? "OK"
                  : s === "low"
                    ? "Low"
                    : "Out"}
            </button>
          ))}
        </div>
      </div>

      {/* == Products Display == */}
      <Card className="p-0 overflow-hidden border border-zinc-100 dark:border-zinc-800/80">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs min-w-[700px] table-fixed">
            <thead className="bg-zinc-50/80 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800/70 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-550">
              <tr>
                <th className="px-4 py-3 text-left min-w-[120px] sm:min-w-[180px]">Product</th>
                <th className="px-4 py-3 text-center w-36 sm:w-52">Actions</th>
                <th className="px-3 py-3 text-center w-20 sm:w-28">Current Stock</th>
                <th className="px-3 py-3 text-left hidden sm:table-cell sm:w-32">
                  Category
                </th>
                <th className="px-3 py-3 text-center hidden md:table-cell md:w-28">
                  Status
                </th>
                <th className="px-3 py-3 text-right hidden lg:table-cell lg:w-32">
                  Price
                </th>
                <th className="px-3 py-3 text-center w-12 sm:w-16">Log</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {loading ? (
                Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={COL_SPAN} className="px-4 py-3">
                      <Skeleton className="h-7 w-full rounded-lg" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={COL_SPAN} className="px-4 py-12 text-center">
                    <Package className="w-7 h-7 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
                    <p className="text-xs text-zinc-400 dark:text-zinc-400">
                      {search
                        ? `No matches for "${search}"`
                        : "No products found"}
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((product) => {
                  const thr = product.lowStockThreshold ?? 10;
                  const variant = stockVariant(product.quantity, thr);

                  return (
                    <tr
                      key={product._id}
                      className="transition-colors hover:bg-zinc-50/40 dark:hover:bg-zinc-900/10"
                    >
                      {/* Product */}
                      <td className="px-4 py-2.5 min-w-[120px] sm:min-w-[180px]">
                        <div className="flex items-center gap-2.5">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-7 h-7 rounded-lg object-cover border border-zinc-100 dark:border-zinc-800 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/20 flex items-center justify-center flex-shrink-0">
                              <Package className="w-3.5 h-3.5 text-indigo-400 dark:text-indigo-505" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[150px]">
                              {product.name}
                            </p>
                            <p className="font-mono text-[9px] text-zinc-400 dark:text-zinc-400">
                              {product.sku}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Stock In / Stock Out Buttons */}
                      <td className="px-4 py-2.5 w-36 sm:w-52 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            id={`stock-in-${product._id}`}
                            onClick={() => openDialog(product, "in")}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all active:scale-95 cursor-pointer
                              bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 hover:shadow-sm hover:shadow-emerald-100
                              dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/40 dark:hover:bg-emerald-950/40 dark:hover:bg-emerald-700/50"
                            aria-label={`Stock In ${product.name}`}
                          >
                            <ArrowDownToLine className="w-3 h-3" />
                            <span className="hidden sm:inline">Stock </span>In
                          </button>
                          <button
                            id={`stock-out-${product._id}`}
                            onClick={() => openDialog(product, "out")}
                            disabled={product.quantity === 0}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed
                              bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 hover:shadow-sm hover:shadow-rose-100
                              dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-800/40 dark:hover:bg-rose-950/40 dark:hover:bg-rose-700/50"
                            aria-label={`Stock Out ${product.name}`}
                          >
                            <ArrowUpFromLine className="w-3 h-3" />
                            <span className="hidden sm:inline">Stock </span>Out
                          </button>
                        </div>
                      </td>

                      {/* Current Stock */}
                      <td className="px-3 py-2.5 w-20 sm:w-28 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-sm font-bold tabular-nums ${
                            variant === "danger"
                              ? "text-rose-605 dark:text-rose-400"
                              : variant === "warning"
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-zinc-800 dark:text-zinc-200"
                          }`}
                        >
                          {product.quantity}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="px-3 py-2.5 text-zinc-500 dark:text-zinc-400 hidden sm:table-cell sm:w-32 text-left truncate">
                        {product.category?.name ?? "-"}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2.5 text-center hidden md:table-cell md:w-28">
                        <Badge variant={variant}>
                          {variant === "success"
                            ? "In Stock"
                            : variant === "warning"
                              ? "Low"
                              : "Out"}
                        </Badge>
                      </td>

                      {/* Price */}
                      <td className="px-3 py-2.5 text-right text-zinc-500 dark:text-zinc-400 hidden lg:table-cell lg:w-32 font-medium truncate">
                        Rs.{" "}
                        {product.unitPrice?.toLocaleString("en-LK", {
                          minimumFractionDigits: 2,
                        })}
                      </td>

                      {/* Log Page Navigation */}
                      <td className="px-3 py-2.5 text-center w-12 sm:w-16">
                        <button
                          onClick={() =>
                            router.push(`/stock/${product._id}/log`)
                          }
                          className="w-7 h-7 mx-auto flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:border-indigo-300 hover:text-indigo-505 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all cursor-pointer active:scale-90"
                          aria-label="View change log"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View Card List */}
        <div className="block md:hidden">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <Package className="w-8 h-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
              <p className="text-xs text-zinc-400 dark:text-zinc-400">
                {search ? `No matches for "${search}"` : "No products found"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {paginated.map((product) => {
                const thr = product.lowStockThreshold ?? 10;
                const variant = stockVariant(product.quantity, thr);

                return (
                  <div
                    key={product._id}
                    className="p-4 flex flex-col gap-3 bg-white dark:bg-[#0c0c14] hover:bg-zinc-50/40 dark:hover:bg-zinc-900/10 transition-colors"
                  >
                    {/* Top row: Product info & Stock badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-10 h-10 rounded-xl object-cover border border-zinc-100 dark:border-zinc-800 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/20 flex items-center justify-center flex-shrink-0">
                            <Package className="w-5 h-5 text-indigo-400 dark:text-indigo-505" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 truncate leading-snug">
                            {product.name}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[9px] text-zinc-400 dark:text-zinc-500">
                              {product.sku}
                            </span>
                            {product.category?.name && (
                              <>
                                <span className="text-[10px] text-zinc-300 dark:text-zinc-700">•</span>
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate max-w-[80px]">
                                  {product.category.name}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Current Stock Badge */}
                      <div className="text-right flex-shrink-0">
                        <div className="text-[9px] font-semibold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider mb-0.5">
                          Stock
                        </div>
                        <Badge variant={variant}>
                          {product.quantity} units
                        </Badge>
                      </div>
                    </div>

                    {/* Bottom row: Interactive Actions */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100/50 dark:border-zinc-800/40">
                      <div className="flex items-center gap-2 flex-1">
                        <button
                          id={`mob-stock-in-${product._id}`}
                          onClick={() => openDialog(product, "in")}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer
                            bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100
                            dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30"
                          aria-label={`Stock In ${product.name}`}
                        >
                          <ArrowDownToLine className="w-3.5 h-3.5" />
                          In
                        </button>
                        <button
                          id={`mob-stock-out-${product._id}`}
                          onClick={() => openDialog(product, "out")}
                          disabled={product.quantity === 0}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed
                            bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100
                            dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30"
                          aria-label={`Stock Out ${product.name}`}
                        >
                          <ArrowUpFromLine className="w-3.5 h-3.5" />
                          Out
                        </button>
                      </div>
                      
                      {/* Log Button */}
                      <button
                        onClick={() => router.push(`/stock/${product._id}/log`)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all cursor-pointer active:scale-90 flex-shrink-0"
                        aria-label="View change log"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* == Pagination == */}
        {!loading && (
          <Pagination
            page={safePage}
            totalPages={totalPages}
            total={filtered.length}
            pageSize={PAGE_SIZE}
            onChange={setPage}
          />
        )}
      </Card>

      {/* == Stock In / Out Dialog == */}
      <Modal
        isOpen={dialog.open}
        onClose={closeDialog}
        title={
          dialog.product
            ? dialog.type === "in"
              ? `Stock In – ${dialog.product.name}`
              : `Stock Out – ${dialog.product.name}`
            : dialog.type === "in"
              ? "Manual Stock In"
              : "Manual Stock Out"
        }
      >
        {!dialog.product ? (
          <div className="space-y-4">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Choose a product to perform manual Stock {dialog.type === "in" ? "In" : "Out"}:
            </p>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name, SKU or category..."
                value={dialogSearch}
                onChange={(e) => setDialogSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                autoFocus
              />
            </div>

            <div className="max-h-[280px] overflow-y-auto border border-zinc-100 dark:border-zinc-800/80 rounded-xl divide-y divide-zinc-100 dark:divide-zinc-800/60 bg-white dark:bg-[#0c0c14]">
              {dialogFilteredProducts.length === 0 ? (
                <div className="p-8 text-center text-zinc-400 dark:text-zinc-500">
                  No products found.
                </div>
              ) : (
                dialogFilteredProducts.map((p) => {
                  const isDisabled = dialog.type === "out" && p.quantity === 0;
                  return (
                    <button
                      key={p._id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => {
                        setDialog((prev) => ({
                          ...prev,
                          product: p,
                          isReturn: dialog.type === "in" && role === "deliver",
                        }));
                      }}
                      className="w-full p-3 flex items-center gap-3 text-left hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.name}
                          className="w-9 h-9 rounded-lg object-cover border border-zinc-100 dark:border-zinc-800 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/20 flex items-center justify-center flex-shrink-0">
                          <Package className="w-4.5 h-4.5 text-indigo-400 dark:text-zinc-500" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-xs text-zinc-800 dark:text-zinc-100 truncate">
                          {p.name}
                        </p>
                        <p className="font-mono text-[9px] text-zinc-400 dark:text-zinc-500 truncate">
                          {p.sku} {p.category?.name ? `• ${p.category.name}` : ""}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[9px] text-zinc-400 dark:text-zinc-500 uppercase font-semibold">Stock</p>
                        <p className={`font-bold text-xs ${p.quantity === 0 ? "text-rose-500" : "text-zinc-700 dark:text-zinc-300"}`}>
                          {p.quantity}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <button
              type="button"
              onClick={closeDialog}
              className="w-full py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-all cursor-pointer text-center active:scale-[0.98]"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Product Info Card */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800/60">
              {dialog.product.image ? (
                <img
                  src={dialog.product.image}
                  alt={dialog.product.name}
                  className="w-10 h-10 rounded-xl object-cover border border-zinc-100 dark:border-zinc-800 flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/20 flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-indigo-400 dark:text-indigo-500" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-sm text-zinc-800 dark:text-zinc-100 truncate">
                    {dialog.product.name}
                  </p>
                  {dialog.isManualSelect && (
                    <button
                      type="button"
                      onClick={() => setDialog((prev) => ({ ...prev, product: null }))}
                      className="px-1.5 py-0.5 text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all cursor-pointer"
                    >
                      Change
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                    {dialog.product.sku}
                  </span>
                  {dialog.product.category?.name && (
                    <>
                      <span className="text-zinc-300 dark:text-zinc-700">
                        •
                      </span>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        {dialog.product.category.name}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  Current
                </p>
                <p className="text-lg font-extrabold tabular-nums text-zinc-800 dark:text-zinc-100">
                  {dialog.product.quantity}
                </p>
              </div>
            </div>

            {/* Type Indicator */}
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${
                dialog.type === "in"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/40"
                  : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-800/40"
              }`}
            >
              {dialog.type === "in" ? (
                <ArrowDownToLine className="w-3.5 h-3.5" />
              ) : (
                <ArrowUpFromLine className="w-3.5 h-3.5" />
              )}
              <span>
                {dialog.type === "in"
                  ? "Adding stock to inventory"
                  : "Removing stock from inventory"}
              </span>
            </div>

            {/* Quantity */}
            <div className="space-y-2.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                <Hash className="w-3.5 h-3.5 text-zinc-400" />
                Quantity <span className="text-rose-500">*</span>
              </label>

              {/* Stepper: [ - ]  [input]  [ + ] */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const cur = parseInt(dialog.quantity) || 0;
                    if (cur > 1)
                      setDialog((prev) => ({
                        ...prev,
                        quantity: String(cur - 1),
                      }));
                  }}
                  disabled={!dialog.quantity || parseInt(dialog.quantity) <= 1}
                  className="w-10 h-10 flex-shrink-0 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:border-rose-400 hover:text-rose-600 hover:bg-rose-50/50 dark:hover:border-rose-500 dark:hover:text-rose-400 dark:hover:bg-rose-950/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90 cursor-pointer"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <input
                  type="number"
                  id="dialog-quantity"
                  value={dialog.quantity}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setDialog((prev) => ({ ...prev, quantity: "" }));
                      return;
                    }
                    const num = parseInt(val);
                    if (isNaN(num) || num < 0) return;
                    const maxVal =
                      dialog.type === "out"
                        ? dialog.product!.quantity
                        : undefined;
                    if (maxVal !== undefined && num > maxVal) {
                      setDialog((prev) => ({
                        ...prev,
                        quantity: String(maxVal),
                      }));
                    } else {
                      setDialog((prev) => ({
                        ...prev,
                        quantity: String(num),
                      }));
                    }
                  }}
                  placeholder="0"
                  min={1}
                  max={
                    dialog.type === "out"
                      ? dialog.product.quantity
                      : undefined
                  }
                  className="flex-1 text-center text-lg font-bold px-3 py-2 bg-zinc-50/30 hover:bg-zinc-50/70 focus:bg-white dark:bg-zinc-900/30 dark:hover:bg-zinc-900/60 dark:focus:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-xl transition-all focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none tabular-nums"
                  autoFocus
                />

                <button
                  type="button"
                  onClick={() => {
                    const cur = parseInt(dialog.quantity) || 0;
                    const maxVal =
                      dialog.type === "out"
                        ? dialog.product!.quantity
                        : Infinity;
                    if (cur < maxVal)
                      setDialog((prev) => ({
                        ...prev,
                        quantity: String(cur + 1),
                      }));
                  }}
                  disabled={
                    dialog.type === "out" &&
                    parseInt(dialog.quantity) >= dialog.product.quantity
                  }
                  className="w-10 h-10 flex-shrink-0 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50/50 dark:hover:border-emerald-500 dark:hover:text-emerald-400 dark:hover:bg-emerald-950/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90 cursor-pointer"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Quick-add chips */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  Quick Add
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[1, 5, 10, 25, 50, 100].map((n) => {
                    const cur = parseInt(dialog.quantity) || 0;
                    const maxVal =
                      dialog.type === "out"
                        ? dialog.product!.quantity
                        : Infinity;
                    const wouldExceed = cur + n > maxVal;

                    return (
                      <button
                        key={n}
                        type="button"
                        disabled={wouldExceed}
                        onClick={() => {
                          const newVal = Math.min(cur + n, maxVal);
                          setDialog((prev) => ({
                            ...prev,
                            quantity: String(newVal),
                          }));
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all active:scale-95 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                          dialog.type === "in"
                            ? "border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/15 hover:bg-emerald-100 hover:border-emerald-300 dark:hover:bg-emerald-950/30 dark:hover:border-emerald-700/50"
                            : "border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-400 bg-rose-50/60 dark:bg-rose-950/15 hover:bg-rose-100 hover:border-rose-300 dark:hover:bg-rose-950/30 dark:hover:border-rose-700/50"
                        }`}
                      >
                        <Plus className="w-2.5 h-2.5" />
                        {n}
                      </button>
                    );
                  })}

                  {/* Set-to presets */}
                  {[
                    ...(dialog.type === "out"
                      ? [
                          {
                            label: "All",
                            value: dialog.product.quantity,
                          },
                          {
                            label: "Half",
                            value: Math.floor(
                              dialog.product.quantity / 2,
                            ),
                          },
                        ]
                      : []),
                  ]
                    .filter((p) => p.value > 0)
                    .map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() =>
                          setDialog((prev) => ({
                            ...prev,
                            quantity: String(preset.value),
                          }))
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all active:scale-95 cursor-pointer
                          border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-950/15 hover:bg-amber-100 hover:border-amber-300 dark:hover:bg-amber-950/30 dark:hover:border-amber-700/50"
                      >
                        {preset.label}
                        <span className="text-[9px] font-normal opacity-70">
                          ({preset.value})
                        </span>
                      </button>
                    ))}

                  {/* Clear */}
                  {dialog.quantity && parseInt(dialog.quantity) > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setDialog((prev) => ({ ...prev, quantity: "" }))
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all active:scale-95 cursor-pointer
                        border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 bg-zinc-50/60 dark:bg-zinc-900/30 hover:bg-zinc-100 hover:border-zinc-300 dark:hover:bg-zinc-800/50"
                    >
                      <X className="w-2.5 h-2.5" />
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Info line */}
              {dialog.type === "out" && (
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                  Max available: {dialog.product.quantity} units
                </p>
              )}

              {/* New quantity preview */}
              {dialog.quantity &&
                parseInt(dialog.quantity) > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800/50">
                    {dialog.type === "in" ? (
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                    )}
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      New quantity:
                    </span>
                    <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100 tabular-nums">
                      {dialog.type === "in"
                        ? dialog.product.quantity + parseInt(dialog.quantity)
                        : Math.max(
                            0,
                            dialog.product.quantity - parseInt(dialog.quantity),
                          )}
                    </span>
                    <span
                      className={`text-[10px] font-semibold tabular-nums ml-auto ${
                        dialog.type === "in"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {dialog.type === "in" ? "+" : "-"}
                      {parseInt(dialog.quantity)}
                    </span>
                  </div>
                )}
            </div>

            {/* Is Return Toggle */}
            {dialog.type === "in" && (
              <div className="flex flex-col gap-2.5 bg-zinc-50/50 dark:bg-zinc-900/20 border border-zinc-200/60 dark:border-zinc-800/40 rounded-xl p-3.5">
                <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Stock In Type</p>
                <div className="flex rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c14] p-0.5 gap-0.5">
                  <button
                    type="button"
                    onClick={() => setDialog(prev => ({ ...prev, isReturn: false }))}
                    disabled={role === "deliver"}
                    className={`flex-1 px-3 py-2.5 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
                      !dialog.isReturn
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer"
                    } ${role === "deliver" ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    Regular Restock
                  </button>
                  <button
                    type="button"
                    onClick={() => setDialog(prev => ({ ...prev, isReturn: true }))}
                    className={`flex-1 px-3 py-2.5 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
                      dialog.isReturn
                        ? "bg-amber-500 text-white shadow-sm"
                        : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer"
                    }`}
                  >
                    Product Return
                  </button>
                </div>
                {role === "deliver" && (
                  <p className="text-[10px] text-amber-600/90 dark:text-amber-400/90 leading-tight">
                    * Delivery personnel can only process product returns for Stock In operations.
                  </p>
                )}
              </div>
            )}

            {/* Date */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                <CalendarDays className="w-3.5 h-3.5 text-zinc-400" />
                Date & Time
              </label>
              <input
                type="datetime-local"
                id="dialog-date"
                value={dialog.date}
                onChange={(e) =>
                  setDialog((prev) => ({ ...prev, date: e.target.value }))
                }
                className="w-full px-3.5 py-2.5 bg-zinc-50/30 hover:bg-zinc-50/70 focus:bg-white dark:bg-zinc-900/30 dark:hover:bg-zinc-900/60 dark:focus:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm transition-all focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5"
              />
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                Note
                <span className="text-zinc-400 dark:text-zinc-500 font-normal text-xs">
                  (optional)
                </span>
              </label>
              <textarea
                id="dialog-note"
                value={dialog.note}
                onChange={(e) =>
                  setDialog((prev) => ({ ...prev, note: e.target.value }))
                }
                placeholder={
                  dialog.type === "in"
                    ? "e.g. Received from supplier, Purchase order #123..."
                    : "e.g. Sold to customer, Damaged goods, Internal use..."
                }
                rows={3}
                className="w-full px-3.5 py-2.5 bg-zinc-50/30 hover:bg-zinc-50/70 focus:bg-white dark:bg-zinc-900/30 dark:hover:bg-zinc-900/60 dark:focus:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm transition-all focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
              <button
                onClick={closeDialog}
                disabled={dialog.saving}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDialogSubmit}
                disabled={
                  dialog.saving ||
                  !dialog.quantity ||
                  parseInt(dialog.quantity) <= 0
                }
                className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 ${
                  dialog.type === "in"
                    ? "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-sm shadow-emerald-500/10 hover:shadow-emerald-500/20"
                    : "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-sm shadow-rose-500/10 hover:shadow-rose-500/20"
                }`}
              >
                {dialog.saving ? (
                  <svg
                    className="animate-spin h-4 w-4 text-current"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : dialog.type === "in" ? (
                  <ArrowDownToLine className="w-4 h-4" />
                ) : (
                  <ArrowUpFromLine className="w-4 h-4" />
                )}
                {dialog.saving
                  ? "Processing..."
                  : dialog.type === "in"
                    ? "Confirm Stock In"
                    : "Confirm Stock Out"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

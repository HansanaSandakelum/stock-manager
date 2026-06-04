"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";

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

const PAGE_SIZE = 10;

function stockVariant(
  qty: number,
  thr: number,
): "success" | "warning" | "danger" {
  if (qty === 0) return "danger";
  if (qty <= thr) return "warning";
  return "success";
}

// == Shared delta state lifted per-row ==
// Each row has its own delta; we expose two cells from the same state.

interface AdjustState {
  delta: number;
  saving: boolean;
}

// == Adjust Input Cell (- [qty] +) ==
function AdjustInputCell({
  product,
  state,
  onChange,
}: {
  product: Product;
  state: AdjustState;
  onChange: (delta: number) => void;
}) {
  const { delta } = state;
  const newQty = Math.max(0, product.quantity + delta);
  const changed = delta !== 0;

  return (
    <div className="flex items-center justify-end gap-1.5 w-full">
      {/* - */}
      <button
        onClick={() => onChange(Math.max(-product.quantity, delta - 1))}
        disabled={product.quantity + delta <= 0}
        className="w-7 h-7 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:border-rose-400 hover:text-rose-600 dark:hover:border-rose-500 dark:hover:text-rose-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90 cursor-pointer flex-shrink-0"
        aria-label="Decrease"
      >
        <Minus className="w-3 h-3" />
      </button>

      {/* Number input */}
      <div className="relative w-[68px] flex-shrink-0">
        <input
          type="number"
          value={newQty}
          onChange={(e) =>
            onChange(
              Math.max(
                -product.quantity,
                Number(e.target.value) - product.quantity,
              ),
            )
          }
          className={`w-full text-center text-sm font-bold py-1 rounded-lg border transition-all outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
            ${
              changed
                ? "border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-400/20"
                : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-150"
            }`}
          min={0}
        />
      </div>

      {/* + */}
      <button
        onClick={() => onChange(delta + 1)}
        className="w-7 h-7 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:border-emerald-400 hover:text-emerald-600 dark:hover:border-emerald-500 dark:hover:text-emerald-400 transition-all active:scale-90 cursor-pointer flex-shrink-0"
        aria-label="Increase"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}

// == Pending Change Badge Cell ==
function ChangeCell({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <div className="flex items-center justify-center select-none w-full">
        <span className="text-[10px] text-zinc-300 dark:text-zinc-600">-</span>
      </div>
    );
  }

  const isPositive = delta > 0;

  return (
    <div className="flex items-center justify-center w-full">
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border tabular-nums ${
          isPositive
            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30"
            : "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/20"
        }`}
      >
        {isPositive ? (
          <TrendingUp className="w-2.5 h-2.5 flex-shrink-0" />
        ) : (
          <TrendingDown className="w-2.5 h-2.5 flex-shrink-0" />
        )}
        <span>{isPositive ? `+${delta}` : delta}</span>
      </span>
    </div>
  );
}

// == Confirm / Cancel Action Cell ==
function ActionCell({
  product,
  state,
  onCommit,
  onCancel,
}: {
  product: Product;
  state: AdjustState;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const { delta, saving } = state;
  const changed = delta !== 0;

  if (!changed) {
    return (
      <div className="flex items-center justify-center h-7 select-none w-full">
        <span className="text-[10px] text-zinc-300 dark:text-zinc-600">-</span>
      </div>
    );
  }

  const newQty = Math.max(0, product.quantity + delta);

  return (
    <div className="flex items-center justify-center gap-1.5 h-7 w-full">
      {/* Confirm */}
      <button
        onClick={onCommit}
        disabled={saving}
        id={`confirm-${product._id}`}
        className="h-7 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center gap-1 transition-all active:scale-90 disabled:opacity-50 cursor-pointer shadow-sm whitespace-nowrap"
        aria-label="Confirm adjustment"
      >
        {saving ? (
          <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              className="opacity-25"
            />
            <path
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              className="opacity-75"
            />
          </svg>
        ) : (
          <Check className="w-3 h-3" />
        )}
        <span>{saving ? "Saving..." : `Apply`}</span>
      </button>

      {/* Cancel */}
      <button
        onClick={onCancel}
        disabled={saving}
        className="w-7 h-7 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-rose-500 hover:border-rose-300 dark:hover:border-rose-700 flex items-center justify-center transition-all active:scale-90 cursor-pointer disabled:opacity-40"
        aria-label="Cancel"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
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

  // Per-row adjust state: productId -> { delta, saving }
  const [adjustStates, setAdjustStates] = useState<Record<string, AdjustState>>(
    {},
  );

  const getState = (id: string): AdjustState =>
    adjustStates[id] ?? { delta: 0, saving: false };

  const setDelta = (id: string, delta: number) =>
    setAdjustStates((prev) => ({ ...prev, [id]: { ...getState(id), delta } }));

  const setSaving = (id: string, saving: boolean) =>
    setAdjustStates((prev) => ({ ...prev, [id]: { ...getState(id), saving } }));

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

  // == Commit adjustment ==
  const handleCommit = useCallback(
    async (product: Product) => {
      const state = adjustStates[product._id] ?? { delta: 0, saving: false };
      const { delta } = state;
      if (delta === 0) return;
      setSaving(product._id, true);

      const type: "in" | "out" = delta > 0 ? "in" : "out";
      const quantity = Math.abs(delta);
      const newQty = Math.max(0, product.quantity + delta);

      try {
        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product: product._id,
            type,
            quantity,
            note: `Manual adjustment ${delta > 0 ? "+" : ""}${delta}`,
            date: new Date().toISOString(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");

        toast(
          `${product.name}: ${delta > 0 ? "+" : ""}${delta} -> ${newQty} units`,
          "success",
        );
        setProducts((ps) =>
          ps.map((p) =>
            p._id === product._id ? { ...p, quantity: newQty } : p,
          ),
        );
        setAdjustStates((prev) => {
          const n = { ...prev };
          delete n[product._id];
          return n;
        });
      } catch (e: any) {
        toast(e.message, "error");
        setSaving(product._id, false);
      }
    },
    [adjustStates],
  );

  const handleCancel = (id: string) =>
    setAdjustStates((prev) => {
      const n = { ...prev };
      delete n[id];
      return n;
    });

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

  // Total columns: Product | Category | Status | Price | Adjust | Change | Action | Log = 8
  const COL_SPAN = 8;

  return (
    <div className="space-y-4">
      {/* == Header == */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Stock Handling
          </h2>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
            Adjust stock directly, confirm in the Action column, or open the
            history page.
          </p>
        </div>
        <button
          onClick={() => fetchProducts(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* == Stat strip == */}
      <div className="grid grid-cols-4 gap-2">
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

      {/* == Table == */}
      <Card className="p-0 overflow-hidden border border-zinc-100 dark:border-zinc-800/80">
        <div className="overflow-x-auto">
          <table className="w-full text-xs table-fixed min-w-[700px]">
            <thead className="bg-zinc-50/80 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800/70 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-left min-w-[180px]">Product</th>
                <th className="px-3 py-3 text-left hidden sm:table-cell w-32">
                  Category
                </th>
                <th className="px-3 py-3 text-center hidden md:table-cell w-28">
                  Status
                </th>
                <th className="px-3 py-3 text-right hidden lg:table-cell w-32">
                  Price
                </th>
                <th className="px-4 py-3 text-right w-44">Adjust Stock</th>
                <th className="px-3 py-3 text-center w-28">Change</th>
                <th className="px-3 py-3 text-center w-40">Action</th>
                <th className="px-3 py-3 text-center w-16">Log</th>
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
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
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
                  const state = getState(product._id);

                  return (
                    <tr
                      key={product._id}
                      className="transition-colors hover:bg-zinc-50/40 dark:hover:bg-zinc-900/10"
                    >
                      {/* Product */}
                      <td className="px-4 py-2.5 min-w-[180px]">
                        <div className="flex items-center gap-2.5">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-7 h-7 rounded-lg object-cover border border-zinc-100 dark:border-zinc-800 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/20 flex items-center justify-center flex-shrink-0">
                              <Package className="w-3.5 h-3.5 text-indigo-400 dark:text-indigo-500" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-zinc-800 dark:text-zinc-155 truncate max-w-[150px]">
                              {product.name}
                            </p>
                            <p className="font-mono text-[9px] text-zinc-400 dark:text-zinc-500">
                              {product.sku}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-3 py-2.5 text-zinc-500 dark:text-zinc-400 hidden sm:table-cell w-32 text-left truncate">
                        {product.category?.name ?? "-"}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2.5 text-center hidden md:table-cell w-28">
                        <Badge variant={variant}>
                          {variant === "success"
                            ? "In Stock"
                            : variant === "warning"
                              ? "Low"
                              : "Out"}
                        </Badge>
                      </td>

                      {/* Price */}
                      <td className="px-3 py-2.5 text-right text-zinc-500 dark:text-zinc-400 hidden lg:table-cell w-32 font-medium truncate">
                        Rs.{" "}
                        {product.unitPrice?.toLocaleString("en-LK", {
                          minimumFractionDigits: 2,
                        })}
                      </td>

                      {/* Adjust - [qty] + */}
                      <td className="px-4 py-2.5 w-44 text-right">
                        <AdjustInputCell
                          product={product}
                          state={state}
                          onChange={(d) => setDelta(product._id, d)}
                        />
                      </td>

                      {/* Change */}
                      <td className="px-3 py-2.5 w-28 text-center">
                        <ChangeCell delta={state.delta} />
                      </td>

                      {/* Confirm / Cancel */}
                      <td className="px-3 py-2.5 w-40 text-center">
                        <ActionCell
                          product={product}
                          state={state}
                          onCommit={() => handleCommit(product)}
                          onCancel={() => handleCancel(product._id)}
                        />
                      </td>

                      {/* Log Page Navigation */}
                      <td className="px-3 py-2.5 text-center w-16">
                        <button
                          onClick={() =>
                            router.push(`/stock/${product._id}/log`)
                          }
                          className="w-7 h-7 mx-auto flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all cursor-pointer active:scale-90"
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
    </div>
  );
}

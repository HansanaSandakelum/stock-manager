"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Search,
  Plus,
  X,
  AlertCircle,
  Package,
  Tag,
  Loader2,
  Receipt,
} from "lucide-react";
import { toast } from "@/components/ui/Toast";

interface Product {
  _id: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
}

type BillItemState = {
  product: string;
  quantity: number;
  unitPrice: number;
  maxQty: number;
};

export default function CreateCreditBillPage() {
  const router = useRouter();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [discount, setDiscount] = useState("0");
  const [amountPaid, setAmountPaid] = useState("0");

  const [billItems, setBillItems] = useState<BillItemState[]>([
    { product: "", quantity: 1, unitPrice: 0, maxQty: 0 },
  ]);

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [productSearches, setProductSearches] = useState<string[]>([""]);
  const [openDropdownIdx, setOpenDropdownIdx] = useState<number | null>(null);
  const desktopRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mobileRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("/api/products?limit=1000");
        const data = await res.json();
        if (data.success) setProducts(data.data);
      } catch {
        toast("Failed to load products", "error");
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const insideDesktop = desktopRefs.current.some(
        (ref) => ref && ref.contains(e.target as Node)
      );
      const insideMobile = mobileRefs.current.some(
        (ref) => ref && ref.contains(e.target as Node)
      );
      if (!insideDesktop && !insideMobile) {
        setOpenDropdownIdx(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const subtotal = useMemo(
    () => billItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0),
    [billItems]
  );
  const discountAmt = useMemo(() => parseFloat(discount) || 0, [discount]);
  const grandTotal = useMemo(() => Math.max(0, subtotal - discountAmt), [subtotal, discountAmt]);

  // Cap amountPaid to grandTotal
  useEffect(() => {
    const amt = parseFloat(amountPaid) || 0;
    if (amt > grandTotal) {
      setAmountPaid(grandTotal.toString());
    }
  }, [grandTotal, amountPaid]);

  const addItem = () => {
    setBillItems((p) => [...p, { product: "", quantity: 1, unitPrice: 0, maxQty: 0 }]);
    setProductSearches((p) => [...p, ""]);
  };

  const removeItem = (idx: number) => {
    if (billItems.length === 1) return;
    setBillItems((p) => p.filter((_, i) => i !== idx));
    setProductSearches((p) => p.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, key: string, value: any) => {
    setBillItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [key]: value };
        if (key === "product") {
          const p = products.find((p) => p._id === value);
          updated.unitPrice = p ? p.unitPrice : 0;
          updated.maxQty = p ? p.quantity : 0;
          updated.quantity = 1;
        }
        return updated;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) { toast("Customer name is required", "error"); return; }
    const itemsToSend = billItems.filter((i) => i.product);
    if (itemsToSend.length === 0) { toast("At least one product item is required", "error"); return; }
    for (const item of itemsToSend) {
      if (item.quantity <= 0) { toast("Quantity must be greater than zero", "error"); return; }
      if (item.quantity > item.maxQty) { toast(`Insufficient stock. Max: ${item.maxQty}`, "error"); return; }
    }

    const amountPaidAmt = parseFloat(amountPaid) || 0;
    if (amountPaidAmt < 0) { toast("Amount paid cannot be negative", "error"); return; }
    if (amountPaidAmt > grandTotal) { toast("Amount paid cannot exceed grand total", "error"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/credit-bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone: customerPhone || undefined,
          customerAddress: customerAddress || undefined,
          dueDate: dueDate || undefined,
          note: note || undefined,
          discount: discountAmt,
          amountPaid: amountPaidAmt,
          items: itemsToSend.map((i) => ({
            product: i.product,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast("Credit Bill created successfully!", "success");
        router.push("/credit-bills");
      } else {
        throw new Error(data.error || "Failed to create credit bill");
      }
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2.5 bg-zinc-50/50 hover:bg-zinc-50/70 focus:bg-white dark:bg-zinc-900/30 dark:hover:bg-zinc-900/60 dark:focus:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm transition-all focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 placeholder-zinc-400 dark:placeholder-zinc-500 text-zinc-800 dark:text-zinc-100 disabled:opacity-50";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-28 lg:pb-12">
      {/* Header Card */}
      <div className="bg-white dark:bg-[#0c0c14] p-4 sm:p-5 rounded-2xl border border-zinc-150 dark:border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.015),0_1px_2px_rgb(0,0,0,0.01)] flex justify-between items-center max-w-5xl mx-auto">
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            type="button"
            onClick={() => router.push("/credit-bills")}
            className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-all active:scale-95 cursor-pointer text-zinc-600 dark:text-zinc-400"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight leading-none">
              New Credit Bill
            </h1>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1.5 hidden sm:block">
              Issue stock on credit and track outstanding balances.
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <form
        id="create-bill-form"
        onSubmit={handleSubmit}
        className="max-w-5xl mx-auto px-4 sm:px-6 py-6 lg:grid lg:grid-cols-[1fr_300px] lg:gap-5 lg:items-start"
      >
        {/* ── LEFT COLUMN ── */}
        <div className="space-y-4">
          {/* Customer card */}
          <section className="bg-white dark:bg-[#0c0c14] rounded-2xl border border-zinc-150 dark:border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.015),0_1px_2px_rgb(0,0,0,0.01)]">
            <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-900 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-500" />
              <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                Customer Details
              </span>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name – full width */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">
                  Customer Name <span className="text-rose-500 normal-case font-normal">*required</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  <input
                    required
                    placeholder="Enter customer full name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className={`${inputCls} pl-10 pr-4`}
                  />
                </div>
              </div>
              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  <input
                    placeholder="e.g. 0771234567"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className={`${inputCls} pl-10 pr-4`}
                  />
                </div>
              </div>
              {/* Due Date */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">
                  Due Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={`${inputCls} pl-10 pr-4`}
                  />
                </div>
              </div>
              {/* Address – full width */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">
                  Address
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  <input
                    placeholder="Street, city, district"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className={`${inputCls} pl-10 pr-4`}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Items card */}
          <section className="bg-white dark:bg-[#0c0c14] rounded-2xl border border-zinc-150 dark:border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.015),0_1px_2px_rgb(0,0,0,0.01)] overflow-visible">
            <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-500" />
                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                  Bill Items
                </span>
                <span className="text-[10px] px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full font-bold border border-indigo-100/50 dark:border-indigo-900/30">
                  {billItems.filter((i) => i.product).length} added
                </span>
              </div>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-455 border border-indigo-200 dark:border-indigo-900/60 rounded-xl hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 active:scale-95 transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>

            {/* Desktop Table View (Compact Row Layout) */}
            <div className="hidden md:block overflow-visible">
              <table className="w-full text-xs table-fixed overflow-visible">
                <thead>
                  <tr className="bg-zinc-50/50 dark:bg-zinc-900/30 text-zinc-400 dark:text-zinc-500 uppercase text-[9px] font-bold tracking-wider border-b border-zinc-100 dark:border-zinc-900 rounded-t-2xl">
                    <th className="py-2.5 px-3 text-center w-12 rounded-tl-2xl">#</th>
                    <th className="py-2.5 px-3 text-left">Product Details</th>
                    <th className="py-2.5 px-3 text-center w-24">Qty</th>
                    <th className="py-2.5 px-3 text-right w-32">Price (Rs.)</th>
                    <th className="py-2.5 px-3 text-right w-32">Total</th>
                    <th className="py-2.5 px-3 text-center w-14 rounded-tr-2xl"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
                  {billItems.map((item, idx) => {
                    const selectedProduct = products.find((p) => p._id === item.product);
                    const search = productSearches[idx] ?? "";
                    const filtered = products.filter(
                      (p) =>
                        search === "" ||
                        p.name.toLowerCase().includes(search.toLowerCase()) ||
                        p.sku.toLowerCase().includes(search.toLowerCase())
                    );
                    return (
                      <tr key={idx} className="hover:bg-zinc-50/20 dark:hover:bg-zinc-900/10">
                        {/* Index */}
                        <td className="py-3 px-3 text-center text-zinc-400 font-bold">
                          {idx + 1}
                        </td>
                        {/* Product Selection */}
                        <td className="py-3 px-2 relative min-w-[200px] overflow-visible">
                          <div className="relative" ref={(el) => { desktopRefs.current[idx] = el; }}>
                            <input
                              type="text"
                              autoComplete="off"
                              placeholder={
                                loadingProducts
                                  ? "Loading..."
                                  : selectedProduct
                                  ? selectedProduct.name
                                  : "Search product..."
                              }
                              value={openDropdownIdx === idx ? search : selectedProduct ? selectedProduct.name : ""}
                              onFocus={() => {
                                setOpenDropdownIdx(idx);
                                setProductSearches((prev) => {
                                  const n = [...prev];
                                  n[idx] = "";
                                  return n;
                                });
                              }}
                              onChange={(e) => {
                                setOpenDropdownIdx(idx);
                                setProductSearches((prev) => {
                                  const n = [...prev];
                                  n[idx] = e.target.value;
                                  return n;
                                });
                              }}
                              className={`w-full px-2.5 py-1.5 text-xs rounded-xl border focus:outline-none transition-all ${
                                selectedProduct && openDropdownIdx !== idx
                                  ? "bg-indigo-50/30 dark:bg-indigo-950/10 border-indigo-400 text-zinc-900 dark:text-zinc-100 font-bold"
                                  : "bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/5"
                              }`}
                            />
                            {selectedProduct && (
                              <button
                                type="button"
                                onClick={() => {
                                  updateItem(idx, "product", "");
                                  setProductSearches((prev) => {
                                    const n = [...prev];
                                    n[idx] = "";
                                    return n;
                                  });
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-rose-500 p-0.5 rounded-lg cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {openDropdownIdx === idx && (
                              <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white dark:bg-[#0c0c14] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl shadow-zinc-250/20 dark:shadow-none max-h-48 overflow-y-auto pr-1 min-w-[280px]">
                                {loadingProducts ? (
                                  <div className="flex items-center justify-center gap-2 py-3 text-xs text-zinc-400">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading inventory...
                                  </div>
                                ) : filtered.length === 0 ? (
                                  <p className="py-3 text-xs text-zinc-400 text-center italic">No products found</p>
                                ) : (
                                  filtered.map((p) => (
                                    <button
                                      key={p._id}
                                      type="button"
                                      disabled={p.quantity <= 0}
                                      onClick={() => {
                                        updateItem(idx, "product", p._id);
                                        setProductSearches((prev) => {
                                          const n = [...prev];
                                          n[idx] = "";
                                          return n;
                                        });
                                        setOpenDropdownIdx(null);
                                      }}
                                      className={`w-full flex items-center justify-between px-3 py-2 text-left text-[11px] transition-colors border-b border-zinc-50 dark:border-zinc-900 last:border-0 cursor-pointer ${
                                        item.product === p._id
                                          ? "bg-indigo-50/80 dark:bg-indigo-950/30 text-indigo-750 dark:text-indigo-300 font-semibold"
                                          : p.quantity <= 0
                                          ? "opacity-35 cursor-not-allowed text-zinc-400 dark:text-zinc-550"
                                          : "hover:bg-zinc-50/80 dark:hover:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300"
                                      }`}
                                    >
                                      <div className="min-w-0 pr-2">
                                        <p className="font-bold truncate text-zinc-850 dark:text-zinc-200">{p.name}</p>
                                        <p className="text-[9px] font-mono text-zinc-400 mt-0.5">{p.sku}</p>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <p
                                          className={`font-bold text-[10px] tabular-nums ${
                                            p.quantity <= 0
                                              ? "text-rose-500"
                                              : p.quantity < 5
                                              ? "text-amber-500"
                                              : "text-emerald-600 dark:text-emerald-450"
                                          }`}
                                        >
                                          {p.quantity} left
                                        </p>
                                        <p className="text-[9px] text-zinc-400 mt-0.5">Rs.{p.unitPrice.toFixed(2)}</p>
                                      </div>
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                          {selectedProduct && item.quantity > selectedProduct.quantity && (
                            <p className="absolute left-2.5 right-2 text-[9px] text-rose-500 font-bold bg-rose-50 dark:bg-rose-950/20 p-1.5 rounded-lg border border-rose-100/40 dark:border-rose-900/20 mt-1 z-10">
                              Max stock is {selectedProduct.quantity}
                            </p>
                          )}
                        </td>
                        {/* Qty */}
                        <td className="py-3 px-2">
                          <input
                            type="number"
                            min={1}
                            max={item.maxQty || undefined}
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 0)}
                            required
                            className="w-full px-2 py-1.5 text-center text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/5 font-semibold"
                          />
                        </td>
                        {/* Unit Price */}
                        <td className="py-3 px-2">
                          <input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                            required
                            className="w-full px-2 py-1.5 text-right text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/5 font-mono font-semibold"
                          />
                        </td>
                        {/* Line Total */}
                        <td className="py-3 px-3 text-right font-bold text-zinc-800 dark:text-zinc-200 font-mono tabular-nums">
                          Rs. {(item.quantity * item.unitPrice).toFixed(2)}
                        </td>
                        {/* Remove Action */}
                        <td className="py-3 px-3 text-center">
                          {billItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="p-1 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View (Highly Compact Card List Layout) */}
            <div className="block md:hidden divide-y divide-zinc-150/40 dark:divide-zinc-800/30">
              {billItems.map((item, idx) => {
                const selectedProduct = products.find((p) => p._id === item.product);
                const search = productSearches[idx] ?? "";
                const filtered = products.filter(
                  (p) =>
                    search === "" ||
                    p.name.toLowerCase().includes(search.toLowerCase()) ||
                    p.sku.toLowerCase().includes(search.toLowerCase())
                );
                return (
                  <div key={idx} className="p-3 space-y-2.5 bg-white dark:bg-[#0c0c14]">
                    {/* Item label + remove */}
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-widest">
                        Item #{idx + 1}
                      </span>
                      {billItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-[9px] font-bold text-zinc-400 hover:text-rose-500 px-2 py-0.5 rounded-lg flex items-center gap-0.5 transition-all cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" /> Remove
                        </button>
                      )}
                    </div>

                    {/* Product Search */}
                    <div className="relative" ref={(el) => { mobileRefs.current[idx] = el; }}>
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none z-10" />
                      <input
                        type="text"
                        autoComplete="off"
                        placeholder={
                          loadingProducts
                            ? "Loading..."
                            : selectedProduct
                            ? selectedProduct.name
                            : "Search product..."
                        }
                        value={openDropdownIdx === idx ? search : selectedProduct ? selectedProduct.name : ""}
                        onFocus={() => {
                          setOpenDropdownIdx(idx);
                          setProductSearches((prev) => {
                            const n = [...prev];
                            n[idx] = "";
                            return n;
                          });
                        }}
                        onChange={(e) => {
                          setOpenDropdownIdx(idx);
                          setProductSearches((prev) => {
                            const n = [...prev];
                            n[idx] = e.target.value;
                            return n;
                          });
                        }}
                        className={`w-full pl-9 pr-8 py-2 text-xs rounded-xl border focus:outline-none transition-all ${
                          selectedProduct && openDropdownIdx !== idx
                            ? "bg-indigo-50/30 dark:bg-indigo-950/10 border-indigo-400 text-zinc-900 dark:text-zinc-100 font-bold"
                            : "bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/5"
                        }`}
                      />
                      {selectedProduct && (
                        <button
                          type="button"
                          onClick={() => {
                            updateItem(idx, "product", "");
                            setProductSearches((prev) => {
                              const n = [...prev];
                              n[idx] = "";
                              return n;
                            });
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-rose-500 transition-colors p-0.5 rounded-lg"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {openDropdownIdx === idx && (
                        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white dark:bg-[#0c0c14] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl max-h-40 overflow-y-auto pr-1">
                          {loadingProducts ? (
                            <div className="flex items-center justify-center gap-2 py-3 text-xs text-zinc-400">
                              <Loader2 className="w-3 h-3 animate-spin" /> Loading...
                            </div>
                          ) : filtered.length === 0 ? (
                            <p className="py-3 text-xs text-zinc-400 text-center italic">No products found</p>
                          ) : (
                            filtered.map((p) => (
                              <button
                                key={p._id}
                                type="button"
                                disabled={p.quantity <= 0}
                                onClick={() => {
                                  updateItem(idx, "product", p._id);
                                  setProductSearches((prev) => {
                                    const n = [...prev];
                                    n[idx] = "";
                                    return n;
                                  });
                                  setOpenDropdownIdx(null);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 text-left text-[11px] transition-colors border-b border-zinc-50 dark:border-zinc-900 last:border-0 cursor-pointer ${
                                  item.product === p._id
                                    ? "bg-indigo-50/80 dark:bg-indigo-950/30 text-indigo-750 dark:text-indigo-300 font-semibold"
                                    : p.quantity <= 0
                                    ? "opacity-35 cursor-not-allowed text-zinc-400 dark:text-zinc-550"
                                    : "hover:bg-zinc-50/80 dark:hover:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300"
                                }`}
                              >
                                <div className="min-w-0 pr-2">
                                  <p className="font-bold truncate text-zinc-850 dark:text-zinc-200">{p.name}</p>
                                  <p className="text-[9px] font-mono text-zinc-400 mt-0.5">{p.sku}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="font-bold text-[10px] text-emerald-600 dark:text-emerald-450">{p.quantity} left</p>
                                  <p className="text-[9px] text-zinc-400 mt-0.5">Rs.{p.unitPrice.toFixed(2)}</p>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    {selectedProduct && item.quantity > selectedProduct.quantity && (
                      <p className="flex items-center gap-1.5 text-[9px] text-rose-500 font-bold bg-rose-50 dark:bg-rose-950/15 p-1.5 rounded-lg border border-rose-100/50 dark:border-rose-900/20">
                        <AlertCircle className="w-3 h-3" /> Max available stock is {selectedProduct.quantity} units.
                      </p>
                    )}

                    {/* Qty + Price + Line Total in one compact flex row */}
                    <div className="flex items-center gap-2">
                      <div className="w-16 shrink-0">
                        <input
                          type="number"
                          min={1}
                          max={item.maxQty || undefined}
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 0)}
                          required
                          placeholder="Qty"
                          className="w-full px-2 py-1.5 text-center text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/5 font-semibold"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                          required
                          placeholder="Price"
                          className="w-full px-2 py-1.5 text-right text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/5 font-mono font-semibold"
                        />
                      </div>
                      {item.product && item.quantity > 0 && (
                        <div className="text-right shrink-0 font-bold text-indigo-600 dark:text-indigo-400 font-mono text-xs pl-1">
                          Rs.{(item.quantity * item.unitPrice).toFixed(0)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Note card */}
          <section className="bg-white dark:bg-[#0c0c14] rounded-2xl border border-zinc-150 dark:border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.015),0_1px_2px_rgb(0,0,0,0.01)]">
            <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                Terms & Note
              </span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-550 italic font-semibold">(optional)</span>
            </div>
            <div className="p-4">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Enter invoice terms, bank payment details, or special delivery instructions..."
                rows={3}
                className="w-full px-4 py-3 text-sm bg-zinc-50/50 hover:bg-zinc-50/70 focus:bg-white dark:bg-zinc-900/30 dark:hover:bg-zinc-900/60 dark:focus:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-850 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 resize-none transition-all text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
              />
            </div>
          </section>
        </div>

        {/* ── RIGHT COLUMN — Summary sidebar ── */}
        <div className="mt-4 lg:mt-0 lg:sticky lg:top-[80px]">
          <section className="bg-white dark:bg-[#0c0c14] rounded-2xl border border-zinc-150 dark:border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.015),0_1px_2px_rgb(0,0,0,0.01)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-900 flex items-center gap-2">
              <Tag className="w-4 h-4 text-indigo-500" />
              <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                Statement Summary
              </span>
            </div>
            <div className="p-4 space-y-3.5">
              {/* Items list */}
              <div className="space-y-2 min-h-[45px] max-h-40 overflow-y-auto pr-1 scrollbar-none">
                {billItems.filter((i) => i.product).length === 0 ? (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 italic text-center py-3">No items added to statement.</p>
                ) : (
                  billItems
                    .filter((i) => i.product)
                    .map((item, idx) => {
                      const p = products.find((p) => p._id === item.product);
                      return (
                        <div key={idx} className="flex justify-between items-start text-xs gap-3">
                          <div className="min-w-0">
                            <p className="font-bold text-zinc-700 dark:text-zinc-300 truncate">{p?.name}</p>
                            <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 mt-0.5">
                              {item.quantity} × Rs.{item.unitPrice.toFixed(2)}
                            </p>
                          </div>
                          <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono shrink-0 text-right mt-0.5">
                            Rs. {(item.quantity * item.unitPrice).toFixed(2)}
                          </span>
                        </div>
                      );
                    })
                )}
              </div>

              <div className="border-t border-dashed border-zinc-200 dark:border-zinc-800 pt-3.5 space-y-2">
                {/* Discount inline */}
                <div className="flex items-center justify-between gap-3">
                  <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-400 uppercase tracking-widest whitespace-nowrap">
                    Discount Amt (Rs.)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-28 px-3 py-1.5 text-xs text-right bg-zinc-50/50 hover:bg-zinc-50/80 focus:bg-white dark:bg-zinc-900/30 dark:focus:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/5 transition-all text-zinc-800 dark:text-zinc-100 font-semibold"
                  />
                </div>

                {/* Amount Paid inline */}
                <div className="flex items-center justify-between gap-3">
                  <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-400 uppercase tracking-widest whitespace-nowrap">
                    Amount Paid (Rs.)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={grandTotal}
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="w-28 px-3 py-1.5 text-xs text-right bg-zinc-50/50 hover:bg-zinc-50/80 focus:bg-white dark:bg-zinc-900/30 dark:focus:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/5 transition-all text-zinc-800 dark:text-zinc-100 font-semibold"
                  />
                </div>

                <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400 pt-1.5">
                  <span className="font-medium">Subtotal</span>
                  <span className="font-mono font-semibold">Rs. {subtotal.toFixed(2)}</span>
                </div>
                {discountAmt > 0 && (
                  <div className="flex justify-between text-xs text-rose-500 font-bold">
                    <span>Discount Applied</span>
                    <span className="font-mono">− Rs. {discountAmt.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-3 border-t border-zinc-150 dark:border-zinc-800">
                  <span className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Grand Total</span>
                  <span className="text-base font-black text-indigo-600 dark:text-indigo-400 font-mono">
                    Rs. {grandTotal.toFixed(2)}
                  </span>
                </div>

                {/* Outstanding Balance indication */}
                {parseFloat(amountPaid) > 0 && (
                  <div className="flex justify-between items-center pt-2 text-rose-500 font-bold text-xs">
                    <span>Outstanding Due</span>
                    <span className="font-mono">
                      Rs. {Math.max(0, grandTotal - (parseFloat(amountPaid) || 0)).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Desktop submit button */}
            <div className="p-4 pt-0">
              <button
                type="submit"
                form="create-bill-form"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 rounded-xl shadow-md hover:shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 hover:-translate-y-[1px] transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                ) : (
                  <Receipt className="w-4 h-4 shrink-0" />
                )}
                {submitting ? "Issuing Statement..." : "Issue Bill & Stock Out"}
              </button>
            </div>
          </section>
        </div>
      </form>

      {/* Mobile sticky footer */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-4 py-3.5 bg-white/95 dark:bg-[#0c0c14]/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-900 flex gap-3 shadow-[0_-8px_30px_rgba(0,0,0,0.03)]">
        <button
          type="button"
          onClick={() => router.push("/credit-bills")}
          className="flex-1 py-3 text-xs font-bold text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900/60 active:scale-95 transition-all cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          form="create-bill-form"
          disabled={submitting}
          className="flex-[2] flex items-center justify-center gap-2 py-3 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 rounded-xl shadow-md hover:shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 hover:-translate-y-[1px] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          ) : (
            <Receipt className="w-4 h-4 shrink-0" />
          )}
          {submitting ? "Issuing..." : "Issue Bill"}
        </button>
      </div>
    </div>
  );
}

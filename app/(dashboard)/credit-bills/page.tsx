"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Receipt,
  Search,
  Plus,
  Printer,
  Trash2,
  Eye,
  CreditCard,
  Calendar,
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  MapPin,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  CheckCircle,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";



interface BillItem {
  product: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface PaymentRecord {
  amount: number;
  date: string;
  note?: string;
  recordedBy?: { name: string };
}

interface CreditBill {
  _id: string;
  billNumber: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: BillItem[];
  subTotal: number;
  discount: number;
  grandTotal: number;
  amountPaid: number;
  status: "Pending" | "Partially Paid" | "Paid" | "Overdue";
  dueDate?: string;
  note?: string;
  paymentHistory: PaymentRecord[];
  createdBy?: { name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

const PAGE_SIZE = 10;

export default function CreditBillsPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const router = useRouter();

  // List view states
  const [bills, setBills] = useState<CreditBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "Pending" | "Partially Paid" | "Paid" | "Overdue"
  >("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    totalBills: 0,
    totalGrand: 0,
    totalPaid: 0,
    totalOutstanding: 0,
  });

  // Modal visibility states
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  // Selected item states
  const [selectedBill, setSelectedBill] = useState<CreditBill | null>(null);

  // Payment form states
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Fetch Bills List
  const fetchBills = useCallback(
    async (silent = false) => {
      silent ? setRefreshing(true) : setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
          status: statusFilter,
          search,
        });
        const res = await fetch(`/api/credit-bills?${queryParams.toString()}`);
        const data = await res.json();
        if (data.success) {
          setBills(data.data);
          setTotalPages(data.pagination.pages || 1);
          if (data.stats) {
            setStats(data.stats);
          }
        }
      } catch (err) {
        toast("Failed to load credit bills", "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, statusFilter, search]
  );

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  // Fetch full details of one bill
  const viewBillDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/credit-bills/${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedBill(data.data);
        setIsDetailOpen(true);
      }
    } catch {
      toast("Failed to load bill details", "error");
    }
  };

  // Open Payment modal
  const openPaymentModal = (bill: CreditBill) => {
    setSelectedBill(bill);
    setPaymentAmount("");
    setPaymentNote("");
    setIsPaymentOpen(true);
  };

  // Record Payment Submit
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBill) return;
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast("Please enter a valid amount", "error");
      return;
    }

    const outstanding = selectedBill.grandTotal - selectedBill.amountPaid;
    if (amount > outstanding) {
      toast(`Amount cannot exceed outstanding balance of Rs. ${outstanding.toFixed(2)}`, "error");
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await fetch(`/api/credit-bills/${selectedBill._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentAmount: amount,
          paymentNote: paymentNote || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast("Payment recorded successfully", "success");
        setIsPaymentOpen(false);
        if (isDetailOpen && selectedBill) {
          // refresh details modal
          viewBillDetails(selectedBill._id);
        }
        fetchBills();
      } else {
        throw new Error(data.error || "Failed to record payment");
      }
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Cancel/Delete Bill
  const handleDeleteBill = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this bill? This will restore the stock levels.")) {
      return;
    }
    try {
      const res = await fetch(`/api/credit-bills/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast("Credit Bill cancelled. Stock restored successfully.", "success");
        setIsDetailOpen(false);
        fetchBills();
      } else {
        throw new Error(data.error || "Failed to delete bill");
      }
    } catch (err: any) {
      toast(err.message, "error");
    }
  };

  // Helper status badge mapper
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "Paid":
        return "success";
      case "Partially Paid":
        return "warning";
      case "Overdue":
        return "danger";
      default:
        return "default";
    }
  };

  // Reset page when filter or search changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter, search]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-receipt-section,
          #print-receipt-section * {
            visibility: visible;
          }
          #print-receipt-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#0c0c14] p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.015),0_1px_2px_rgb(0,0,0,0.01)]">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-indigo-500/10 to-blue-500/10 border border-indigo-500/15 dark:border-indigo-500/25 text-indigo-600 dark:text-indigo-400 shrink-0 shadow-sm">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Credit Bill System
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 max-w-lg leading-relaxed">
              Issue stock to customers on credit, generate printable invoices, and track outstanding balances.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t border-zinc-100 dark:border-zinc-800/60 md:border-0">
          <button
            onClick={() => fetchBills(true)}
            disabled={refreshing}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <button
            onClick={() => router.push("/credit-bills/new")}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 rounded-xl shadow-md hover:shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 hover:-translate-y-[1px] transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-5" />
            New Credit Bill
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            label: "Total Invoices",
            value: stats.totalBills,
            cls: "text-zinc-950 dark:text-zinc-50",
            bg: "bg-white dark:bg-[#0c0c14] border-zinc-100 dark:border-zinc-800/80 hover:border-zinc-200 dark:hover:border-zinc-700",
            icon: <Receipt className="w-4 h-4 sm:w-5 h-5 text-zinc-500 dark:text-zinc-400" />,
            iconBg: "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800/50",
          },
          {
            label: "Total Sales",
            value: `Rs. ${stats.totalGrand.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            cls: "text-indigo-600 dark:text-indigo-400",
            bg: "bg-white dark:bg-[#0c0c14] border-indigo-100/50 dark:border-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-800/60 shadow-[0_4px_20px_rgba(99,102,241,0.01)]",
            icon: <TrendingUp className="w-4 h-4 sm:w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
            iconBg: "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-100/40 dark:border-indigo-900/20",
          },
          {
            label: "Total Collected",
            value: `Rs. ${stats.totalPaid.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            cls: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-white dark:bg-[#0c0c14] border-emerald-100/50 dark:border-emerald-900/20 hover:border-emerald-200 dark:hover:border-emerald-800/60 shadow-[0_4px_20px_rgba(16,185,129,0.01)]",
            icon: <CheckCircle className="w-4 h-4 sm:w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
            iconBg: "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100/40 dark:border-emerald-900/20",
          },
          {
            label: "Outstanding",
            value: `Rs. ${stats.totalOutstanding.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            cls: "text-rose-600 dark:text-rose-400",
            bg: "bg-white dark:bg-[#0c0c14] border-rose-100/50 dark:border-rose-900/20 hover:border-rose-200 dark:hover:border-rose-800/60 shadow-[0_4px_20px_rgba(244,63,94,0.01)]",
            icon: <TrendingDown className="w-4 h-4 sm:w-5 h-5 text-rose-600 dark:text-rose-400" />,
            iconBg: "bg-rose-50/50 dark:bg-rose-950/20 border-rose-100/40 dark:border-rose-900/20",
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`p-3 sm:p-4 rounded-2xl border ${s.bg} flex items-center justify-between shadow-[0_8px_30px_rgb(0,0,0,0.008),0_1px_2px_rgb(0,0,0,0.006)] hover:shadow-[0_12px_35px_rgb(0,0,0,0.015),0_1px_3px_rgb(0,0,0,0.01)] hover:-translate-y-0.5 transition-all duration-300`}
          >
            <div className="space-y-1 sm:space-y-1.5 min-w-0">
              <p className="text-[9px] sm:text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-wider truncate">
                {s.label}
              </p>
              <p className={`text-xs sm:text-lg font-black tabular-nums tracking-tight truncate ${s.cls}`}>
                {s.value}
              </p>
            </div>
            <div className={`flex items-center justify-center p-1.5 sm:p-2.5 rounded-xl border ${s.iconBg} shrink-0 shadow-sm ml-1.5`}>
              {s.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, phone, invoice number..."
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-white dark:bg-[#0c0c14] border border-zinc-200 dark:border-zinc-800/85 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-[0_4px_20px_rgb(0,0,0,0.006)] placeholder-zinc-400 dark:placeholder-zinc-500 text-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div className="w-full md:w-auto overflow-x-auto scrollbar-none flex shrink-0">
          <div className="flex rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#0c0c14] p-1 gap-1 w-max md:w-auto shadow-[0_4px_20px_rgb(0,0,0,0.006)]">
            {([
              { id: "all", label: "All Bills" },
              { id: "Pending", label: "Pending" },
              { id: "Partially Paid", label: "Partial" },
              { id: "Paid", label: "Paid" },
              { id: "Overdue", label: "Overdue" },
            ] as const).map((s) => {
              const isActive = statusFilter === s.id;
              let activeClass = "";
              if (isActive) {
                switch (s.id) {
                  case "all":
                    activeClass = "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-sm";
                    break;
                  case "Paid":
                    activeClass = "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-white shadow-sm shadow-emerald-500/10";
                    break;
                  case "Partially Paid":
                    activeClass = "bg-amber-500 text-white dark:bg-amber-500 dark:text-white shadow-sm shadow-amber-500/10";
                    break;
                  case "Overdue":
                    activeClass = "bg-rose-600 text-white dark:bg-rose-500 dark:text-white shadow-sm shadow-rose-500/10";
                    break;
                  default:
                    activeClass = "bg-indigo-600 text-white";
                }
              }
              return (
                <button
                  key={s.id}
                  onClick={() => setStatusFilter(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? `${activeClass}`
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Desktop view: Table (hidden on mobile) */}
      <div className="hidden md:block">
        <Card className="p-0 overflow-hidden border border-zinc-200/60 dark:border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.012),0_1px_2px_rgb(0,0,0,0.008)]">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-full table-fixed">
              <thead className="bg-zinc-50/50 dark:bg-zinc-900/40 border-b border-zinc-150/60 dark:border-zinc-800/80 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                <tr>
                  <th className="px-4 py-3.5 text-left w-32">Invoice No</th>
                  <th className="px-4 py-3.5 text-left">Customer</th>
                  <th className="px-3 py-3.5 text-center w-28">Due Date</th>
                  <th className="px-3 py-3.5 text-right w-28">Grand Total</th>
                  <th className="px-3 py-3.5 text-right w-28">Amount Paid</th>
                  <th className="px-3 py-3.5 text-right w-28">Balance</th>
                  <th className="px-3 py-3.5 text-center w-28">Status</th>
                  <th className="px-4 py-3.5 text-center w-36">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
                {loading ? (
                  Array.from({ length: PAGE_SIZE }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={8} className="px-4 py-3.5">
                        <Skeleton className="h-7 w-full rounded-lg" />
                      </td>
                    </tr>
                  ))
                ) : bills.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <Receipt className="w-7 h-7 mx-auto mb-2 text-zinc-400 dark:text-zinc-500" />
                      <p className="text-xs text-zinc-400 dark:text-zinc-400">
                        {search ? `No matches for "${search}"` : "No credit bills found"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  bills.map((bill) => {
                    const outstanding = bill.grandTotal - bill.amountPaid;
                    return (
                      <tr
                        key={bill._id}
                        className="transition-colors hover:bg-zinc-50/30 dark:hover:bg-zinc-900/10"
                      >
                        <td className="px-4 py-3 font-mono text-zinc-800 dark:text-zinc-200">
                          {bill.billNumber}
                        </td>
                        <td className="px-4 py-3">
                          <div className="min-w-0">
                            <p className="font-bold text-zinc-800 dark:text-zinc-200 truncate">
                              {bill.customerName}
                            </p>
                            {bill.customerPhone && (
                              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                                {bill.customerPhone}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center text-zinc-500 dark:text-zinc-400 font-medium">
                          {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold text-zinc-800 dark:text-zinc-200 tabular-nums">
                          Rs. {bill.grandTotal.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-right text-emerald-600 dark:text-emerald-450 font-semibold tabular-nums">
                          Rs. {bill.amountPaid.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-right text-rose-600 dark:text-rose-400 font-bold tabular-nums">
                          Rs. {outstanding.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Badge variant={getStatusVariant(bill.status)}>
                            {bill.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => viewBillDetails(bill._id)}
                              className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-xl transition-all cursor-pointer"
                              title="View Invoice"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openPaymentModal(bill)}
                              disabled={bill.status === "Paid"}
                              className="p-1.5 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                              title="Record Payment"
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Mobile view: Cards list (hidden on desktop) */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#0c0c14] p-4 rounded-2xl border border-zinc-150 dark:border-zinc-800/80 space-y-3"
            >
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-3.5 w-24 rounded" />
              </div>
              <div className="border-t border-zinc-100 dark:border-zinc-800/60 pt-3 flex justify-between">
                <Skeleton className="h-4 w-16 rounded" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>
            </div>
          ))
        ) : bills.length === 0 ? (
          <div className="bg-white dark:bg-[#0c0c14] p-8 rounded-2xl border border-zinc-150 dark:border-zinc-800/80 text-center">
            <Receipt className="w-8 h-8 mx-auto mb-2 text-zinc-400 dark:text-zinc-500" />
            <p className="text-xs text-zinc-400 dark:text-zinc-400">
              {search ? `No matches for "${search}"` : "No credit bills found"}
            </p>
          </div>
        ) : (
          bills.map((bill) => {
            const outstanding = bill.grandTotal - bill.amountPaid;
            return (
              <div
                key={bill._id}
                className="bg-white dark:bg-[#0c0c14] p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-[0_4px_20px_rgb(0,0,0,0.005)] space-y-3 active:scale-[0.99] transition-all"
              >
                {/* Card Header: Invoice number and status */}
                <div className="flex justify-between items-center">
                  <span className="font-mono text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    {bill.billNumber}
                  </span>
                  <Badge variant={getStatusVariant(bill.status)}>
                    {bill.status}
                  </Badge>
                </div>

                {/* Card Body: Customer and due date */}
                <div>
                  <h4 className="font-extrabold text-zinc-900 dark:text-zinc-200 text-sm">
                    {bill.customerName}
                  </h4>
                  {bill.customerPhone && (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 font-semibold mt-0.5">
                      {bill.customerPhone}
                    </p>
                  )}
                  {bill.dueDate && (
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-2 flex items-center gap-1 font-bold">
                      <Calendar className="w-3.5 h-3.5 text-rose-500/80" />
                      Due: {new Date(bill.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Card Financials breakdown */}
                <div className="grid grid-cols-3 gap-2 bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-150/40 dark:border-zinc-800/50 p-2.5 rounded-xl text-center shadow-inner">
                  <div>
                    <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                      Total
                    </span>
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block mt-0.5 font-mono">
                      Rs.{bill.grandTotal.toFixed(0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                      Paid
                    </span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5 font-mono">
                      Rs.{bill.amountPaid.toFixed(0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                      Balance
                    </span>
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 block mt-0.5 font-mono">
                      Rs.{outstanding.toFixed(0)}
                    </span>
                  </div>
                </div>

                {/* Card Footer: Quick Actions */}
                <div className="flex gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                  <button
                    onClick={() => viewBillDetails(bill._id)}
                    className="flex-1 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Details
                  </button>
                  <button
                    onClick={() => openPaymentModal(bill)}
                    disabled={bill.status === "Paid"}
                    className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-900/40 disabled:text-zinc-400 dark:disabled:text-zinc-500 disabled:border-transparent rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 border border-transparent"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Pay Bill
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border border-zinc-200/60 dark:border-zinc-800/80 bg-white dark:bg-[#0c0c14] rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.005)]">
          <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-550">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-all cursor-pointer disabled:opacity-30 active:scale-95 shrink-0"
            >
              <ChevronLeft className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-all cursor-pointer disabled:opacity-30 active:scale-95 shrink-0"
            >
              <ChevronRight className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            </button>
          </div>
        </div>
      )}

      {/* Bill Details / Print view Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Credit Invoice Details"
      >
        {selectedBill && (
          <div className="space-y-5 max-h-[78vh] overflow-y-auto pr-1.5 scrollbar-none">
            {/* The printable receipt block */}
            <div
              id="print-receipt-section"
              className="p-5 bg-white dark:bg-[#0c0c14] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl space-y-5 text-zinc-900 dark:text-zinc-100 shadow-sm"
            >
              {/* Receipt Header */}
              <div className="flex justify-between items-start border-b border-dashed border-zinc-200 dark:border-zinc-800 pb-4">
                <div>
                  <span className="text-[10px] font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">
                    Credit Statement
                  </span>
                  <h3 className="font-mono text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-1">
                    {selectedBill.billNumber}
                  </h3>
                </div>
                <div>
                  <Badge variant={getStatusVariant(selectedBill.status)}>
                    {selectedBill.status}
                  </Badge>
                </div>
              </div>

              {/* Customer and creation Meta info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5 bg-zinc-50/50 dark:bg-zinc-900/25 p-3 rounded-xl border border-zinc-150/40 dark:border-zinc-800/40">
                  <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                    Customer Info
                  </p>
                  <p className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-zinc-400" />
                    {selectedBill.customerName}
                  </p>
                  {selectedBill.customerPhone && (
                    <p className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-zinc-400" />
                      {selectedBill.customerPhone}
                    </p>
                  )}
                  {selectedBill.customerAddress && (
                    <p className="text-zinc-500 dark:text-zinc-400 flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400 mt-0.5 shrink-0" />
                      <span className="break-words leading-tight">{selectedBill.customerAddress}</span>
                    </p>
                  )}
                </div>
                <div className="space-y-1.5 bg-zinc-50/50 dark:bg-zinc-900/25 p-3 rounded-xl border border-zinc-150/40 dark:border-zinc-800/40 text-left sm:text-right flex flex-col justify-between">
                  <div>
                    <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                      Invoice Dates
                    </p>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                      <span className="font-semibold text-zinc-400 dark:text-zinc-500">Issued:</span>{" "}
                      {new Date(selectedBill.createdAt).toLocaleDateString()}
                    </p>
                    {selectedBill.dueDate && (
                      <p className="text-rose-500 dark:text-rose-400 font-bold mt-0.5 flex items-center sm:justify-end gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Due: {new Date(selectedBill.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {selectedBill.createdBy && (
                    <p className="text-[10px] text-zinc-400 mt-2">
                      Billed by: <span className="font-semibold">{selectedBill.createdBy.name}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Line Items Table */}
              <div className="py-1">
                <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">
                  Invoice Items
                </p>
                <div className="overflow-x-auto scrollbar-none">
                  <table className="w-full text-left text-xs min-w-[320px]">
                    <thead>
                      <tr className="text-zinc-400 dark:text-zinc-500 font-bold border-b border-zinc-150 dark:border-zinc-800/60 pb-2 text-[10px] uppercase">
                        <th className="pb-2">Description</th>
                        <th className="text-center w-12 pb-2">Qty</th>
                        <th className="text-right w-24 pb-2">Price</th>
                        <th className="text-right w-24 pb-2">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100/60 dark:divide-zinc-800/30">
                      {selectedBill.items.map((item, index) => (
                        <tr key={index} className="text-zinc-700 dark:text-zinc-300">
                          <td className="py-2.5 pr-2 font-medium">
                            <span className="font-bold text-zinc-800 dark:text-zinc-200 block leading-tight">{item.productName}</span>
                            <span className="font-mono text-[9px] text-zinc-400 dark:text-zinc-500">
                              {item.sku}
                            </span>
                          </td>
                          <td className="py-2.5 text-center font-medium">{item.quantity}</td>
                          <td className="py-2.5 text-right font-mono text-zinc-500 dark:text-zinc-400">
                            Rs. {item.unitPrice.toFixed(2)}
                          </td>
                          <td className="py-2.5 text-right font-bold font-mono">
                            Rs. {item.total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals Summary */}
              <div className="flex flex-col items-end text-xs space-y-1.5 border-t border-dashed border-zinc-200 dark:border-zinc-800 pt-4">
                <div className="flex justify-between w-full sm:w-56 text-zinc-500 dark:text-zinc-400">
                  <span className="font-medium">Subtotal:</span>
                  <span className="font-mono font-semibold">Rs. {selectedBill.subTotal.toFixed(2)}</span>
                </div>
                {selectedBill.discount > 0 && (
                  <div className="flex justify-between w-full sm:w-56 text-zinc-500 dark:text-zinc-400">
                    <span className="font-medium">Discount:</span>
                    <span className="font-mono font-semibold text-rose-500">- Rs. {selectedBill.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between w-full sm:w-56 font-bold text-zinc-800 dark:text-zinc-200 border-t border-zinc-150 dark:border-zinc-800 pt-2">
                  <span>Grand Total:</span>
                  <span className="font-mono text-sm">Rs. {selectedBill.grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between w-full sm:w-56 text-emerald-600 dark:text-emerald-400 font-bold">
                  <span>Amount Paid:</span>
                  <span className="font-mono">Rs. {selectedBill.amountPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between w-full sm:w-56 text-rose-600 dark:text-rose-400 font-extrabold border-t border-dashed border-zinc-200 dark:border-zinc-800 pt-2">
                  <span>Outstanding Due:</span>
                  <span className="font-mono text-sm bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded-lg border border-rose-100/50 dark:border-rose-900/30">
                    Rs. {(selectedBill.grandTotal - selectedBill.amountPaid).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Extra terms note */}
              {selectedBill.note && (
                <div className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/30 p-3.5 rounded-xl border border-zinc-150 dark:border-zinc-800/60 leading-relaxed">
                  <p className="font-bold uppercase tracking-wider text-[9px] text-zinc-400 dark:text-zinc-500 mb-1">
                    Terms & Notes
                  </p>
                  {selectedBill.note}
                </div>
              )}
            </div>

            {/* Payment history block - visible inside modal only */}
            <div className="space-y-3 bg-zinc-50/30 dark:bg-zinc-900/10 p-4 rounded-2xl border border-zinc-150 dark:border-zinc-800/80">
              <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-indigo-500" /> Payment History
              </h4>
              {selectedBill.paymentHistory.length === 0 ? (
                <p className="text-xs text-zinc-400 italic pl-1">No payments recorded yet.</p>
              ) : (
                <div className="relative border-l-2 border-indigo-100 dark:border-indigo-950/50 ml-2.5 pl-4 space-y-4 my-2">
                  {selectedBill.paymentHistory.map((pm, idx) => (
                    <div key={idx} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[23px] top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-indigo-600 ring-4 ring-white dark:ring-[#0c0c14]" />
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <p className="font-extrabold text-xs text-zinc-800 dark:text-zinc-200 font-mono">
                            Rs. {pm.amount.toFixed(2)}
                          </p>
                          {pm.note && (
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                              {pm.note}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-[10px] text-zinc-400 shrink-0">
                          <p className="font-bold">{new Date(pm.date).toLocaleDateString()}</p>
                          {pm.recordedBy && <p className="font-medium text-zinc-500">by {pm.recordedBy.name}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Control buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-zinc-150 dark:border-zinc-850">
              {(role === "admin" || role === "manager") && (
                <Button
                  variant="destructive"
                  className="w-full sm:flex-1"
                  onClick={() => handleDeleteBill(selectedBill._id)}
                >
                  <Trash2 className="w-4 h-4 shrink-0" /> Cancel Bill
                </Button>
              )}
              <Button variant="outline" className="w-full sm:flex-1" onClick={handlePrint}>
                <Printer className="w-4 h-4 shrink-0" /> Print Invoice
              </Button>
              {selectedBill.status !== "Paid" && (
                <Button
                  variant="primary"
                  className="w-full sm:flex-1"
                  onClick={() => {
                    setIsDetailOpen(false);
                    openPaymentModal(selectedBill);
                  }}
                >
                  Record Payment
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        title="Record Bill Payment"
      >
        {selectedBill && (
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div className="p-4 bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-150 dark:border-zinc-800 rounded-2xl space-y-2.5 shadow-inner">
              <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span className="font-medium">Invoice Number:</span>
                <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                  {selectedBill.billNumber}
                </span>
              </div>
              <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span className="font-medium">Customer Name:</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  {selectedBill.customerName}
                </span>
              </div>
              <div className="border-t border-dashed border-zinc-200 dark:border-zinc-800/80 my-1 pt-2 space-y-1.5">
                <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span>Grand Total:</span>
                  <span className="font-mono font-semibold">Rs. {selectedBill.grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-455">
                  <span>Paid to date:</span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    Rs. {selectedBill.amountPaid.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-bold text-zinc-850 dark:text-zinc-200 border-t border-zinc-200/60 dark:border-zinc-800/60 pt-2">
                  <span>Outstanding Balance:</span>
                  <span className="font-mono text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 px-2.5 py-0.5 rounded-lg border border-rose-100/50 dark:border-rose-900/30">
                    Rs. {(selectedBill.grandTotal - selectedBill.amountPaid).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3.5">
              <Input
                label="Amount Received (Rs.)"
                placeholder="0.00"
                type="number"
                step="0.01"
                required
                value={paymentAmount}
                onChange={(e: any) => setPaymentAmount(e.target.value)}
              />
              <Input
                label="Note / Reference"
                placeholder="e.g. Cash payment, bank transfer reference..."
                value={paymentNote}
                onChange={(e: any) => setPaymentNote(e.target.value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-zinc-150 dark:border-zinc-800/60">
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:flex-1 order-2 sm:order-1"
                onClick={() => setIsPaymentOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="w-full sm:flex-1 order-1 sm:order-2"
                isLoading={submittingPayment}
              >
                Record Payment
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

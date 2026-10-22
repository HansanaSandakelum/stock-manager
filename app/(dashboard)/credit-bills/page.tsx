"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  X,
  Banknote,
  Building2,
  Hash,
  BarChart3,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const SRI_LANKAN_BANKS = [
  "Commercial Bank",
  "Bank of Ceylon (BOC)",
  "Hatton National Bank (HNB)",
  "Sampath Bank",
  "People's Bank",
  "Nations Trust Bank (NTB)",
  "Seylan Bank",
  "National Development Bank (NDB)",
  "DFCC Bank",
  "Pan Asia Bank",
  "Union Bank",
  "Standard Chartered Bank",
  "HSBC",
  "Amana Bank",
  "Cargills Bank",
  "Sanasa Development Bank (SDB)",
];

interface MonthlyDetail {
  monthKey: string;
  label: string;
  shortLabel: string;
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  offset: number;
  totalBills: number;
  totalSales: number;
  totalCollected: number;
  outstanding: number;
}

interface MonthlyCombinedStats {
  totalBills: number;
  totalSales: number;
  totalCollected: number;
  outstanding: number;
}

const formatDateToInput = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getCurrentMonthRange = () => {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: formatDateToInput(first),
    end: formatDateToInput(last),
  };
};

const getLast3MonthsRange = () => {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: formatDateToInput(first),
    end: formatDateToInput(last),
  };
};

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
  paymentMethod?: "Cash" | "Cheque" | "Bank Transfer";
  chequeNumber?: string;
  bankName?: string;
  chequeDate?: string;
  chequeStatus?: "Pending" | "Deposited" | "Cleared" | "Bounced";
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
  paymentMethod?: "Cash" | "Cheque" | "Bank Transfer" | "Credit";
  chequeNumber?: string;
  bankName?: string;
  chequeDate?: string;
  chequeStatus?: "Pending" | "Deposited" | "Cleared" | "Bounced";
  status: "Pending" | "Partially Paid" | "Paid" | "Overdue";
  dueDate?: string;
  note?: string;
  isHistorical?: boolean;
  paymentHistory: PaymentRecord[];
  createdBy?: { name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

interface OldBillItem {
  productName: string;
  sku: string;
  quantity: string;
  unitPrice: string;
}

const PAGE_SIZE = 10;

export default function CreditBillsPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const router = useRouter();

  // List view states
  const currentMonthRange = getCurrentMonthRange();
  const last3MonthsRange = getLast3MonthsRange();
  const [bills, setBills] = useState<CreditBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "Pending" | "Partially Paid" | "Paid" | "Overdue"
  >("all");
  const [startDate, setStartDate] = useState(currentMonthRange.start);
  const [endDate, setEndDate] = useState(currentMonthRange.end);
  const [dateType, setDateType] = useState<"createdAt" | "dueDate">("createdAt");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    totalBills: 0,
    totalGrand: 0,
    totalPaid: 0,
    totalOutstanding: 0,
  });

  // Monthly stats state
  const [showLast3MonthsDetails, setShowLast3MonthsDetails] = useState(false);
  const [monthlyDetails, setMonthlyDetails] = useState<MonthlyDetail[]>([]);
  const [currentMonthStats, setCurrentMonthStats] = useState<MonthlyDetail | null>(null);
  const [previous3MonthsList, setPrevious3MonthsList] = useState<MonthlyDetail[]>([]);
  const [last3MonthsCombinedStats, setLast3MonthsCombinedStats] = useState<MonthlyCombinedStats | null>(null);

  // Modal visibility states
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Selected item states
  const [selectedBill, setSelectedBill] = useState<CreditBill | null>(null);

  // Payment form states
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Cheque">("Cash");
  const [paymentChequeNumber, setPaymentChequeNumber] = useState("");
  const [paymentBankName, setPaymentBankName] = useState("");
  const [paymentChequeDate, setPaymentChequeDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentChequeStatus, setPaymentChequeStatus] = useState<"Pending" | "Deposited" | "Cleared">("Pending");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Import Old Bill form states
  const [importForm, setImportForm] = useState({
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    billDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    amountPaid: "",
    discount: "",
    note: "",
    paymentMethod: "Cash" as "Cash" | "Cheque",
    chequeNumber: "",
    bankName: "",
    chequeDate: new Date().toISOString().slice(0, 10),
  });
  const [importItems, setImportItems] = useState<OldBillItem[]>([
    { productName: "", sku: "", quantity: "", unitPrice: "" },
  ]);
  const [submittingImport, setSubmittingImport] = useState(false);
  const csvFileRef = useRef<HTMLInputElement>(null);

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
        if (startDate) queryParams.set("startDate", startDate);
        if (endDate) queryParams.set("endDate", endDate);
        if (startDate || endDate) queryParams.set("dateType", dateType);

        const res = await fetch(`/api/credit-bills?${queryParams.toString()}`);
        const data = await res.json();
        if (data.success) {
          setBills(data.data);
          setTotalPages(data.pagination.pages || 1);
          if (data.stats) {
            setStats(data.stats);
          }
          if (data.monthlyDetails) {
            setMonthlyDetails(data.monthlyDetails);
          }
          if (data.currentMonthStats) {
            setCurrentMonthStats(data.currentMonthStats);
          }
          if (data.previous3MonthsList) {
            setPrevious3MonthsList(data.previous3MonthsList);
          }
          if (data.last3MonthsCombinedStats) {
            setLast3MonthsCombinedStats(data.last3MonthsCombinedStats);
          }
        }
      } catch (err) {
        toast("Failed to load credit bills", "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, statusFilter, search, startDate, endDate, dateType]
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
    if (role === 'deliver') {
      toast('Deliver role is not permitted to record payments or edit credit bills', 'error');
      return;
    }
    setSelectedBill(bill);
    setPaymentAmount("");
    setPaymentNote("");
    setPaymentMethod("Cash");
    setPaymentChequeNumber("");
    setPaymentBankName("");
    setPaymentChequeDate(new Date().toISOString().slice(0, 10));
    setPaymentChequeStatus("Pending");
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

    if (paymentMethod === "Cheque") {
      if (!paymentChequeNumber.trim()) {
        toast("Cheque number is required for cheque payments", "error");
        return;
      }
      if (!paymentBankName.trim()) {
        toast("Bank name is required for cheque payments", "error");
        return;
      }
    }

    setSubmittingPayment(true);
    try {
      const res = await fetch(`/api/credit-bills/${selectedBill._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentAmount: amount,
          paymentNote: paymentNote || undefined,
          paymentMethod,
          chequeNumber: paymentMethod === "Cheque" ? paymentChequeNumber.trim() : undefined,
          bankName: paymentMethod === "Cheque" ? paymentBankName.trim() : undefined,
          chequeDate: paymentMethod === "Cheque" ? paymentChequeDate : undefined,
          chequeStatus: paymentMethod === "Cheque" ? paymentChequeStatus : undefined,
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

  // Update Cheque Status
  const handleUpdateChequeStatus = async (billId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/credit-bills/${billId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chequeStatus: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast(`Cheque status updated to ${newStatus}`, "success");
        if (selectedBill && selectedBill._id === billId) {
          viewBillDetails(billId);
        }
        fetchBills(true);
      } else {
        throw new Error(data.error || "Failed to update cheque status");
      }
    } catch (err: any) {
      toast(err.message, "error");
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

  // Import Old Bill Submit
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importForm.customerName.trim()) {
      toast("Customer name is required", "error");
      return;
    }
    const validItems = importItems.filter(
      (it) => it.productName.trim() && Number(it.quantity) > 0 && Number(it.unitPrice) >= 0,
    );
    if (validItems.length === 0) {
      toast("Add at least one valid item", "error");
      return;
    }
    const isImportCheque = importForm.paymentMethod === "Cheque" && Number(importForm.amountPaid) > 0;
    if (isImportCheque) {
      if (!importForm.chequeNumber.trim()) {
        toast("Cheque number is required for cheque payment", "error");
        return;
      }
      if (!importForm.bankName.trim()) {
        toast("Bank name is required for cheque payment", "error");
        return;
      }
    }

    setSubmittingImport(true);
    try {
      const res = await fetch("/api/credit-bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: importForm.customerName.trim(),
          customerPhone: importForm.customerPhone.trim() || undefined,
          customerAddress: importForm.customerAddress.trim() || undefined,
          billDate: importForm.billDate || undefined,
          dueDate: importForm.dueDate || undefined,
          amountPaid: Number(importForm.amountPaid) || 0,
          discount: Number(importForm.discount) || 0,
          note: importForm.note.trim() || undefined,
          paymentMethod: Number(importForm.amountPaid) > 0 ? importForm.paymentMethod : "Credit",
          chequeNumber: isImportCheque ? importForm.chequeNumber.trim() : undefined,
          bankName: isImportCheque ? importForm.bankName.trim() : undefined,
          chequeDate: isImportCheque ? importForm.chequeDate : undefined,
          isHistorical: true,
          items: validItems.map((it) => ({
            productName: it.productName.trim(),
            sku: it.sku.trim() || "N/A",
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
          })),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to import bill");
      toast("Old credit bill imported successfully", "success");
      setIsImportOpen(false);
      setImportForm({
        customerName: "",
        customerPhone: "",
        customerAddress: "",
        billDate: new Date().toISOString().slice(0, 10),
        dueDate: "",
        amountPaid: "",
        discount: "",
        note: "",
        paymentMethod: "Cash",
        chequeNumber: "",
        bankName: "",
        chequeDate: new Date().toISOString().slice(0, 10),
      });
      setImportItems([{ productName: "", sku: "", quantity: "", unitPrice: "" }]);
      fetchBills(true);
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setSubmittingImport(false);
    }
  };

  // ── Parse CSV file and populate import items ──────────────────────────────
  const parseCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      toast("Please upload a .csv file", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = (evt.target?.result as string) || "";
        const lines = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);
        if (lines.length < 2) {
          toast("CSV must have a header row and at least one data row", "error");
          return;
        }

        // Normalise a header cell to a key
        const normalise = (s: string) =>
          s.toLowerCase().replace(/[^a-z]/g, "");

        // Parse a CSV line (handles quoted commas)
        const parseLine = (line: string): string[] => {
          const result: string[] = [];
          let cur = "";
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') { inQuotes = !inQuotes; }
            else if (ch === "," && !inQuotes) { result.push(cur.trim()); cur = ""; }
            else { cur += ch; }
          }
          result.push(cur.trim());
          return result;
        };

        const headers = parseLine(lines[0]).map(normalise);

        // Map known customer-info header names → form fields
        const custMap: Record<string, keyof typeof importForm> = {
          customername:   "customerName",
          customer:       "customerName",
          name:           "customerName",
          phone:          "customerPhone",
          customerphone:  "customerPhone",
          address:        "customerAddress",
          customeraddress:"customerAddress",
          billdate:       "billDate",
          date:           "billDate",
          duedate:        "dueDate",
          amountpaid:     "amountPaid",
          paid:           "amountPaid",
          discount:       "discount",
          note:           "note",
        };

        // Map known item column names
        const itemMap: Record<string, keyof OldBillItem> = {
          productname:  "productName",
          product:      "productName",
          item:         "productName",
          description:  "productName",
          sku:          "sku",
          code:         "sku",
          qty:          "quantity",
          quantity:     "quantity",
          unitprice:    "unitPrice",
          price:        "unitPrice",
          rate:         "unitPrice",
        };

        // Decide if this looks like an item CSV or a mixed CSV
        const hasItemCols = headers.some((h) => itemMap[h] && itemMap[h] === "productName");
        if (!hasItemCols) {
          toast("CSV must have a 'Product Name' (or similar) column", "error");
          return;
        }

        const newItems: OldBillItem[] = [];
        const newFormUpdates: Partial<typeof importForm> = {};

        for (let i = 1; i < lines.length; i++) {
          const cells = parseLine(lines[i]);
          const row: Record<string, string> = {};
          headers.forEach((h, idx) => { row[h] = cells[idx] ?? ""; });

          // Pick up any customer-info columns from the first data row
          if (i === 1) {
            headers.forEach((h) => {
              const field = custMap[h];
              if (field && row[h]) {
                (newFormUpdates as any)[field] = row[h];
              }
            });
          }

          // Build item from item columns
          const item: OldBillItem = { productName: "", sku: "", quantity: "", unitPrice: "" };
          headers.forEach((h) => {
            const field = itemMap[h];
            if (field) (item as any)[field] = row[h] ?? "";
          });

          if (item.productName) newItems.push(item);
        }

        if (newItems.length === 0) {
          toast("No valid item rows found in CSV", "error");
          return;
        }

        if (Object.keys(newFormUpdates).length > 0) {
          setImportForm((f) => ({ ...f, ...newFormUpdates }));
        }
        setImportItems(newItems);
        toast(`Loaded ${newItems.length} item${newItems.length > 1 ? "s" : ""} from CSV`, "success");
      } catch {
        toast("Failed to parse CSV — check the format and try again", "error");
      } finally {
        // Reset file input so the same file can be re-uploaded
        if (csvFileRef.current) csvFileRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  // ── Download sample CSV ───────────────────────────────────────────────────
  const downloadSampleCsv = () => {
    const sample = [
      // Header — all supported columns
      "Product Name,SKU,Quantity,Unit Price,Customer Name,Phone,Address,Bill Date,Due Date,Amount Paid,Discount,Note",
      // First row: fill BOTH customer info AND first item
      // (Customer info is only read from the first data row)
      "Rice 5kg,RICE-001,10,250.00,John Silva,0711234567,\"123 Main St, Colombo\",2024-03-15,2024-04-15,500.00,50.00,Before system migration",
      // Subsequent rows: only item columns matter (customer info ignored)
      "Sugar 1kg,SUG-001,5,180.00,,,,,,,,",
      "Coconut Oil 1L,OIL-002,3,420.00,,,,,,,,",
    ].join("\n");
    const blob = new Blob([sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_credit_bill_items.csv";
    a.click();
    URL.revokeObjectURL(url);
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
  }, [statusFilter, search, startDate, endDate, dateType]);

  const handlePrint = () => {
    window.print();
  };

  // Active period state checks
  const isCurrentMonthActive =
    startDate === currentMonthRange.start && endDate === currentMonthRange.end;
  const isLast3MonthsActive =
    startDate === last3MonthsRange.start && endDate === last3MonthsRange.end;
  const isAllTimeActive = !startDate && !endDate;
  const isFilterActive = search.trim() !== "" || statusFilter !== "all";

  // Calculate stats to display in the 3 cards
  const displayStats = (() => {
    if (isFilterActive) {
      return {
        title: "Filtered Results",
        badge: "Filtered",
        totalBills: stats.totalBills,
        totalSales: stats.totalGrand,
        totalCollected: stats.totalPaid,
        outstanding: stats.totalOutstanding,
      };
    }
    if (isCurrentMonthActive) {
      return {
        title: currentMonthStats?.label || "Current Month",
        badge: "Current Month",
        totalBills: currentMonthStats?.totalBills ?? stats.totalBills,
        totalSales: currentMonthStats?.totalSales ?? stats.totalGrand,
        totalCollected: currentMonthStats?.totalCollected ?? stats.totalPaid,
        outstanding: currentMonthStats?.outstanding ?? stats.totalOutstanding,
      };
    }
    if (isLast3MonthsActive) {
      return {
        title: "Last 3 Months Combined",
        badge: "Last 3 Months",
        totalBills: last3MonthsCombinedStats?.totalBills ?? stats.totalBills,
        totalSales: last3MonthsCombinedStats?.totalSales ?? stats.totalGrand,
        totalCollected: last3MonthsCombinedStats?.totalCollected ?? stats.totalPaid,
        outstanding: last3MonthsCombinedStats?.outstanding ?? stats.totalOutstanding,
      };
    }
    if (isAllTimeActive) {
      return {
        title: "All Time Cumulative",
        badge: "All Time",
        totalBills: stats.totalBills,
        totalSales: stats.totalGrand,
        totalCollected: stats.totalPaid,
        outstanding: stats.totalOutstanding,
      };
    }
    return {
      title: `${startDate} to ${endDate}`,
      badge: "Custom Range",
      totalBills: stats.totalBills,
      totalSales: stats.totalGrand,
      totalCollected: stats.totalPaid,
      outstanding: stats.totalOutstanding,
    };
  })();

  // Fallback 3-month list if not yet loaded from backend
  const display3MonthsList: MonthlyDetail[] =
    previous3MonthsList.length > 0
      ? previous3MonthsList
      : [1, 2, 3].map((offset) => {
          const d = new Date();
          d.setMonth(d.getMonth() - offset);
          const yr = d.getFullYear();
          const mth = d.getMonth() + 1;
          const firstDay = new Date(yr, mth - 1, 1);
          const lastDay = new Date(yr, mth, 0);
          return {
            monthKey: `${yr}-${String(mth).padStart(2, "0")}`,
            label: d.toLocaleString("en-US", { month: "long", year: "numeric" }),
            shortLabel: d.toLocaleString("en-US", { month: "short" }),
            year: yr,
            month: mth,
            startDate: formatDateToInput(firstDay),
            endDate: formatDateToInput(lastDay),
            isCurrent: false,
            offset,
            totalBills: 0,
            totalSales: 0,
            totalCollected: 0,
            outstanding: 0,
          };
        });

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
            onClick={() => setIsImportOpen(true)}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-950/60 rounded-xl transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Import Old Bill
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

      {/* Period & Filter Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-[#0c0c14] p-3.5 sm:p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.01)]">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100/80 dark:border-indigo-900/30">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Credit Summary
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
                {displayStats.badge}: {displayStats.title}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {displayStats.totalBills} bill{displayStats.totalBills === 1 ? "" : "s"} recorded in this period
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick period switcher pills */}
          <div className="flex items-center bg-zinc-100/80 dark:bg-zinc-900/80 p-1 rounded-xl border border-zinc-200/60 dark:border-zinc-800/80 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                const r = getCurrentMonthRange();
                setStartDate(r.start);
                setEndDate(r.end);
              }}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer text-xs ${
                isCurrentMonthActive
                  ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-300 font-bold shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              Current Month
            </button>
            <button
              type="button"
              onClick={() => {
                const r = getLast3MonthsRange();
                setStartDate(r.start);
                setEndDate(r.end);
              }}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer text-xs ${
                isLast3MonthsActive
                  ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-300 font-bold shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              Last 3 Months
            </button>
            <button
              type="button"
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer text-xs ${
                isAllTimeActive
                  ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-300 font-bold shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              All Time
            </button>
          </div>

          {/* Toggle Last 3 Months Details */}
          <button
            type="button"
            onClick={() => setShowLast3MonthsDetails((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer active:scale-95 ${
              showLast3MonthsDetails
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/20"
                : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-950/70"
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>{showLast3MonthsDetails ? "Hide 3 Months Details" : "Show Last 3 Months Details"}</span>
            {showLast3MonthsDetails ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Stats row - ONLY 3 CARDS: Total Sales, Total Collected, Outstanding */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Card 1: Total Sales */}
        <div className="p-4 sm:p-5 rounded-2xl border border-indigo-100/70 dark:border-indigo-900/30 bg-gradient-to-br from-white via-indigo-50/20 to-white dark:from-[#0c0c14] dark:via-indigo-950/15 dark:to-[#0c0c14] shadow-[0_8px_30px_rgb(99,102,241,0.03),0_1px_2px_rgb(0,0,0,0.01)] hover:shadow-[0_12px_35px_rgb(99,102,241,0.06)] hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] sm:text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Total Sales
            </span>
            <div className="p-2 sm:p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100/80 dark:border-indigo-900/30">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight tabular-nums">
            Rs. {displayStats.totalSales.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/60 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span>{displayStats.badge}</span>
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              {displayStats.totalBills} {displayStats.totalBills === 1 ? "invoice" : "invoices"}
            </span>
          </div>
        </div>

        {/* Card 2: Total Collected */}
        <div className="p-4 sm:p-5 rounded-2xl border border-emerald-100/70 dark:border-emerald-900/30 bg-gradient-to-br from-white via-emerald-50/20 to-white dark:from-[#0c0c14] dark:via-emerald-950/15 dark:to-[#0c0c14] shadow-[0_8px_30px_rgb(16,185,129,0.03),0_1px_2px_rgb(0,0,0,0.01)] hover:shadow-[0_12px_35px_rgb(16,185,129,0.06)] hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] sm:text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Total Collected
            </span>
            <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100/80 dark:border-emerald-900/30">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums">
            Rs. {displayStats.totalCollected.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/60 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span>Collection Rate</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {displayStats.totalSales > 0
                ? `${Math.min(100, Math.round((displayStats.totalCollected / displayStats.totalSales) * 100))}%`
                : "0%"}
            </span>
          </div>
        </div>

        {/* Card 3: Outstanding */}
        <div className="p-4 sm:p-5 rounded-2xl border border-rose-100/70 dark:border-rose-900/30 bg-gradient-to-br from-white via-rose-50/20 to-white dark:from-[#0c0c14] dark:via-rose-950/15 dark:to-[#0c0c14] shadow-[0_8px_30px_rgb(244,63,94,0.03),0_1px_2px_rgb(0,0,0,0.01)] hover:shadow-[0_12px_35px_rgb(244,63,94,0.06)] hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] sm:text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Outstanding
            </span>
            <div className="p-2 sm:p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100/80 dark:border-rose-900/30">
              <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight tabular-nums">
            Rs. {displayStats.outstanding.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/60 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span>Pending Balance</span>
            <span className="font-bold text-rose-600 dark:text-rose-400">
              {displayStats.totalSales > 0
                ? `${Math.max(0, Math.round((displayStats.outstanding / displayStats.totalSales) * 100))}% unpaid`
                : "0% unpaid"}
            </span>
          </div>
        </div>
      </div>

      {/* Expandable Section: Last 3 Months Details */}
      {showLast3MonthsDetails && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c0c14] border border-indigo-100 dark:border-indigo-950/60 shadow-[0_10px_35px_rgba(99,102,241,0.04)] space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/70">
            <div>
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Last 3 Months Performance Details
                </h3>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Month-by-month analysis of Total Sales, Total Collected, and Outstanding balances
              </p>
            </div>
            {last3MonthsCombinedStats && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
                  <span className="text-zinc-500 dark:text-zinc-400">3M Sales: </span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    Rs. {last3MonthsCombinedStats.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
                  <span className="text-zinc-500 dark:text-zinc-400">3M Collected: </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    Rs. {last3MonthsCombinedStats.totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
                  <span className="text-zinc-500 dark:text-zinc-400">3M Outstanding: </span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    Rs. {last3MonthsCombinedStats.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Cards for each of the 3 previous months */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {display3MonthsList.map((m, idx) => {
              const collectionPct =
                m.totalSales > 0 ? Math.min(100, Math.round((m.totalCollected / m.totalSales) * 100)) : 0;
              const isMonthFiltered = startDate === m.startDate && endDate === m.endDate;

              return (
                <div
                  key={m.monthKey}
                  className={`p-4 rounded-xl border transition-all ${
                    isMonthFiltered
                      ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-sm"
                      : "border-zinc-200/70 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-900/30 hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {m.label}
                      </h4>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        {idx === 0 ? "Previous Month" : `${idx + 1} Months Ago`} • {m.totalBills} bill{m.totalBills === 1 ? "" : "s"}
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                      {m.shortLabel} {m.year}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 dark:text-zinc-400">Total Sales:</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                        Rs. {m.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 dark:text-zinc-400">Total Collected:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        Rs. {m.totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 dark:text-zinc-400">Outstanding:</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                        Rs. {m.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Collection Progress bar */}
                    <div className="pt-1.5 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-zinc-400">Collection Rate</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{collectionPct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${collectionPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Filter action button */}
                  <div className="mt-3.5 pt-2.5 border-t border-zinc-200/60 dark:border-zinc-800 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (isMonthFiltered) {
                          const cur = getCurrentMonthRange();
                          setStartDate(cur.start);
                          setEndDate(cur.end);
                          toast("Reset to current month view", "info");
                        } else {
                          setStartDate(m.startDate);
                          setEndDate(m.endDate);
                          toast(`Filtered bills for ${m.label}`, "info");
                        }
                      }}
                      className={`text-[11px] font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        isMonthFiltered
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                      }`}
                    >
                      <span>{isMonthFiltered ? "Active Filter (Reset)" : "Filter this month's bills"}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      {/* Date Range Filter Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-[#0c0c14] p-3.5 rounded-2xl border border-zinc-200/70 dark:border-zinc-800/80 shadow-[0_4px_20px_rgb(0,0,0,0.006)]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200 font-bold text-xs shrink-0">
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-700/60 shadow-xs flex items-center justify-center">
              <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
            </span>
            <span className="hidden sm:inline">Filter By:</span>
            {/* Dropdown toggle for Bill Date vs Due Date */}
            <select
              value={dateType}
              onChange={(e) => setDateType(e.target.value as "createdAt" | "dueDate")}
              className="text-xs font-bold bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-750 text-zinc-800 dark:text-zinc-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 cursor-pointer shadow-xs"
            >
              <option value="createdAt">Bill Date</option>
              <option value="dueDate">Due Date</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              onClick={(e) => {
                const input = e.currentTarget.querySelector('input[type="date"]') as HTMLInputElement | null;
                if (input && typeof input.showPicker === 'function') {
                  try { input.showPicker(); } catch {}
                }
              }}
              className="relative flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 px-2.5 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer group"
            >
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-400 uppercase tracking-wider select-none pointer-events-none">
                From
              </span>
              <div className="relative flex items-center">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none cursor-pointer pr-5 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:h-5 [&::-webkit-calendar-picker-indicator]:cursor-pointer dark:[color-scheme:dark]"
                />
                <Calendar className="w-3.5 h-3.5 text-zinc-400 dark:text-white group-hover:text-zinc-600 dark:group-hover:text-white absolute right-0 pointer-events-none transition-colors" />
              </div>
            </div>
            <span className="text-zinc-400 dark:text-zinc-500 text-xs font-semibold select-none">to</span>
            <div
              onClick={(e) => {
                const input = e.currentTarget.querySelector('input[type="date"]') as HTMLInputElement | null;
                if (input && typeof input.showPicker === 'function') {
                  try { input.showPicker(); } catch {}
                }
              }}
              className="relative flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 px-2.5 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer group"
            >
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-400 uppercase tracking-wider select-none pointer-events-none">
                To
              </span>
              <div className="relative flex items-center">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none cursor-pointer pr-5 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:h-5 [&::-webkit-calendar-picker-indicator]:cursor-pointer dark:[color-scheme:dark]"
                />
                <Calendar className="w-3.5 h-3.5 text-zinc-400 dark:text-white group-hover:text-zinc-600 dark:group-hover:text-white absolute right-0 pointer-events-none transition-colors" />
              </div>
            </div>

            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-all cursor-pointer shadow-xs"
                title="Reset date filter"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-2 lg:pt-0 border-t lg:border-t-0 border-zinc-100 dark:border-zinc-800/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mr-1 shrink-0">
            Presets:
          </span>
          {[
            {
              label: "This Month",
              getRange: () => {
                const r = getCurrentMonthRange();
                return [r.start, r.end];
              },
            },
            {
              label: "Last 3 Months",
              getRange: () => {
                const r = getLast3MonthsRange();
                return [r.start, r.end];
              },
            },
            {
              label: "Today",
              getRange: () => {
                const t = formatDateToInput(new Date());
                return [t, t];
              },
            },
            {
              label: "Yesterday",
              getRange: () => {
                const y = new Date();
                y.setDate(y.getDate() - 1);
                const s = formatDateToInput(y);
                return [s, s];
              },
            },
            {
              label: "Last 7 Days",
              getRange: () => {
                const d = new Date();
                d.setDate(d.getDate() - 6);
                return [formatDateToInput(d), formatDateToInput(new Date())];
              },
            },
          ].map((preset) => {
            const [pStart, pEnd] = preset.getRange();
            const isPresetActive = startDate === pStart && endDate === pEnd;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  if (isPresetActive) {
                    setStartDate("");
                    setEndDate("");
                  } else {
                    setStartDate(pStart);
                    setEndDate(pEnd);
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isPresetActive
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 border border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/30"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
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
                        {search || startDate || endDate || statusFilter !== "all"
                          ? "No credit bills match the selected filters"
                          : "No credit bills found"}
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
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold">{bill.billNumber}</span>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-sans">
                              {new Date(bill.createdAt).toLocaleDateString()}
                            </span>
                            {bill.isHistorical && (
                              <span className="inline-block text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 px-1.5 py-0.5 rounded-md w-fit">
                                Historical
                              </span>
                            )}
                          </div>
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
                        <td className="px-3 py-3 text-right tabular-nums">
                          <span className="font-semibold text-emerald-600 dark:text-emerald-450 block">
                            Rs. {bill.amountPaid.toFixed(2)}
                          </span>
                          {(bill.paymentMethod === "Cheque" || bill.chequeNumber) && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40 px-1.5 py-0.2 rounded mt-0.5">
                              <CreditCard className="w-2.5 h-2.5" /> Cheque
                            </span>
                          )}
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
                            {role !== "deliver" && (
                              <button
                                onClick={() => openPaymentModal(bill)}
                                disabled={bill.status === "Paid"}
                                className="p-1.5 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                                title="Record Payment"
                              >
                                <CreditCard className="w-4 h-4" />
                              </button>
                            )}
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
              {search || startDate || endDate || statusFilter !== "all"
                ? "No credit bills match the selected filters"
                : "No credit bills found"}
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
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      {bill.billNumber}
                    </span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-sans">
                      {new Date(bill.createdAt).toLocaleDateString()}
                    </span>
                    {bill.isHistorical && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 px-1.5 py-0.5 rounded-md w-fit">
                        Historical
                      </span>
                    )}
                  </div>
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
                    {(bill.paymentMethod === "Cheque" || bill.chequeNumber) && (
                      <span className="text-[8px] font-bold text-indigo-600 dark:text-indigo-400 block mt-0.5">
                        Cheque
                      </span>
                    )}
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
                  {role !== "deliver" && (
                    <button
                      onClick={() => openPaymentModal(bill)}
                      disabled={bill.status === "Paid"}
                      className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-900/40 disabled:text-zinc-400 dark:disabled:text-zinc-500 disabled:border-transparent rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 border border-transparent"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Pay Bill
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border border-zinc-200/60 dark:border-zinc-800/80 bg-white dark:bg-[#0c0c14] rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.005)]">
          <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
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

      {/* ── Import Old Bill Modal ─────────────────────────────────── */}
      <Modal
        isOpen={isImportOpen}
        onClose={() => !submittingImport && setIsImportOpen(false)}
        title="Import Old Credit Bill"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleImportSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1 scrollbar-none">
          {/* Info banner */}
          <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/40 rounded-xl p-3">
            <span className="text-amber-500 text-lg leading-none mt-0.5">⚠</span>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
              This records a <strong>historical bill only</strong> — it will <strong>not</strong> affect stock levels or create any transaction records.
            </p>
          </div>

          {/* Customer Details */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Customer Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Customer Name <span className="text-rose-500">*</span></label>
                <Input
                  value={importForm.customerName}
                  onChange={(e) => setImportForm((f) => ({ ...f, customerName: e.target.value }))}
                  placeholder="e.g. John Silva"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Phone</label>
                <Input
                  value={importForm.customerPhone}
                  onChange={(e) => setImportForm((f) => ({ ...f, customerPhone: e.target.value }))}
                  placeholder="e.g. 071 234 5678"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Address</label>
              <Input
                value={importForm.customerAddress}
                onChange={(e) => setImportForm((f) => ({ ...f, customerAddress: e.target.value }))}
                placeholder="Customer address (optional)"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Bill Date <span className="text-rose-500">*</span></label>
              <Input
                type="date"
                value={importForm.billDate}
                onChange={(e) => setImportForm((f) => ({ ...f, billDate: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Due Date</label>
              <Input
                type="date"
                value={importForm.dueDate}
                onChange={(e) => setImportForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Items <span className="text-rose-500">*</span></p>
              <div className="flex items-center gap-2">
                {/* CSV upload */}
                <button
                  type="button"
                  onClick={() => csvFileRef.current?.click()}
                  className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1 cursor-pointer border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 px-2.5 py-1 rounded-lg transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  Upload CSV
                </button>
                {/* Sample download */}
                <button
                  type="button"
                  onClick={downloadSampleCsv}
                  className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
                  title="Download a sample CSV to use as a template"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" /></svg>
                  Sample
                </button>
                {/* Add row */}
                <button
                  type="button"
                  onClick={() => setImportItems((prev) => [...prev, { productName: "", sku: "", quantity: "", unitPrice: "" }])}
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Row
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {/* Header row */}
              <div className="grid gap-2 px-1" style={{gridTemplateColumns: '2.4fr 1.1fr 0.9fr 1.6fr 2rem'}}>
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Product Name</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">SKU</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Qty</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Unit Price (Rs.)</span>
                <span></span>
              </div>
              {importItems.map((item, idx) => (
                <div key={idx} className="grid gap-2 items-center" style={{gridTemplateColumns: '2.4fr 1.1fr 0.9fr 1.6fr 2rem'}}>
                  <Input
                    value={item.productName}
                    onChange={(e) => setImportItems((prev) => prev.map((it, i) => i === idx ? { ...it, productName: e.target.value } : it))}
                    placeholder="Product name"
                    className="text-xs"
                  />
                  <Input
                    value={item.sku}
                    onChange={(e) => setImportItems((prev) => prev.map((it, i) => i === idx ? { ...it, sku: e.target.value } : it))}
                    placeholder="N/A"
                    className="text-xs"
                  />
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => setImportItems((prev) => prev.map((it, i) => i === idx ? { ...it, quantity: e.target.value } : it))}
                    placeholder="0"
                    className="text-xs"
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => setImportItems((prev) => prev.map((it, i) => i === idx ? { ...it, unitPrice: e.target.value } : it))}
                    placeholder="0.00"
                    className="text-xs"
                  />
                  <div className="flex justify-center">
                    {importItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setImportItems((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20"
                      >
                        <span className="text-base leading-none">×</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* Running subtotal */}
            {(() => {
              const sub = importItems.reduce((s, it) => s + (Number(it.quantity) * Number(it.unitPrice) || 0), 0);
              const disc = Number(importForm.discount) || 0;
              const grand = Math.max(0, sub - disc);
              return sub > 0 ? (
                <div className="flex justify-end gap-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400 pt-1 pr-1">
                  <span>Subtotal: <span className="text-zinc-800 dark:text-zinc-200">Rs. {sub.toFixed(2)}</span></span>
                  {disc > 0 && <span>Discount: <span className="text-rose-500">-Rs. {disc.toFixed(2)}</span></span>}
                  <span>Grand Total: <span className="text-indigo-600 dark:text-indigo-400 font-bold">Rs. {grand.toFixed(2)}</span></span>
                </div>
              ) : null;
            })()}
          </div>

          {/* Discount and Payment */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Discount (Rs.)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={importForm.discount}
                onChange={(e) => setImportForm((f) => ({ ...f, discount: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Amount Already Paid (Rs.)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={importForm.amountPaid}
                onChange={(e) => setImportForm((f) => ({ ...f, amountPaid: e.target.value }))}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Payment Method in Import Modal */}
          {Number(importForm.amountPaid) > 0 && (
            <div className="p-3 bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Payment Method</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setImportForm((f) => ({ ...f, paymentMethod: "Cash" }))}
                    className={`px-2 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      importForm.paymentMethod === "Cash"
                        ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                        : "text-zinc-400 hover:text-zinc-700"
                    }`}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportForm((f) => ({ ...f, paymentMethod: "Cheque" }))}
                    className={`px-2 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      importForm.paymentMethod === "Cheque"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-zinc-400 hover:text-zinc-700"
                    }`}
                  >
                    Cheque
                  </button>
                </div>
              </div>

              {importForm.paymentMethod === "Cheque" && (
                <div className="space-y-2 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">Cheque Number *</label>
                      <Input
                        value={importForm.chequeNumber}
                        onChange={(e) => setImportForm((f) => ({ ...f, chequeNumber: e.target.value }))}
                        placeholder="e.g. 104523"
                        className="text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">Bank Name *</label>
                      <input
                        list="import-bank-options"
                        value={importForm.bankName}
                        onChange={(e) => setImportForm((f) => ({ ...f, bankName: e.target.value }))}
                        placeholder="e.g. Commercial Bank"
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-800 dark:text-zinc-100"
                      />
                      <datalist id="import-bank-options">
                        {SRI_LANKAN_BANKS.map((b) => (
                          <option key={b} value={b} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">Cheque Date</label>
                    <input
                      type="date"
                      value={importForm.chequeDate}
                      onChange={(e) => setImportForm((f) => ({ ...f, chequeDate: e.target.value }))}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Note (optional)</label>
            <textarea
              value={importForm.note}
              onChange={(e) => setImportForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="e.g. Bill from March 2024, before system migration"
              rows={2}
            className="w-full px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 bg-zinc-50/30 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
            <button
              type="button"
              onClick={() => setIsImportOpen(false)}
              disabled={submittingImport}
              className="flex-1 py-2.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingImport}
              className="flex-1 py-2.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-400 rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submittingImport ? "Importing..." : "Import Bill"}
            </button>
          </div>
          {/* Hidden CSV file input */}
          <input
            ref={csvFileRef}
            type="file"
            accept=".csv"
            onChange={parseCsv}
            className="hidden"
          />
        </form>
      </Modal>

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
                {(selectedBill.paymentMethod === "Cheque" || selectedBill.chequeNumber) && (
                  <div className="flex justify-between w-full sm:w-56 text-indigo-600 dark:text-indigo-400 font-semibold text-[10px]">
                    <span>Cheque Info:</span>
                    <span className="font-mono">
                      #{selectedBill.chequeNumber} {selectedBill.bankName ? `(${selectedBill.bankName})` : ""}
                    </span>
                  </div>
                )}
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
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-zinc-800 dark:text-zinc-200 font-mono">
                              Rs. {pm.amount.toFixed(2)}
                            </span>
                            {pm.paymentMethod === "Cheque" || pm.chequeNumber ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800/60 px-1.5 py-0.5 rounded">
                                <CreditCard className="w-2.5 h-2.5" /> Cheque
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 px-1.5 py-0.5 rounded">
                                <Banknote className="w-2.5 h-2.5" /> Cash
                              </span>
                            )}
                          </div>

                          {(pm.paymentMethod === "Cheque" || pm.chequeNumber) && (
                            <div className="p-2 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-[10px] space-y-1">
                              <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                                <span className="font-bold">Cheque No:</span>
                                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                  #{pm.chequeNumber || "N/A"}
                                </span>
                                {pm.bankName && <span className="text-zinc-500">• {pm.bankName}</span>}
                              </div>
                              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 gap-2">
                                {pm.chequeDate && (
                                  <span>Cheque Date: {new Date(pm.chequeDate).toLocaleDateString()}</span>
                                )}
                                {pm.chequeStatus && (
                                  <span
                                    className={`font-bold px-1.5 py-0.5 rounded text-[9px] ${
                                      pm.chequeStatus === "Cleared"
                                        ? "text-emerald-700 bg-emerald-100/70 dark:bg-emerald-950/60"
                                        : pm.chequeStatus === "Deposited"
                                        ? "text-blue-700 bg-blue-100/70 dark:bg-blue-950/60"
                                        : pm.chequeStatus === "Bounced"
                                        ? "text-rose-700 bg-rose-100/70 dark:bg-rose-950/60"
                                        : "text-amber-700 bg-amber-100/70 dark:bg-amber-950/60"
                                    }`}
                                  >
                                    {pm.chequeStatus}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {pm.note && (
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                              {pm.note}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-[10px] text-zinc-400 shrink-0">
                          <p className="font-bold">{new Date(pm.date).toLocaleDateString()}</p>
                          {pm.recordedBy && <p className="font-medium text-zinc-500">by {pm.recordedBy.name}</p>}
                          {(pm.paymentMethod === "Cheque" || pm.chequeNumber) && (role === "admin" || role === "manager") && (
                            <div className="mt-1 flex items-center justify-end gap-1">
                              <span className="text-[9px] text-zinc-400">Status:</span>
                              <select
                                value={pm.chequeStatus || "Pending"}
                                onChange={(e) => handleUpdateChequeStatus(selectedBill._id, e.target.value)}
                                className="text-[9px] font-bold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-1.5 py-0.5 text-zinc-850 dark:text-zinc-200 cursor-pointer"
                              >
                                <option value="Pending">Pending</option>
                                <option value="Deposited">Deposited</option>
                                <option value="Cleared">Cleared</option>
                                <option value="Bounced">Bounced</option>
                              </select>
                            </div>
                          )}
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
              {role !== "deliver" && selectedBill.status !== "Paid" && (
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
              {/* Payment Method Selector */}
              <div>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("Cash")}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      paymentMethod === "Cash"
                        ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod("Cheque");
                      if (!paymentAmount && selectedBill) {
                        const out = selectedBill.grandTotal - selectedBill.amountPaid;
                        if (out > 0) setPaymentAmount(out.toFixed(2));
                      }
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      paymentMethod === "Cheque"
                        ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm"
                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Cheque
                  </button>
                </div>
              </div>

              <Input
                label={paymentMethod === "Cheque" ? "Cheque Amount (Rs.)" : "Amount Received (Rs.)"}
                placeholder="0.00"
                type="number"
                step="0.01"
                required
                value={paymentAmount}
                onChange={(e: any) => setPaymentAmount(e.target.value)}
              />

              {/* Cheque Details Fields */}
              {paymentMethod === "Cheque" && (
                <div className="p-3.5 bg-gradient-to-b from-indigo-50/70 to-blue-50/40 dark:from-indigo-950/30 dark:to-blue-950/20 border border-indigo-200/80 dark:border-indigo-800/50 rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-indigo-100 dark:border-indigo-900/40 pb-1.5">
                    <span className="text-[11px] font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" /> Cheque Information
                    </span>
                    <span className="text-[9px] font-bold text-rose-500 uppercase">* Required</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider block">
                      Cheque Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Hash className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                      <input
                        type="text"
                        required={paymentMethod === "Cheque"}
                        placeholder="e.g. CHQ-209481"
                        value={paymentChequeNumber}
                        onChange={(e) => setPaymentChequeNumber(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:border-indigo-500 font-mono font-bold text-zinc-800 dark:text-zinc-100 placeholder-zinc-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider block">
                      Bank Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                      <input
                        type="text"
                        list="modal-bank-options"
                        required={paymentMethod === "Cheque"}
                        placeholder="e.g. Commercial Bank"
                        value={paymentBankName}
                        onChange={(e) => setPaymentBankName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:border-indigo-500 font-medium text-zinc-800 dark:text-zinc-100 placeholder-zinc-400"
                      />
                      <datalist id="modal-bank-options">
                        {SRI_LANKAN_BANKS.map((b) => (
                          <option key={b} value={b} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider block">
                        Cheque Date
                      </label>
                      <input
                        type="date"
                        value={paymentChequeDate}
                        onChange={(e) => setPaymentChequeDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:border-indigo-500 text-zinc-800 dark:text-zinc-100 font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider block">
                        Status
                      </label>
                      <select
                        value={paymentChequeStatus}
                        onChange={(e) => setPaymentChequeStatus(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:border-indigo-500 text-zinc-800 dark:text-zinc-100 font-medium cursor-pointer"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Deposited">Deposited</option>
                        <option value="Cleared">Cleared</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <Input
                label="Note / Reference"
                placeholder="e.g. Customer signature on cheque, reference note..."
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

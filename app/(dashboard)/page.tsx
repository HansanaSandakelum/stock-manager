'use client';

import { useEffect, useState } from 'react';
import { Package, Coins, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { StockChart } from '@/components/dashboard/StockChart';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { Skeleton } from '@/components/ui/Skeleton';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, chartRes, recentRes] = await Promise.all([
          fetch('/api/dashboard/stats').then(r => r.json()),
          fetch('/api/dashboard/chart').then(r => r.json()),
          fetch('/api/dashboard/recent').then(r => r.json())
        ]);

        if (statsRes.success) setStats(statsRes.data);
        if (chartRes.success) setChartData(chartRes.data);
        if (recentRes.success) setRecent(recentRes.data);
      } catch (error) {
        console.error('Failed to load dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-[400px] rounded-xl" />
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return `Rs. ${value.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Total Products" 
          value={stats?.totalProducts || 0} 
          icon={Package} 
        />
        <StatsCard 
          title="Total Stock Value" 
          value={formatCurrency(stats?.totalValue || 0)} 
          icon={Coins} 
        />
        <StatsCard 
          title="Low Stock Items" 
          value={stats?.lowStockCount || 0} 
          icon={AlertTriangle} 
        />
        <StatsCard 
          title="Monthly Transactions" 
          value={stats?.monthlyTransactions || 0} 
          icon={ArrowRightLeft} 
        />
      </div>

      {/* Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <StockChart data={chartData} />
        </div>
        <div>
          <RecentActivity transactions={recent} />
        </div>
      </div>
    </div>
  );
}

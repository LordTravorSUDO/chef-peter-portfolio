/**
 * /admin — Dashboard with real Supabase statistics.
 */

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText, CheckCircle, Clock, Archive,
  PlusCircle, RefreshCw, AlertCircle, TrendingUp,
} from 'lucide-react';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import { useAuth } from '../../hooks/useAuth';
import Badge from '../../components/admin/ui/Badge';
import Button from '../../components/admin/ui/Button';
import Spinner from '../../components/admin/ui/Spinner';
import EmptyState from '../../components/admin/ui/EmptyState';

interface StatCardProps {
  label:    string;
  value:    number | string;
  icon:     React.ReactNode;
  color:    string;
  to?:      string;
}

function StatCard({ label, value, icon, color, to }: StatCardProps) {
  const inner = (
    <div className={`bg-white rounded-xl border border-[#DDE3EA] p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition ${to ? 'cursor-pointer' : ''}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-[#1A2B40]">{value}</p>
        <p className="text-xs text-[#6B7A8D] font-medium mt-0.5">{label}</p>
      </div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : <div>{inner}</div>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { timeZone: 'Africa/Kampala',
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const { stats, recentArticles, loading, error, refresh } = useDashboardStats();
  const navigate = useNavigate();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <title>Dashboard | Chef Peter CMS</title>
      <meta name="robots" content="noindex, nofollow" />

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1B365D]">
            {greeting()}{profile?.display_name ? `, ${profile.display_name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm text-[#6B7A8D] mt-0.5">
            Here's what's happening with your content today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={refresh}
            aria-label="Refresh statistics"
          >
            Refresh
          </Button>
          <Button
            size="sm"
            icon={<PlusCircle className="w-3.5 h-3.5" />}
            onClick={() => navigate('/admin/articles/new')}
          >
            New article
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-700">Could not load statistics</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={refresh} className="ml-auto">Retry</Button>
        </div>
      )}

      {/* Stats grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#DDE3EA] p-5 h-24 flex items-center justify-center">
              <Spinner size="sm" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total articles"
            value={stats.total}
            icon={<FileText className="w-5 h-5 text-[#1B365D]" />}
            color="bg-[#1B365D]/10"
            to="/admin/articles"
          />
          <StatCard
            label="Published"
            value={stats.published}
            icon={<CheckCircle className="w-5 h-5 text-emerald-600" />}
            color="bg-emerald-50"
            to="/admin/articles?status=published"
          />
          <StatCard
            label="Drafts"
            value={stats.drafts}
            icon={<FileText className="w-5 h-5 text-[#6B7A8D]" />}
            color="bg-slate-100"
            to="/admin/articles?status=draft"
          />
          <StatCard
            label="Scheduled"
            value={stats.scheduled}
            icon={<Clock className="w-5 h-5 text-[#D99B26]" />}
            color="bg-amber-50"
            to="/admin/articles?status=scheduled"
          />
        </div>
      )}

      {/* Recent articles */}
      <div className="bg-white rounded-xl border border-[#DDE3EA] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#DDE3EA] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#4A777A]" />
            <h2 className="text-sm font-semibold text-[#1A2B40]">Recently updated</h2>
          </div>
          <Link
            to="/admin/articles"
            className="text-xs text-[#4A777A] hover:text-[#1B365D] font-medium transition"
          >
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center"><Spinner /></div>
        ) : recentArticles.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-6 h-6" />}
            title="No articles yet"
            description="Create your first article to start building your content library."
            action={{ label: 'Create article', onClick: () => navigate('/admin/articles/new') }}
          />
        ) : (
          <div className="divide-y divide-[#DDE3EA]">
            {recentArticles.map((article) => (
              <div key={article.id} className="px-5 py-3 flex items-center gap-3 group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1A2B40] truncate">{article.title}</p>
                  <p className="text-xs text-[#6B7A8D] mt-0.5">
                    Updated {formatDate(article.updated_at)}
                  </p>
                </div>
                <Badge status={article.status} />
                <Link
                  to={`/admin/articles/${article.id}/edit`}
                  className="text-xs text-[#4A777A] hover:text-[#1B365D] font-medium transition opacity-0 group-hover:opacity-100"
                >
                  Edit
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Manage categories', to: '/admin/categories', icon: <Archive className="w-4 h-4" /> },
          { label: 'Manage tags',       to: '/admin/tags',       icon: <FileText  className="w-4 h-4" /> },
          { label: 'Media library',     to: '/admin/media',      icon: <FileText  className="w-4 h-4" /> },
        ].map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="bg-white border border-[#DDE3EA] rounded-xl p-4 flex items-center gap-3 hover:border-[#4A777A] hover:shadow-sm transition"
          >
            <span className="text-[#4A777A]">{l.icon}</span>
            <span className="text-sm font-medium text-[#1A2B40]">{l.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

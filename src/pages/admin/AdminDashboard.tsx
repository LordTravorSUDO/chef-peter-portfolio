/**
 * /admin — Dashboard with real Supabase statistics.
 */

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText, CheckCircle, Clock, Archive,
  PlusCircle, RefreshCw, AlertCircle, TrendingUp, Send, FolderOpen, ListChecks, Image as ImageIcon, Tag, UserRound,
} from 'lucide-react';
import { formatInZone } from '../../lib/datetime';
import type { RecentArticle } from '../../hooks/useDashboardStats';
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
        <p className="text-xs text-[#5F6E80] font-medium mt-0.5">{label}</p>
      </div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : <div>{inner}</div>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const { stats, recentArticles, recentlyPublished, upcoming, categories, uncategorised, attention, loading, error, refresh } = useDashboardStats();
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
          <p className="text-sm text-[#5F6E80] mt-0.5">
            An overview of the culinary library.
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
            <p className="text-xs text-red-700 mt-0.5">{error}</p>
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
            icon={<CheckCircle className="w-5 h-5 text-emerald-700" />}
            color="bg-emerald-50"
            to="/admin/articles?status=published"
          />
          <StatCard
            label="Drafts"
            value={stats.drafts}
            icon={<FileText className="w-5 h-5 text-[#5F6E80]" />}
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

      {/* Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Recently updated" icon={<TrendingUp className="w-4 h-4 text-[#4A777A]" />} link={{ to: '/admin/articles', label: 'All articles' }}>
          {loading ? <PanelLoading /> : recentArticles.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-6 h-6" />}
              title="No articles yet"
              description="Create your first article to start the library."
              action={{ label: 'Create article', onClick: () => navigate('/admin/articles/new') }}
            />
          ) : (
            <ArticleList items={recentArticles} detail={(a) => `Updated ${formatDate(a.updated_at)}`} showBadge />
          )}
        </Panel>

        <Panel title="Recently published" icon={<Send className="w-4 h-4 text-emerald-700" />} link={{ to: '/admin/articles?status=published&date=published_at', label: 'All published' }}>
          {loading ? <PanelLoading /> : recentlyPublished.length === 0 ? (
            <p className="px-5 py-6 text-sm text-[#5F6E80]">Nothing published yet.</p>
          ) : (
            <ArticleList items={recentlyPublished} detail={(a) => `Published ${a.published_at ? formatDate(a.published_at) : ''}`} viewLive />
          )}
        </Panel>

        <Panel title="Scheduled to go live" icon={<Clock className="w-4 h-4 text-[#D99B26]" />} link={{ to: '/admin/articles?status=scheduled', label: 'All scheduled' }}>
          {loading ? <PanelLoading /> : upcoming.length === 0 ? (
            <p className="px-5 py-6 text-sm text-[#5F6E80]">No articles are scheduled.</p>
          ) : (
            <ArticleList
              items={upcoming}
              detail={(a) => a.scheduled_for ? `${formatInZone(a.scheduled_for, undefined, { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} (Kampala)` : ''}
            />
          )}
        </Panel>

        <Panel title="Needs attention" icon={<ListChecks className="w-4 h-4 text-[#8A5A12]" />}>
          {loading ? <PanelLoading /> : attention.length === 0 ? (
            <p className="px-5 py-6 text-sm text-[#5F6E80]">Every published article has a category, a featured image and an introduction.</p>
          ) : (
            <ul className="divide-y divide-[#DDE3EA]">
              {attention.map((item) => (
                <li key={item.id + item.issue} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A2B40] truncate">{item.title}</p>
                    <p className="text-xs text-[#8A5A12] mt-0.5">{item.issue}</p>
                  </div>
                  <Link to={`/admin/articles/${item.id}/edit`} className="text-xs text-[#4A777A] hover:text-[#1B365D] font-medium">Fix</Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Category overview */}
      <Panel title="Categories" icon={<FolderOpen className="w-4 h-4 text-[#4A777A]" />} link={{ to: '/admin/categories', label: 'Manage categories' }}>
        {loading ? <PanelLoading /> : categories.length === 0 ? (
          <p className="px-5 py-6 text-sm text-[#5F6E80]">No categories yet. <Link to="/admin/categories" className="underline">Create the first one</Link>.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-[#5F6E80] bg-[#F4F6F8]">
                  <th scope="col" className="px-5 py-2 font-medium">Category</th>
                  <th scope="col" className="px-5 py-2 font-medium">Published</th>
                  <th scope="col" className="px-5 py-2 font-medium">All articles</th>
                  <th scope="col" className="px-5 py-2 font-medium w-1/3"><span className="sr-only">Share of published articles</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE3EA]">
                {categories.map((c) => {
                  const max = Math.max(1, ...categories.map((x) => x.published));
                  return (
                    <tr key={c.id}>
                      <td className="px-5 py-2.5">
                        <Link to={`/admin/articles?category=${c.id}`} className="font-medium text-[#1A2B40] hover:underline">{c.name}</Link>
                      </td>
                      <td className="px-5 py-2.5 tabular-nums">{c.published}</td>
                      <td className="px-5 py-2.5 tabular-nums text-[#5F6E80]">{c.total}</td>
                      <td className="px-5 py-2.5">
                        <div className="h-2 rounded-full bg-[#F4F6F8]" aria-hidden="true">
                          <div className="h-2 rounded-full bg-[#4A777A]" style={{ width: `${(c.published / max) * 100}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {uncategorised > 0 && (
              <p className="px-5 py-3 text-xs text-[#8A5A12] border-t border-[#DDE3EA]">
                {uncategorised} published article{uncategorised === 1 ? ' has' : 's have'} no category and will not appear when visitors browse by subject.
              </p>
            )}
          </div>
        )}
      </Panel>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Media library',  to: '/admin/media',      icon: <ImageIcon className="w-4 h-4" /> },
          { label: 'Categories',     to: '/admin/categories', icon: <FolderOpen className="w-4 h-4" /> },
          { label: 'Tags',           to: '/admin/tags',       icon: <Tag className="w-4 h-4" /> },
          { label: 'Author profile', to: '/admin/author',     icon: <UserRound className="w-4 h-4" /> },
        ].map((l) => (
          <Link key={l.to} to={l.to} className="bg-white border border-[#DDE3EA] rounded-xl p-4 flex items-center gap-3 hover:border-[#4A777A] hover:shadow-sm transition">
            <span className="text-[#4A777A]">{l.icon}</span>
            <span className="text-sm font-medium text-[#1A2B40]">{l.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Panel({ title, icon, link, children }: { title: string; icon: React.ReactNode; link?: { to: string; label: string }; children: React.ReactNode }) {
  const id = `panel-${title.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  return (
    <section aria-labelledby={id} className="bg-white rounded-xl border border-[#DDE3EA] shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-[#DDE3EA] flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h2 id={id} className="text-sm font-semibold text-[#1A2B40]">{title}</h2>
        </div>
        {link && <Link to={link.to} className="text-xs text-[#4A777A] hover:text-[#1B365D] font-medium transition">{link.label} →</Link>}
      </div>
      {children}
    </section>
  );
}

function PanelLoading() {
  return <div className="p-8 flex justify-center"><Spinner /></div>;
}

function ArticleList({ items, detail, showBadge = false, viewLive = false }: {
  items: RecentArticle[];
  detail: (a: RecentArticle) => string;
  showBadge?: boolean;
  viewLive?: boolean;
}) {
  return (
    <ul className="divide-y divide-[#DDE3EA]">
      {items.map((a) => (
        <li key={a.id} className="px-5 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <Link to={`/admin/articles/${a.id}/edit`} className="block text-sm font-medium text-[#1A2B40] truncate hover:underline">{a.title}</Link>
            <p className="text-xs text-[#5F6E80] mt-0.5">{detail(a)}</p>
          </div>
          {showBadge && <Badge status={a.status} />}
          {viewLive && (
            <a href={`/articles/${a.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#4A777A] hover:text-[#1B365D] font-medium">
              View<span className="sr-only"> {a.title} on the website (opens in a new tab)</span>
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

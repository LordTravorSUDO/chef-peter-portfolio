/**
 * AdminLayout — persistent sidebar on desktop, slide-in drawer on mobile.
 *
 * Used as the outer shell for every protected admin page.
 * Brand colours: navy #1B365D (sidebar), light grey #F4F6F8 (main bg).
 */

import React, { useState } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Image, Tag, FolderOpen,
  Settings, Search, LogOut, Menu, X, ChevronRight,
  ExternalLink, Award,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Spinner from './ui/Spinner';

interface NavItem {
  label: string;
  to:    string;
  icon:  React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',   to: '/admin',            icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Articles',    to: '/admin/articles',   icon: <FileText        className="w-4 h-4" /> },
  { label: 'Media',       to: '/admin/media',      icon: <Image           className="w-4 h-4" /> },
  { label: 'Categories',  to: '/admin/categories', icon: <FolderOpen      className="w-4 h-4" /> },
  { label: 'Tags',        to: '/admin/tags',        icon: <Tag             className="w-4 h-4" /> },
  { label: 'SEO',         to: '/admin/seo',         icon: <Search          className="w-4 h-4" /> },
  { label: 'Settings',    to: '/admin/settings',   icon: <Settings        className="w-4 h-4" /> },
];

interface Props { children: React.ReactNode; }

export default function AdminLayout({ children }: Props) {
  const { profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      navigate('/admin/login', { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  // Active link style
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all
     ${isActive
       ? 'bg-white/15 text-white'
       : 'text-white/70 hover:bg-white/10 hover:text-white'}`;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-white/10">
        <Link
          to="/admin"
          className="flex items-center gap-3 group"
          onClick={() => setDrawerOpen(false)}
        >
          <div className="w-8 h-8 rounded-full bg-[#D99B26] flex items-center justify-center">
            <Award className="w-4 h-4 text-[#1B365D]" />
          </div>
          <div className="leading-tight">
            <p className="text-white text-sm font-bold">Chef Peter</p>
            <p className="text-white/50 text-[11px] font-mono uppercase tracking-wider">CMS</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5" aria-label="Admin navigation">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin'}
            className={linkClass}
            onClick={() => setDrawerOpen(false)}
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer: view site + sign out */}
      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition"
        >
          <ExternalLink className="w-4 h-4" />
          View website
        </a>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition disabled:opacity-50"
        >
          {signingOut
            ? <Spinner size="sm" className="border-white/30 border-t-white" />
            : <LogOut className="w-4 h-4" />}
          Sign out
        </button>
        {/* Profile info */}
        <div className="px-3 pt-2">
          <p className="text-xs text-white/40 truncate">
            {loading ? '…' : profile?.display_name || 'Administrator'}
          </p>
          <p className="text-[10px] text-white/25 uppercase tracking-wider font-mono">
            {profile?.role ?? 'admin'}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex">
      {/* ── Desktop sidebar ─────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-56 xl:w-60 bg-[#1B365D] fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* ── Mobile drawer overlay ────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-[#1B365D] flex flex-col
          transform transition-transform duration-250 lg:hidden
          ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        aria-label="Mobile navigation"
      >
        <button
          onClick={() => setDrawerOpen(false)}
          className="absolute top-4 right-4 text-white/60 hover:text-white"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent />
      </aside>

      {/* ── Main content area ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:ml-56 xl:ml-60 min-w-0">
        {/* Mobile topbar */}
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-[#DDE3EA] px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            className="p-1.5 rounded-md text-[#1B365D] hover:bg-[#F4F6F8] transition"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-[#D99B26]" />
            <span className="text-sm font-bold text-[#1B365D]">Chef Peter CMS</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}

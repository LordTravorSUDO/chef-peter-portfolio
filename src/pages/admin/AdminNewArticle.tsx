/**
 * /admin/articles/new — Create a new article.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import ArticleForm from '../../components/admin/ArticleForm';

export default function AdminNewArticle() {
  return (
    <div className="space-y-6 max-w-5xl">
      <title>New Article | Chef Peter CMS</title>
      <meta name="robots" content="noindex, nofollow" />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-[#5F6E80]" aria-label="Breadcrumb">
        <Link to="/admin/articles" className="hover:text-[#1B365D] transition">Articles</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-[#1A2B40] font-medium">New article</span>
      </nav>

      <h1 className="text-2xl font-bold text-[#1B365D]">New article</h1>

      <ArticleForm />
    </div>
  );
}

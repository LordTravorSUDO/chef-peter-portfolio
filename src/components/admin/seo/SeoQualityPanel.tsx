/**
 * SeoQualityPanel — displays SEO quality check results in the article editor.
 *
 * Shows a summary badge and expandable list of issues.
 * Checks are suggestions only — they do not prevent publishing.
 */

import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, Info, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import type { SeoCheck, CheckSeverity } from '../../../lib/seo/quality';

interface Props {
  checks: SeoCheck[];
  loading?: boolean;
}

const ICON: Record<CheckSeverity, React.ReactNode> = {
  error:   <AlertCircle  className="w-3.5 h-3.5 text-red-500    shrink-0" />,
  warning: <AlertTriangle className="w-3.5 h-3.5 text-amber-500  shrink-0" />,
  info:    <Info          className="w-3.5 h-3.5 text-[#4A777A]  shrink-0" />,
};

const ROW_BG: Record<CheckSeverity, string> = {
  error:   'bg-red-50   border-red-100',
  warning: 'bg-amber-50 border-amber-100',
  info:    'bg-[#F4F6F8] border-[#DDE3EA]',
};

export default function SeoQualityPanel({ checks, loading = false }: Props) {
  const [expanded, setExpanded] = useState(false);

  const errors   = checks.filter((c) => c.severity === 'error').length;
  const warnings = checks.filter((c) => c.severity === 'warning').length;
  const infos    = checks.filter((c) => c.severity === 'info').length;
  const hasIssues = errors > 0 || warnings > 0;

  const summaryColor = errors > 0
    ? 'text-red-700 bg-red-50   border-red-200'
    : warnings > 0
      ? 'text-amber-700 bg-amber-50 border-amber-200'
      : 'text-emerald-700 bg-emerald-50 border-emerald-200';

  const summaryIcon = errors > 0
    ? <AlertCircle className="w-4 h-4 shrink-0" />
    : warnings > 0
      ? <AlertTriangle className="w-4 h-4 shrink-0" />
      : <CheckCircle className="w-4 h-4 shrink-0" />;

  const summaryText = loading
    ? 'Checking SEO…'
    : checks.length === 0
      ? 'No SEO issues found'
      : [
          errors   > 0 ? `${errors} error${errors   > 1 ? 's' : ''}` : '',
          warnings > 0 ? `${warnings} warning${warnings > 1 ? 's' : ''}` : '',
          infos    > 0 ? `${infos} suggestion${infos > 1 ? 's' : ''}` : '',
        ].filter(Boolean).join(' · ');

  return (
    <div className="bg-white rounded-xl border border-[#DDE3EA] overflow-hidden">
      {/* Header / summary button */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between px-4 py-3 transition hover:bg-[#F4F6F8]`}
        aria-expanded={expanded}
        aria-controls="seo-checks-list"
      >
        <div className={`flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-full border ${summaryColor}`}>
          {summaryIcon}
          {summaryText}
        </div>
        {checks.length > 0 && (
          <span className="text-[#5F6E80]">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        )}
      </button>

      {/* Check list */}
      {expanded && checks.length > 0 && (
        <div id="seo-checks-list" className="border-t border-[#DDE3EA] divide-y divide-[#DDE3EA]">
          {/* Sort: errors first, then warnings, then info */}
          {[...checks]
            .sort((a, b) => {
              const order = { error: 0, warning: 1, info: 2 };
              return order[a.severity] - order[b.severity];
            })
            .map((check) => (
              <div key={check.id} className={`flex items-start gap-2.5 px-4 py-2.5 text-xs border-l-2 ${ROW_BG[check.severity]} ${
                check.severity === 'error'   ? 'border-l-red-400'   :
                check.severity === 'warning' ? 'border-l-amber-400' :
                                               'border-l-[#4A777A]'
              }`}>
                <span className="mt-0.5">{ICON[check.severity]}</span>
                <p className="text-[#1A2B40] leading-snug">{check.message}</p>
              </div>
            ))
          }
          <div className="px-4 py-2 bg-[#F4F6F8]">
            <p className="text-[10px] text-[#5F6E80] italic">
              These are editorial suggestions, not guarantees of search ranking performance.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

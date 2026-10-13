import React, { useState, useEffect } from 'react';
import {
  Brain,
  Activity,
  Heart,
  Sun,
  Moon,
  Printer,
  Sparkles,
  ChevronDown,
  Upload,
} from 'lucide-react';
import { fetchHealth } from '../services/api';
import { StudySummary } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDark: boolean;
  setIsDark: (val: boolean) => void;
  onOpenUploadModal: () => void;
  onPrintReport: () => void;
  selectedStudyId: string;
  studies: StudySummary[];
  onSelectStudy: (studyId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isDark,
  setIsDark,
  onOpenUploadModal,
  onPrintReport,
  selectedStudyId,
  studies,
  onSelectStudy,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showCaseDropdown, setShowCaseDropdown] = useState<boolean>(false);

  useEffect(() => {
    const check = async () => {
      try {
        await fetchHealth();
        setIsOnline(true);
      } catch {
        setIsOnline(false);
      }
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  const activeStudy = studies.find((s) => s.study_id === selectedStudyId);

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div
            className="flex items-center space-x-3 cursor-pointer select-none"
            onClick={() => setActiveTab('condition')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  NeuroLens <span className="text-blue-600 dark:text-blue-400">AI</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Patient Health
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1">
                Brain Stroke & Language Condition Assistant
              </p>
            </div>
          </div>

          {/* Simple 2-Tab Navigation */}
          <nav className="hidden md:flex items-center space-x-1.5 bg-slate-100/80 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('condition')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'condition'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Condition & Brain Scan</span>
            </button>

            <button
              onClick={() => setActiveTab('exercises')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'exercises'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Heart className="w-4 h-4 text-rose-500" />
              <span>Speech Exercises & Care Guide</span>
            </button>
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center space-x-3">
            {/* Quick Patient Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowCaseDropdown(!showCaseDropdown)}
                className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="max-w-[130px] truncate">
                  {activeStudy?.display_name || selectedStudyId}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showCaseDropdown && (
                <div
                  className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-in fade-in duration-150"
                  onMouseLeave={() => setShowCaseDropdown(false)}
                >
                  <div className="px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Switch Patient Scan
                  </div>
                  {studies.map((s) => (
                    <button
                      key={s.study_id}
                      onClick={() => {
                        onSelectStudy(s.study_id);
                        setShowCaseDropdown(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                        s.study_id === selectedStudyId
                          ? 'bg-blue-50/60 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="truncate">{s.display_name || s.study_id}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 ml-2 shrink-0">
                        {s.severity_tier || 'Case'}
                      </span>
                    </button>
                  ))}

                  <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1 px-2">
                    <button
                      onClick={() => {
                        setShowCaseDropdown(false);
                        onOpenUploadModal();
                      }}
                      className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 flex items-center justify-center space-x-1.5 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload My Scan (.nii)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Upload / Case Modal trigger */}
            <button
              onClick={onOpenUploadModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-semibold transition-all"
              title="Upload scan or pick patient"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Upload Scan</span>
            </button>

            {/* Print Button */}
            <button
              onClick={onPrintReport}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-colors"
              title="Print Doctor Summary Report"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Status Indicator */}
            <div
              className={`hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                isOnline
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                }`}
              />
              <span>{isOnline ? 'Active' : 'Offline'}</span>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-colors"
              title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-100 dark:border-slate-800/80">
          <button
            onClick={() => setActiveTab('condition')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
              activeTab === 'condition'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Condition & Scan</span>
          </button>
          <button
            onClick={() => setActiveTab('exercises')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
              activeTab === 'exercises'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-rose-500" />
            <span>Exercises</span>
          </button>
        </div>
      </div>
    </header>
  );
};

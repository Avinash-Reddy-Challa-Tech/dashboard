"use client";
import React, { useState } from 'react';
import { BarChart3, Clock, CheckCircle, XCircle, FileText, Calendar, RefreshCw } from 'lucide-react';

// Type definitions
interface UserStoryData {
  session_id?: string;
  date?: string;
  time?: string;
  status?: 'success' | 'failed' | 'pending';
  email_id?: string;
  feature_title?: string;
  user_story_type?: string;
  chat_session_url?: string;
}

interface TimeWindow {
  label: string;
  hours?: number;
  days?: number;
}

const Dashboard = () => {
  const [timeWindow, setTimeWindow] = useState('Last 24 Hours');
  const [data, setData] = useState<UserStoryData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const timeWindows: TimeWindow[] = [
    { label: 'Last 1 Hour', hours: 1 },
    { label: 'Last 6 Hours', hours: 6 },
    { label: 'Last 12 Hours', hours: 12 },
    { label: 'Last 24 Hours', hours: 24 },
    { label: 'Last 3 Days', days: 3 },
    { label: 'Last 7 Days', days: 7 },
    { label: 'Last 14 Days', days: 14 },
    { label: 'Last 30 Days', days: 30 },
  ];

  const computePrefix = (selectedWindow: string) => {
    const now = new Date();
    const selected = timeWindows.find(w => w.label === selectedWindow);
    
    if (!selected) {
      return '';
    }
    
    let fromTime = new Date(now);
    if (selected.hours !== undefined) {
      fromTime.setHours(now.getHours() - selected.hours);
    } else if (selected.days !== undefined) {
      fromTime.setDate(now.getDate() - selected.days);
    }

    const year = fromTime.getUTCFullYear();
    const month = String(fromTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(fromTime.getUTCDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    const hourStr = String(fromTime.getUTCHours()).padStart(2, '0');
    const timestampStr = Math.floor(fromTime.getTime() / 1000);

    return `userstorymodetrace_${dateStr}_${hourStr}_${timestampStr}`;
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const prefix = computePrefix(timeWindow);
      const baseurl = process.env.NEXT_PUBLIC_API_BASE_URL||'http://localhost:8000/backend/product_owner';
      const response = await fetch(`${baseurl}/session-storage/keys/${prefix}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setData(Array.isArray(result) ? result : []);
      setLastFetched(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: data.length,
    success: data.filter(d => d.status === 'success').length,
    failed: data.filter(d => d.status === 'failed').length,
    pending: data.filter(d => d.status === 'pending').length,
  };

  const userStoryTypes: Record<string, number> = {};
  data.forEach(d => {
    const type = d.user_story_type || 'Unknown';
    userStoryTypes[type] = (userStoryTypes[type] || 0) + 1;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800/50 border-b border-slate-700 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-blue-400" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                User Story Trace Dashboard
              </h1>
            </div>
            {lastFetched && (
              <div className="text-sm text-slate-400">
                Last updated: {lastFetched.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Controls */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 mb-6 border border-slate-700">
          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Time Window
              </label>
              <select
                value={timeWindow}
                onChange={(e) => setTimeWindow(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                aria-label="Select time window for data filtering"
              >
                {timeWindows.map(w => (
                  <option key={w.label} value={w.label}>{w.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Fetch Data
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-xl p-4 mb-6">
            <p className="text-red-200">Error: {error}</p>
          </div>
        )}

        {/* Stats Cards */}
        {data.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Total Records</p>
                    <p className="text-3xl font-bold mt-1">{stats.total}</p>
                  </div>
                  <FileText className="w-10 h-10 text-blue-400" />
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Success</p>
                    <p className="text-3xl font-bold mt-1 text-green-400">{stats.success}</p>
                  </div>
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Failed</p>
                    <p className="text-3xl font-bold mt-1 text-red-400">{stats.failed}</p>
                  </div>
                  <XCircle className="w-10 h-10 text-red-400" />
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Pending</p>
                    <p className="text-3xl font-bold mt-1 text-yellow-400">{stats.pending}</p>
                  </div>
                  <Clock className="w-10 h-10 text-yellow-400" />
                </div>
              </div>
            </div>

            {/* User Story Types */}
            {Object.keys(userStoryTypes).length > 0 && (
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 mb-6 border border-slate-700">
                <h3 className="text-lg font-semibold mb-4">User Story Types Distribution</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(userStoryTypes).map(([type, count]) => (
                    <div key={type} className="bg-slate-700/50 rounded-lg p-4">
                      <p className="text-slate-300 text-sm truncate" title={type}>
                        {type}
                      </p>
                      <p className="text-2xl font-bold mt-1">{count}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Data Table */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Date</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Time</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Email</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Feature Title</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Story Type</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Session</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {data.map((row, idx) => (
                        <tr key={`${row.session_id || 'no-session'}-${idx}-${row.email_id || 'no-email'}`} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span>{row.date || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span>{row.time || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            row.status === 'success' ? 'bg-green-900/50 text-green-300' :
                            row.status === 'failed' ? 'bg-red-900/50 text-red-300' :
                            row.status === 'pending' ? 'bg-yellow-900/50 text-yellow-300' :
                            'bg-slate-700 text-slate-300'
                          }`}>
                            {row.status || 'unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300">
                          <div className="max-w-xs truncate" title={row.email_id}>
                            {row.email_id || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300">
                          <div className="max-w-xs truncate" title={row.feature_title}>
                            {row.feature_title || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300">
                          <div className="max-w-xs truncate" title={row.user_story_type}>
                            {row.user_story_type || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {row.chat_session_url ? (
                            <a
                              href={row.chat_session_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 underline transition-colors"
                            >
                              View
                            </a>
                          ) : (
                            <span className="text-slate-500">N/A</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {!loading && data.length === 0 && !error && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-12 text-center border border-slate-700">
            <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No data available. Select a time window and click "Fetch Data".</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

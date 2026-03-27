import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Activity,
  Code,
  FolderKanban,
  GitCommitHorizontal,
  Globe,
  LayoutDashboard,
  Shield,
  Sparkles,
  User,
  Settings,
  PlusCircle,
  UserPlus,
  Server,
  Zap,
  Database
} from 'lucide-react';
import Navbar from './Navbar';
import CreateWorkspaceModal from './CreateWorkspaceModal';
import JoinWorkspaceModal from './JoinWorkspaceModal';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS } from '../config/api';
import './Dashboard.css';

function Dashboard() {
  const [workspaces, setWorkspaces] = useState([]);
  const [saveActivityCounts, setSaveActivityCounts] = useState({});
  const [hoveredCellInfo, setHoveredCellInfo] = useState('Hover a cell to see date and saves');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [languageStats, setLanguageStats] = useState([]);
  const [systemStatusData, setSystemStatusData] = useState(null);
  const navigate = useNavigate();
  const { token, user, isAuthenticated, logout, loading: authLoading } = useAuth();

  const API_URL = API_ENDPOINTS.workspaces;
  const HEATMAP_DAYS = 140;

  const getDateKey = (date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const fetchWorkspaces = useCallback(async () => {
    const response = await axios.get(API_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setWorkspaces(response.data.workspaces || []);
  }, [token, API_URL]);

  const fetchSaveActivity = useCallback(async () => {
    const response = await axios.get(`${API_URL}/save-activity?days=${HEATMAP_DAYS}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setSaveActivityCounts(response.data.counts || {});
  }, [token, API_URL]);

  const fetchLanguageStats = useCallback(async () => {
    const response = await axios.get(`${API_URL}/language-stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setLanguageStats(response.data.stats || []);
  }, [token, API_URL]);

  const fetchSystemStatus = useCallback(async () => {
    const response = await axios.get(`${API_URL}/system-status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setSystemStatusData(response.data.status || null);
  }, [token, API_URL]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      setWorkspaces([]);
      setSaveActivityCounts({});
      setLoading(false);
      return;
    }

    const loadDashboard = async () => {
      const results = await Promise.allSettled([
        fetchWorkspaces(),
        fetchSaveActivity(),
        fetchLanguageStats(),
        fetchSystemStatus(),
      ]);

      if (results[0].status === 'rejected') {
        console.error('Workspace load error:', results[0].reason);
        toast.error('Failed to load dashboard data');
      }

      if (results[1].status === 'rejected') {
        console.warn('Save activity load error:', results[1].reason);
        setSaveActivityCounts({});
      }

      setLoading(false);
    };

    loadDashboard();
  }, [authLoading, isAuthenticated, fetchWorkspaces, fetchSaveActivity, fetchLanguageStats, fetchSystemStatus]);

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    fetchWorkspaces();
  };

  const handleJoinSuccess = () => {
    setShowJoinModal(false);
    fetchWorkspaces();
  };

  const getActivityFeed = () => {
    const recentWorkspaces = [...workspaces]
      .sort((a, b) => new Date(b.last_accessed) - new Date(a.last_accessed))
      .slice(0, 5);

    if (recentWorkspaces.length === 0) {
      return [
        {
          id: 'empty-state',
          action: isAuthenticated ? 'No recent workspace activity yet' : 'Sign in to unlock activity feed',
          detail: isAuthenticated
            ? 'Create or join a workspace to see team updates here.'
            : 'Your latest workspace activity appears here after login.',
          icon: Sparkles,
          when: 'Now',
        },
      ];
    }

    return recentWorkspaces.map((workspace) => ({
      id: workspace.id,
      action: `${workspace.name} accessed`,
      detail: `${workspace.role} role in ${workspace.language} workspace`,
      icon: Activity,
      when: formatDate(workspace.last_accessed),
    }));
  };

  const heatmapData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rangeStart = new Date(today);
    rangeStart.setDate(today.getDate() - (HEATMAP_DAYS - 1));

    const alignedStart = new Date(rangeStart);
    alignedStart.setDate(rangeStart.getDate() - rangeStart.getDay());

    const alignedEnd = new Date(today);
    alignedEnd.setDate(today.getDate() + (6 - today.getDay()));

    const cells = [];
    const cursor = new Date(alignedStart);

    while (cursor <= alignedEnd) {
      const dateKey = getDateKey(cursor);
      const isInRange = cursor >= rangeStart && cursor <= today;
      const count = isInRange ? Number(saveActivityCounts[dateKey] || 0) : 0;

      cells.push({
        dateKey,
        count,
        isInRange,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    const maxCount = Math.max(...cells.map((cell) => cell.count), 0);

    return cells.map((cell) => {
      if (!cell.isInRange) {
        return {
          ...cell,
          level: -1,
        };
      }

      let level = 0;

      if (cell.count > 0 && maxCount > 0) {
        const ratio = cell.count / maxCount;
        if (ratio >= 0.75) {
          level = 4;
        } else if (ratio >= 0.5) {
          level = 3;
        } else if (ratio >= 0.25) {
          level = 2;
        } else {
          level = 1;
        }
      }

      return {
        ...cell,
        level,
      };
    });
  }, [saveActivityCounts]);

  const totalSaves = useMemo(() => {
    return Object.values(saveActivityCounts).reduce((acc, value) => acc + Number(value || 0), 0);
  }, [saveActivityCounts]);

  const barChartData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rangeStart = new Date(today);
    rangeStart.setDate(today.getDate() - (HEATMAP_DAYS - 1));

    // Align to Monday of the starting week
    const alignedStart = new Date(rangeStart);
    const dayOfWeek = alignedStart.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    alignedStart.setDate(alignedStart.getDate() + mondayOffset);

    const weeks = [];
    const cursor = new Date(alignedStart);

    while (cursor <= today) {
      const weekStart = new Date(cursor);
      const weekEnd = new Date(cursor);
      weekEnd.setDate(weekEnd.getDate() + 6);

      let weekSaves = 0;
      for (let d = 0; d < 7; d++) {
        const day = new Date(weekStart);
        day.setDate(day.getDate() + d);
        if (day > today) break;
        const key = getDateKey(day);
        weekSaves += Number(saveActivityCounts[key] || 0);
      }

      const label = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      weeks.push({ week: label, saves: weekSaves });
      cursor.setDate(cursor.getDate() + 7);
    }

    return weeks;
  }, [saveActivityCounts]);

  const heatmapWeeks = useMemo(() => {
    const chunks = [];
    for (let index = 0; index < heatmapData.length; index += 7) {
      chunks.push(heatmapData.slice(index, index + 7));
    }
    return chunks;
  }, [heatmapData]);

  const heatmapWeekMeta = useMemo(() => {
    return heatmapWeeks.map((week, index) => {
      const firstDay = week[0];
      if (!firstDay) {
        return {
          monthLabel: '',
          isMonthStart: false,
        };
      }

      const date = new Date(firstDay.dateKey);
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

      if (index === 0) {
        return {
          monthLabel,
          isMonthStart: false,
          monthKey,
        };
      }

      const prevFirstDay = heatmapWeeks[index - 1][0];
      const prevDate = prevFirstDay ? new Date(prevFirstDay.dateKey) : date;
      const prevMonthKey = `${prevDate.getFullYear()}-${prevDate.getMonth()}`;

      return {
        monthLabel: monthKey !== prevMonthKey ? monthLabel : '',
        isMonthStart: monthKey !== prevMonthKey,
        monthKey,
      };
    });
  }, [heatmapWeeks]);

  const handleHeatmapHover = (cell) => {
    const formattedDate = new Date(cell.dateKey).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    if (!cell.isInRange) {
      setHoveredCellInfo(`${formattedDate}: outside selected range`);
      return;
    }

    setHoveredCellInfo(`${formattedDate}: ${cell.count} save${cell.count === 1 ? '' : 's'}`);
  };

  const statsCards = [
    {
      title: 'Total Workspaces',
      value: workspaces.length,
      subtitle: isAuthenticated ? 'Across your organization' : 'Sign in to manage projects',
      icon: FolderKanban,
      theme: 'dashboard-card-blue',
    },
    {
      title: 'Code Saves (140d)',
      value: totalSaves,
      subtitle: 'Daily save actions captured',
      icon: GitCommitHorizontal,
      theme: 'dashboard-card-green',
    },
    {
      title: 'Languages In Use',
      value: new Set(workspaces.map((workspace) => workspace.language)).size,
      subtitle: 'Projects with diverse stacks',
      icon: Code,
      theme: 'dashboard-card-orange',
    },
    {
      title: 'Ownership Score',
      value: `${Math.round(
        ((workspaces.filter((workspace) => workspace.role === 'owner').length || 0) /
          (workspaces.length || 1)) *
        100
      )}%`,
      subtitle: 'Workspaces you directly own',
      icon: Shield,
      theme: 'dashboard-card-violet',
    },
  ];

  const langColorMap = {
    javascript: 'bg-cyan-400',
    python: 'bg-purple-400',
    html: 'bg-emerald-400',
    css: 'bg-sky-400',
    java: 'bg-amber-400',
    typescript: 'bg-blue-400',
    cpp: 'bg-red-400',
    c: 'bg-orange-400',
    ruby: 'bg-rose-400',
    go: 'bg-teal-400',
    rust: 'bg-yellow-400',
    php: 'bg-indigo-400',
  };

  const formattedLangStats = languageStats.length > 0
    ? languageStats.map((l) => ({
        name: l.name.charAt(0).toUpperCase() + l.name.slice(1),
        percentage: l.percentage,
        color: langColorMap[l.name.toLowerCase()] || 'bg-slate-400',
      }))
    : [
        { name: 'No Data', percentage: 100, color: 'bg-slate-600' },
      ];

  const systemStatus = systemStatusData
    ? [
        { label: 'DB Latency', value: systemStatusData.dbLatency, status: systemStatusData.dbLatencyStatus, icon: Zap, color: 'text-emerald-400' },
        { label: 'Server Uptime', value: systemStatusData.serverUptime, status: systemStatusData.serverUptimeStatus, icon: Server, color: 'text-cyan-400' },
        { label: 'Connections', value: systemStatusData.activeConnections, status: systemStatusData.activeConnectionsStatus, icon: Database, color: 'text-purple-400' },
        { label: 'Memory', value: systemStatusData.memoryUsage, status: systemStatusData.memoryUsageStatus, icon: Activity, color: 'text-amber-400' },
      ]
    : [
        { label: 'DB Latency', value: '...', status: 'Loading', icon: Zap, color: 'text-emerald-400' },
        { label: 'Server Uptime', value: '...', status: 'Loading', icon: Server, color: 'text-cyan-400' },
        { label: 'Connections', value: '...', status: 'Loading', icon: Database, color: 'text-purple-400' },
        { label: 'Memory', value: '...', status: 'Loading', icon: Activity, color: 'text-amber-400' },
      ];

  const activityFeed = getActivityFeed();

  const handleSidebarNav = (path) => {
    navigate(path);
  };

  if (loading || authLoading) {
    return (
      <div>
        <Navbar />
        <div className="d-flex justify-content-center align-items-center min-vh-100">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page flex h-screen w-full relative">

      {/* Slim Sidebar matching Editor / Reference Image */}
      <aside className="dashboard-sidebar z-20">
        <div className="dashboard-sidebar-container">
          <div className="w-10 h-10 mt-2 mb-6 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <img src="/images/logo.png" alt="CV" className="w-full h-full object-contain hover:scale-105 transition-transform" />
          </div>

          <div className="flex flex-col gap-3 w-full px-2">
            <button
              onClick={() => handleSidebarNav('/dashboard')}
              className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center transition-all bg-[#1A1F2E] text-cyan-400 border border-slate-700/50 shadow-[0_0_15px_rgba(6,182,212,0.1)] group relative"
              title="Dashboard"
            >
              <LayoutDashboard className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
            <button
              onClick={() => handleSidebarNav('/workspaces')}
              className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center transition-all text-slate-500 hover:text-slate-200 hover:bg-[#1A1F2E]/80 group"
              title="Workspaces"
            >
              <FolderKanban className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center transition-all text-slate-500 hover:text-cyan-400 hover:bg-[#1A1F2E]/80 group"
              title="Create Workspace"
            >
              <Code className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
            <button
              onClick={() => setShowJoinModal(true)}
              className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center transition-all text-slate-500 hover:text-cyan-400 hover:bg-[#1A1F2E]/80 group"
              title="Join Workspace"
            >
              <Globe className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
          </div>

          <div className="mt-auto flex flex-col gap-3 w-full px-2 pb-4">
            <button
              className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center transition-all text-slate-500 hover:text-slate-200 hover:bg-[#1A1F2E]/80 group"
              title="Settings"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            </button>
            <button
              className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center transition-all text-slate-500 hover:text-slate-200 hover:bg-[#1A1F2E]/80 group"
              title="Profile"
            >
              <User className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>
      </aside>

      <main className="dashboard-main flex-1 flex flex-col pt-6 z-10">

        {/* Top Navbar Area (Internal to Dashboard) */}
        <header className="flex justify-between items-center mb-10 pl-2">
          <div className="flex items-center gap-8">
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              CodeVerse
            </span>

            <nav className="flex items-center gap-6 hidden md:flex">
              <span className="text-sm font-medium text-slate-400 hover:text-white cursor-pointer transition-colors" onClick={() => navigate('/')}>Home</span>
              <span className="text-sm font-bold text-cyan-400 border-b-2 border-cyan-400 pb-1 cursor-pointer">Dashboard</span>
              <span className="text-sm font-medium text-slate-400 hover:text-white cursor-pointer transition-colors" onClick={() => navigate('/workspaces')}>Workspaces</span>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-300">{user?.username}</span>
            {isAuthenticated ? (
              <button onClick={() => logout()} className="px-4 py-1.5 bg-[#1E293B] hover:bg-[#334155] border border-slate-700/50 text-xs font-bold text-slate-300 tracking-wider uppercase rounded-sm transition-all">
                Logout
              </button>
            ) : (
              <button onClick={() => navigate('/login')} className="px-4 py-1.5 bg-cyan-900/40 hover:bg-cyan-800/60 border border-cyan-500/30 text-xs font-bold text-cyan-400 tracking-wider uppercase rounded-sm transition-all">
                Login
              </button>
            )}
          </div>
        </header>

        {/* Hero Section */}
        <div className="dashboard-hero mb-8">
          <div className="dashboard-hero__content">
            <h1 className="dashboard-title">Welcome back, {user?.username || 'Architect'}</h1>
            <p className="dashboard-subtitle">
              System analysis complete. All services operational.
            </p>
          </div>
        </div>

        {/* Top Stat Cards Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          {statsCards.map((card) => {
            const Icon = card.icon;
            return (
              <div className="dashboard-stat-card" key={card.title}>
                <div className="dashboard-stat-header">
                  <p className="dashboard-stat-label">{card.title}</p>
                  <span className="dashboard-stat-icon"><Icon size={20} /></span>
                </div>
                <h3 className="dashboard-stat-value">{card.value}</h3>
              </div>
            );
          })}
        </section>

        {/* Middle Split (Heatmap, Language Core, & System Status) */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">

          <div className="xl:col-span-1 dashboard-panel flex flex-col">
            <div className="dashboard-panel__header mb-6">
              <div>
                <h4>Contribution Flux</h4>
                <p>Commit trajectory across the last 140 operational cycles.</p>
                <small className="heatmap-hover-info">{hoveredCellInfo}</small>
              </div>
              <span className="dashboard-pill">
                <GitCommitHorizontal size={14} />
                {totalSaves} metrics log
              </span>
            </div>
            <div className="heatmap-shell" aria-label="Contribution heatmap">
              <div className="heatmap-months" style={{ '--heatmap-columns': heatmapWeeks.length }}>
                {heatmapWeeks.map((week, index) => (
                  <span key={`month-${index}`} className={`heatmap-month-slot ${heatmapWeekMeta[index]?.isMonthStart ? 'month-start' : ''}`}>
                    {heatmapWeekMeta[index]?.monthLabel}
                  </span>
                ))}
              </div>
              <div className="heatmap-body">
                <div className="heatmap-days">
                  <span>Mon</span><span>Wed</span><span>Fri</span>
                </div>
                <div className="heatmap-weeks" style={{ '--heatmap-columns': heatmapWeeks.length }}>
                  {heatmapWeeks.map((week, index) => (
                    <div key={`week-${index}`} className={`heatmap-week-column ${heatmapWeekMeta[index]?.isMonthStart ? 'month-start' : ''}`}>
                      {week.map((cell) => (
                        <span
                          key={cell.dateKey}
                          className={`heatmap-cell heatmap-level-${cell.level}`}
                          onMouseEnter={() => handleHeatmapHover(cell)}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="xl:col-span-1 dashboard-panel">
            <div className="dashboard-panel__header mb-8">
              <div>
                <h4>Language Core</h4>
                <p>Primary architectural syntax.</p>
              </div>
            </div>
            <div className="flex flex-col gap-5 mt-2">
              {formattedLangStats.map((lang, idx) => (
                <div key={idx} className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                    <span className="uppercase tracking-wider">{lang.name}</span>
                    <span className="text-slate-400">{lang.percentage}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#0A0D14] rounded-full overflow-hidden border border-slate-800/50">
                    <div className={`h-full ${lang.color} rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]`} style={{ width: `${lang.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="xl:col-span-1 dashboard-panel flex flex-col">
            <div className="dashboard-panel__header mb-6">
              <div>
                <h4>System Status</h4>
                <p>Real-time infrastructure telemetry</p>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              {systemStatus.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-[#161B26] border border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-slate-800/50 ${stat.color}`}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{stat.label}</p>
                        <p className="text-sm font-bold text-slate-200">{stat.value}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm border border-slate-700 ${stat.color} bg-slate-800/30`}>
                      {stat.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </section>

        {/* Bottom Split (Bar Chart & Activity Options) */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-10">

          <div className="xl:col-span-2 dashboard-panel">
            <div className="dashboard-panel__header mb-8">
              <div>
                <h4>Structural Velocity</h4>
                <p>Volumetric code aggregation per temporal cycle.</p>
              </div>
            </div>
            <div className="bar-chart-container">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGradientDark" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#0f172a" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} opacity={0.5} />
                  <XAxis dataKey="week" tick={{ fill: '#64748B', fontSize: 10, fontWeight: 700 }} axisLine={{ stroke: '#1E293B' }} tickLine={false} interval={Math.max(0, Math.floor(barChartData.length / 10) - 1)} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(6, 182, 212, 0.05)' }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bar-chart-tooltip">
                          <p className="bar-chart-tooltip__label">{label}</p>
                          <p className="bar-chart-tooltip__value">{payload[0].value} <span className="text-xs text-slate-500 font-sans">Saves</span></p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="saves" fill="url(#barGradientDark)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="xl:col-span-1 flex flex-col gap-6">

            {/* Quick Actions Panel */}
            <div className="dashboard-panel" style={{ padding: '1.25rem' }}>
              <div className="dashboard-panel__header mb-4">
                <div>
                  <h4>Quick Actions</h4>
                  <p className="text-xs">Frequent operations</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowCreateModal(true)} className="flex flex-col items-center justify-center p-3 gap-2 rounded-xl bg-[#161B26] border border-slate-800 hover:border-cyan-500/40 hover:bg-[#1A1F2E] transition-all group">
                  <PlusCircle className="text-cyan-400 group-hover:scale-110 transition-transform" size={20} />
                  <span className="text-xs font-semibold text-slate-300">New Vault</span>
                </button>
                <button onClick={() => setShowJoinModal(true)} className="flex flex-col items-center justify-center p-3 gap-2 rounded-xl bg-[#161B26] border border-slate-800 hover:border-purple-500/40 hover:bg-[#1A1F2E] transition-all group">
                  <UserPlus className="text-purple-400 group-hover:scale-110 transition-transform" size={20} />
                  <span className="text-xs font-semibold text-slate-300">Join Vault</span>
                </button>
              </div>
            </div>

            {/* Recent Activity Panel */}
            <div className="dashboard-panel flex-1 flex flex-col" style={{ padding: '1.25rem' }}>
              <div className="dashboard-panel__header mb-4">
                <div>
                  <h4>Recent Vaults</h4>
                  <p className="text-xs">Latest active operations</p>
                </div>
              </div>
              <div className="activity-feed flex-1">
                {activityFeed.map((item) => {
                  return (
                    <div className="activity-feed__item hover:cursor-pointer p-2!" style={{ padding: '0.6rem 0.8rem' }} key={item.id} onClick={() => navigate(item.id !== 'empty-state' ? `/workspaces` : '/')}>
                      <div>
                        <h6>{item.action.replace(' accessed', '')}</h6>
                        <p style={{ fontSize: '0.75rem' }}>{item.detail.split(' ')[0]} arc</p>
                      </div>
                      <small style={{ fontSize: '0.65rem' }}>{item.when}</small>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </section>

      </main>

      {isAuthenticated && (
        <>
          <CreateWorkspaceModal
            show={showCreateModal}
            onHide={() => setShowCreateModal(false)}
            onSuccess={handleCreateSuccess}
          />
          <JoinWorkspaceModal
            show={showJoinModal}
            onHide={() => setShowJoinModal(false)}
            onSuccess={handleJoinSuccess}
          />
        </>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
          <div className="w-full max-w-md bg-[#12151E] border border-slate-700/50 rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white tracking-tight">Settings</h3>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white transition-colors text-xl">&times;</button>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#161B26] border border-slate-800">
                <div>
                  <p className="text-sm font-semibold text-slate-200">Theme</p>
                  <p className="text-xs text-slate-400">Neo-Cyberpunk Dark</p>
                </div>
                <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm border border-cyan-500/30 text-cyan-400 bg-cyan-900/20">Active</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#161B26] border border-slate-800">
                <div>
                  <p className="text-sm font-semibold text-slate-200">Notifications</p>
                  <p className="text-xs text-slate-400">Workspace activity alerts</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-cyan-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                </label>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#161B26] border border-slate-800">
                <div>
                  <p className="text-sm font-semibold text-slate-200">Profile</p>
                  <p className="text-xs text-slate-400">{user?.email || 'Not logged in'}</p>
                </div>
                <span className="text-xs text-slate-400 font-mono">{user?.username || '—'}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#161B26] border border-slate-800">
                <div>
                  <p className="text-sm font-semibold text-slate-200">Account</p>
                  <p className="text-xs text-slate-400">Manage your account</p>
                </div>
                {isAuthenticated ? (
                  <button onClick={() => { logout(); setShowSettings(false); }} className="text-xs font-bold text-red-400 hover:text-red-300 uppercase tracking-wider transition-colors">Logout</button>
                ) : (
                  <button onClick={() => { navigate('/login'); setShowSettings(false); }} className="text-xs font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider transition-colors">Login</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;

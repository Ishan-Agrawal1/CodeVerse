import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import Activity from 'lucide-react/dist/esm/icons/activity';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import CalendarClock from 'lucide-react/dist/esm/icons/calendar-clock';
import Code from 'lucide-react/dist/esm/icons/code';
import FolderKanban from 'lucide-react/dist/esm/icons/folder-kanban';
import GitBranch from 'lucide-react/dist/esm/icons/git-branch';
import GitCommitHorizontal from 'lucide-react/dist/esm/icons/git-commit-horizontal';
import Globe from 'lucide-react/dist/esm/icons/globe';
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard';
import PlusCircle from 'lucide-react/dist/esm/icons/plus-circle';
import Shield from 'lucide-react/dist/esm/icons/shield';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import UserPlus from 'lucide-react/dist/esm/icons/user-plus';
import Navbar from './Navbar';
import CreateWorkspaceModal from './CreateWorkspaceModal';
import JoinWorkspaceModal from './JoinWorkspaceModal';
import { useAuth } from '../contexts/AuthContext';
import './Dashboard.css';

function Dashboard() {
  const [workspaces, setWorkspaces] = useState([]);
  const [saveActivityCounts, setSaveActivityCounts] = useState({});
  const [hoveredCellInfo, setHoveredCellInfo] = useState('Hover a cell to see date and saves');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const navigate = useNavigate();
  const { token, user, isAuthenticated, loading: authLoading } = useAuth();

  const API_URL = 'http://localhost:5000/api/workspaces';
  const HEATMAP_DAYS = 140;

  const activeUsers = [
    { name: 'Asha', role: 'Frontend', status: 'editing Dashboard.js' },
    { name: 'Ravi', role: 'Backend', status: 'reviewing aiController.js' },
    { name: 'Mira', role: 'DevOps', status: 'running deployment checks' },
    { name: 'Kian', role: 'QA', status: 'validating workspace routes' },
  ];

  const versionEvents = [
    { version: 'v0.9.0', note: 'Introduced workspace sharing and invite flow', date: 'Mar 15' },
    { version: 'v0.9.1', note: 'Improved file operations and session persistence', date: 'Mar 16' },
    { version: 'v1.0.0-beta', note: 'Dashboard analytics and collaboration view', date: 'Mar 17' },
  ];

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
  }, [token]);

  const fetchSaveActivity = useCallback(async () => {
    const response = await axios.get(`${API_URL}/save-activity?days=${HEATMAP_DAYS}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setSaveActivityCounts(response.data.counts || {});
  }, [token]);

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
      const [workspaceResult, saveActivityResult] = await Promise.allSettled([
        fetchWorkspaces(),
        fetchSaveActivity(),
      ]);

      if (workspaceResult.status === 'rejected') {
        console.error('Workspace load error:', workspaceResult.reason);
        toast.error('Failed to load dashboard data');
      }

      if (saveActivityResult.status === 'rejected') {
        console.warn('Save activity load error:', saveActivityResult.reason);
        setSaveActivityCounts({});
      }

      setLoading(false);
    };

    loadDashboard();
  }, [authLoading, isAuthenticated, fetchWorkspaces, fetchSaveActivity]);

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

  const activityFeed = getActivityFeed();

  const sectionNav = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, type: 'section' },
    { id: 'workspaces', label: 'Workspaces', icon: FolderKanban, type: 'route', path: '/workspaces' },
    { id: 'activity', label: 'Activity', icon: Activity, type: 'section' },
    { id: 'versions', label: 'Versioning', icon: GitBranch, type: 'section' },
  ];

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSidebarNav = (item) => {
    if (item.type === 'route') {
      navigate(item.path);
      return;
    }

    scrollToSection(item.id);
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
    <div className="dashboard-page min-vh-100">
      <Navbar />

      <div className="container-fluid py-4 py-md-5">
        <div className="dashboard-layout">
          <aside className="dashboard-sidebar">
            <h6 className="dashboard-sidebar__title">Navigation</h6>
            <div className="dashboard-sidebar__menu">
              {sectionNav.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="dashboard-sidebar__link"
                    onClick={() => handleSidebarNav(item)}
                  >
                    <Icon size={16} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="dashboard-content container">
            <section id="overview" className="dashboard-hero mb-4 mb-lg-5">
              <div className="dashboard-hero__content">
                <p className="dashboard-kicker">Dashboard</p>
                <h1 className="dashboard-title">Welcome {user?.username || 'Guest'}</h1>
                <p className="dashboard-subtitle">
                  Track delivery velocity, collaboration signals, and repository momentum from one strategic view.
                </p>
              </div>
              <div className="dashboard-hero__actions">
                {isAuthenticated ? (
                  <>
                    <button className="btn dashboard-cta dashboard-cta-primary" onClick={() => setShowCreateModal(true)}>
                      <PlusCircle size={18} />
                      Create Workspace
                    </button>
                    <button className="btn dashboard-cta dashboard-cta-secondary" onClick={() => setShowJoinModal(true)}>
                      <UserPlus size={18} />
                      Join Workspace
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn dashboard-cta dashboard-cta-primary" onClick={() => navigate('/login')}>
                      <ArrowRight size={18} />
                      Login
                    </button>
                    <button className="btn dashboard-cta dashboard-cta-secondary" onClick={() => navigate('/register')}>
                      <UserPlus size={18} />
                      Sign Up
                    </button>
                  </>
                )}
              </div>
            </section>

            <section className="row g-3 mb-4 mb-lg-5">
              {statsCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div className="col-12 col-sm-6 col-xl-3" key={card.title}>
                    <div className={`dashboard-stat-card ${card.theme}`}>
                      <div>
                        <p className="dashboard-stat-label">{card.title}</p>
                        <h3 className="dashboard-stat-value">{card.value}</h3>
                        <p className="dashboard-stat-subtitle">{card.subtitle}</p>
                      </div>
                      <span className="dashboard-stat-icon">
                        <Icon size={22} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </section>

            <section className="row g-4 mb-4 mb-lg-5">
              <div className="col-12 col-lg-8">
                <div className="dashboard-panel h-100">
                  <div className="dashboard-panel__header">
                    <div>
                      <h4>Contribution Heatmap</h4>
                      <p>Daily code save frequency over the last 140 days</p>
                      <small className="heatmap-hover-info">{hoveredCellInfo}</small>
                    </div>
                    <span className="dashboard-pill">
                      <GitCommitHorizontal size={16} />
                      {totalSaves} total saves
                    </span>
                  </div>
                  <div className="heatmap-shell" aria-label="Contribution heatmap">
                    <div className="heatmap-months" style={{ '--heatmap-columns': heatmapWeeks.length }}>
                      {heatmapWeeks.map((week, index) => (
                        <span
                          key={`month-${week[0]?.dateKey || index}`}
                          className={`heatmap-month-slot ${heatmapWeekMeta[index]?.isMonthStart ? 'month-start' : ''}`}
                        >
                          {heatmapWeekMeta[index]?.monthLabel}
                        </span>
                      ))}
                    </div>
                    <div className="heatmap-body">
                      <div className="heatmap-days">
                        <span>Mon</span>
                        <span>Wed</span>
                        <span>Fri</span>
                      </div>
                      <div className="heatmap-weeks" style={{ '--heatmap-columns': heatmapWeeks.length }}>
                        {heatmapWeeks.map((week, index) => (
                          <div
                            key={`week-${week[0]?.dateKey || index}`}
                            className={`heatmap-week-column ${heatmapWeekMeta[index]?.isMonthStart ? 'month-start' : ''}`}
                          >
                            {week.map((cell) => (
                              <span
                                key={cell.dateKey}
                                className={`heatmap-cell heatmap-level-${cell.level}`}
                                title={`${cell.dateKey}: ${cell.count} save${cell.count === 1 ? '' : 's'}`}
                                onMouseEnter={() => handleHeatmapHover(cell)}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div id="activity" className="col-12 col-lg-4">
                <div className="dashboard-panel h-100">
                  <div className="dashboard-panel__header">
                    <div>
                      <h4>Activity Feed</h4>
                      <p>Recent updates from your workspace stream</p>
                    </div>
                    <CalendarClock size={18} />
                  </div>
                  <div className="activity-feed">
                    {activityFeed.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div className="activity-feed__item" key={item.id}>
                          <span className="activity-feed__icon">
                            <Icon size={15} />
                          </span>
                          <div>
                            <h6>{item.action}</h6>
                            <p>{item.detail}</p>
                          </div>
                          <small>{item.when}</small>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <section className="row g-4 mb-4 mb-lg-5">
              <div className="col-12 col-lg-5">
                <div className="dashboard-panel h-100">
                  <div className="dashboard-panel__header">
                    <div>
                      <h4>Collaboration Live</h4>
                      <p>Teammates actively contributing now</p>
                    </div>
                    <Globe size={18} />
                  </div>
                  <div className="active-users-list">
                    {activeUsers.map((member) => (
                      <div className="active-user-row" key={member.name}>
                        <div className="active-user-avatar">{member.name[0]}</div>
                        <div>
                          <h6>{member.name}</h6>
                          <p>{member.role}</p>
                        </div>
                        <small>{member.status}</small>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div id="versions" className="col-12 col-lg-7">
                <div className="dashboard-panel h-100">
                  <div className="dashboard-panel__header">
                    <div>
                      <h4>Version Tracking</h4>
                      <p>Roadmap milestones (dummy data)</p>
                    </div>
                    <GitBranch size={18} />
                  </div>
                  <div className="version-track-list">
                    {versionEvents.map((event) => (
                      <div className="version-track-item" key={event.version}>
                        <span className="version-track-dot" />
                        <div>
                          <h6>{event.version}</h6>
                          <p>{event.note}</p>
                        </div>
                        <small>{event.date}</small>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

          </main>
        </div>
      </div>

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
    </div>
  );
}

export default Dashboard;

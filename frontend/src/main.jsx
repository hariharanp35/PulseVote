import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Circle,
  Copy,
  Eye,
  EyeOff,
  Hash,
  Info,
  LayoutDashboard,
  Languages,
  LogOut,
  Mail,
  Menu,
  MoreVertical,
  Pencil,
  Plus,
  QrCode,
  Radio,
  Share2,
  Shield,
  Sparkles,
  Square,
  Star,
  Trash2,
  UserCircle,
  Users,
  X,
  Zap,
} from "lucide-react";
import { Download, Search } from "lucide-react";
import { API_URL, api, voterId } from "./api";
import "./styles.css";

const dateLabel = (value) =>
  value
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(value))
    : "Just now";
const readJSON = (key, fallback) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};
const writeJSON = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};
const translations = {
  en: {
    dashboard: "Dashboard",
    createPoll: "Create Poll",
    access: "Accessibility",
    favorites: "Favorites",
    admin: "Admin",
    filterAll: "All Polls",
    filterActive: "Active",
    filterScheduled: "Scheduled",
    filterClosed: "Closed",
    filterExpired: "Expired",
    filterFavorites: "Favorites",
  },
  ta: {
    dashboard: "டாஷ்போர்டு",
    createPoll: "போல் உருவாக்கு",
    access: "அணுகல்",
    favorites: "பிடித்தவை",
    admin: "நிர்வாகம்",
    filterAll: "அனைத்தும்",
    filterActive: "செயலில்",
    filterScheduled: "திட்டமிடப்பட்டது",
    filterClosed: "மூடப்பட்டது",
    filterExpired: "காலாவதியானது",
    filterFavorites: "பிடித்தவை",
  },
  hi: {
    dashboard: "डैशबोर्ड",
    createPoll: "पोल बनाएं",
    access: "एक्सेसिबिलिटी",
    favorites: "पसंदीदा",
    admin: "एडमिन",
    filterAll: "सभी",
    filterActive: "सक्रिय",
    filterScheduled: "अनुसूचित",
    filterClosed: "बंद",
    filterExpired: "समाप्त",
    filterFavorites: "पसंदीदा",
  },
};
const Kicker = ({ children }) => (
  <div className="kicker">
    <span className="pulse-dot" />
    {children}
  </div>
);
function Logo() {
  return (
    <Link to="/" className="brand" aria-label="PulseVote home">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 96 96" role="img">
          <defs>
            <linearGradient
              id="pulsevote-logo-gradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#6C63FF" />
              <stop offset="48%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#22D3EE" />
            </linearGradient>
          </defs>
          <circle className="brand-orbit" cx="48" cy="48" r="34" />
          <path
            className="brand-p-shape"
            d="M33 18h21.2c12.7 0 22.5 7.8 22.5 19.5S67 57 54.2 57H47v21H33V18zm14 16.5h5.8c5.4 0 9.1-2.9 9.1-7.4 0-4.5-3.6-7.3-9.1-7.3H47v14.7z"
          />
          <path
            className="brand-wave"
            d="M14 52h11l10-15 12 24 10-20 9 11h18"
          />
          <path className="brand-check" d="M48 69l9 9 23-28" />
        </svg>
      </span>
      <span className="brand-copy">
        <span className="brand-name">
          <span className="brand-pulse">Pulse</span>
          <span className="brand-vote">Vote</span>
        </span>
        <span className="brand-tagline">YOUR VOICE. LIVE.</span>
      </span>
    </Link>
  );
}
function Status({ label = "LIVE" }) {
  return (
    <span className={`status status-${label.toLowerCase()}`}>
      <i />
      {label}
    </span>
  );
}
function NotificationBell({ user }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bellRef = useRef(null);
  const token = localStorage.getItem("pulsvote_token");

  const refresh = async () => {
    if (!user || !token) return;
    try {
      const [listResponse, countResponse] = await Promise.all([
        api.get("/notifications"),
        api.get("/notifications/unread-count"),
      ]);
      setNotifications(listResponse.data?.data || []);
      setUnreadCount(countResponse.data?.data?.count || 0);
      setError("");
    } catch {
      setError("Unable to load notifications");
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((current) =>
        current.map((item) => ({ ...item, read: true })),
      );
      setUnreadCount(0);
    } catch {
      setError("Unable to update notifications");
    }
  };

  const markOneRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((current) =>
        current.map((item) =>
          item.id === id ? { ...item, read: true } : item,
        ),
      );
      setUnreadCount((current) => Math.max(0, current - 1));
    } catch {
      setError("Unable to update notification");
    }
  };

  useEffect(() => {
    if (!user) return undefined;
    refresh();
    const eventSource = new EventSource(
      `${API_URL.replace(/\/api$/, "")}/api/notifications/stream?token=${encodeURIComponent(token || "")}`,
    );
    eventSource.addEventListener("notification", (event) => {
      const item = JSON.parse(event.data || "{}");
      if (!item?.id) return;
      setNotifications((current) => [item, ...current]);
      setUnreadCount((current) => current + (item.read ? 0 : 1));
    });
    eventSource.onerror = () => {
      setError("Realtime connection lost");
    };
    return () => eventSource.close();
  }, [user, token]);

  useEffect(() => {
    const closeOnOutside = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const timeAgo = (iso) => {
    if (!iso) return "Just now";
    const diff = Math.max(0, Date.now() - new Date(iso).getTime());
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  };

  if (!user) return null;

  return (
    <div className="notification-wrap" ref={bellRef}>
      <button
        type="button"
        className="notification-bell"
        onClick={() => {
          setOpen((current) => !current);
          if (!open) refresh();
        }}
        aria-label="Open notifications"
        aria-expanded={open}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>
      {open && (
        <div
          className="notification-center"
          role="dialog"
          aria-label="Notifications"
        >
          <div className="notification-header">
            <div>
              <strong>Notifications</strong>
              <small>{unreadCount} unread</small>
            </div>
            <button type="button" className="text-button" onClick={markAllRead}>
              Mark all as read
            </button>
          </div>
          {loading && <div className="notification-empty">Loading...</div>}
          {!loading && error && (
            <div className="notification-empty error">{error}</div>
          )}
          {!loading && !error && notifications.length === 0 && (
            <div className="notification-empty">No notifications yet.</div>
          )}
          {!loading && !error && notifications.length > 0 && (
            <ul className="notification-list">
              {notifications.map((item) => (
                <li
                  key={item.id}
                  className={`notification-item ${item.read ? "read" : "unread"}`}
                >
                  <div className="notification-icon">
                    {item.type === "VOTE_RECEIVED" ? (
                      <CheckSquare size={14} />
                    ) : item.type.includes("POLL") ? (
                      <CalendarDays size={14} />
                    ) : (
                      <Info size={14} />
                    )}
                  </div>
                  <div className="notification-body">
                    <div className="notification-topline">
                      <strong>{item.title || "PulseVote"}</strong>
                      {!item.read && <span className="notification-dot" />}
                    </div>
                    <p>{item.message}</p>
                    <div className="notification-footer">
                      <span>{timeAgo(item.createdAt)}</span>
                      {!item.read && (
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => markOneRead(item.id)}
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

const DEFAULT_NOTIFICATION_SETTINGS = {
  inApp: true,
  email: true,
  push: false,
  voteReceived: true,
  pollScheduled: true,
  pollExpiring: true,
  pollClosed: true,
  collaboration: true,
  system: true,
};

const getUserInitials = (name) => {
  const safeName = String(name || "").trim();
  if (!safeName) return "U";
  const parts = safeName.split(/\s+/).filter(Boolean).slice(0, 2);
  return parts
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

function NotificationSettings({ user, onClose }) {
  const [settings, setSettings] = useState(DEFAULT_NOTIFICATION_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    api
      .get("/notifications/settings")
      .then((response) => {
        const payload = response.data?.data?.settings || {};
        setSettings((current) => ({ ...current, ...payload }));
      })
      .catch(() => setError("Unable to load notification settings"));
  }, [user]);

  const updatePreference = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const saveSettings = async () => {
    setSaving(true);
    setError("");
    try {
      await api.patch("/notifications/settings", settings);
    } catch {
      setError("Unable to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="notification-settings-modal">
        <div className="notification-header">
          <div>
            <strong>Notification Settings</strong>
            <small>Choose how PulseVote reaches you.</small>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close notification settings"
          >
            <X size={15} />
          </button>
        </div>
        <div className="notification-settings-grid">
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={settings.inApp}
              onChange={(event) =>
                updatePreference("inApp", event.target.checked)
              }
            />
            <span className="toggle-switch" aria-hidden="true" />
            <span className="toggle-copy">
              <strong>In-App Notifications</strong>
            </span>
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={settings.email}
              onChange={(event) =>
                updatePreference("email", event.target.checked)
              }
            />
            <span className="toggle-switch" aria-hidden="true" />
            <span className="toggle-copy">
              <strong>Email Notifications</strong>
            </span>
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={settings.push}
              onChange={(event) =>
                updatePreference("push", event.target.checked)
              }
            />
            <span className="toggle-switch" aria-hidden="true" />
            <span className="toggle-copy">
              <strong>Browser Push Notifications</strong>
            </span>
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={settings.voteReceived}
              onChange={(event) =>
                updatePreference("voteReceived", event.target.checked)
              }
            />
            <span className="toggle-switch" aria-hidden="true" />
            <span className="toggle-copy">
              <strong>New Votes</strong>
            </span>
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={settings.pollScheduled}
              onChange={(event) =>
                updatePreference("pollScheduled", event.target.checked)
              }
            />
            <span className="toggle-switch" aria-hidden="true" />
            <span className="toggle-copy">
              <strong>Poll Scheduled</strong>
            </span>
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={settings.pollExpiring}
              onChange={(event) =>
                updatePreference("pollExpiring", event.target.checked)
              }
            />
            <span className="toggle-switch" aria-hidden="true" />
            <span className="toggle-copy">
              <strong>Poll Expiring</strong>
            </span>
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={settings.pollClosed}
              onChange={(event) =>
                updatePreference("pollClosed", event.target.checked)
              }
            />
            <span className="toggle-switch" aria-hidden="true" />
            <span className="toggle-copy">
              <strong>Poll Closed</strong>
            </span>
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={settings.collaboration}
              onChange={(event) =>
                updatePreference("collaboration", event.target.checked)
              }
            />
            <span className="toggle-switch" aria-hidden="true" />
            <span className="toggle-copy">
              <strong>Collaboration</strong>
            </span>
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={settings.system}
              onChange={(event) =>
                updatePreference("system", event.target.checked)
              }
            />
            <span className="toggle-switch" aria-hidden="true" />
            <span className="toggle-copy">
              <strong>System</strong>
            </span>
          </label>
        </div>
        {error && <div className="notification-empty error">{error}</div>}
        <div className="notification-actions">
          <button
            type="button"
            className="button button-outline"
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            className="button button-red"
            onClick={saveSettings}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfilePage({ user }) {
  const [profileUser, setProfileUser] = useState(user);
  const [summary, setSummary] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(!user);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [activityFilter, setActivityFilter] = useState("all");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);
    const load = async () => {
      try {
        const response = await api.get("/profile");
        if (!active) return;
        const payload = response.data?.data || {};
        setProfileUser(payload.user || user);
        setSummary(
          payload.summary || {
            totalPollsParticipated: 0,
            totalQuestionsAnswered: 0,
            totalVotesCast: 0,
            recentActivityCount: 0,
          },
        );
        setActivity(payload.activity || []);
        setTotal(Number(payload.total || payload.activity?.length || 0));
        setHasMore(Boolean(payload.hasMore));
      } catch {
        if (!active) return;
        setProfileUser(user);
        setSummary({
          totalPollsParticipated: 0,
          totalQuestionsAnswered: 0,
          totalVotesCast: 0,
          recentActivityCount: 0,
        });
        setActivity([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [user]);

  const loadMore = async () => {
    if (!user || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const response = await api.get(
        `/profile/activity?page=${nextPage}&limit=5`,
      );
      const payload = response.data?.data || {};
      const items = payload.items || [];
      setActivity((current) => [...current, ...items]);
      setHasMore(Boolean(payload.hasMore));
      setPage(nextPage);
      setTotal(Number(payload.total || activity.length + items.length));
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  if (!profileUser) {
    return (
      <section className="page-width profile-page-empty">
        <div className="empty-state-card">
          <Kicker>ACCOUNT / OFFLINE</Kicker>
          <h1>Sign in to view your profile.</h1>
          <Link className="button button-red" to="/login">
            Go to login
          </Link>
        </div>
      </section>
    );
  }

  const initials = getUserInitials(profileUser.name);
  const createdAt = profileUser.createdAt
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(profileUser.createdAt))
    : "Recently";
  const participationTotal = Number(summary?.totalPollsParticipated || 0);
  const answeredTotal = Number(summary?.totalQuestionsAnswered || 0);
  const votesTotal = Number(summary?.totalVotesCast || 0);
  const activeTotal = Number(summary?.activePolls || 0);
  const completedTotal = Number(summary?.completedPolls || 0);
  const filteredActivity = activity.filter((item) => {
    if (activityFilter === "active") return item.pollStatus === "ACTIVE";
    if (activityFilter === "completed") return item.pollStatus !== "ACTIVE";
    return true;
  });
  const formatActivityDate = (value) => {
    if (!value) return "No date recorded";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  };
  const formatActivityTime = (value) => {
    if (!value) return "No time recorded";
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  };
  const activityTimestamp = (item) => item.updatedAt || item.createdAt;

  return (
    <section className="page-width profile-page">
      <div className="profile-page-shell">
        <div className="profile-hero">
          <div className="profile-avatar" aria-label="Profile avatar">
            {initials}
          </div>
          <div>
            <Kicker>ACCOUNT / PROFILE</Kicker>
            <h1>{profileUser.name || "PulseVote User"}</h1>
            <p>{profileUser.email || "No email available"}</p>
          </div>
        </div>

        <div className="profile-summary-grid">
          <div className="profile-stat-card">
            <span>Polls Participated</span>
            <strong>
              {participationTotal > 0 ? participationTotal : "No activity yet"}
            </strong>
          </div>
          <div className="profile-stat-card">
            <span>Votes Cast</span>
            <strong>{votesTotal > 0 ? votesTotal : "No activity yet"}</strong>
          </div>
          <div className="profile-stat-card">
            <span>Active Polls</span>
            <strong>{activeTotal > 0 ? activeTotal : "No activity yet"}</strong>
          </div>
          <div className="profile-stat-card">
            <span>Completed Polls</span>
            <strong>
              {completedTotal > 0 ? completedTotal : "No activity yet"}
            </strong>
          </div>
        </div>

        <div className="settings-panel profile-card-panel">
          <div className="settings-panel-header">
            <strong>Account overview</strong>
            {loading && <span>Refreshing...</span>}
          </div>
          <div className="account-fields">
            <div className="account-field">
              <label>Full name</label>
              <span>{profileUser.name || "Not provided"}</span>
            </div>
            <div className="account-field">
              <label>Email address</label>
              <span>{profileUser.email || "Not provided"}</span>
            </div>
            <div className="account-field">
              <label>Member since</label>
              <span>{createdAt}</span>
            </div>
            <div className="account-field">
              <label>Account ID</label>
              <span>
                {profileUser.id ? profileUser.id.slice(0, 12) : "Unknown"}
              </span>
            </div>
          </div>
        </div>

        <div className="settings-panel profile-activity-panel">
          <div className="settings-panel-header">
            <strong>Activity</strong>
            <span>
              {filteredActivity.length > 0
                ? `${filteredActivity.length} shown`
                : "No polls yet"}
            </span>
          </div>

          <div
            className="profile-activity-tabs"
            role="tablist"
            aria-label="Activity filters"
          >
            {["all", "active", "completed"].map((filter) => (
              <button
                key={filter}
                type="button"
                className={activityFilter === filter ? "active" : ""}
                onClick={() => setActivityFilter(filter)}
              >
                {filter[0].toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>

          {activity.length === 0 ? (
            <div className="profile-empty-state">
              <h3>No activity yet</h3>
              <p>
                Your poll activity will appear here when you participate in a
                poll.
              </p>
              <Link className="button button-red" to="/dashboard">
                Explore Polls
              </Link>
            </div>
          ) : filteredActivity.length === 0 ? (
            <div className="profile-empty-inline">
              {activityFilter === "active"
                ? "No active polls"
                : "No past activity"}
            </div>
          ) : (
            <div className="activity-list">
              {filteredActivity.map((item) => {
                const timestamp = activityTimestamp(item);
                const status =
                  item.pollStatus === "ACTIVE" ? "Active" : "Completed";
                const answerText = item.selectedAnswer || "No answer recorded";

                return (
                  <Link
                    key={item.id || item.pollId}
                    className="activity-card activity-card-link"
                    to={`/poll/${item.pollId}`}
                  >
                    <div className="activity-card-header">
                      <strong>{item.question || "Untitled poll"}</strong>
                      <span className={`status-badge ${status.toLowerCase()}`}>
                        {status}
                      </span>
                    </div>
                    <div className="activity-meta-grid">
                      <div>
                        <label>Your answer</label>
                        <p>{answerText}</p>
                      </div>
                      <div>
                        <label>Poll creator</label>
                        <p>{item.creatorName || "PulseVote"}</p>
                      </div>
                    </div>
                    <div className="activity-meta-grid compact">
                      <div>
                        <label>Date</label>
                        <p>{formatActivityDate(timestamp)}</p>
                      </div>
                      <div>
                        <label>Time</label>
                        <p>{formatActivityTime(timestamp)}</p>
                      </div>
                      {item.endAt && (
                        <div>
                          <label>Ends</label>
                          <p>
                            {formatActivityDate(item.endAt)} •{" "}
                            {formatActivityTime(item.endAt)}
                          </p>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {activity.length > 0 && hasMore && (
            <div className="profile-load-more-wrap">
              <button
                className="button button-outline"
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading..." : "Load More Activity"}
              </button>
            </div>
          )}

          {activity.length > 0 && !hasMore && (
            <div className="profile-load-more-wrap end">
              <span>You've reached the end of your activity.</span>
            </div>
          )}
        </div>

        <div className="settings-panel profile-recent-panel">
          <div className="settings-panel-header">
            <strong>Recent Activity</strong>
            <span>
              {summary?.recentActivityCount
                ? `${summary.recentActivityCount} recent`
                : "No recent activity"}
            </span>
          </div>
          {activity.length === 0 ? (
            <div className="profile-empty-inline">No activity yet</div>
          ) : (
            <div className="timeline-list">
              {activity.slice(0, 5).map((item) => {
                const voteDate =
                  item.updatedAt || item.createdAt
                    ? new Date(item.updatedAt || item.createdAt)
                    : null;
                const label = voteDate
                  ? new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                    }).format(voteDate)
                  : "Recent";
                const timeLabel = voteDate
                  ? new Intl.DateTimeFormat("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(voteDate)
                  : "";
                return (
                  <div
                    key={`recent-${item.id || item.pollId}`}
                    className="timeline-item"
                  >
                    <div className="timeline-date">{label}</div>
                    <div className="timeline-content">
                      <strong>{item.question || "Untitled poll"}</strong>
                      <p>
                        Voted on {item.selectedAnswer || "No answer recorded"}
                      </p>
                      <small>{timeLabel}</small>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function SettingsPage({ user, onLogout }) {
  const [notificationSettings, setNotificationSettings] = useState(
    DEFAULT_NOTIFICATION_SETTINGS,
  );
  const [theme, setTheme] = useState(() => {
    const stored = readJSON("pulsvote_appearance", { theme: "midnight" });
    return stored.theme || "midnight";
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    api
      .get("/notifications/settings")
      .then((response) => {
        const payload = response.data?.data?.settings || {};
        setNotificationSettings((current) => ({ ...current, ...payload }));
      })
      .catch(() => setError("Unable to load notification settings"));
  }, [user]);

  useEffect(() => {
    document.body.dataset.theme = theme;
    writeJSON("pulsvote_appearance", { theme });
  }, [theme]);

  const updatePreference = (key, value) => {
    setNotificationSettings((current) => ({ ...current, [key]: value }));
  };

  const saveNotifications = async () => {
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      await api.patch("/notifications/settings", notificationSettings);
    } catch {
      setError("Unable to save notification settings");
    } finally {
      setSaving(false);
    }
  };

  const themeOptions = [
    { value: "midnight", label: "Midnight" },
    { value: "glow", label: "Glow" },
  ];

  return (
    <section className="page-width settings-page">
      <div className="settings-page-shell">
        <div className="settings-header">
          <Kicker>ACCOUNT / SETTINGS</Kicker>
          <h1>Customize your PulseVote workspace.</h1>
        </div>

        <div className="settings-layout">
          <aside className="settings-sidebar">
            <div className="settings-sidebar-card">
              <strong>{user?.name || "PulseVote User"}</strong>
              <small>{user?.email || "No email available"}</small>
            </div>
          </aside>

          <div className="settings-content">
            <div className="settings-panel">
              <div className="settings-panel-header">
                <strong>Account settings</strong>
              </div>
              <div className="account-fields">
                <div className="account-field">
                  <label>Display name</label>
                  <span>{user?.name || "Not provided"}</span>
                </div>
                <div className="account-field">
                  <label>Email address</label>
                  <span>{user?.email || "Not provided"}</span>
                </div>
              </div>
            </div>

            <div className="settings-panel">
              <div className="settings-panel-header">
                <strong>Notification preferences</strong>
              </div>
              <div className="notification-settings-grid compact">
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={notificationSettings.inApp}
                    onChange={(event) =>
                      updatePreference("inApp", event.target.checked)
                    }
                  />
                  <span className="toggle-switch" aria-hidden="true" />
                  <span className="toggle-copy">
                    <strong>In-App</strong>
                  </span>
                </label>
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={notificationSettings.email}
                    onChange={(event) =>
                      updatePreference("email", event.target.checked)
                    }
                  />
                  <span className="toggle-switch" aria-hidden="true" />
                  <span className="toggle-copy">
                    <strong>Email</strong>
                  </span>
                </label>
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={notificationSettings.push}
                    onChange={(event) =>
                      updatePreference("push", event.target.checked)
                    }
                  />
                  <span className="toggle-switch" aria-hidden="true" />
                  <span className="toggle-copy">
                    <strong>Push</strong>
                  </span>
                </label>
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={notificationSettings.voteReceived}
                    onChange={(event) =>
                      updatePreference("voteReceived", event.target.checked)
                    }
                  />
                  <span className="toggle-switch" aria-hidden="true" />
                  <span className="toggle-copy">
                    <strong>Vote alerts</strong>
                  </span>
                </label>
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={notificationSettings.pollScheduled}
                    onChange={(event) =>
                      updatePreference("pollScheduled", event.target.checked)
                    }
                  />
                  <span className="toggle-switch" aria-hidden="true" />
                  <span className="toggle-copy">
                    <strong>Poll scheduling</strong>
                  </span>
                </label>
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={notificationSettings.pollExpiring}
                    onChange={(event) =>
                      updatePreference("pollExpiring", event.target.checked)
                    }
                  />
                  <span className="toggle-switch" aria-hidden="true" />
                  <span className="toggle-copy">
                    <strong>Expiring polls</strong>
                  </span>
                </label>
              </div>
              {error && <div className="notification-empty error">{error}</div>}
              <div className="settings-actions">
                <button
                  type="button"
                  className="button button-red"
                  onClick={saveNotifications}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save notifications"}
                </button>
              </div>
            </div>

            <div className="settings-panel">
              <div className="settings-panel-header">
                <strong>Appearance</strong>
              </div>
              <div className="theme-selector">
                {themeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`theme-option ${theme === option.value ? "active" : ""}`}
                    onClick={() => setTheme(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-panel settings-panel-danger">
              <div className="settings-panel-header">
                <strong>Security</strong>
              </div>
              <p className="muted">Sign out securely from this device.</p>
              <div className="settings-actions">
                <button
                  type="button"
                  className="button button-outline"
                  onClick={onLogout}
                >
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Layout({ user, onLogout, children }) {
  const [menu, setMenu] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();
  useEffect(() => {
    const closeOnOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
        setMenu(false);
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);
  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="topbar">
        <Logo />
        <button
          className="mobile-menu"
          onClick={() => setMenu(!menu)}
          aria-label="Toggle navigation"
        >
          {menu ? <X /> : <Menu />}
        </button>
        <nav className={menu ? "nav-open" : ""}>
          {user ? (
            <>
              <Link to="/dashboard" onClick={() => setMenu(false)}>
                <LayoutDashboard size={15} /> Dashboard
              </Link>
              <Link to="/create" onClick={() => setMenu(false)}>
                <Plus size={15} /> Create poll
              </Link>
              <span className="nav-divider" />
              <NotificationBell user={user} />
              <div className="profile-wrap" ref={profileRef}>
                <button
                  className="profile-button"
                  onClick={() => setProfileOpen(!profileOpen)}
                  aria-expanded={profileOpen}
                  aria-label="Open profile menu"
                  title="Profile menu"
                >
                  <span>{user.name?.[0]?.toUpperCase()}</span>
                  <UserCircle size={16} />
                </button>
                {profileOpen && (
                  <div className="profile-menu">
                    <div className="profile-summary">
                      <span>{getUserInitials(user.name)}</span>
                      <div>
                        <strong>{user.name}</strong>
                        <small>{user.email}</small>
                      </div>
                    </div>
                    <div className="profile-divider" />
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        navigate("/profile");
                      }}
                    >
                      <UserCircle size={15} /> Profile
                    </button>
                    <button
                      type="button"
                      className="profile-signout"
                      onClick={() => {
                        setProfileOpen(false);
                        onLogout();
                      }}
                    >
                      <LogOut size={15} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenu(false)}>
                Log in
              </Link>
              <Link
                className="nav-cta"
                to="/signup"
                onClick={() => setMenu(false)}
              >
                Sign Up <ArrowUpRight size={15} />
              </Link>
            </>
          )}
        </nav>
      </header>
      {user && (
        <Link
          className="create-fab"
          to="/create"
          aria-label="Create new poll"
          title="Create New Poll"
        >
          <Plus size={24} />
        </Link>
      )}
      {settingsOpen && (
        <NotificationSettings
          user={user}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      <main className="page-transition">{children}</main>
      <footer>
        <Logo />
        <span>REAL-TIME DECISIONS / 2026</span>
      </footer>
    </div>
  );
}
function VoteOrbit({ compact = false }) {
  const layers = [
    { className: "orbit-layer orbit-inner", count: 4 },
    { className: "orbit-layer orbit-middle", count: 4 },
    { className: "orbit-layer orbit-outer", count: 4 },
  ];
  return (
    <div className={`vote-orbit ${compact ? "vote-orbit-compact" : ""}`}>
      <div className="orbit-scan" aria-hidden="true" />
      <div className="orbit-core" aria-hidden="true" />
      {layers.map((layer, layerIndex) => (
        <div
          className={layer.className}
          key={layer.className}
          aria-hidden="true"
        >
          {Array.from({ length: layer.count }, (_, nodeIndex) => (
            <span
              className="orbit-node"
              key={nodeIndex}
              style={{
                "--node-index": nodeIndex,
                "--node-count": layer.count,
                "--orbit-layer": layerIndex,
              }}
            />
          ))}
        </div>
      ))}
      <div className="orbit-particles" aria-hidden="true">
        {Array.from({ length: compact ? 8 : 16 }, (_, index) => (
          <span key={index} style={{ "--particle-index": index }} />
        ))}
      </div>
    </div>
  );
}
function PulseLoader({ label = "Loading PulseVote" }) {
  const messages = [
    label,
    "Connecting to live network...",
    "Syncing poll data...",
    "Synchronizing votes...",
    "Preparing your experience...",
  ];
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(
      () => setMessageIndex((current) => (current + 1) % messages.length),
      1500,
    );
    return () => window.clearInterval(timer);
  }, [messages.length]);

  return (
    <div className="pulse-loader" role="status" aria-live="polite">
      <div className="loader-atmosphere" aria-hidden="true" />
      <div className="pulse-loader-scene">
        <VoteOrbit />
        <div className="pulse-loader-brand">
          <Logo />
        </div>
      </div>
      <div className="pulse-loader-status">
        <p key={messageIndex}>{messages[messageIndex]}</p>
        <div className="sync-dots" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((index) => (
            <span key={index} style={{ "--dot-index": index }} />
          ))}
        </div>
      </div>
    </div>
  );
}
function DustDissolve({ active, children, particleCount = 150 }) {
  const shellRef = useRef(null);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return undefined;
    }

    const nextParticles = Array.from({ length: particleCount }, (_, index) => {
      const angle = Math.random() * Math.PI * 2;
      const distance = 24 + Math.random() * 110;
      const palette = ["gold", "blue", "white", "neutral"];
      const fragmentRoll = Math.random();
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance - 12;
      return {
        id: `${Date.now()}-${index}`,
        x: `${4 + Math.random() * 92}%`,
        y: `${4 + Math.random() * 92}%`,
        dx: `${dx}px`,
        dy: `${dy}px`,
        midDx: `${dx * 0.48}px`,
        midDy: `${dy * 0.48}px`,
        size: `${1.4 + Math.random() * 3.8}px`,
        delay: `${Math.random() * 220}ms`,
        duration: `${780 + Math.random() * 360}ms`,
        rotate: `${Math.round(Math.random() * 180 - 90)}deg`,
        color: palette[index % palette.length],
        shape:
          fragmentRoll > 0.9
            ? "chunk"
            : fragmentRoll > 0.7
              ? "fragment"
              : "grain",
      };
    });
    setParticles(nextParticles);

    const cleanupTimer = window.setTimeout(() => setParticles([]), 1240);
    return () => window.clearTimeout(cleanupTimer);
  }, [active, particleCount]);

  return (
    <div
      ref={shellRef}
      className={`dust-dissolve-shell ${active ? "is-dissolving" : ""}`}
    >
      <div className="dust-dissolve-content">{children}</div>
      {active && (
        <div className="dust-particles" aria-hidden="true">
          {particles.map((particle) => (
            <i
              className={`dust-particle dust-${particle.shape} dust-${particle.color}`}
              key={particle.id}
              style={{
                "--dust-x": particle.x,
                "--dust-y": particle.y,
                "--dust-dx": particle.dx,
                "--dust-dy": particle.dy,
                "--dust-mid-dx": particle.midDx,
                "--dust-mid-dy": particle.midDy,
                "--dust-size": particle.size,
                "--dust-delay": particle.delay,
                "--dust-duration": particle.duration,
                "--dust-rotate": particle.rotate,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
function ErrorState({
  message = "Something went wrong.",
  onRetry,
  retrying = false,
}) {
  return (
    <div className="error-state" role="alert">
      <div className="empty-icon">
        <X size={24} />
      </div>
      <div>
        <Kicker>SIGNAL INTERRUPTED</Kicker>
        <h3>{message}</h3>
        <p>Check your connection and try again.</p>
      </div>
      {onRetry && (
        <button
          className="button button-outline"
          onClick={onRetry}
          disabled={retrying}
        >
          {retrying ? "Retrying..." : "Retry"} <Radio size={15} />
        </button>
      )}
    </div>
  );
}
class RouteErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(previousProps) {
    if (
      this.state.hasError &&
      previousProps.location.pathname !== this.props.location.pathname
    ) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="empty page-width">
          <ErrorState
            message="This page could not be rendered."
            onRetry={() => this.setState({ hasError: false })}
          />
        </section>
      );
    }
    return this.props.children;
  }
}
function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [showReload, setShowReload] = useState(() => {
    if (typeof window === "undefined") return false;
    const navType = performance.getEntriesByType("navigation")[0]?.type;
    return navType === "reload" || performance.navigation?.type === 1;
  });
  const reloadStartedAt = useRef(Date.now());
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("pulsvote_token");
    if (!token) return setReady(true);
    api
      .get("/auth/me")
      .then((r) => setUser(r.data.data))
      .catch(() => localStorage.removeItem("pulsvote_token"))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!showReload) return undefined;
    if (!ready) return undefined;
    const elapsed = Date.now() - reloadStartedAt.current;
    const remaining = Math.max(0, 700 - elapsed);
    const timer = window.setTimeout(() => setShowReload(false), remaining);
    return () => window.clearTimeout(timer);
  }, [showReload, ready]);

  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("pulsvote_token");
    setUser(null);
    navigate("/login");
  };

  if (showReload) {
    return (
      <div className="reload-shell" role="status" aria-live="polite">
        <div className="reload-scene">
          <VoteOrbit compact />
          <div className="reload-center-brand">
            <Logo />
          </div>
        </div>
        <div className="reload-status">
          <span>Reconnecting to live network</span>
          <div className="sync-dots" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((index) => (
              <span key={index} style={{ "--dot-index": index }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!ready) return <PulseLoader label="Tuning into your workspace" />;
  return (
    <Layout user={user} onLogout={logout}>
      <RouteErrorBoundary location={location}>
        <Routes>
          <Route path="/" element={<Landing user={user} />} />
          <Route path="/demo" element={<DemoPoll />} />
          <Route
            path="/login"
            element={<Auth mode="login" onAuth={setUser} />}
          />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/signup"
            element={<Auth mode="signup" onAuth={setUser} />}
          />
          <Route
            path="/dashboard"
            element={
              user ? <Dashboard user={user} /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/profile"
            element={
              user ? <ProfilePage user={user} /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/create"
            element={user ? <Create /> : <Navigate to="/login" />}
          />
          <Route
            path="/poll/:id/edit"
            element={user ? <EditPoll /> : <Navigate to="/login" />}
          />
          <Route path="/poll/:id" element={<PublicPoll />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </RouteErrorBoundary>
    </Layout>
  );
}
function Landing({ user }) {
  const [demoOptions, setDemoOptions] = useState([
    { label: "React", votes: 164, tone: "chart-react", weight: 0.54 },
    { label: "Go", votes: 106, tone: "chart-go", weight: 0.31 },
    { label: "Python", votes: 72, tone: "chart-python", weight: 0.15 },
  ]);

  const totalDemoVotes = demoOptions.reduce((sum, item) => sum + item.votes, 0);

  useEffect(() => {
    const tick = () => {
      setDemoOptions((current) => {
        const total = current.reduce((sum, item) => sum + item.votes, 0);
        const weighted = current.map((item) => ({
          ...item,
          weight:
            item.weight +
            (item.label === "React" ? 0.04 : 0) -
            (item.label === "Python" ? 0.03 : 0),
        }));
        const roll = Math.random();
        let cursor = 0;
        let targetIndex = 0;

        weighted.forEach((item, index) => {
          const adjustedWeight =
            item.label === "React" ? 0.49 : item.label === "Go" ? 0.35 : 0.16;
          cursor += adjustedWeight;
          if (roll <= cursor) {
            targetIndex = index;
          }
        });

        const next = current.map((item) => ({ ...item }));
        next[targetIndex] = {
          ...next[targetIndex],
          votes: next[targetIndex].votes + 1,
        };

        return next;
      });
    };

    const interval = window.setInterval(tick, 2800 + Math.random() * 1300);
    return () => window.clearInterval(interval);
  }, []);

  const demoBars = demoOptions.map((item) => {
    const percentage = totalDemoVotes ? (item.votes / totalDemoVotes) * 100 : 0;
    return {
      ...item,
      value: percentage,
    };
  });

  const featureHighlights = [
    {
      icon: <Zap size={18} />,
      title: "Real-Time Results",
      text: "Results update instantly without refresh.",
    },
    {
      icon: <Share2 size={18} />,
      title: "Instant Sharing",
      text: "Share polls through links, QR codes and social platforms.",
    },
    {
      icon: <Shield size={18} />,
      title: "Duplicate Vote Protection",
      text: "Prevent repeated voting according to the existing project rules.",
    },
    {
      icon: <BarChart3 size={18} />,
      title: "Poll Analytics",
      text: "Understand participation and response patterns.",
    },
  ];

  const steps = [
    { id: "01", title: "Create", text: "Build your poll in minutes." },
    { id: "02", title: "Share", text: "Send it using a link or QR code." },
    { id: "03", title: "Vote", text: "Participants respond from any device." },
    { id: "04", title: "Watch", text: "See results update live." },
  ];

  const useCases = [
    {
      icon: <Users size={20} />,
      title: "Students",
      text: "Classroom feedback and live decision-making.",
    },
    {
      icon: <Sparkles size={20} />,
      title: "Teams",
      text: "Quick alignment on priorities and roadmaps.",
    },
    {
      icon: <Bell size={20} />,
      title: "Events",
      text: "Capture crowd sentiment in real time.",
    },
    {
      icon: <QrCode size={20} />,
      title: "Communities",
      text: "Run listening sessions without friction.",
    },
    {
      icon: <CheckSquare size={20} />,
      title: "Meetings",
      text: "Turn open discussion into clear signals.",
    },
    {
      icon: <BarChart3 size={20} />,
      title: "Workshops",
      text: "Surface opinions while the conversation evolves.",
    },
  ];

  const capabilityList = [
    "Live Voting",
    "QR Sharing",
    "Poll Analytics",
    "Scheduled Polls",
    "Notifications",
    "Export Results",
    "Duplicate Vote Prevention",
  ];

  return (
    <section className="pulse-home page-width">
      <div className="pulse-hero">
        <div className="pulse-hero-copy">
          <div className="eyebrow">REAL-TIME POLLING PLATFORM</div>
          <h1>Turn Every Opinion Into a Live Signal.</h1>
          <p>
            Create polls, share them anywhere, and watch responses appear in
            real time — without refreshing.
          </p>
          <div className="pulse-hero-actions">
            <Link
              className="button pulse-primary"
              to={user ? "/create" : "/signup"}
            >
              Create a Poll
              <ArrowUpRight size={17} />
            </Link>
            <Link className="button pulse-secondary" to="/demo">
              Demo
            </Link>
          </div>
          <div className="pulse-hero-proof">
            <span>
              <Zap size={15} /> LIVE UPDATES
            </span>
            <span>
              <Users size={15} /> SHARED INSTANTLY
            </span>
          </div>
        </div>

        <div
          className="pulse-visual-wrap"
          aria-label="Demo live poll visualization"
        >
          <div className="pulse-visual">
            <div className="pulse-visual-top">
              <span className="pulse-signal">
                <i /> LIVE
              </span>
              <span className="pulse-demo-label">Demo signal</span>
            </div>

            <div className="pulse-visual-header">
              <div>
                <small>Which technology should we explore next?</small>
                <h2>Live Poll</h2>
              </div>
              <span className="pulse-votes">
                <Users size={14} /> {totalDemoVotes} votes
              </span>
            </div>

            <div className="pulse-bars">
              {demoBars.map((item) => (
                <div className="pulse-bar-row" key={item.label}>
                  <div className="pulse-bar-meta">
                    <span>{item.label}</span>
                    <strong>{Math.round(item.value * 10) / 10}%</strong>
                  </div>
                  <div className="pulse-track">
                    <i
                      className={item.tone}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pulse-footer">
              <div className="pulse-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <span>Signal intensity rising</span>
            </div>

            <div className="pulse-wave pulse-wave-a" aria-hidden="true" />
            <div className="pulse-wave pulse-wave-b" aria-hidden="true" />
            <div className="pulse-node pulse-node-a" aria-hidden="true" />
            <div className="pulse-node pulse-node-b" aria-hidden="true" />
            <div className="pulse-node pulse-node-c" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="pulse-feature-strip">
        {featureHighlights.map((feature) => (
          <div className="feature-card" key={feature.title}>
            <span className="feature-icon">{feature.icon}</span>
            <h3>{feature.title}</h3>
            <p>{feature.text}</p>
          </div>
        ))}
      </div>

      <div className="pulse-flow">
        <div className="pulse-section-heading">
          <Kicker>HOW IT WORKS</Kicker>
          <h2>From Question to Insight in Seconds</h2>
        </div>

        <div className="pulse-flow-grid">
          {steps.map((step) => (
            <div className="flow-step" key={step.id}>
              <span className="flow-number">{step.id}</span>
              <div className="flow-step-copy">
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pulse-showcase">
        <div className="pulse-section-heading">
          <Kicker>LIVE SIGNAL</Kicker>
          <h2>See the Pulse as It Happens.</h2>
        </div>

        <div className="pulse-showcase-layout">
          <div className="pulse-demo-panel">
            <div className="pulse-demo-head">
              <span className="pulse-signal small">
                <i /> LIVE
              </span>
              <span className="pulse-demo-meta">Total votes: 428</span>
            </div>
            <h3>Which feature should we build next?</h3>
            <div className="demo-bars">
              {[
                { label: "Realtime Results", value: 58, tone: "chart-react" },
                { label: "Analytics", value: 24, tone: "chart-go" },
                { label: "Templates", value: 18, tone: "chart-python" },
              ].map((item) => (
                <div className="demo-bar" key={item.label}>
                  <div className="demo-meta">
                    <span>{item.label}</span>
                    <strong>{item.value}%</strong>
                  </div>
                  <div className="pulse-track compact">
                    <i
                      className={item.tone}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pulse-activity-panel">
            <span className="panel-label">Recent responses</span>
            <ul>
              <li>
                <span className="activity-dot" />
                <div>
                  <strong>Realtime Results</strong>
                  <small>+18 votes in the last minute</small>
                </div>
              </li>
              <li>
                <span className="activity-dot" />
                <div>
                  <strong>Analytics</strong>
                  <small>+7 votes after share update</small>
                </div>
              </li>
              <li>
                <span className="activity-dot" />
                <div>
                  <strong>Templates</strong>
                  <small>+3 votes from mobile users</small>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="pulse-use-cases">
        <div className="pulse-section-heading">
          <Kicker>USE CASES</Kicker>
          <h2>Made for Every Voice</h2>
        </div>

        <div className="pulse-use-grid">
          {useCases.map((item) => (
            <div className="use-card" key={item.title}>
              <span className="use-icon">{item.icon}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="pulse-capabilities">
        <div className="pulse-capabilities-copy">
          <Kicker>FEATURE DISCOVERY</Kicker>
          <h2>Built for the conversations that matter.</h2>
          <p>
            PulseVote gives you the fundamentals for live decision-making,
            versioned polling, and rapid sharing from a single workspace.
          </p>
        </div>

        <div className="pulse-feature-list">
          {capabilityList.map((feature) => (
            <div className="feature-pill" key={feature}>
              <span className="feature-pill-icon" aria-hidden="true" />
              {feature}
            </div>
          ))}
        </div>
      </div>

      <div className="pulse-final-cta">
        <div>
          <Kicker>START THE SIGNAL</Kicker>
          <h2>Your Next Question Could Start a Conversation.</h2>
          <p>Create a poll and let the responses speak for themselves.</p>
        </div>

        <Link
          className="button pulse-primary"
          to={user ? "/create" : "/signup"}
        >
          Create a Poll
          <ArrowUpRight size={17} />
        </Link>
      </div>
    </section>
  );
}
const passwordRules = [
  {
    key: "minLength",
    label: "At least 8 characters",
    test: (value) => value.length >= 8,
  },
  {
    key: "uppercase",
    label: "One uppercase letter",
    test: (value) => /[A-Z]/.test(value),
  },
  {
    key: "lowercase",
    label: "One lowercase letter",
    test: (value) => /[a-z]/.test(value),
  },
  {
    key: "number",
    label: "One number",
    test: (value) => /\d/.test(value),
  },
  {
    key: "special",
    label: "Special character (! @ # $ % ^ & *)",
    test: (value) => /[@#$%^&*]/.test(value),
  },
];

const getPasswordChecks = (password) =>
  passwordRules.map((rule) => ({ ...rule, met: rule.test(password) }));

const getPasswordStrength = (password) => {
  const checks = getPasswordChecks(password);
  const metCount = checks.filter((rule) => rule.met).length;
  if (!password) return { label: "Too short", score: 0, tone: "weak" };
  if (password.length < 8 || metCount < 3)
    return { label: "Weak", score: 1, tone: "weak" };
  if (metCount < 5) return { label: "Medium", score: 2, tone: "medium" };
  return { label: "Strong", score: 3, tone: "strong" };
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

function ForgotPasswordModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    const normalized = email.trim();
    if (!normalized) {
      setError("Please enter your email address.");
      setSuccess("");
      return;
    }
    if (!isValidEmail(normalized)) {
      setError("Please enter a valid email address.");
      setSuccess("");
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      await api.post("/auth/forgot-password", {
        email: normalized.toLowerCase(),
      });
      setSuccess(
        "If an account exists for this email, password reset instructions will be sent.",
      );
    } catch (requestError) {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal forgot-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Forgot password"
      >
        <button
          className="modal-close"
          type="button"
          onClick={onClose}
          aria-label="Close forgot password dialog"
        >
          <X size={18} />
        </button>
        <div className="kicker">PULSEVOTE / ACCESS</div>
        <h2>Forgot password</h2>
        <p className="modal-copy">
          Enter your account email and we'll guide you to the next step.
        </p>
        <form onSubmit={submit} className="forgot-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              aria-label="Email address for password reset"
            />
          </label>
          {error && (
            <div className="error" role="alert">
              <X size={15} />
              {error}
            </div>
          )}
          {success && (
            <div className="success" role="status">
              <Check size={15} />
              {success}
            </div>
          )}
          <div className="modal-actions">
            <button
              type="button"
              className="button button-outline"
              onClick={onClose}
            >
              Back to login
            </button>
            <button type="submit" className="button button-red" disabled={busy}>
              {busy ? "Sending..." : "Send reset link"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const token = params.get("token") || "";
  const passwordValid = getPasswordChecks(password).every((rule) => rule.met);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!token) {
      setError(
        "This password reset link is invalid or has expired. Please request a new reset link.",
      );
      return;
    }
    if (!passwordValid) {
      setError(
        "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.",
      );
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setSuccess("Password reset successfully. Redirecting to login...");
      window.setTimeout(() => navigate("/login"), 900);
    } catch (requestError) {
      setError(
        requestError.response?.data?.error?.message ||
          "Unable to reset password.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="auth-layout page-width reset-password-layout">
      <div className="auth-panel reset-password-panel">
        <div className="panel-label">PULSEVOTE / ACCESS</div>
        <h2>Reset password</h2>
        <p className="muted">
          Choose a new password for your PulseVote account.
        </p>
        <form onSubmit={submit} className="auth-form reset-password-form">
          <label>
            New password
            <span className="password-field">
              <input
                required
                minLength="8"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-label="New password"
              />
              <button
                type="button"
                className="password-signal"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </span>
          </label>
          <label>
            Confirm password
            <span className="password-field">
              <input
                required
                minLength="8"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                aria-label="Confirm password"
              />
              <button
                type="button"
                className="password-signal"
                onClick={() => setShowConfirmPassword((value) => !value)}
                aria-label={
                  showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </span>
          </label>
          {error && (
            <div className="error" role="alert">
              <X size={15} />
              {error}
            </div>
          )}
          {success && (
            <div className="success" role="status">
              <Check size={15} />
              {success}
            </div>
          )}
          <button
            className="button button-primary full"
            type="submit"
            disabled={busy}
          >
            {busy ? "Resetting..." : "Reset password"}
          </button>
          {error.includes("invalid or has expired") && (
            <button
              type="button"
              className="text-button-link"
              onClick={() => navigate("/login")}
            >
              Request new reset link
            </button>
          )}
        </form>
      </div>
    </section>
  );
}

function DemoPoll() {
  const [options, setOptions] = useState([
    { id: "react", label: "Realtime Results", votes: 58 },
    { id: "go", label: "Analytics", votes: 27 },
    { id: "python", label: "Templates", votes: 15 },
  ]);
  const [highlight, setHighlight] = useState("react");
  const totalVotes = options.reduce((sum, option) => sum + option.votes, 0);
  const updateDemoSpot = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty(
      "--demo-spot-x",
      `${event.clientX - bounds.left}px`,
    );
    event.currentTarget.style.setProperty(
      "--demo-spot-y",
      `${event.clientY - bounds.top}px`,
    );
  };

  const castVote = (id) => {
    setOptions((current) =>
      current.map((option) =>
        option.id === id ? { ...option, votes: option.votes + 1 } : option,
      ),
    );
    setHighlight(id);
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      setOptions((current) => {
        const next = [...current];
        const index = Math.floor(Math.random() * next.length);
        next[index] = {
          ...next[index],
          votes: next[index].votes + 1,
        };
        return next;
      });
      setHighlight((current) => current);
    }, 2800);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="demo-page page-width">
      <div className="demo-hero-row">
        <div className="demo-copy">
          <Kicker>LIVE POLL DEMO</Kicker>
          <h1>Experience PulseVote in Action</h1>
          <p>
            This is a frontend-only demonstration of the live voting experience.
            It updates in real time visually and does not touch production data.
          </p>
        </div>
        <div className="demo-live-pill">
          <span className="pulse-dot" /> LIVE DEMO
        </div>
      </div>

      <div className="demo-layout-card">
        <div className="demo-poll-card" onMouseMove={updateDemoSpot}>
          <div className="demo-card-top">
            <span className="demo-status">
              <span className="pulse-dot small" /> LIVE
            </span>
            <span className="demo-count">{totalVotes} votes</span>
          </div>

          <div className="demo-question-wrap">
            <small>Which feature should we ship next?</small>
            <h2>PulseVote Signal</h2>
          </div>

          <div className="demo-results-heading">
            <span>Choose a signal</span>
            <small>Tap an option to cast a demo vote</small>
          </div>

          <div className="demo-option-list" aria-live="polite">
            {options.map((option) => {
              const percentage = Math.round((option.votes / totalVotes) * 100);
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`demo-option ${highlight === option.id ? "is-active" : ""}`}
                  onClick={() => castVote(option.id)}
                >
                  <div className="demo-option-head">
                    <span>{option.label}</span>
                    <strong>{percentage}%</strong>
                  </div>
                  <div className="demo-track">
                    <i style={{ width: `${percentage}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="demo-side-panel" onMouseMove={updateDemoSpot}>
          <div className="demo-panel-head">
            <span className="panel-label">Realtime Preview</span>
          </div>
          <ul className="demo-metrics">
            <li>
              <span>Votes cast</span>
              <strong>{totalVotes}</strong>
            </li>
            <li>
              <span>Sync speed</span>
              <strong>~160ms</strong>
            </li>
            <li>
              <span>Participation</span>
              <strong>92%</strong>
            </li>
          </ul>

          <div className="demo-signal-box" aria-hidden="true">
            <div className="signal-bars">
              <span style={{ height: "26%" }} />
              <span style={{ height: "52%" }} />
              <span style={{ height: "70%" }} />
              <span style={{ height: "88%" }} />
              <span style={{ height: "62%" }} />
              <span style={{ height: "96%" }} />
              <span style={{ height: "76%" }} />
              <span style={{ height: "92%" }} />
            </div>
            <div className="signal-ring" />
          </div>
        </aside>
      </div>
    </section>
  );
}

function Auth({ mode, onAuth }) {
  const signup = mode === "signup";
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordRequirements, setShowPasswordRequirements] =
    useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const passwordChecks = getPasswordChecks(form.password);
  const passwordStrength = getPasswordStrength(form.password);
  const passwordValid = passwordChecks.every((rule) => rule.met);
  const confirmMatches =
    form.confirmPassword === "" || form.password === form.confirmPassword;

  const handleEmailChange = (value) => {
    setForm((current) => ({ ...current, email: value }));
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault();

    const email = form.email.trim();
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      setSuccess("");
      return;
    }

    if (signup) {
      if (!passwordValid) {
        setError("Password does not meet the required security rules.");
        setSuccess("");
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError("Passwords do not match.");
        setSuccess("");
        return;
      }
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const payload = signup
        ? {
            name: form.name.trim(),
            email: email.toLowerCase(),
            password: form.password,
          }
        : { email: email.toLowerCase(), password: form.password };
      const r = await api.post(`/auth/${mode}`, payload);
      if (signup) {
        setSuccess("Account created successfully. Redirecting to login...");
        navigate("/login?created=1");
        return;
      }

      localStorage.setItem("pulsvote_token", r.data.data.token);
      onAuth(r.data.data.user);
      setSuccess("Signed in successfully.");
      navigate("/dashboard");
    } catch (requestError) {
      const apiUnavailable = !requestError.response;
      const message =
        requestError.response?.data?.error?.message ||
        "Something went wrong. Please try again.";
      setError(
        apiUnavailable
          ? "Unable to reach the API. Check the deployed backend URL and try again."
          : signup
            ? message
            : message === "Email or password is incorrect"
              ? "Unable to sign in. Please check your credentials."
              : message,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="auth-layout page-width">
      <div className="auth-poster">
        <Kicker>PULSEVOTE / ACCESS</Kicker>
        <h1>
          MAKE IT
          <br />
          <em>VISIBLE.</em>
        </h1>
        <p>
          Every voice deserves a signal. Sign in to launch the next question in
          the room.
        </p>
        <div className="poster-mark">
          <Hash size={17} /> LIVE BY DESIGN
        </div>
      </div>
      <div className="auth-panel">
        <div className="panel-label">
          {signup ? "01 / CREATE ACCOUNT" : "02 / RETURN TO ROOM"}
        </div>
        <h2>{signup ? "Start the signal." : "Welcome back."}</h2>
        <p className="muted">
          {signup
            ? "Create a workspace for questions that matter."
            : "Your live questions are waiting."}
        </p>
        {!signup && params.get("created") === "1" && (
          <div className="notice">
            <Check size={15} /> Account created. Use the same email and password
            to log in.
          </div>
        )}
        <form onSubmit={submit} className="auth-form">
          {signup && (
            <label>
              Name
              <input
                required
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Ada Lovelace"
                aria-label="Full name"
              />
            </label>
          )}
          <label>
            Email
            <div className="email-field">
              <Mail
                size={15}
                className="email-leading-icon"
                aria-hidden="true"
              />
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) => handleEmailChange(event.target.value)}
                placeholder="name@example.com"
                aria-label="Email address"
              />
            </div>
          </label>

          <label>
            Password
            <span className="password-field">
              <input
                required
                minLength="8"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                placeholder={
                  signup ? "Create your password" : "Enter your password"
                }
                aria-label="Password"
              />
              <button
                type="button"
                className={`password-signal ${showPassword ? "is-on" : ""}`}
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </span>
          </label>

          {signup && (
            <>
              <label>
                Confirm Password
                <span className="password-field">
                  <input
                    required
                    minLength="8"
                    type={showConfirmPassword ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        confirmPassword: event.target.value,
                      }))
                    }
                    placeholder="Confirm your password"
                    aria-label="Confirm password"
                  />
                  <button
                    type="button"
                    className={`password-signal ${showConfirmPassword ? "is-on" : ""}`}
                    onClick={() =>
                      setShowConfirmPassword((current) => !current)
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </span>
              </label>

              <div
                className={`strength-meter ${passwordStrength.tone}`}
                aria-live="polite"
              >
                <div className="strength-copy">
                  <span>Password strength</span>
                  <strong>{passwordStrength.label}</strong>
                </div>
                <div className="strength-bar" aria-hidden="true">
                  <span
                    style={{ width: `${(passwordStrength.score / 3) * 100}%` }}
                  />
                </div>
              </div>

              {!confirmMatches && form.confirmPassword && (
                <div className="error inline-error" role="alert">
                  <X size={15} />
                  Passwords do not match.
                </div>
              )}
            </>
          )}

          <div className="auth-access-row">
            <button
              type="button"
              className="password-requirements-toggle"
              onClick={() => setShowPasswordRequirements((current) => !current)}
              aria-expanded={showPasswordRequirements}
              aria-controls="password-criteria-panel"
            >
              {showPasswordRequirements ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
              Password Criteria
            </button>
            {!signup && (
              <button
                type="button"
                className="text-button-link"
                onClick={() => setShowForgotPassword(true)}
              >
                Forgot Password?
              </button>
            )}
          </div>
          <div
            id="password-criteria-panel"
            className={`password-rules-wrap ${showPasswordRequirements ? "is-open" : ""}`}
            aria-hidden={!showPasswordRequirements}
          >
            <div className="password-rules" aria-live="polite">
              {passwordChecks.map((rule) => (
                <div
                  key={rule.key}
                  className={`password-rule ${rule.met ? "is-met" : ""}`}
                >
                  <span className="password-rule-icon" aria-hidden="true">
                    {rule.met ? <Check size={12} /> : <Circle size={12} />}
                  </span>
                  {rule.label}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="error" role="alert">
              <X size={15} />
              {error}
            </div>
          )}
          {success && (
            <div className="success" role="status">
              <Check size={15} />
              {success}
            </div>
          )}

          <button
            className="button button-red full"
            type="submit"
            disabled={busy}
          >
            {busy ? "Connecting..." : signup ? "Create account" : "Log in"}
            <ArrowUpRight size={17} />
          </button>
        </form>
        <p className="switch">
          {signup ? "Already have an account?" : "New to PulseVote?"}{" "}
          <Link to={signup ? "/login" : "/signup"}>
            {signup ? "Log in" : "Sign up"}
          </Link>
        </p>
      </div>
      {showForgotPassword && (
        <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />
      )}
    </section>
  );
}
function SignalNumber({ value }) {
  const [display, setDisplay] = useState(value ?? 0);
  const previous = useRef(value ?? 0);

  useEffect(() => {
    if (value === null || value === undefined) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      previous.current = value;
      setDisplay(value);
      return undefined;
    }
    const start = previous.current;
    const delta = value - start;
    const startedAt = performance.now();
    let frame;
    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / 520);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + delta * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    previous.current = value;
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{value === null || value === undefined ? "—" : display}</>;
}

function SignalStatCard({
  className,
  icon,
  label,
  value,
  caption,
  live = false,
  system = false,
  spot = false,
}) {
  const updateSpot = (event) => {
    if (!spot) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty(
      "--spot-x",
      `${event.clientX - bounds.left}px`,
    );
    event.currentTarget.style.setProperty(
      "--spot-y",
      `${event.clientY - bounds.top}px`,
    );
  };
  return (
    <article
      className={`signal-stat-card ${className}`}
      onMouseMove={updateSpot}
      aria-label={`${label}: ${value ?? "loading"}`}
    >
      <div className="signal-stat-top">
        <span className="signal-stat-icon">{icon}</span>
        <span className="signal-stat-label">{label}</span>
      </div>
      <strong className="signal-stat-number">
        <SignalNumber value={value} />
      </strong>
      <div className="signal-stat-caption">
        {live && <i className="signal-live-dot" />}
        <span>{caption}</span>
        {system && <small>ONLINE</small>}
      </div>
      {className === "signal-polls" && (
        <div className="activity-bars" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      )}
      {className === "signal-votes" && (
        <div className="vote-flow" aria-hidden="true">
          <i />
          <i />
          <i />
          <b />
          <b />
          <b />
        </div>
      )}
      {live && (
        <div className="signal-wave" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      )}
      {system && <div className="system-line" aria-hidden="true" />}
    </article>
  );
}

function Dashboard({ user }) {
  const [polls, setPolls] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState(() => new Set());
  const [favoriteBusyId, setFavoriteBusyId] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const loadingRef = useRef(false);
  const load = () => {
    if (loadingRef.current) return Promise.resolve();
    loadingRef.current = true;
    setError("");
    setPolls(null);
    return api
      .get("/polls")
      .then((pollResponse) => {
        setPolls(pollResponse.data.data);
        return api
          .get("/polls/bookmarks")
          .then((bookmarkResponse) => {
            setFavoriteIds(
              new Set(
                (bookmarkResponse.data.data || []).map((item) => item.pollId),
              ),
            );
          })
          .catch(() => setFavoriteIds(new Set()));
      })
      .catch((error) => {
        const status = error.response?.status;
        setError(
          status === 401
            ? "Your session has expired. Please sign in again."
            : error.request && !error.response
              ? "Unable to connect to PulseVote."
              : status >= 500
                ? "Unable to load your polls right now."
                : "Something went wrong while loading your polls.",
        );
      })
      .finally(() => {
        loadingRef.current = false;
      });
  };
  useEffect(() => {
    load();
  }, []);
  const remove = async (id) => {
    if (deletingId) return;
    setDeletingId(id);
    setModal(null);
    try {
      await api.delete(`/polls/${id}`);
      await new Promise((resolve) => window.setTimeout(resolve, 1150));
      setDeletingId(null);
      setToast("Poll deleted successfully");
      load();
      setTimeout(() => setToast(""), 2600);
    } catch {
      setDeletingId(null);
      setError("Unable to delete poll");
    }
  };
  const close = async (id) => {
    try {
      await api.post(`/polls/${id}/close`);
      setModal(null);
      setToast("Poll closed");
      load();
      setTimeout(() => setToast(""), 2200);
    } catch (e) {
      setError(e.response?.data?.error?.message || "Unable to close poll");
    }
  };
  const toggleFavorite = async (pollId) => {
    if (favoriteBusyId) return;
    const wasFavorite = favoriteIds.has(pollId);
    setFavoriteBusyId(pollId);
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (wasFavorite) next.delete(pollId);
      else next.add(pollId);
      return next;
    });
    try {
      if (wasFavorite) await api.delete(`/polls/${pollId}/bookmark`);
      else await api.post(`/polls/${pollId}/bookmark`);
      setToast(wasFavorite ? "Removed from Favorites" : "Added to Favorites");
      setTimeout(() => setToast(""), 2200);
    } catch {
      setFavoriteIds((current) => {
        const next = new Set(current);
        if (wasFavorite) next.add(pollId);
        else next.delete(pollId);
        return next;
      });
      setToast("Unable to update favorites");
      setTimeout(() => setToast(""), 2200);
    } finally {
      setFavoriteBusyId(null);
    }
  };
  const votes = polls?.reduce((sum, p) => sum + p.totalVotes, 0) || 0;
  const activeCount =
    polls?.filter((poll) => (poll.status || "ACTIVE") === "ACTIVE").length || 0;
  const closedCount =
    polls?.filter((poll) => ["CLOSED", "EXPIRED"].includes(poll.status))
      .length || 0;
  const visiblePolls = polls?.filter(
    (poll) =>
      (filter === "ALL" ||
        (filter === "FAVORITES" && favoriteIds.has(poll.id)) ||
        (filter !== "FAVORITES" && (poll.status || "ACTIVE") === filter)) &&
      poll.question.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section className="dashboard page-width">
      <div className="dashboard-head">
        <div>
          <Kicker>CREATOR CONTROL / 001</Kicker>
          <h1>
            WELCOME BACK,
            <br />
            <em>{user.name?.split(" ")[0] || "Pulse"}.</em>
          </h1>
          <p className="muted">
            Your questions are live. Keep the room moving.
          </p>
        </div>
        <Link className="button button-red" to="/create">
          <Plus size={17} /> New poll
        </Link>
      </div>
      <div
        className="stat-strip signal-overview"
        aria-label="Live signal overview"
      >
        <SignalStatCard
          className="signal-polls"
          icon={<BarChart3 size={17} />}
          label="POLL ACTIVITY"
          value={polls ? polls.length : null}
          caption="Total polls"
          spot
        />
        <SignalStatCard
          className="signal-votes"
          icon={<Zap size={17} />}
          label="VOTE FLOW"
          value={polls ? votes : null}
          caption="Total votes"
          spot
        />
        <SignalStatCard
          className="signal-active"
          icon={<Radio size={17} />}
          label="ACTIVE SIGNALS"
          value={polls ? activeCount : null}
          caption="LIVE"
          live
          spot
        />
        <SignalStatCard
          className="signal-system"
          icon={<CheckSquare size={17} />}
          label="SYSTEM STATUS"
          value={polls ? closedCount : null}
          caption="CLOSED"
          system
          spot
        />
      </div>
      <div className="section-line">
        <span>YOUR POLLS</span>
        <span>{polls?.length || 0} SIGNALS REGISTERED</span>
      </div>
      <div className="poll-tools">
        <label>
          <Search size={15} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your questions"
          />
        </label>
        <div className="filter-tabs">
          {["ALL", "ACTIVE", "CLOSED", "EXPIRED", "FAVORITES"].map((value) => (
            <button
              className={filter === value ? "active" : ""}
              key={value}
              onClick={() => setFilter(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <ErrorState
          message={error}
          onRetry={load}
          retrying={loadingRef.current}
        />
      ) : polls === null ? (
        <div className="loading-block">
          <PulseLoader label="Loading your polls" />
        </div>
      ) : visiblePolls.length ? (
        <div className="poll-grid">
          {visiblePolls.map((p) => (
            <DustDissolve key={p.id} active={deletingId === p.id}>
              <PollCard
                poll={p}
                isFavorite={favoriteIds.has(p.id)}
                favoriteBusy={favoriteBusyId === p.id}
                onToggleFavorite={() => toggleFavorite(p.id)}
                onDelete={() => setModal({ type: "delete", poll: p })}
                onClose={() => setModal({ type: "close", poll: p })}
                onExport={() => setModal({ type: "export", poll: p })}
                onShare={() => setModal({ type: "share", poll: p })}
                onQr={() => setModal({ type: "qr", poll: p })}
                onCopy={async () => {
                  await copyText(publicUrl(p));
                  setToast("Poll link copied!");
                  setTimeout(() => setToast(""), 2200);
                }}
              />
            </DustDissolve>
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
      {toast && (
        <div className="toast">
          <Check size={15} />
          {toast}
        </div>
      )}
      {modal?.type === "delete" && (
        <Modal title="Delete poll?" onClose={() => setModal(null)}>
          <p className="modal-copy">
            Are you sure you want to delete{" "}
            <strong>{modal.poll.question}</strong>? This action cannot be
            undone.
          </p>
          <div className="modal-actions">
            <button
              className="button button-outline"
              onClick={() => setModal(null)}
            >
              Cancel
            </button>
            <button
              className="button button-red"
              onClick={() => remove(modal.poll.id)}
              disabled={Boolean(deletingId)}
            >
              <Trash2 size={15} />
              {deletingId ? "Deleting..." : "Delete poll"}
            </button>
          </div>
        </Modal>
      )}
      {modal?.type === "close" && (
        <Modal title="Close poll?" onClose={() => setModal(null)}>
          <p className="modal-copy">
            Are you sure you want to close this poll? New votes will be
            disabled, but all existing results will remain visible.
          </p>
          <div className="modal-actions">
            <button
              className="button button-outline"
              onClick={() => setModal(null)}
            >
              Cancel
            </button>
            <button
              className="button button-red"
              onClick={() => close(modal.poll.id)}
            >
              <X size={15} /> Close poll
            </button>
          </div>
        </Modal>
      )}
      {modal?.type === "share" && (
        <Modal title="Share Your Poll" onClose={() => setModal(null)} wide>
          <ShareContent poll={modal.poll} />
        </Modal>
      )}
      {modal?.type === "qr" && (
        <Modal title="Scan to vote" onClose={() => setModal(null)}>
          <QrContent
            poll={modal.poll}
            onDone={() => {
              setModal(null);
              setToast("Link copied!");
              setTimeout(() => setToast(""), 2200);
            }}
          />
        </Modal>
      )}
      {modal?.type === "export" && (
        <Modal title="Export Poll Results" onClose={() => setModal(null)} wide>
          <ExportContent
            poll={modal.poll}
            onDone={(message) => {
              setModal(null);
              setToast(message || "Export ready");
              setTimeout(() => setToast(""), 2600);
            }}
          />
        </Modal>
      )}
    </section>
  );
}
function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const close = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`modal ${wide ? "modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>
        <div className="kicker">PULSEVOTE / ACTION</div>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}
function publicUrl(poll) {
  return `${window.location.origin}/poll/${poll.id}`;
}
const DEMO_POLL = {
  id: "demo",
  question: "What should we build next?",
  description: "A live demo poll for exploring the app experience.",
  options: [
    { id: "demo-opt-1", text: "Live dashboards", votes: 62 },
    { id: "demo-opt-2", text: "A better API", votes: 24 },
    { id: "demo-opt-3", text: "More integrations", votes: 14 },
  ],
  totalVotes: 100,
  status: "ACTIVE",
  choiceType: "SINGLE",
  maxSelections: 0,
  votingMode: "ANONYMOUS",
  expiresAt: null,
  createdAt: new Date().toISOString(),
};
function ShareContent({ poll }) {
  const url = publicUrl(poll);
  const [copied, setCopied] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

  const copy = async () => {
    const ok = await copyText(url);
    if (ok) {
      setCopied(true);
      setShareMessage("");
      window.setTimeout(() => setCopied(false), 1600);
      return;
    }
    setShareMessage("Unable to copy the link. Please try again.");
  };

  const nativeShare = async () => {
    if (!navigator.share) {
      const ok = await copyText(url);
      setShareMessage(
        ok
          ? "Sharing is not supported on this device. Poll link copied to clipboard."
          : "Sharing is not supported on this device. Please copy the link manually.",
      );
      return;
    }

    try {
      await navigator.share({
        title: poll.question,
        text: "Vote on this poll",
        url,
      });
      setShareMessage("Poll shared successfully.");
    } catch (cause) {
      if (cause?.name !== "AbortError") {
        setShareMessage("Device sharing is unavailable. Please try again.");
      }
    }
  };

  return (
    <div className="share-content">
      <p className="muted">Send this live poll to your room.</p>
      <strong className="share-question">{poll.question}</strong>
      <div className="share-url">{url}</div>
      <div className="modal-actions">
        <button className="button button-primary" type="button" onClick={copy}>
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? "Link copied!" : "Copy Link"}
        </button>
        <button
          className="button button-outline"
          type="button"
          onClick={nativeShare}
        >
          <Share2 size={15} /> Share via Device
        </button>
      </div>
      {shareMessage && (
        <div className="success" role="status">
          {shareMessage}
        </div>
      )}
    </div>
  );
}
function QrContent({ poll, onDone }) {
  const url = publicUrl(poll);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&color=111114&bgcolor=f5f5f5&data=${encodeURIComponent(url)}`;
  return (
    <div className="qr-content">
      <img src={qrUrl} alt={`QR code for ${poll.question}`} />
      <p>{poll.question}</p>
      <small>{url}</small>
      <div className="modal-actions">
        <a
          className="button button-outline"
          href={qrUrl}
          download={`pulsvote-${poll.id}-qr.png`}
          target="_blank"
          rel="noreferrer"
        >
          <Download size={15} /> Download QR
        </a>
        <button
          className="button button-red"
          onClick={async () => {
            if (await copyText(url)) onDone();
          }}
        >
          <Copy size={15} /> Copy link
        </button>
      </div>
    </div>
  );
}
function exportFileName(poll, extension) {
  const id = String(poll.id || "poll")
    .replace(/[^a-z0-9_-]/gi, "")
    .slice(0, 12);
  return `PulseVote-${id || "Poll"}-Results.${extension}`;
}
function exportPercentage(option, poll) {
  return poll.totalVotes
    ? Math.round((option.votes / poll.totalVotes) * 100)
    : 0;
}
function ExportContent({ poll, onDone }) {
  const previewRef = useRef(null);
  const [format, setFormat] = useState("PDF");
  const [chartType, setChartType] = useState("bar");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showCounts, setShowCounts] = useState(true);
  const [showPercentages, setShowPercentages] = useState(true);
  const [includeChart, setIncludeChart] = useState(true);
  const [includeAnalytics, setIncludeAnalytics] = useState(true);
  const [includeBranding, setIncludeBranding] = useState(true);
  const [includeQr, setIncludeQr] = useState(false);
  const url = publicUrl(poll);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=111114&bgcolor=f5f5f5&data=${encodeURIComponent(url)}`;
  const downloadBlob = (blob, extension) => {
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = exportFileName(poll, extension);
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  };
  const downloadCsv = async () => {
    const rows = [["Poll Question", "Option", "Votes", "Percentage"]];
    poll.options.forEach((option) =>
      rows.push([
        poll.question,
        option.text,
        option.votes,
        `${exportPercentage(option, poll)}%`,
      ]),
    );
    const csv = rows
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","),
      )
      .join("\r\n");
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "csv");
  };
  const downloadXlsx = () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["Poll Question", poll.question],
        ["Total Votes", poll.totalVotes],
        ["Status", poll.status || "ACTIVE"],
        ["Created Date", poll.createdAt || ""],
        ["Expiry Date", poll.expiresAt || ""],
      ]),
      "Poll Summary",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["Option", "Votes", "Percentage"],
        ...poll.options.map((option) => [
          option.text,
          option.votes,
          `${exportPercentage(option, poll)}%`,
        ]),
      ]),
      "Results",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["Metric", "Value"],
        ["Total Votes", poll.totalVotes],
        ["Available Analytics", "Option distribution"],
      ]),
      "Analytics",
    );
    XLSX.writeFile(workbook, exportFileName(poll, "xlsx"));
  };
  const downloadVisual = async () => {
    if (!previewRef.current) throw new Error("Export preview is unavailable");
    const canvas = await html2canvas(previewRef.current, {
      backgroundColor: "#f1f0eb",
      scale: 2,
      useCORS: true,
    });
    if (format === "PDF") {
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const width = pdf.internal.pageSize.getWidth() - 56;
      const imageHeight = (canvas.height * width) / canvas.width;
      const image = canvas.toDataURL("image/png");
      let offset = 0;
      while (offset < imageHeight) {
        if (offset) pdf.addPage();
        pdf.addImage(image, "PNG", 28, 28 - offset, width, imageHeight);
        offset += pdf.internal.pageSize.getHeight() - 56;
      }
      pdf.save(exportFileName(poll, "pdf"));
      return;
    }
    const image = canvas.toDataURL(
      format === "JPG" ? "image/jpeg" : "image/png",
      0.95,
    );
    const response = await fetch(image);
    downloadBlob(await response.blob(), format.toLowerCase());
  };
  const download = async () => {
    setBusy(true);
    setError("");
    try {
      if (format === "CSV") await downloadCsv();
      else if (format === "XLSX") downloadXlsx();
      else await downloadVisual();
      onDone("Download complete ✓");
    } catch (cause) {
      console.error("PulseVote export failed", cause);
      setError("We couldn't generate this file. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="export-content">
      <div className="export-layout">
        <div className="export-preview-wrap">
          <span className="panel-label">EXPORT PREVIEW</span>
          <div className="export-preview" ref={previewRef}>
            {includeBranding && (
              <div className="export-brand">
                PULSE<span>VOTE</span>
              </div>
            )}
            <h3>PulseVote Poll Results</h3>
            <h4>{poll.question}</h4>
            <div className="export-meta">
              <span>{poll.totalVotes} total votes</span>
              <span>{poll.status || "ACTIVE"}</span>
              <span>
                {poll.createdAt ? dateLabel(poll.createdAt) : "Just now"}
              </span>
            </div>
            {includeChart && (
              <div className={`export-chart chart-${chartType}`}>
                <strong>Vote distribution</strong>
                {chartType === "pie" || chartType === "donut" ? (
                  <div
                    className="pie-chart"
                    style={{
                      background: `conic-gradient(${poll.options.map((option, index) => `${["#ff3b30", "#c89c4f", "#76c7aa", "#6f9fcb"][index % 4]} ${exportPercentage(option, poll)}%`).join(", ")})`,
                    }}
                  >
                    <span>{chartType === "donut" ? poll.totalVotes : ""}</span>
                  </div>
                ) : (
                  poll.options.map((option) => (
                    <div className="export-bar" key={option.id}>
                      <span>{option.text}</span>
                      <i>
                        <b
                          style={{
                            width: `${exportPercentage(option, poll)}%`,
                          }}
                        />
                      </i>
                      {showCounts && <em>{option.votes}</em>}
                      {showPercentages && (
                        <em>{exportPercentage(option, poll)}%</em>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
            <div className="export-results">
              {poll.options.map((option, index) => (
                <div key={option.id}>
                  <span>
                    {index + 1}. {option.text}
                  </span>
                  <strong>
                    {showCounts ? option.votes : ""}
                    {showCounts && showPercentages ? " · " : ""}
                    {showPercentages
                      ? `${exportPercentage(option, poll)}%`
                      : ""}
                  </strong>
                </div>
              ))}
            </div>
            {includeAnalytics && (
              <small className="export-analytics">
                Available analytics: total votes and option distribution.
              </small>
            )}
            {includeQr && (
              <img
                className="export-qr"
                src={qrUrl}
                alt="Public poll QR code"
                crossOrigin="anonymous"
              />
            )}
            <small className="export-generated">
              Generated {new Date().toLocaleString()}
            </small>
          </div>
        </div>
        <div className="export-controls">
          <span className="panel-label">CHOOSE FORMAT</span>
          <div className="export-formats">
            {["PDF", "PNG", "JPG", "CSV", "XLSX"].map((value) => (
              <button
                type="button"
                className={format === value ? "active" : ""}
                key={value}
                onClick={() => setFormat(value)}
              >
                {value}
              </button>
            ))}
          </div>
          <label>
            CHART TYPE
            <select
              value={chartType}
              onChange={(event) => setChartType(event.target.value)}
            >
              <option value="bar">Bar Chart</option>
              <option value="column">Column Chart</option>
              <option value="pie">Pie Chart</option>
              <option value="donut">Donut Chart</option>
            </select>
          </label>
          <label className="export-check">
            <input
              type="checkbox"
              checked={showCounts}
              onChange={() => setShowCounts(!showCounts)}
            />{" "}
            Vote Counts
          </label>
          <label className="export-check">
            <input
              type="checkbox"
              checked={showPercentages}
              onChange={() => setShowPercentages(!showPercentages)}
            />{" "}
            Percentages
          </label>
          <label className="export-check">
            <input
              type="checkbox"
              checked={includeChart}
              onChange={() => setIncludeChart(!includeChart)}
            />{" "}
            Chart
          </label>
          <label className="export-check">
            <input
              type="checkbox"
              checked={includeAnalytics}
              onChange={() => setIncludeAnalytics(!includeAnalytics)}
            />{" "}
            Analytics
          </label>
          <label className="export-check">
            <input
              type="checkbox"
              checked={includeBranding}
              onChange={() => setIncludeBranding(!includeBranding)}
            />{" "}
            PulseVote Branding
          </label>
          <label className="export-check">
            <input
              type="checkbox"
              checked={includeQr}
              onChange={() => setIncludeQr(!includeQr)}
            />{" "}
            QR Code
          </label>
          {error && (
            <div className="error">
              {error}
              <button
                type="button"
                className="button button-outline"
                onClick={download}
              >
                Try Again
              </button>
            </div>
          )}
          <button
            className="button button-red full"
            type="button"
            onClick={download}
            disabled={busy}
          >
            {busy ? `Generating ${format}...` : `Download ${format}`}{" "}
            <Download size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
function PollCard({
  poll,
  isFavorite,
  favoriteBusy,
  onToggleFavorite,
  onDelete,
  onClose,
  onExport,
  onShare,
  onQr,
  onCopy,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    const closeMenu = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", closeMenu);
    function safeFileName(poll, extension) {
      const id = String(poll.id || "poll")
        .replace(/[^a-z0-9_-]/gi, "")
        .slice(0, 12);
      return `PulseVote-${id || "Poll"}-Results.${extension}`;
    }
    function pollPercent(option, poll) {
      return poll.totalVotes
        ? Math.round((option.votes / poll.totalVotes) * 100)
        : 0;
    }
    function ExportContent({ poll, onDone }) {
      const previewRef = useRef(null);
      const [format, setFormat] = useState("PDF");
      const [chartType, setChartType] = useState("bar");
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState("");
      const [showPercentages, setShowPercentages] = useState(true);
      const [showCounts, setShowCounts] = useState(true);
      const [showLegend, setShowLegend] = useState(true);
      const [showTitle, setShowTitle] = useState(true);
      const [include, setInclude] = useState({
        question: true,
        results: true,
        chart: true,
        analytics: true,
        info: true,
        qr: false,
        branding: true,
      });
      const url = publicUrl(poll);
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=111114&bgcolor=f5f5f5&data=${encodeURIComponent(url)}`;
      const toggleInclude = (key) =>
        setInclude((current) => ({ ...current, [key]: !current[key] }));
      const downloadCsv = async () => {
        const response = await api.get(`/polls/${poll.id}/export`, {
          responseType: "blob",
        });
        const blobUrl = URL.createObjectURL(response.data);
        const anchor = document.createElement("a");
        anchor.href = blobUrl;
        anchor.download = safeFileName(poll, "csv");
        anchor.click();
        URL.revokeObjectURL(blobUrl);
      };
      const downloadXlsx = () => {
        const summary = [
          ["PulseVote Poll Summary", ""],
          ["Poll Question", poll.question],
          ["Poll ID", poll.id],
          ["Total Votes", poll.totalVotes],
          ["Status", poll.status || "ACTIVE"],
          ["Created Date", poll.createdAt || ""],
          ["Expiry Date", poll.expiresAt || ""],
        ];
        const results = [["Option", "Votes", "Percentage"]].concat(
          poll.options.map((option) => [
            option.text,
            option.votes,
            `${pollPercent(option, poll)}%`,
          ]),
        );
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(
          workbook,
          XLSX.utils.aoa_to_sheet(summary),
          "Poll Summary",
        );
        XLSX.utils.book_append_sheet(
          workbook,
          XLSX.utils.aoa_to_sheet(results),
          "Results",
        );
        XLSX.writeFile(workbook, safeFileName(poll, "xlsx"));
      };
      const downloadVisual = async () => {
        if (!previewRef.current) return;
        const canvas = await html2canvas(previewRef.current, {
          backgroundColor: "#111114",
          scale: 2,
          useCORS: true,
        });
        if (format === "PDF") {
          const document = new jsPDF({
            orientation: "portrait",
            unit: "pt",
            format: "a4",
          });
          const width = document.internal.pageSize.getWidth() - 56;
          const height = (canvas.height * width) / canvas.width;
          document.addImage(
            canvas.toDataURL("image/png"),
            "PNG",
            28,
            28,
            width,
            height,
          );
          document.save(safeFileName(poll, "pdf"));
        } else {
          const link = document.createElement("a");
          link.download = safeFileName(poll, format.toLowerCase());
          link.href = canvas.toDataURL(
            format === "JPG" ? "image/jpeg" : "image/png",
            0.95,
          );
          link.click();
        }
      };
      const download = async () => {
        setBusy(true);
        setError("");
        try {
          if (format === "CSV") await downloadCsv();
          else if (format === "XLSX") downloadXlsx();
          else await downloadVisual();
          onDone("Export ready ✓");
        } catch {
          setError("Unable to generate the export. Please try again.");
        } finally {
          setBusy(false);
        }
      };
      return (
        <div className="export-content">
          <div className="export-layout">
            <div className="export-preview-wrap">
              <span className="panel-label">EXPORT PREVIEW</span>
              <div className="export-preview" ref={previewRef}>
                {include.branding && (
                  <div className="export-brand">
                    PULSE<span>VOTE</span>
                  </div>
                )}
                {showTitle && <h3>Poll Results</h3>}
                {include.question && <h4>{poll.question}</h4>}
                {include.info && (
                  <div className="export-meta">
                    <span>{poll.totalVotes} total votes</span>
                    <span>{poll.status || "ACTIVE"}</span>
                    <span>
                      {poll.createdAt ? dateLabel(poll.createdAt) : "Just now"}
                    </span>
                  </div>
                )}
                {include.chart && (
                  <div className={`export-chart chart-${chartType}`}>
                    {showLegend && (
                      <strong>
                        {showTitle ? "Vote distribution" : "Results"}
                      </strong>
                    )}
                    {chartType === "pie" || chartType === "donut" ? (
                      <div
                        className="pie-chart"
                        style={{
                          background: `conic-gradient(${poll.options.map((option, index) => `${["#ff3b30", "#c89c4f", "#76c7aa", "#6f9fcb"][index % 4]} ${pollPercent(option, poll)}%`).join(", ")})`,
                        }}
                      >
                        <span>
                          {chartType === "donut" ? `${poll.totalVotes}` : ""}
                        </span>
                      </div>
                    ) : (
                      poll.options.map((option) => (
                        <div className="export-bar" key={option.id}>
                          <span>{option.text}</span>
                          <i>
                            <b
                              style={{ width: `${pollPercent(option, poll)}%` }}
                            />
                          </i>
                          {showCounts && <em>{option.votes}</em>}
                          {showPercentages && (
                            <em>{pollPercent(option, poll)}%</em>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
                {include.results && (
                  <div className="export-results">
                    {poll.options.map((option, index) => (
                      <div key={option.id}>
                        <span>
                          {index + 1}. {option.text}
                        </span>
                        <strong>
                          {showCounts ? option.votes : ""}
                          {showCounts && showPercentages ? " · " : ""}
                          {showPercentages
                            ? `${pollPercent(option, poll)}%`
                            : ""}
                        </strong>
                      </div>
                    ))}
                  </div>
                )}
                {include.analytics && (
                  <small className="export-analytics">
                    Available analytics: total votes and option distribution.
                  </small>
                )}
                {include.qr && (
                  <img
                    className="export-qr"
                    src={qrUrl}
                    alt="Public poll QR code"
                    crossOrigin="anonymous"
                  />
                )}
                <small className="export-generated">
                  Generated {new Date().toLocaleString()}
                </small>
              </div>
            </div>
            <div className="export-controls">
              <span className="panel-label">FORMAT</span>
              <div className="export-formats">
                {["PDF", "PNG", "JPG", "CSV", "XLSX"].map((value) => (
                  <button
                    type="button"
                    className={format === value ? "active" : ""}
                    key={value}
                    onClick={() => setFormat(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <span className="panel-label">CUSTOMIZE CHART</span>
              <label>
                CHART TYPE
                <select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value)}
                >
                  <option value="bar">Bar Chart</option>
                  <option value="column">Column Chart</option>
                  <option value="pie">Pie Chart</option>
                  <option value="donut">Donut Chart</option>
                </select>
              </label>
              <label className="export-check">
                <input
                  type="checkbox"
                  checked={showTitle}
                  onChange={() => setShowTitle(!showTitle)}
                />{" "}
                Show title
              </label>
              <label className="export-check">
                <input
                  type="checkbox"
                  checked={showCounts}
                  onChange={() => setShowCounts(!showCounts)}
                />{" "}
                Vote counts
              </label>
              <label className="export-check">
                <input
                  type="checkbox"
                  checked={showPercentages}
                  onChange={() => setShowPercentages(!showPercentages)}
                />{" "}
                Percentages
              </label>
              <label className="export-check">
                <input
                  type="checkbox"
                  checked={showLegend}
                  onChange={() => setShowLegend(!showLegend)}
                />{" "}
                Legend / chart label
              </label>
              <span className="panel-label">INCLUDE</span>
              {[
                ["question", "Poll Question"],
                ["results", "Poll Results"],
                ["chart", "Chart"],
                ["analytics", "Analytics"],
                ["info", "Poll Information"],
                ["qr", "QR Code"],
                ["branding", "PulseVote Branding"],
              ].map(([key, label]) => (
                <label className="export-check" key={key}>
                  <input
                    type="checkbox"
                    checked={include[key]}
                    onChange={() => toggleInclude(key)}
                  />{" "}
                  {label}
                </label>
              ))}
              {error && <div className="error">{error}</div>}
              <button
                className="button button-red full"
                type="button"
                onClick={download}
                disabled={busy}
              >
                {busy ? "Preparing export..." : `Download ${format}`}{" "}
                <Download size={16} />
              </button>
            </div>
          </div>
        </div>
      );
    }
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);
  const action = (callback) => {
    setMenuOpen(false);
    callback();
  };
  return (
    <article className="poll-card">
      <div className="card-accent" />
      <div className="card-top">
        <Status label={poll.status || "ACTIVE"} />
        <span className="poll-mode">{poll.votingMode || "ANONYMOUS"}</span>
        <div className="poll-menu-wrap" ref={menuRef}>
          <button
            className={`poll-favorite-trigger ${isFavorite ? "is-favorite" : ""}`}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite();
            }}
            aria-label={
              isFavorite ? "Remove from favorites" : "Add to favorites"
            }
            aria-pressed={isFavorite}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            disabled={favoriteBusy}
          >
            {isFavorite ? (
              <Star fill="currentColor" size={17} />
            ) : (
              <Star size={17} />
            )}
          </button>
          <button
            className="poll-menu-trigger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Open poll actions"
            aria-expanded={menuOpen}
            title="Poll actions"
          >
            <MoreVertical size={18} />
          </button>
          {menuOpen && (
            <div className="poll-menu">
              <Link
                to={`/poll/${poll.id}/edit`}
                onClick={() => setMenuOpen(false)}
              >
                <Pencil size={14} /> Edit
              </Link>
              <button onClick={() => action(onShare)}>
                <Share2 size={14} /> Share
              </button>
              <button onClick={() => action(onCopy)}>
                <Copy size={14} /> Copy Link
              </button>
              <button onClick={() => action(onQr)}>
                <QrCode size={14} /> QR Code
              </button>
              <button onClick={() => action(onDelete)}>
                <Trash2 size={14} /> Delete
              </button>
              <button onClick={() => action(() => onExport(poll.id))}>
                <Download size={14} /> Download / Export
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="poll-id">POLL / {poll.id.slice(0, 8).toUpperCase()}</div>
      <h3>{poll.question}</h3>
      <div className="mini-chart">
        {poll.options.slice(0, 4).map((o) => (
          <i
            key={o.id}
            style={{
              height: `${Math.max(12, Math.min(100, o.votes * 12 + 12))}%`,
            }}
          />
        ))}
      </div>
      <div className="card-meta">
        <span>
          <Users size={14} /> {poll.totalVotes} votes
        </span>
        <span>{poll.options.length} options</span>
      </div>
      <div className="card-bottom">
        <span>{dateLabel(poll.createdAt)}</span>
        <Link to={`/poll/${poll.id}`}>
          {poll.status === "ACTIVE" ? "View live poll" : "View poll results"}
          <ArrowUpRight size={15} />
        </Link>
      </div>
    </article>
  );
}
function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <BarChart3 size={24} />
      </div>
      <div>
        <Kicker>NO SIGNALS YET</Kicker>
        <h3>Put a question in the room.</h3>
        <p>Launch a live poll and watch your first answer arrive.</p>
      </div>
      <Link className="button button-red" to="/create">
        <Plus size={17} /> Create poll
      </Link>
    </div>
  );
}
function AdvancedPollSettings({ value, onChange }) {
  const update = (key, nextValue) => onChange({ ...value, [key]: nextValue });
  const customLimit = value.responseLimit > 0;
  return (
    <div className="advanced-settings">
      <div className="form-heading">
        <span>03</span>
        <div>
          <h2>Control the signal</h2>
          <p>Set guardrails, visibility, and the finish line.</p>
        </div>
      </div>
      <div className="poll-settings choice-settings">
        <label className="setting-field">
          RESPONSE LIMIT
          <select
            value={customLimit ? "CUSTOM" : "NONE"}
            onChange={(event) =>
              update(
                "responseLimit",
                event.target.value === "CUSTOM"
                  ? Math.max(1, value.responseLimit || 1)
                  : 0,
              )
            }
          >
            <option value="NONE">No limit</option>
            <option value="CUSTOM">Custom limit</option>
          </select>
          {customLimit && (
            <input
              type="number"
              min="1"
              value={value.responseLimit}
              onChange={(event) =>
                update(
                  "responseLimit",
                  Math.max(1, Number(event.target.value) || 1),
                )
              }
            />
          )}
          <small>
            {customLimit
              ? `Responses: ${value.currentResponses || 0} / ${value.responseLimit}`
              : "Accept responses until the poll closes."}
          </small>
        </label>
        <label className="setting-field">
          AUTO CLOSE
          <select
            value={value.autoCloseAt > 0 ? "CUSTOM" : "NONE"}
            onChange={(event) =>
              update(
                "autoCloseAt",
                event.target.value === "CUSTOM"
                  ? Math.max(1, value.autoCloseAt || 1)
                  : 0,
              )
            }
          >
            <option value="NONE">Never</option>
            <option value="CUSTOM">After X votes</option>
          </select>
          {value.autoCloseAt > 0 && (
            <input
              type="number"
              min="1"
              value={value.autoCloseAt}
              onChange={(event) =>
                update(
                  "autoCloseAt",
                  Math.max(1, Number(event.target.value) || 1),
                )
              }
            />
          )}
          <small>
            {value.autoCloseAt > 0
              ? `Automatically close after ${value.autoCloseAt} responses.`
              : "Keep the poll open until you close it."}
          </small>
        </label>
        <label className="setting-field">
          RESULT VISIBILITY
          <select
            value={value.resultVisibility}
            onChange={(event) => update("resultVisibility", event.target.value)}
          >
            <option value="ALWAYS_VISIBLE">Always visible</option>
            <option value="AFTER_VOTING">After voting</option>
            <option value="AFTER_CLOSED">After poll closes</option>
            <option value="CREATOR_ONLY">Creator only</option>
          </select>
          <small>
            Visibility is enforced by the API, not only the browser.
          </small>
        </label>
        <label className="setting-field">
          ACCENT COLOR
          <input
            type="color"
            value={value.branding.accent || "#e45757"}
            onChange={(event) =>
              update("branding", {
                ...value.branding,
                accent: event.target.value,
              })
            }
          />
          <small>
            Safe predefined styling keeps contrast and accessibility intact.
          </small>
        </label>
      </div>
      <div className="poll-settings choice-settings">
        <label className="setting-field">
          CREATOR / ORGANIZATION
          <input
            maxLength="80"
            value={value.branding.organization}
            onChange={(event) =>
              update("branding", {
                ...value.branding,
                organization: event.target.value,
              })
            }
            placeholder="Optional name"
          />
        </label>
        <label className="setting-field">
          THANK-YOU TITLE
          <input
            maxLength="120"
            value={value.thankYou.title}
            onChange={(event) =>
              update("thankYou", {
                ...value.thankYou,
                title: event.target.value,
              })
            }
            placeholder="Thanks for participating"
          />
        </label>
        <label className="setting-field">
          THANK-YOU MESSAGE
          <input
            maxLength="240"
            value={value.thankYou.message}
            onChange={(event) =>
              update("thankYou", {
                ...value.thankYou,
                message: event.target.value,
              })
            }
            placeholder="Your response has been recorded."
          />
        </label>
        <label className="setting-field">
          CTA URL (HTTPS)
          <input
            type="url"
            value={value.thankYou.ctaUrl}
            onChange={(event) =>
              update("thankYou", {
                ...value.thankYou,
                ctaUrl: event.target.value,
              })
            }
            placeholder="https://example.com"
          />
        </label>
      </div>
    </div>
  );
}
function CalendarPopover({ value, onChange, onClose, anchorRef }) {
  const calendarRef = useRef(null);
  const selected = value ? new Date(`${value}T00:00:00`) : null;
  const [month, setMonth] = useState(
    selected || new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const today = new Date();
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const previousMonth = () =>
    setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  const nextMonth = () =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
  const isPast = (day) => {
    const candidate = new Date(month.getFullYear(), month.getMonth(), day);
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    return candidate < startOfToday;
  };
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    const closeOnOutsideClick = (event) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target) &&
        !anchorRef?.current?.contains(event.target)
      ) {
        onClose();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("mousedown", closeOnOutsideClick);
    };
  }, [onClose]);
  return (
    <div
      ref={calendarRef}
      className="calendar-popover"
      role="dialog"
      aria-label="Select poll date"
    >
      <button
        type="button"
        className="calendar-close"
        onClick={onClose}
        aria-label="Close calendar"
        title="Close calendar"
      >
        <X size={16} />
      </button>
      <div className="calendar-header">
        <button
          type="button"
          onClick={previousMonth}
          aria-label="Previous month"
          disabled={
            month.getFullYear() === today.getFullYear() &&
            month.getMonth() <= today.getMonth()
          }
        >
          ‹
        </button>
        <strong>
          {month.toLocaleString(undefined, { month: "long", year: "numeric" })}
        </strong>
        <button type="button" onClick={nextMonth} aria-label="Next month">
          ›
        </button>
      </div>
      <div className="calendar-weekdays" aria-hidden="true">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {Array.from({ length: firstDay }, (_, index) => (
          <span className="calendar-empty" key={`empty-${index}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;
          const dateValue = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isSelected = value === dateValue;
          const isToday =
            today.getFullYear() === month.getFullYear() &&
            today.getMonth() === month.getMonth() &&
            today.getDate() === day;
          return (
            <button
              type="button"
              key={dateValue}
              disabled={isPast(day)}
              className={`${isSelected ? "selected" : ""} ${isToday ? "today" : ""}`}
              aria-pressed={isSelected}
              onClick={() => {
                onChange(dateValue);
                onClose();
              }}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
function Create() {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [description, setDescription] = useState("");
  const [votingMode, setVotingMode] = useState("ANONYMOUS");
  const [choiceType, setChoiceType] = useState("SINGLE");
  const [maxSelections, setMaxSelections] = useState(0);
  const [expiryDate, setExpiryDate] = useState("");
  const [expiryHour, setExpiryHour] = useState("06");
  const [expiryMinute, setExpiryMinute] = useState("30");
  const [expiryPeriod, setExpiryPeriod] = useState("PM");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleStartDate, setScheduleStartDate] = useState("");
  const [scheduleStartTime, setScheduleStartTime] = useState("09:00");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarTriggerRef = useRef(null);
  const [scheduleError, setScheduleError] = useState("");
  const [allowVoteChange, setAllowVoteChange] = useState(false);
  const [advanced, setAdvanced] = useState({
    responseLimit: 0,
    autoCloseAt: 0,
    resultVisibility: "ALWAYS_VISIBLE",
    currentResponses: 0,
    branding: { accent: "#e45757", organization: "" },
    thankYou: { title: "", message: "", ctaUrl: "" },
  });
  const [templates, setTemplates] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [optionError, setOptionError] = useState("");
  const navigate = useNavigate();
  const expiryHour24 = String(
    (Number(expiryHour) % 12) + (expiryPeriod === "PM" ? 12 : 0),
  ).padStart(2, "0");
  const expiryValue = expiryDate
    ? new Date(`${expiryDate}T${expiryHour24}:${expiryMinute}:00`)
    : null;
  const expiryIso =
    expiryValue && !Number.isNaN(expiryValue.getTime())
      ? expiryValue.toISOString()
      : null;
  const hourError =
    expiryHour !== "" && (Number(expiryHour) < 1 || Number(expiryHour) > 12)
      ? "Hour must be between 1 and 12."
      : "";
  const minuteError =
    expiryMinute !== "" &&
    (Number(expiryMinute) < 1 || Number(expiryMinute) > 59)
      ? "Minute must be between 1 and 59."
      : "";
  const scheduleStartValue = scheduleStartDate
    ? new Date(`${scheduleStartDate}T${scheduleStartTime || "00:00"}:00`)
    : null;
  const validSchedule = Boolean(
    scheduleEnabled &&
    scheduleStartDate &&
    expiryDate &&
    expiryIso &&
    scheduleStartValue &&
    !Number.isNaN(scheduleStartValue.getTime()) &&
    !hourError &&
    !minuteError &&
    scheduleStartValue > new Date() &&
    expiryValue > scheduleStartValue,
  );
  const scheduleStartIso =
    scheduleStartValue && !Number.isNaN(scheduleStartValue.getTime())
      ? scheduleStartValue.toISOString()
      : null;
  const choiceTypeOptions = [
    {
      value: "SINGLE",
      title: "Single Choice",
      description: "Select one option.",
      icon: Circle,
    },
    {
      value: "MULTIPLE",
      title: "Multiple Choice",
      description: "Select several options.",
      icon: Square,
    },
  ];
  useEffect(() => {
    api
      .get("/templates")
      .then((r) => setTemplates(r.data.data))
      .catch(() => {});
  }, []);
  const addOption = () => {
    if (options.length >= 10) return;
    setOptions((current) => [...current, ""]);
    setOptionError("");
  };

  const removeOption = (index) => {
    if (options.length <= 2) {
      setOptionError("A poll needs at least two options.");
      return;
    }
    setOptions((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
    setOptionError("");
  };

  const validateOptionValues = () => {
    const normalizedOptions = options.map((option) => option.trim());
    if (normalizedOptions.length < 2) {
      return { ok: false, message: "Add at least two option values." };
    }
    if (normalizedOptions.some((option) => option.length === 0)) {
      return {
        ok: false,
        message: "Each option needs a value before submitting.",
      };
    }
    const seen = new Set();
    for (const option of normalizedOptions) {
      const key = option.toLowerCase();
      if (seen.has(key)) {
        return { ok: false, message: "Each option must be unique." };
      }
      seen.add(key);
    }
    return { ok: true, values: normalizedOptions };
  };

  const createPoll = async () => {
    setBusy(true);
    setError("");
    setScheduleError("");
    setOptionError("");
    if (scheduleEnabled && !validSchedule) {
      setScheduleError("Choose a future start and an end after the start.");
      setBusy(false);
      return;
    }
    const optionValidation = validateOptionValues();
    if (!optionValidation.ok) {
      setOptionError(optionValidation.message);
      setBusy(false);
      return;
    }
    try {
      const payload = {
        question,
        options: optionValidation.values,
        description,
        votingMode,
        choiceType,
        maxSelections: choiceType === "MULTIPLE" ? maxSelections : 0,
        expiresAt: scheduleEnabled ? expiryIso : null,
        startAt: scheduleEnabled ? scheduleStartIso : null,
        endAt: scheduleEnabled ? expiryIso : null,
        allowVoteChange,
        responseLimit: advanced.responseLimit,
        autoCloseAt: advanced.autoCloseAt,
        resultVisibility: advanced.resultVisibility,
        branding: advanced.branding,
        thankYou: advanced.thankYou,
      };
      await api.post("/polls", payload);
      navigate("/dashboard");
    } catch (e) {
      setError(e.response?.data?.error?.message || "Unable to create poll");
    } finally {
      setBusy(false);
    }
  };
  const submit = (e) => {
    e.preventDefault();
    createPoll();
  };
  return (
    <section className="create-layout page-width">
      <div className="create-intro">
        <Link className="back" to="/dashboard">
          ← Back to command center
        </Link>
        <Kicker>NEW SIGNAL / 002</Kicker>
        <h1>
          ASK THE
          <br />
          <em>ROOM.</em>
        </h1>
        <p className="muted">
          One sharp question can turn a crowd into a decision.
        </p>
        <div className="form-note">
          <Zap size={16} />
          <span>Live results activate the moment your first vote lands.</span>
        </div>
      </div>
      <form className="create-form poll-form" onSubmit={submit}>
        <div className="template-section">
          <div className="template-heading">
            <div>
              <span className="panel-label">START FROM TEMPLATE</span>
              <h2>Choose a starting signal</h2>
              <p>Pre-fill the room with a proven question shape.</p>
            </div>
          </div>
          <div className="template-grid">
            <button
              type="button"
              className="template-card template-blank"
              onClick={() => {
                setQuestion("");
                setOptions(["", ""]);
              }}
            >
              <span className="template-icon">
                <Plus size={17} />
              </span>
              <strong>Blank poll</strong>
              <small>Start from zero</small>
            </button>
            {templates.map((template, index) => (
              <button
                type="button"
                className={`template-card template-tone-${index % 4}`}
                key={template.id}
                onClick={() => {
                  setQuestion(template.question);
                  setOptions(template.options);
                }}
              >
                <span className="template-icon">
                  <Hash size={16} />
                </span>
                <strong>{template.name}</strong>
                <small>{template.options.length} ready-made choices</small>
              </button>
            ))}
          </div>
        </div>
        <div className="question-panel">
          <div className="form-heading">
            <span>01</span>
            <div>
              <h2>Frame the question</h2>
              <p>Keep it clear. Make it impossible to ignore.</p>
            </div>
          </div>
          <label>
            QUESTION
            <textarea
              required
              maxLength="240"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What should we focus on next?"
            />
            <small>{question.length} / 240</small>
          </label>
          <label>
            DESCRIPTION
            <textarea
              className="short-textarea"
              maxLength="500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Give your audience a little context (optional)."
            />
          </label>
        </div>
        <div className="form-heading options-heading">
          <span>02</span>
          <div>
            <h2>Set the choices</h2>
            <p>Give the room something worth choosing.</p>
          </div>
          <b>{options.length} / 10</b>
        </div>
        <div className="poll-settings choice-settings">
          <label className="setting-field">
            VOTING MODE
            <select
              value={votingMode}
              onChange={(e) => setVotingMode(e.target.value)}
            >
              <option value="ANONYMOUS">Anonymous voting</option>
              <option value="NAMED">Named voting</option>
            </select>
          </label>
          <div className="setting-field choice-type-field">
            <span>CHOICE TYPE</span>
            <div
              className="choice-type-segment"
              role="radiogroup"
              aria-label="Choice Type"
            >
              {choiceTypeOptions.map(
                ({ value, title, description, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    className={`choice-type-option ${choiceType === value ? "selected" : ""}`}
                    onClick={() => {
                      setChoiceType(value);
                      if (value === "MULTIPLE" && maxSelections === 0)
                        setMaxSelections(2);
                    }}
                    aria-pressed={choiceType === value}
                  >
                    <span className="choice-type-icon">
                      <Icon size={16} />
                    </span>
                    <strong>{title}</strong>
                    <small>{description}</small>
                  </button>
                ),
              )}
            </div>
            {choiceType === "MULTIPLE" && (
              <label className="choice-max-wrap">
                MAX SELECTIONS
                <input
                  type="number"
                  min="2"
                  max="10"
                  value={maxSelections || 2}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setMaxSelections(
                      Math.max(
                        2,
                        Math.min(10, Number.isFinite(value) ? value : 2),
                      ),
                    );
                  }}
                />
              </label>
            )}
          </div>
          <div
            className={`schedule-card ${scheduleEnabled ? "is-enabled" : ""}`}
          >
            <div className="schedule-heading">
              <div>
                <span className="panel-label">SCHEDULE POLL</span>
                <h3>
                  {scheduleEnabled
                    ? "Select when responses close"
                    : "Schedule Poll"}
                </h3>
              </div>
              <label className="schedule-toggle">
                <span>{scheduleEnabled ? "ON" : "OFF"}</span>
                <input
                  type="checkbox"
                  checked={scheduleEnabled}
                  onChange={(event) => {
                    setScheduleEnabled(event.target.checked);
                    if (!event.target.checked) {
                      setExpiryDate("");
                      setScheduleError("");
                    }
                  }}
                  aria-label="Enable Schedule Poll"
                />
                <span className="toggle-switch" aria-hidden="true" />
              </label>
              {validSchedule && (
                <small>
                  Scheduled for{" "}
                  {new Date(expiryIso).toLocaleString([], {
                    dateStyle: "long",
                    timeStyle: "short",
                  })}
                </small>
              )}
            </div>
            {scheduleEnabled && (
              <label className="setting-field">
                START DATE
                <input
                  type="date"
                  value={scheduleStartDate}
                  onChange={(event) => setScheduleStartDate(event.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  aria-label="Schedule start date"
                />
              </label>
            )}
            {scheduleEnabled && (
              <label className="setting-field">
                START TIME
                <input
                  type="time"
                  value={scheduleStartTime}
                  onChange={(event) => setScheduleStartTime(event.target.value)}
                  aria-label="Schedule start time"
                />
              </label>
            )}
            {scheduleEnabled && (
              <label className="setting-field">
                SELECT DATE
                <button
                  type="button"
                  className="date-picker-trigger"
                  ref={calendarTriggerRef}
                  onClick={() => setCalendarOpen((current) => !current)}
                  aria-expanded={calendarOpen}
                  aria-haspopup="dialog"
                >
                  <CalendarDays size={16} />{" "}
                  {expiryDate
                    ? new Date(`${expiryDate}T00:00:00`).toLocaleDateString(
                        undefined,
                        { month: "long", day: "numeric", year: "numeric" },
                      )
                    : "Select Date"}
                </button>
                {calendarOpen && (
                  <CalendarPopover
                    value={expiryDate}
                    onChange={setExpiryDate}
                    onClose={() => setCalendarOpen(false)}
                    anchorRef={calendarTriggerRef}
                  />
                )}
              </label>
            )}
            {scheduleEnabled && (
              <div className="setting-field">
                TIME
                <div className="time-fields" aria-label="Select time">
                  <label>
                    HOUR
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength="2"
                      placeholder="HH"
                      value={expiryHour}
                      onChange={(e) => {
                        if (/^\d*$/.test(e.target.value))
                          setExpiryHour(e.target.value);
                      }}
                      aria-label="Hour"
                    />
                    {hourError && (
                      <small className="field-error">{hourError}</small>
                    )}
                  </label>
                  <span>:</span>
                  <label>
                    MINUTE
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength="2"
                      placeholder="MM"
                      value={expiryMinute}
                      onChange={(e) => {
                        if (/^\d*$/.test(e.target.value))
                          setExpiryMinute(e.target.value);
                      }}
                      aria-label="Minute"
                    />
                    {minuteError && (
                      <small className="field-error">{minuteError}</small>
                    )}
                  </label>
                  <label>
                    AM / PM
                    <select
                      value={expiryPeriod}
                      onChange={(e) => setExpiryPeriod(e.target.value)}
                    >
                      {["AM", "PM"].map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            )}
            {scheduleError && (
              <div className="error inline-error">
                <X size={15} /> {scheduleError}
              </div>
            )}
          </div>
          <label className="setting-field vote-change-setting">
            <span>VOTE CONTROL</span>
            <span className="toggle-row">
              <input
                type="checkbox"
                checked={allowVoteChange}
                onChange={(e) => setAllowVoteChange(e.target.checked)}
                aria-label="Allow voters to change their vote"
              />
              <span className="toggle-switch" aria-hidden="true" />
              <span className="toggle-copy">
                <strong>Allow Vote Change</strong>
                <small>
                  Voters can change their selected option after submitting their
                  vote.
                </small>
              </span>
            </span>
          </label>
        </div>
        <div className="options-list choice-options">
          {options.map((option, i) => (
            <div
              className="option-input choice-option"
              key={`${i}-${option || "empty"}`}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              <input
                required
                value={option}
                onChange={(e) => {
                  const next = [...options];
                  next[i] = e.target.value;
                  setOptions(next);
                  if (optionError) setOptionError("");
                }}
                placeholder={`Option ${i + 1}`}
                aria-label={`Option ${i + 1}`}
              />
              {options.length > 2 && (
                <button
                  type="button"
                  className="remove"
                  onClick={() => removeOption(i)}
                  aria-label={`Remove option ${i + 1}`}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          className="button button-outline choice-add-option"
          onClick={addOption}
          disabled={options.length >= 10}
        >
          <Plus size={16} /> Add Option
        </button>
        {optionError && (
          <div className="error inline-error">
            <X size={15} /> {optionError}
          </div>
        )}
        <AdvancedPollSettings value={advanced} onChange={setAdvanced} />
        {error && (
          <div className="error">
            <X size={15} />
            {error}
          </div>
        )}
        <button className="button button-red full" disabled={busy}>
          {busy ? "Launching signal..." : "Launch poll"}
          <Radio size={17} />
        </button>
      </form>
    </section>
  );
}
function EditPoll() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState([]);
  const [choiceType, setChoiceType] = useState("SINGLE");
  const [maxSelections, setMaxSelections] = useState(0);
  const [allowVoteChange, setAllowVoteChange] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleStart, setScheduleStart] = useState("");
  const [scheduleEnd, setScheduleEnd] = useState("");
  const [advanced, setAdvanced] = useState({
    responseLimit: 0,
    autoCloseAt: 0,
    resultVisibility: "ALWAYS_VISIBLE",
    currentResponses: 0,
    branding: { accent: "#e45757", organization: "" },
    thankYou: { title: "", message: "", ctaUrl: "" },
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api
      .get(`/polls/${id}`)
      .then((r) => {
        const poll = r.data.data;
        setQuestion(poll.question);
        setOptions(poll.options.map((option) => option.text));
        setChoiceType(poll.choiceType || "SINGLE");
        setMaxSelections(
          poll.maxSelections || (poll.choiceType === "EXACTLY_TWO" ? 2 : 0),
        );
        setAllowVoteChange(Boolean(poll.allowVoteChange));
        setScheduleEnabled(Boolean(poll.startAt || poll.endAt));
        setScheduleStart(
          poll.startAt ? new Date(poll.startAt).toISOString().slice(0, 16) : "",
        );
        setScheduleEnd(
          poll.endAt || poll.expiresAt
            ? new Date(poll.endAt || poll.expiresAt).toISOString().slice(0, 16)
            : "",
        );
        setAdvanced({
          responseLimit: poll.responseLimit || 0,
          autoCloseAt: poll.autoCloseAt || 0,
          resultVisibility: poll.resultVisibility || "ALWAYS_VISIBLE",
          currentResponses: poll.totalVotes || 0,
          branding: {
            accent: poll.branding?.accent || "#e45757",
            organization: poll.branding?.organization || "",
          },
          thankYou: {
            title: poll.thankYou?.title || "",
            message: poll.thankYou?.message || "",
            ctaUrl: poll.thankYou?.ctaUrl || "",
          },
        });
      })
      .catch(() => setError("Poll not found"));
  }, [id]);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (
        scheduleEnabled &&
        (!scheduleStart ||
          !scheduleEnd ||
          new Date(scheduleEnd) <= new Date(scheduleStart))
      ) {
        setError("Choose a valid schedule with the end after the start.");
        setBusy(false);
        return;
      }
      await api.put(`/polls/${id}`, {
        question,
        options,
        choiceType,
        maxSelections:
          choiceType === "MULTIPLE"
            ? maxSelections
            : choiceType === "EXACTLY_TWO"
              ? 2
              : 0,
        allowVoteChange,
        responseLimit: advanced.responseLimit,
        autoCloseAt: advanced.autoCloseAt,
        resultVisibility: advanced.resultVisibility,
        branding: advanced.branding,
        thankYou: advanced.thankYou,
        startAt: scheduleEnabled ? new Date(scheduleStart).toISOString() : null,
        endAt: scheduleEnabled ? new Date(scheduleEnd).toISOString() : null,
        expiresAt: scheduleEnabled ? new Date(scheduleEnd).toISOString() : null,
      });
      navigate(`/poll/${id}`);
    } catch (e) {
      setError(e.response?.data?.error?.message || "Unable to update poll");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="create-layout page-width">
      <div className="create-intro">
        <Link className="back" to="/dashboard">
          ← Back to command center
        </Link>
        <Kicker>EDIT SIGNAL / {id.slice(0, 6).toUpperCase()}</Kicker>
        <h1>
          REFINE THE
          <br />
          <em>ROOM.</em>
        </h1>
        <p className="muted">
          Adjust the question or choices before the next answer arrives.
        </p>
      </div>
      <form className="create-form poll-form" onSubmit={submit}>
        <div className="choice-type-editor">
          <span>CHOICE TYPE</span>
          <div
            className="choice-type-segment"
            role="radiogroup"
            aria-label="Choice Type"
          >
            {[
              {
                value: "SINGLE",
                title: "Single Choice",
                description: "Select one option.",
                icon: Circle,
              },
              {
                value: "MULTIPLE",
                title: "Multiple Choice",
                description: "Select several.",
                icon: Square,
              },
            ].map(({ value, title, description, icon: Icon }) => (
              <button
                key={value}
                type="button"
                className={`choice-type-option ${choiceType === value ? "selected" : ""}`}
                onClick={() => {
                  setChoiceType(value);
                  if (value === "MULTIPLE" && maxSelections === 0)
                    setMaxSelections(2);
                }}
                aria-pressed={choiceType === value}
              >
                <span className="choice-type-icon">
                  <Icon size={16} />
                </span>
                <strong>{title}</strong>
                <small>{description}</small>
              </button>
            ))}
          </div>
          {choiceType === "MULTIPLE" && (
            <label className="choice-max-wrap">
              MAX SELECTIONS
              <input
                type="number"
                min="2"
                max="10"
                value={maxSelections || 2}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setMaxSelections(
                    Math.max(
                      2,
                      Math.min(10, Number.isFinite(value) ? value : 2),
                    ),
                  );
                }}
              />
            </label>
          )}
          <label className="setting-field vote-change-setting">
            <span>VOTE CONTROL</span>
            <span className="toggle-row">
              <input
                type="checkbox"
                checked={allowVoteChange}
                onChange={(e) => setAllowVoteChange(e.target.checked)}
                aria-label="Allow voters to change their vote"
              />
              <span className="toggle-switch" aria-hidden="true" />
              <span className="toggle-copy">
                <strong>Allow Vote Change</strong>
                <small>
                  Voters can change their selected option after submitting their
                  vote.
                </small>
              </span>
            </span>
          </label>
        </div>
        <div className={`schedule-card ${scheduleEnabled ? "is-enabled" : ""}`}>
          <div className="schedule-heading">
            <div>
              <span className="panel-label">SCHEDULE POLL</span>
              <h3>{scheduleEnabled ? "Edit schedule" : "Schedule Poll"}</h3>
            </div>
            <label className="schedule-toggle">
              <span>{scheduleEnabled ? "ON" : "OFF"}</span>
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(event) => setScheduleEnabled(event.target.checked)}
                aria-label="Enable Schedule Poll"
              />
              <span className="toggle-switch" aria-hidden="true" />
            </label>
          </div>
          {scheduleEnabled && (
            <div className="edit-schedule-fields">
              <label className="setting-field">
                START DATE/TIME
                <input
                  type="datetime-local"
                  value={scheduleStart}
                  onChange={(event) => setScheduleStart(event.target.value)}
                />
              </label>
              <label className="setting-field">
                END DATE/TIME
                <input
                  type="datetime-local"
                  value={scheduleEnd}
                  onChange={(event) => setScheduleEnd(event.target.value)}
                />
              </label>
            </div>
          )}
        </div>
        <label>
          QUESTION
          <textarea
            required
            maxLength="240"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </label>
        <label>OPTIONS</label>
        {options.map((option, index) => (
          <div className="option-input" key={index}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <input
              required
              value={option}
              onChange={(e) => {
                const next = [...options];
                next[index] = e.target.value;
                setOptions(next);
              }}
            />
          </div>
        ))}
        <AdvancedPollSettings value={advanced} onChange={setAdvanced} />
        {error && (
          <div className="error">
            <X size={15} />
            {error}
          </div>
        )}
        <button className="button button-red full" disabled={busy}>
          {busy ? "Saving..." : "Save changes"}
          <Check size={17} />
        </button>
      </form>
    </section>
  );
}
function ResultAnalytics({ poll }) {
  const [chartType, setChartType] = useState("bar");
  const total = poll.totalVotes || 0;
  const palette = ["#78a8ff", "#e5b95c", "#6ad0bc", "#a9a6f8", "#9aaabd"];
  const results = poll.options.map((option, index) => ({
    ...option,
    percent: total ? (option.votes / total) * 100 : 0,
    color: palette[index % palette.length],
  }));
  const leader = [...results].sort(
    (left, right) => right.votes - left.votes,
  )[0];
  const gradient = results
    .reduce(
      (segments, option, index) => {
        const start = segments.end;
        const end = start + option.percent;
        segments.parts.push(`${option.color} ${start}% ${end}%`);
        segments.end = end;
        return segments;
      },
      { parts: [], end: 0 },
    )
    .parts.join(", ");

  return (
    <section className="results-dashboard" aria-labelledby="results-heading">
      <div className="results-dashboard-heading">
        <div>
          <Kicker>RESULTS / LIVE ANALYTICS</Kicker>
          <h2 id="results-heading">Poll results</h2>
          <p>Live vote data, updated as responses arrive.</p>
        </div>
        <div className="results-stat-grid">
          <div className="results-stat">
            <small>Total votes</small>
            <strong>{total}</strong>
          </div>
          <div className="results-stat">
            <small>Status</small>
            <strong>{poll.status || "ACTIVE"}</strong>
          </div>
          <div className="results-stat">
            <small>Leading option</small>
            <strong>{leader?.text || "No votes yet"}</strong>
            <span>
              {leader && total ? `${Math.round(leader.percent)}%` : ""}
            </span>
          </div>
        </div>
      </div>
      <div
        className="chart-selector"
        role="tablist"
        aria-label="Result chart type"
      >
        {["bar", "column", "donut", "pie"].map((type) => (
          <button
            key={type}
            type="button"
            role="tab"
            aria-selected={chartType === type}
            className={chartType === type ? "active" : ""}
            onClick={() => setChartType(type)}
          >
            {type[0].toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>
      {total === 0 ? (
        <div className="results-zero-state">
          <BarChart3 size={24} />
          <strong>No votes yet</strong>
          <span>Your poll is waiting for its first response.</span>
        </div>
      ) : (
        <div className={`results-chart results-chart-${chartType}`}>
          {(chartType === "donut" || chartType === "pie") && (
            <div
              className="results-ring"
              style={{ background: `conic-gradient(${gradient})` }}
              role="img"
              aria-label={`${chartType} chart of poll results`}
            >
              {chartType === "donut" && (
                <span>
                  <strong>{total}</strong>Votes
                </span>
              )}
            </div>
          )}
          {chartType === "bar" && (
            <div className="results-bars">
              {results.map((option) => (
                <div className="results-bar-row" key={option.id}>
                  <div>
                    <span>{option.text}</span>
                    <strong>{Math.round(option.percent)}%</strong>
                  </div>
                  <i>
                    <b
                      style={{
                        width: `${option.percent}%`,
                        background: option.color,
                      }}
                    />
                  </i>
                  <small>{option.votes} votes</small>
                </div>
              ))}
            </div>
          )}
          {chartType === "column" && (
            <div className="results-columns">
              {results.map((option) => (
                <div className="results-column" key={option.id}>
                  <strong>{Math.round(option.percent)}%</strong>
                  <i
                    style={{
                      height: `${Math.max(option.percent, 2)}%`,
                      background: option.color,
                    }}
                  />
                  <span>{option.text}</span>
                  <small>{option.votes}</small>
                </div>
              ))}
            </div>
          )}
          <div className="results-legend">
            {results.map((option) => (
              <span key={option.id}>
                <i style={{ background: option.color }} />
                {option.text}: {option.votes} ({Math.round(option.percent)}%)
              </span>
            ))}
          </div>
        </div>
      )}
      <div
        className="results-table"
        role="table"
        aria-label="Poll result details"
      >
        <div className="results-table-row results-table-head" role="row">
          <span>Option</span>
          <span>Votes</span>
          <span>Share</span>
        </div>
        {results.map((option) => (
          <div className="results-table-row" role="row" key={option.id}>
            <span>{option.text}</span>
            <strong>{option.votes}</strong>
            <span>{Math.round(option.percent)}%</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function PublicPoll() {
  const { id } = useParams();
  const isDemo = id === "demo";
  const [poll, setPoll] = useState(isDemo ? DEMO_POLL : null);
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [connection, setConnection] = useState(
    isDemo ? "connected" : "connecting",
  );
  const [updated, setUpdated] = useState(false);
  const [share, setShare] = useState(false);
  const [hasVoted, setHasVoted] = useState(() =>
    Boolean(localStorage.getItem(`pulsvote_vote_${id}`)),
  );
  const [changingVote, setChangingVote] = useState(false);
  useEffect(() => {
    setHasVoted(Boolean(localStorage.getItem(`pulsvote_vote_${id}`)));
    setChangingVote(false);
    if (isDemo) {
      setPoll(DEMO_POLL);
      setMessage("Demo poll is ready.");
      return undefined;
    }
    api
      .get(`/polls/${id}`)
      .then((r) => setPoll(r.data.data))
      .catch(() => setMessage("This poll could not be found."));
    const source = new EventSource(`${API_URL}/polls/${id}/stream`);
    source.onopen = () => setConnection("connected");
    source.onerror = () => setConnection("disconnected");
    source.addEventListener("results", (e) => {
      setPoll(JSON.parse(e.data));
      setUpdated(true);
      setTimeout(() => setUpdated(false), 1200);
    });
    return () => source.close();
  }, [id, isDemo]);
  const choiceType = poll?.choiceType || "SINGLE";
  const maxSelections =
    poll?.maxSelections || (choiceType === "EXACTLY_TWO" ? 2 : 0);
  const toggleSelection = (optionId) => {
    if (choiceType === "SINGLE") {
      setSelected([optionId]);
      return;
    }
    setSelected((current) => {
      if (current.includes(optionId))
        return current.filter((id) => id !== optionId);
      if (choiceType === "EXACTLY_TWO" && current.length >= 2) return current;
      if (
        choiceType === "MULTIPLE" &&
        maxSelections > 0 &&
        current.length >= maxSelections
      )
        return current;
      return [...current, optionId];
    });
  };
  const vote = async () => {
    setBusy(true);
    try {
      if (isDemo) {
        setPoll((current) => {
          if (!current) return current;
          const updatedOptions = current.options.map((option) => {
            const selectedMatch = selected.includes(option.id);
            return selectedMatch
              ? { ...option, votes: option.votes + 1 }
              : option;
          });
          const newTotal = current.totalVotes + selected.length;
          return { ...current, options: updatedOptions, totalVotes: newTotal };
        });
        setSelected([]);
        setMessage("Demo vote recorded. The sample results updated instantly.");
        setUpdated(true);
        setTimeout(() => setUpdated(false), 1200);
        return "Demo vote recorded. The sample results updated instantly.";
      }
      const payload =
        choiceType === "SINGLE"
          ? { optionId: selected[0] }
          : { optionIds: selected };
      const r = await api.post(`/polls/${id}/vote`, payload, {
        headers: { "X-Voter-ID": voterId() },
      });
      setPoll(r.data.data);
      setSelected([]);
      localStorage.setItem(`pulsvote_vote_${id}`, JSON.stringify(selected));
      setHasVoted(true);
      setChangingVote(false);
      setMessage(
        hasVoted
          ? "Your vote has been updated successfully."
          : "Vote submitted. Results are live.",
      );
      return hasVoted
        ? "Your vote has been updated successfully."
        : "Vote submitted. Results are live.";
    } catch (e) {
      const errorMessage =
        e.response?.data?.error?.message || "Unable to record vote";
      setMessage(errorMessage);
      return errorMessage;
    } finally {
      setBusy(false);
    }
  };
  if (!poll)
    return (
      <div className="loading-page">
        <div className="loader-line" />
        <p>{message || "Connecting to live poll..."}</p>
      </div>
    );
  const total = poll.totalVotes || 0;
  const isUnavailable = poll.status === "CLOSED" || poll.status === "EXPIRED";
  const copy = () => {
    copyText(window.location.href).then(() => {
      setMessage("Poll link copied to clipboard.");
      setShare(false);
    });
  };
  const selectionLabel =
    choiceType === "SINGLE"
      ? "SELECT ONE"
      : choiceType === "MULTIPLE"
        ? maxSelections > 0
          ? `SELECT UP TO ${maxSelections}`
          : "SELECT MANY"
        : "SELECT EXACTLY 2";
  return (
    <section className="public-layout page-width">
      <div className="public-top">
        <Kicker>PUBLIC SIGNAL / {id.slice(0, 6).toUpperCase()}</Kicker>
        <button className="share-button" onClick={() => setShare(!share)}>
          <Share2 size={15} /> Share poll
        </button>
        {share && (
          <div className="share-menu">
            <button onClick={copy}>
              <Copy size={15} /> Copy link
            </button>
            <button
              onClick={() =>
                navigator.share?.({
                  title: poll.question,
                  url: window.location.href,
                })
              }
            >
              <Share2 size={15} /> Share...
            </button>
          </div>
        )}
      </div>
      <div className="connection-row">
        <Status label={poll.status || "ACTIVE"} />
        <Status
          label={
            connection === "connected"
              ? "LIVE"
              : connection === "connecting"
                ? "CONNECTING"
                : "OFFLINE"
          }
        />
        <span>
          {connection === "connected"
            ? "Results update instantly"
            : connection === "connecting"
              ? "Finding the live signal..."
              : "Reconnecting to signal..."}
        </span>
        {updated && (
          <strong className="live-update">
            <Zap size={14} /> +1 LIVE UPDATE
          </strong>
        )}
      </div>
      <div className="public-question">
        <span className="question-index">01</span>
        <h1>{poll.question}</h1>
        <p>
          {total} {total === 1 ? "person has" : "people have"} voted. Choose
          your answer below.
        </p>
        {poll.expiresAt && (
          <p className="expiry-note">
            {isUnavailable
              ? "This poll has expired and is no longer accepting responses."
              : `Voting closes ${new Date(poll.expiresAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}.`}
          </p>
        )}
      </div>
      <ResultAnalytics poll={poll} />
      <div className="voting-area">
        <div className="options-label">
          {selectionLabel}{" "}
          <span>
            {choiceType === "SINGLE"
              ? "ONE VOTE / BROWSER"
              : choiceType === "MULTIPLE"
                ? "MULTIPLE RESPONSES"
                : "EXACTLY TWO"}
          </span>
        </div>
        {choiceType === "EXACTLY_TWO" && (
          <p className="choice-helper">Select exactly 2 options.</p>
        )}
        <div className="results">
          {poll.options.map((option) => {
            const percent = total
              ? Math.round((option.votes / total) * 100)
              : 0;
            const isSelected = selected.includes(option.id);
            return (
              <button
                className={`result ${isSelected ? "selected" : ""} ${updated ? "result-pulse" : ""}`}
                key={option.id}
                onClick={() => toggleSelection(option.id)}
                disabled={isUnavailable}
                type="button"
              >
                <div className="result-label">
                  <span>
                    {isSelected && <Check size={15} />} {option.text}
                  </span>
                  <strong>{percent}%</strong>
                </div>
                <div className="track">
                  <i style={{ width: `${percent}%` }} />
                </div>
                <small>
                  {option.votes} {option.votes === 1 ? "vote" : "votes"}
                </small>
              </button>
            );
          })}
        </div>
        <button
          className="button button-red vote-button"
          disabled={
            choiceType === "SINGLE"
              ? !selected.length || busy || isUnavailable
              : selected.length === 0 ||
                busy ||
                isUnavailable ||
                (choiceType === "EXACTLY_TWO" && selected.length !== 2)
          }
          onClick={vote}
        >
          {busy
            ? "Recording vote..."
            : choiceType === "SINGLE"
              ? "Cast my vote"
              : choiceType === "EXACTLY_TWO"
                ? "Submit my 2 picks"
                : "Submit my picks"}
          <Check size={17} />
        </button>
        {poll.allowVoteChange &&
          hasVoted &&
          !changingVote &&
          !isUnavailable && (
            <button
              className="button button-outline vote-button"
              type="button"
              onClick={() => setChangingVote(true)}
            >
              Change Vote
              <Pencil size={16} />
            </button>
          )}
        {message && (
          <div
            className={
              message.includes("Unable") || message.includes("already")
                ? "error"
                : "success"
            }
          >
            {message}
          </div>
        )}
      </div>
    </section>
  );
}
function NotFound() {
  return (
    <section className="empty-state page-width">
      <div className="empty-icon">
        <Hash size={24} />
      </div>
      <div>
        <Kicker>404 / SIGNAL LOST</Kicker>
        <h3>This page is off the air.</h3>
        <p>The route you requested does not exist.</p>
      </div>
      <Link className="button button-red" to="/">
        Return home <ArrowUpRight size={16} />
      </Link>
    </section>
  );
}
createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);

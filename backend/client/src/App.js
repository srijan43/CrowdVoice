import React, { useEffect, useState, useRef } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

// Use environment variable or fallback to localhost
const API_URL = process.env.REACT_APP_API_URL || "https://crowdvoice-fg8d.onrender.com/api";

function App() {
  const [view, setView] = useState("list"); // "list" | "detail" | "auth" | "admin" | "dashboard"
  const [polls, setPolls] = useState([]);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem("pollUser");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isAdmin, setIsAdmin] = useState(() => {
    try {
      return localStorage.getItem("pollAdmin") === "true";
    } catch {
      return false;
    }
  });

  // Use refs to track current values without causing re-renders
  const selectedPollRef = useRef(selectedPoll);
  const viewRef = useRef(view);

  // Update refs when state changes
  useEffect(() => {
    selectedPollRef.current = selectedPoll;
  }, [selectedPoll]);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  // Set the page background image from the public folder
  useEffect(() => {
    const previousBackgroundImage = document.body.style.backgroundImage;
    const previousBackgroundRepeat = document.body.style.backgroundRepeat;
    const previousBackgroundSize = document.body.style.backgroundSize;
    const previousBackgroundPosition = document.body.style.backgroundPosition;
    const previousBackgroundAttachment = document.body.style.backgroundAttachment;

    document.body.style.backgroundImage = `url(${process.env.PUBLIC_URL}/Electronic-Voting-Blog---Image----1-.png)`;
    document.body.style.backgroundRepeat = "no-repeat";
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundAttachment = "fixed";

    return () => {
      document.body.style.backgroundImage = previousBackgroundImage;
      document.body.style.backgroundRepeat = previousBackgroundRepeat;
      document.body.style.backgroundSize = previousBackgroundSize;
      document.body.style.backgroundPosition = previousBackgroundPosition;
      document.body.style.backgroundAttachment = previousBackgroundAttachment;
    };
  }, []);

  // For "real-time" updates (basic approach: refetch every 3 seconds)
  useEffect(() => {
    fetchPolls();

    const intervalId = setInterval(() => {
      // Use refs to get current values without triggering re-renders
      const currentView = viewRef.current;
      const currentSelectedPoll = selectedPollRef.current;

      if (currentView === "detail" && currentSelectedPoll) {
        // Refresh just the selected poll
        fetchPollById(currentSelectedPoll._id, false);
      } else if (currentView === "list" || currentView === "dashboard") {
        fetchPolls(false);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [view]); // Only depend on view, not selectedPoll

  const fetchPolls = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch(`${API_URL}/polls`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setPolls(data);
      } else {
        console.error("API returned non-array:", data);
        setPolls([]);
      }
    } catch (err) {
      console.error("Error fetching polls", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchPollById = async (id, showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch(`${API_URL}/polls/${id}`);
      const data = await res.json();
      setSelectedPoll(data);
    } catch (err) {
      console.error("Error fetching poll", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handlePollClick = (poll) => {
    setSelectedPoll(poll);
    setView("detail");
  };

  const handleBackToList = () => {
    setView("list");
    setSelectedPoll(null);
  };

  const handleCreatedPoll = (poll) => {
    // After creating, go to detail view
    setSelectedPoll(poll);
    setView("detail");
  };

  const handleUserChange = (user) => {
    setCurrentUser(user);
    try {
      if (user) {
        localStorage.setItem("pollUser", JSON.stringify(user));
      } else {
        localStorage.removeItem("pollUser");
      }
    } catch {
      // ignore storage errors
    }
  };

  const handleAdminLogin = () => {
    setIsAdmin(true);
    try {
      localStorage.setItem("pollAdmin", "true");
    } catch {
      // ignore
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    try {
      localStorage.removeItem("pollAdmin");
    } catch {
      // ignore
    }
  };

  const deletePoll = async (pollId) => {
    // Extra safety: only allow delete when admin flag is true
    if (!isAdmin) {
      alert("Only admins can delete polls.");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/polls/${pollId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete poll");
      }

      // After successful deletion, go back to list and refresh
      setView("list");
      setSelectedPoll(null);
      await fetchPolls();
    } catch (err) {
      console.error("Error deleting poll", err);
      alert(err.message || "Failed to delete poll");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.appContainer}>
      <header style={styles.header}>
        <h1 style={styles.title}>Online Polling & Voting System</h1>
        <p style={styles.subtitle}>
          Create polls, collect votes, and view live results in a secure, modern interface.
        </p>
      </header>

      <nav style={styles.nav}>
        <button
          onClick={() => setView("list")}
          style={view === "list" ? styles.activeButton : styles.button}
        >
          Surveys
        </button>
        <button
          onClick={() => setView("dashboard")}
          style={view === "dashboard" ? styles.activeButton : styles.button}
        >
          Dashboard
        </button>
        <button
          onClick={() => setView("auth")}
          style={view === "auth" ? styles.activeButton : styles.button}
        >
          {currentUser ? `User: ${currentUser.name}` : "Register / Login"}
        </button>
        <button
          onClick={() => setView("admin")}
          style={view === "admin" ? styles.activeButton : styles.button}
        >
          {isAdmin ? "Admin (logged in)" : "Admin"}
        </button>
      </nav>

      <main style={styles.main}>
        {loading && <LoadingSpinner />}

        {!loading && view === "list" && (
          <PollList polls={polls} onPollClick={handlePollClick} />
        )}

        {!loading && view === "detail" && selectedPoll && (
          <PollDetail
            poll={selectedPoll}
            onBack={handleBackToList}
            onRefresh={() => fetchPollById(selectedPoll._id)}
            onDelete={isAdmin ? () => deletePoll(selectedPoll._id) : null}
            currentUser={currentUser}
            onRequireAuth={() => setView("auth")}
            isAdmin={isAdmin}
            onPublishToggle={async (published) => {
              try {
                const res = await fetch(`${API_URL}/polls/${selectedPoll._id}/publish`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ published }),
                });
                if (res.ok) {
                  const updatedPoll = await res.json();
                  setSelectedPoll(updatedPoll);
                  await fetchPolls(false);
                }
              } catch (err) {
                console.error("Error toggling publish status", err);
              }
            }}
          />
        )}

        {!loading && view === "auth" && (
          <AuthForm
            currentUser={currentUser}
            onUserChange={handleUserChange}
            onDone={() => setView("list")}
          />
        )}

        {!loading && view === "admin" && (
          <AdminPanel
            isAdmin={isAdmin}
            onAdminLogin={handleAdminLogin}
            onAdminLogout={handleAdminLogout}
            onCreated={handleCreatedPoll}
          />
        )}

        {!loading && view === "dashboard" && (
          <Dashboard
            polls={polls}
            onPollClick={handlePollClick}
            isAdmin={isAdmin}
            onPublishToggle={async (pollId, published) => {
              try {
                const res = await fetch(`${API_URL}/polls/${pollId}/publish`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ published }),
                });
                if (res.ok) {
                  await fetchPolls(false);
                  if (selectedPoll && selectedPoll._id === pollId) {
                    await fetchPollById(pollId, false);
                  }
                }
              } catch (err) {
                console.error("Error toggling publish status", err);
              }
            }}
          />
        )}
      </main>
    </div>
  );
}

// ====== Loading Spinner Component ======
function LoadingSpinner() {
  return (
    <div style={styles.loadingContainer}>
      <div style={styles.spinner}></div>
      <p style={styles.loadingText}>Loading...</p>
    </div>
  );
}

// ====== Poll List Component ======
function PollList({ polls, onPollClick }) {
  if (polls.length === 0) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>📊</div>
        <h2 style={styles.emptyTitle}>No polls yet</h2>
        <p style={styles.emptyText}>Create your first poll to get started!</p>
      </div>
    );
  }

  return (
    <div style={styles.fadeIn}>
      <h2 style={styles.sectionTitle}>All Polls</h2>
      <ul style={styles.list}>
        {polls.map((poll, index) => (
          <li
            key={poll._id}
            style={{
              ...styles.listItem,
              animationDelay: `${index * 0.1}s`,
            }}
            onClick={() => onPollClick(poll)}
            className="poll-item"
          >
            <div style={styles.listItemContent}>
              <strong style={styles.pollQuestion}>{poll.question}</strong>
              <div style={styles.pollMeta}>
                <span style={styles.badge}>
                  {poll.allowAnonymous ? "🔓 Anonymous" : "🔒 Non-anonymous"}
                </span>
                {poll.published && (
                  <span style={styles.publishedBadge}>✨ Published</span>
                )}
              </div>
            </div>
            <div style={styles.listItemRight}>
              <span style={styles.dateText}>
                {new Date(poll.createdAt).toLocaleDateString()}
              </span>
              <span style={styles.arrow}>→</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ====== Create Poll Form Component ======
function CreatePollForm({ onCreated }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [allowAnonymous, setAllowAnonymous] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    setOptions([...options, ""]);
  };

  const removeOption = (index) => {
    if (options.length <= 2) return; // keep at least 2 options
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedOptions = options.map((opt) => opt.trim()).filter((opt) => opt);
    if (!question.trim() || trimmedOptions.length < 2) {
      setError("Please enter a question and at least two options.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/polls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          options: trimmedOptions,
          allowAnonymous,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to create poll");
      }

      const createdPoll = await res.json();
      onCreated(createdPoll);

      // Reset form
      setQuestion("");
      setOptions(["", ""]);
      setAllowAnonymous(true);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.fadeIn}>
      <h2 style={styles.sectionTitle}>✨ Create a New Poll</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>
          Question:
          <input
            style={styles.input}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What do you want to ask?"
          />
        </label>

        <div style={{ marginTop: "20px" }}>
          <div style={styles.label}>Options:</div>
          {options.map((opt, index) => (
            <div key={index} style={styles.optionRow}>
              <input
                style={styles.input}
                value={opt}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  style={styles.smallButton}
                  title="Remove option"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addOption}
            style={{ ...styles.secondaryButton, marginTop: "12px" }}
          >
            ➕ Add Option
          </button>
        </div>

        <label style={{ ...styles.label, marginTop: "20px", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={allowAnonymous}
            onChange={(e) => setAllowAnonymous(e.target.checked)}
            style={{ width: "18px", height: "18px", cursor: "pointer" }}
          />
          <span>Allow anonymous voting</span>
        </label>

        {error && (
          <div style={styles.errorMessage}>
            <span>⚠️ {error}</span>
          </div>
        )}

        <button
          type="submit"
          style={{ ...styles.button, marginTop: "24px", width: "100%" }}
          disabled={submitting}
        >
          {submitting ? "⏳ Creating..." : "🚀 Create Poll"}
        </button>
      </form>
    </div>
  );
}

// ====== Admin Panel (only admin can create polls) ======
function AdminPanel({ isAdmin, onAdminLogin, onAdminLogout, onCreated }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const ADMIN_CODE = "admin123"; // demo-only; change as needed

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code === ADMIN_CODE) {
      onAdminLogin();
      setError("");
    } else {
      setError("Invalid admin code.");
    }
  };

  return (
    <div style={styles.fadeIn}>
      <h2 style={styles.sectionTitle}>🔐 Admin Area</h2>
      {!isAdmin && (
        <>
          <p style={styles.sectionSubtitle}>
            Only administrators can create new polls. Enter the admin code to continue.
          </p>
          <div style={styles.formCard}>
            <form onSubmit={handleSubmit} style={styles.form}>
              <label style={styles.label}>
                Admin code:
                <input
                  style={styles.input}
                  type="password"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter admin code"
                />
              </label>
              {error && (
                <div style={styles.errorMessage}>
                  <span>⚠️ {error}</span>
                </div>
              )}
              <button type="submit" style={{ ...styles.button, marginTop: "16px", width: "100%" }}>
                🔑 Login as Admin
              </button>
            </form>
          </div>
        </>
      )}

      {isAdmin && (
        <>
          <div style={styles.successMessage}>
            <span>✅ You are logged in as admin. You can create new polls below.</span>
          </div>
          <button
            type="button"
            onClick={onAdminLogout}
            style={{
              ...styles.secondaryButton,
              marginBottom: "24px",
            }}
          >
            🚪 Log out as Admin
          </button>
          <CreatePollForm onCreated={onCreated} />
        </>
      )}
    </div>
  );
}

// ====== Simple Registration / Login Component ======
// This is a purely front-end "registration" that stores the user's
// display name in localStorage. Non-anonymous polls will require a
// user to be set before voting.
function AuthForm({ currentUser, onUserChange, onDone }) {
  const [name, setName] = useState(currentUser?.name || "");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a name.");
      return;
    }
    onUserChange({ name: trimmed });
    setError("");
    onDone();
  };

  const handleLogout = () => {
    onUserChange(null);
    setName("");
  };

  return (
    <div style={styles.fadeIn}>
      <h2 style={styles.sectionTitle}>👤 Register / Login</h2>
      <p style={styles.sectionSubtitle}>
        Set a display name to vote on polls that do not allow anonymous voting.
      </p>
      <div style={styles.formCard}>
        {currentUser && (
          <div style={styles.successMessage}>
            <span>✅ Logged in as: <strong>{currentUser.name}</strong></span>
          </div>
        )}
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Display name:
            <input
              style={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
            />
          </label>
          {error && (
            <div style={styles.errorMessage}>
              <span>⚠️ {error}</span>
            </div>
          )}
          <button type="submit" style={{ ...styles.button, marginTop: "16px", width: "100%" }}>
            💾 Save
          </button>
          {currentUser && (
            <button
              type="button"
              onClick={handleLogout}
              style={{
                ...styles.secondaryButton,
                marginTop: "12px",
                width: "100%",
              }}
            >
              🚪 Log out
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

// ====== Dashboard Component ======
function Dashboard({ polls, onPollClick, isAdmin, onPublishToggle }) {
  const publishedPolls = polls.filter((poll) => poll.published);
  const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444"];

  if (publishedPolls.length === 0) {
    return (
      <div style={styles.fadeIn}>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📈</div>
          <h2 style={styles.emptyTitle}>No Published Polls</h2>
          <p style={styles.emptyText}>
            Publish a poll to see its results displayed here in beautiful pie charts!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.fadeIn}>
      <h2 style={styles.sectionTitle}>📊 Dashboard - Published Poll Results</h2>
      <p style={styles.sectionSubtitle}>
        View results of published polls in interactive pie chart format
      </p>
      <div style={styles.dashboardGrid}>
        {publishedPolls.map((poll, index) => {
          const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
          const chartData = poll.options.map((opt, idx) => ({
            name: opt.text,
            value: opt.votes,
            percentage: totalVotes > 0 ? ((opt.votes / totalVotes) * 100).toFixed(1) : 0,
          }));

          return (
            <div
              key={poll._id}
              style={{
                ...styles.dashboardCard,
                animationDelay: `${index * 0.15}s`,
              }}
              className="dashboard-card"
            >
              <h3 style={styles.dashboardCardTitle}>{poll.question}</h3>
              {totalVotes === 0 ? (
                <div style={styles.noVotesChart}>
                  <p>No votes yet</p>
                </div>
              ) : (
                <div style={styles.chartContainer}>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name}: ${percentage}%`}
                        outerRadius={90}
                        fill="#8884d8"
                        dataKey="value"
                        animationDuration={800}
                      >
                        {chartData.map((entry, idx) => (
                          <Cell
                            key={`cell-${idx}`}
                            fill={COLORS[idx % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: "0.85rem" }}
                        iconType="circle"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div style={styles.dashboardCardFooter}>
                <div style={styles.totalVotes}>
                  <span style={styles.totalVotesLabel}>Total Votes:</span>
                  <strong style={styles.totalVotesValue}>{totalVotes}</strong>
                </div>
                <div style={styles.dashboardButtons}>
                  <button
                    onClick={() => onPollClick(poll)}
                    style={styles.button}
                  >
                    👁️ View Details
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => onPublishToggle(poll._id, false)}
                      style={styles.secondaryButton}
                    >
                      Unpublish
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ====== Poll Detail & Voting Component ======
function PollDetail({
  poll,
  onBack,
  onRefresh,
  onDelete,
  currentUser,
  onRequireAuth,
  isAdmin,
  onPublishToggle,
}) {
  const [submittingVote, setSubmittingVote] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(() => {
    try {
      const userKeyPart = currentUser?.name ? `_${currentUser.name}` : "";
      const key = `pollVote_${poll._id}${userKeyPart}`;
      const stored = localStorage.getItem(key);
      return stored !== null ? Number(stored) : null;
    } catch {
      return null;
    }
  });

  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);

  const handleVote = async (optionIndex) => {
    if (!poll.allowAnonymous && !currentUser) {
      setError("You must register / log in before voting on this poll.");
      if (onRequireAuth) {
        onRequireAuth();
      }
      return;
    }

    if (selectedOptionIndex !== null && selectedOptionIndex !== optionIndex) {
      setError("You have already voted. Clear your response to change your vote.");
      return;
    }

    if (selectedOptionIndex === optionIndex) {
      setError("You have already voted for this option.");
      return;
    }

    setError("");
    setSubmittingVote(true);
    try {
      const res = await fetch(
        `${API_URL}/polls/${poll._id}/vote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ optionIndex }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to vote");
      }

      const updatedPoll = await res.json();
      // Refresh by directly using the response
      // (or you could call onRefresh again)
      Object.assign(poll, updatedPoll);
      setSelectedOptionIndex(optionIndex);
      try {
        const userKeyPart = currentUser?.name ? `_${currentUser.name}` : "";
        localStorage.setItem(`pollVote_${poll._id}${userKeyPart}`, String(optionIndex));
      } catch {
        // ignore storage error
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSubmittingVote(false);
    }
  };

  const handleClearVote = async () => {
    if (selectedOptionIndex === null) {
      setError("You have not voted yet.");
      return;
    }

    // For non-anonymous polls, require login before clearing (so only that user can clear)
    if (!poll.allowAnonymous && !currentUser) {
      setError("You must register / log in before clearing your vote on this poll.");
      if (onRequireAuth) {
        onRequireAuth();
      }
      return;
    }

    setError("");
    setSubmittingVote(true);
    try {
      const res = await fetch(
        `${API_URL}/polls/${poll._id}/clear-vote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ optionIndex: selectedOptionIndex }),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        console.error("Clear vote failed. Status:", res.status, "Body:", text);
        let message = "Failed to clear vote";
        try {
          const data = JSON.parse(text);
          if (data && data.message) {
            message = data.message;
          }
        } catch {
          // not JSON, fall back to raw text snippet
          if (text && text.trim().length > 0) {
            message = text.substring(0, 200);
          }
        }
        throw new Error(message);
      }

      const updatedPoll = await res.json();
      Object.assign(poll, updatedPoll);
      setSelectedOptionIndex(null);
      try {
        const userKeyPart = currentUser?.name ? `_${currentUser.name}` : "";
        localStorage.removeItem(`pollVote_${poll._id}${userKeyPart}`);
      } catch {
        // ignore
      }
      // Make sure UI is fully in sync with backend
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSubmittingVote(false);
    }
  };

  const handleDelete = async () => {
    if (!isAdmin || !onDelete) {
      setError("Only admins can delete polls.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this poll? This action cannot be undone.")) {
      return;
    }

    setError("");
    setDeleting(true);
    try {
      await onDelete();
    } catch (err) {
      console.error(err);
      setError(err.message);
      setDeleting(false);
    }
  };

  return (
    <div style={styles.fadeIn}>
      <div style={styles.buttonGroup}>
        <button onClick={onBack} style={styles.button}>
          ← Back to Polls
        </button>
        <button onClick={onRefresh} style={styles.button}>
          🔄 Refresh
        </button>
        <button
          onClick={handleClearVote}
          disabled={submittingVote || selectedOptionIndex === null}
          style={styles.secondaryButton}
        >
          Clear Response
        </button>
        {isAdmin && onDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={styles.dangerButton}
          >
            {deleting ? "Deleting..." : "🗑️ Delete"}
          </button>
        )}
        {isAdmin && onPublishToggle && (
          <button
            onClick={() => onPublishToggle(!poll.published)}
            style={poll.published ? styles.secondaryButton : styles.successButton}
          >
            {poll.published ? "👁️ Unpublish" : "✨ Publish Results"}
          </button>
        )}
      </div>

      <div style={styles.pollDetailCard}>
        <h2 style={styles.pollDetailTitle}>{poll.question}</h2>
        <div style={styles.infoBadge}>
          {poll.allowAnonymous ? (
            <span>🔓 Anonymous voting enabled</span>
          ) : (
            <span>🔒 Non-anonymous voting</span>
          )}
        </div>

        <div style={styles.optionsContainer}>
          {poll.options && Array.isArray(poll.options) && poll.options.map((opt, index) => {
            const percentage = totalVotes
              ? ((opt.votes / totalVotes) * 100).toFixed(1)
              : 0;
            const isSelected = selectedOptionIndex === index;
            return (
              <div key={index} style={styles.optionCard}>
                <div style={styles.optionHeader}>
                  <span style={styles.optionText}>{opt.text}</span>
                  <div style={styles.voteCount}>
                    <strong>{opt.votes}</strong> vote{opt.votes !== 1 ? "s" : ""} — {percentage}%
                  </div>
                </div>
                <div style={styles.progressBarOuter}>
                  <div
                    style={{
                      ...styles.progressBarInner,
                      width: `${percentage}%`,
                      transition: "width 0.6s ease-out",
                    }}
                  ></div>
                </div>
                <button
                  style={{
                    ...styles.voteButton,
                    ...(isSelected ? styles.votedButton : {}),
                  }}
                  disabled={submittingVote}
                  onClick={() => handleVote(index)}
                >
                  {submittingVote ? "⏳ Submitting..." : isSelected ? "✓ Voted" : "🗳️ Vote"}
                </button>
              </div>
            );
          })}
        </div>

        {totalVotes === 0 && (
          <div style={styles.emptyVotes}>
            <p>🌟 No votes yet. Be the first to vote!</p>
          </div>
        )}

        {error && (
          <div style={styles.errorMessage}>
            <span>⚠️ {error}</span>
          </div>
        )}

        <div style={styles.footerInfo}>
          <span>Last updated: {new Date(poll.updatedAt || poll.createdAt).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

// ====== Enhanced Modern Styles ======
const styles = {
  appContainer: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "32px 20px",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    textAlign: "center",
    marginBottom: "32px",
    color: "#ffffff",
    textShadow: "0 2px 8px rgba(0,0,0,0.5), 0 0 20px rgba(99, 102, 241, 0.3)",
  },
  title: {
    margin: 0,
    fontSize: "3rem",
    fontWeight: 800,
    letterSpacing: "-0.02em",
    background: "linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  subtitle: {
    margin: "12px 0 0 0",
    fontSize: "1.1rem",
    opacity: 0.95,
    fontWeight: 400,
  },
  nav: {
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    marginBottom: "32px",
    flexWrap: "wrap",
  },
  main: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    padding: "40px 32px",
    borderRadius: "24px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)",
    backdropFilter: "blur(20px) saturate(180%)",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
  },
  button: {
    padding: "12px 24px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "0.95rem",
    fontWeight: 600,
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.4)",
    position: "relative",
    overflow: "hidden",
  },
  activeButton: {
    padding: "12px 24px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "0.95rem",
    fontWeight: 700,
    boxShadow: "0 6px 20px rgba(99, 102, 241, 0.5), inset 0 1px 0 rgba(255,255,255,0.2)",
    transform: "translateY(-2px)",
  },
  secondaryButton: {
    padding: "12px 24px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "0.95rem",
    fontWeight: 600,
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: "0 4px 12px rgba(107, 114, 128, 0.4)",
  },
  successButton: {
    padding: "12px 24px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "0.95rem",
    fontWeight: 600,
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.4)",
  },
  dangerButton: {
    padding: "12px 24px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "0.95rem",
    fontWeight: 600,
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: "0 4px 12px rgba(239, 68, 68, 0.4)",
  },
  buttonGroup: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "24px",
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  listItem: {
    padding: "20px 24px",
    marginBottom: "16px",
    background: "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.5)",
    display: "flex",
    justifyContent: "space-between",
    cursor: "pointer",
    alignItems: "center",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    animation: "slideInUp 0.5s ease-out both",
  },
  listItemContent: {
    flex: 1,
  },
  pollQuestion: {
    fontSize: "1.1rem",
    fontWeight: 600,
    color: "#1f2937",
    display: "block",
    marginBottom: "8px",
  },
  pollMeta: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  badge: {
    fontSize: "0.8rem",
    padding: "4px 12px",
    borderRadius: "20px",
    background: "rgba(99, 102, 241, 0.1)",
    color: "#6366f1",
    fontWeight: 500,
  },
  publishedBadge: {
    fontSize: "0.8rem",
    padding: "4px 12px",
    borderRadius: "20px",
    background: "rgba(16, 185, 129, 0.1)",
    color: "#10b981",
    fontWeight: 500,
  },
  listItemRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  dateText: {
    fontSize: "0.85rem",
    color: "#6b7280",
    fontWeight: 500,
  },
  arrow: {
    fontSize: "1.2rem",
    color: "#6366f1",
    fontWeight: 600,
    transition: "transform 0.3s ease",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  label: {
    fontWeight: 600,
    marginTop: "8px",
    fontSize: "0.95rem",
    color: "#374151",
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    marginTop: "6px",
    borderRadius: "12px",
    border: "2px solid #e5e7eb",
    fontSize: "0.95rem",
    outline: "none",
    boxSizing: "border-box",
    transition: "all 0.3s ease",
    background: "rgba(255,255,255,0.9)",
  },
  optionRow: {
    display: "flex",
    gap: "8px",
    marginBottom: "8px",
    alignItems: "center",
  },
  smallButton: {
    padding: "6px 14px",
    borderRadius: "8px",
    border: "none",
    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    color: "#fff",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: 600,
    transition: "all 0.3s ease",
    boxShadow: "0 2px 8px rgba(239, 68, 68, 0.3)",
  },
  progressBarOuter: {
    width: "100%",
    height: "16px",
    background: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
    borderRadius: "10px",
    overflow: "hidden",
    margin: "12px 0",
    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1)",
  },
  progressBarInner: {
    height: "100%",
    background: "linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)",
    borderRadius: "10px",
    boxShadow: "0 2px 8px rgba(99, 102, 241, 0.4)",
    transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  dashboardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
    gap: "28px",
    marginTop: "28px",
  },
  dashboardCard: {
    background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)",
    padding: "28px",
    borderRadius: "20px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.5)",
    border: "1px solid rgba(255,255,255,0.5)",
    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
    animation: "slideInUp 0.6s ease-out both",
  },
  dashboardCardTitle: {
    marginTop: 0,
    marginBottom: "20px",
    fontSize: "1.2rem",
    fontWeight: 700,
    color: "#1f2937",
    lineHeight: 1.4,
  },
  chartContainer: {
    margin: "20px 0",
    padding: "10px",
  },
  noVotesChart: {
    color: "#9ca3af",
    textAlign: "center",
    padding: "60px 0",
    fontSize: "1rem",
    fontWeight: 500,
  },
  dashboardCardFooter: {
    marginTop: "20px",
    paddingTop: "20px",
    borderTop: "1px solid rgba(229, 231, 235, 0.5)",
  },
  totalVotes: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  totalVotesLabel: {
    fontSize: "0.9rem",
    color: "#6b7280",
    fontWeight: 500,
  },
  totalVotesValue: {
    fontSize: "1.3rem",
    color: "#6366f1",
    fontWeight: 700,
  },
  dashboardButtons: {
    display: "flex",
    gap: "10px",
    justifyContent: "center",
  },
  fadeIn: {
    animation: "fadeIn 0.5s ease-out",
  },
  sectionTitle: {
    fontSize: "2rem",
    fontWeight: 800,
    color: "#1f2937",
    marginBottom: "8px",
    letterSpacing: "-0.02em",
  },
  sectionSubtitle: {
    fontSize: "1rem",
    color: "#6b7280",
    marginBottom: "28px",
    fontWeight: 400,
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
  },
  emptyIcon: {
    fontSize: "4rem",
    marginBottom: "16px",
    display: "block",
  },
  emptyTitle: {
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "#1f2937",
    marginBottom: "8px",
  },
  emptyText: {
    fontSize: "1rem",
    color: "#6b7280",
    maxWidth: "400px",
    margin: "0 auto",
  },
  pollDetailCard: {
    background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(249,250,251,0.95) 100%)",
    padding: "32px",
    borderRadius: "20px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
    border: "1px solid rgba(255,255,255,0.5)",
  },
  pollDetailTitle: {
    fontSize: "1.8rem",
    fontWeight: 800,
    color: "#1f2937",
    marginBottom: "16px",
    lineHeight: 1.3,
  },
  infoBadge: {
    display: "inline-block",
    padding: "8px 16px",
    borderRadius: "20px",
    background: "rgba(99, 102, 241, 0.1)",
    color: "#6366f1",
    fontSize: "0.9rem",
    fontWeight: 600,
    marginBottom: "24px",
  },
  optionsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    marginTop: "24px",
  },
  optionCard: {
    padding: "20px",
    borderRadius: "16px",
    background: "rgba(255,255,255,0.8)",
    border: "2px solid rgba(229, 231, 235, 0.5)",
    transition: "all 0.3s ease",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  optionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
    flexWrap: "wrap",
    gap: "8px",
  },
  optionText: {
    fontSize: "1.05rem",
    fontWeight: 600,
    color: "#1f2937",
    flex: 1,
  },
  voteCount: {
    fontSize: "0.9rem",
    color: "#6366f1",
    fontWeight: 600,
  },
  voteButton: {
    padding: "10px 20px",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: 600,
    transition: "all 0.3s ease",
    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
    width: "100%",
    marginTop: "8px",
  },
  votedButton: {
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
  },
  emptyVotes: {
    textAlign: "center",
    padding: "32px",
    color: "#9ca3af",
    fontSize: "1rem",
    fontWeight: 500,
  },
  errorMessage: {
    padding: "16px",
    borderRadius: "12px",
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    color: "#dc2626",
    marginTop: "16px",
    fontWeight: 500,
  },
  footerInfo: {
    marginTop: "24px",
    paddingTop: "20px",
    borderTop: "1px solid rgba(229, 231, 235, 0.5)",
    fontSize: "0.85rem",
    color: "#9ca3af",
    textAlign: "center",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 20px",
    gap: "20px",
  },
  spinner: {
    width: "50px",
    height: "50px",
    border: "4px solid rgba(99, 102, 241, 0.2)",
    borderTop: "4px solid #6366f1",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  loadingText: {
    fontSize: "1rem",
    color: "#6366f1",
    fontWeight: 600,
  },
  formCard: {
    background: "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(249,250,251,0.9) 100%)",
    padding: "28px",
    borderRadius: "16px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    border: "1px solid rgba(255,255,255,0.5)",
    marginTop: "20px",
  },
  successMessage: {
    padding: "16px",
    borderRadius: "12px",
    background: "rgba(16, 185, 129, 0.1)",
    border: "1px solid rgba(16, 185, 129, 0.3)",
    color: "#059669",
    marginBottom: "20px",
    fontWeight: 500,
  },
};

export default App;

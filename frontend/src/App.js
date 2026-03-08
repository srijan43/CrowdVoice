import React, { useEffect, useState } from "react";

const API_URL = "https://crowdvoice-fg8d.onrender.com/api";

function App() {
  const [view, setView] = useState("list"); // "list" | "create" | "detail"
  const [polls, setPolls] = useState([]);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [loading, setLoading] = useState(false);

  // For "real-time" updates (basic approach: refetch every 3 seconds)
  useEffect(() => {
    fetchPolls();

    const intervalId = setInterval(() => {
      if (view === "detail" && selectedPoll) {
        // Refresh just the selected poll
        fetchPollById(selectedPoll._id, false);
      } else if (view === "list") {
        fetchPolls(false);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [view, selectedPoll]);

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

  return (
    <div style={styles.appContainer}>
      <header style={styles.header}>
        <h1 style={{ margin: 0 }}>Online Polling & Voting System</h1>
        <p style={{ margin: "4px 0 0 0" }}>
          Create surveys, vote, and see results in (almost) real-time.
        </p>
      </header>

      <nav style={styles.nav}>
        <button
          onClick={() => setView("list")}
          style={view === "list" ? styles.activeButton : styles.button}
        >
          View Polls
        </button>
        <button
          onClick={() => setView("create")}
          style={view === "create" ? styles.activeButton : styles.button}
        >
          Create Poll
        </button>
      </nav>

      <main style={styles.main}>
        {loading && <p>Loading...</p>}

        {!loading && view === "list" && (
          <PollList polls={polls} onPollClick={handlePollClick} />
        )}

        {!loading && view === "create" && (
          <CreatePollForm onCreated={handleCreatedPoll} />
        )}

        {!loading && view === "detail" && selectedPoll && (
          <PollDetail
            poll={selectedPoll}
            onBack={handleBackToList}
            onRefresh={() => fetchPollById(selectedPoll._id)}
          />
        )}
      </main>
    </div>
  );
}

// ====== Poll List Component ======
function PollList({ polls, onPollClick }) {
  if (polls.length === 0) {
    return <p>No polls yet. Create one!</p>;
  }

  return (
    <div>
      <h2>All Polls</h2>
      <ul style={styles.list}>
        {polls.map((poll) => (
          <li
            key={poll._id}
            style={styles.listItem}
            onClick={() => onPollClick(poll)}
          >
            <div>
              <strong>{poll.question}</strong>
              <div style={{ fontSize: "0.85rem", color: "#666" }}>
                {poll.allowAnonymous ? "Anonymous voting allowed" : "Non-anonymous"}
              </div>
            </div>
            <span style={{ fontSize: "0.8rem", color: "#999" }}>
              {new Date(poll.createdAt).toLocaleString()}
            </span>
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
      const res = await fetch("http://localhost:5000/api/polls", {
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
    <div>
      <h2>Create a New Poll</h2>
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

        <div style={{ marginTop: "12px" }}>
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
                >
                  X
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addOption}
            style={{ ...styles.button, marginTop: "8px" }}
          >
            + Add Option
          </button>
        </div>

        <label style={{ ...styles.label, marginTop: "12px" }}>
          <input
            type="checkbox"
            checked={allowAnonymous}
            onChange={(e) => setAllowAnonymous(e.target.checked)}
          />{" "}
          Allow anonymous voting
        </label>

        {error && <p style={{ color: "red" }}>{error}</p>}

        <button
          type="submit"
          style={{ ...styles.button, marginTop: "16px" }}
          disabled={submitting}
        >
          {submitting ? "Creating..." : "Create Poll"}
        </button>
      </form>
    </div>
  );
}

// ====== Poll Detail & Voting Component ======
function PollDetail({ poll, onBack, onRefresh }) {
  const [submittingVote, setSubmittingVote] = useState(false);
  const [error, setError] = useState("");

  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);

  const handleVote = async (optionIndex) => {
    setError("");
    setSubmittingVote(true);
    try {
      const res = await fetch(
        `http://localhost:5000/api/polls/${poll._id}/vote`,
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
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSubmittingVote(false);
    }
  };

  return (
    <div>
      <button onClick={onBack} style={styles.button}>
        ← Back to Polls
      </button>
      <button onClick={onRefresh} style={{ ...styles.button, marginLeft: "8px" }}>
        Refresh Results
      </button>

      <h2 style={{ marginTop: "16px" }}>{poll.question}</h2>
      <p style={{ fontSize: "0.9rem", color: "#666" }}>
        {poll.allowAnonymous
          ? "Anonymous voting is allowed. Your identity is not stored."
          : "Anonymous voting is disabled (but this simple demo still does not store identities)."}
      </p>

      <div style={{ marginTop: "16px" }}>
        {poll.options && Array.isArray(poll.options) && poll.options.map((opt, index) => {
          const percentage = totalVotes
            ? ((opt.votes / totalVotes) * 100).toFixed(1)
            : 0;
          return (
            <div key={index} style={{ marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{opt.text}</span>
                <span>
                  {opt.votes} vote(s) — {percentage}%
                </span>
              </div>
              <div style={styles.progressBarOuter}>
                <div
                  style={{
                    ...styles.progressBarInner,
                    width: `${percentage}%`,
                  }}
                ></div>
              </div>
              <button
                style={styles.button}
                disabled={submittingVote}
                onClick={() => handleVote(index)}
              >
                {submittingVote ? "Submitting..." : "Vote"}
              </button>
            </div>
          );
        })}
      </div>

      {totalVotes === 0 && (
        <p style={{ fontSize: "0.9rem", color: "#999" }}>
          No votes yet. Be the first to vote!
        </p>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}

      <p style={{ fontSize: "0.8rem", color: "#999", marginTop: "16px" }}>
        Last updated: {new Date(poll.updatedAt || poll.createdAt).toLocaleString()}
      </p>
    </div>
  );
}

// ====== Basic inline styles to keep things simple ======
const styles = {
  appContainer: {
    maxWidth: "800px",
    margin: "0 auto",
    padding: "16px",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    textAlign: "center",
    marginBottom: "16px",
  },
  nav: {
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    marginBottom: "16px",
  },
  main: {
    backgroundColor: "#f9f9f9",
    padding: "16px",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  button: {
    padding: "8px 12px",
    borderRadius: "4px",
    border: "1px solid #007bff",
    backgroundColor: "#007bff",
    color: "#fff",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  activeButton: {
    padding: "8px 12px",
    borderRadius: "4px",
    border: "1px solid #0056b3",
    backgroundColor: "#0056b3",
    color: "#fff",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  listItem: {
    padding: "8px",
    marginBottom: "8px",
    backgroundColor: "#fff",
    borderRadius: "4px",
    border: "1px solid #ddd",
    display: "flex",
    justifyContent: "space-between",
    cursor: "pointer",
  },
  form: {
    display: "flex",
    flexDirection: "column",
  },
  label: {
    fontWeight: "bold",
    marginTop: "8px",
  },
  input: {
    width: "100%",
    padding: "6px 8px",
    marginTop: "4px",
    borderRadius: "4px",
    border: "1px solid " +
      "#ccc",
    fontSize: "0.9rem",
  },
  optionRow: {
    display: "flex",
    gap: "4px",
    marginBottom: "4px",
  },
  smallButton: {
    padding: "4px 8px",
    borderRadius: "4px",
    border: "1px solid #dc3545",
    backgroundColor: "#dc3545",
    color: "#fff",
    cursor: "pointer",
    fontSize: "0.8rem",
  },
  progressBarOuter: {
    width: "100%",
    height: "12px",
    backgroundColor: "#e0e0e0",
    borderRadius: "6px",
    overflow: "hidden",
    margin: "4px 0 8px 0",
  },
  progressBarInner: {
    height: "100%",
    backgroundColor: "#28a745",
  },
};

export default App;



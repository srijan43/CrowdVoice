import express from "express";
import mongoose from "mongoose";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 5000;

// ====== MIDDLEWARE ======
app.use(cors({
  origin: "*", // Allow all origins (change in production)
  methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json()); // Parse JSON bodies

// ====== MONGODB CONNECTION ======
const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/polling_app";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Mongo connection error:", err));

// ====== MONGOOSE SCHEMAS & MODELS ======

// Each poll option has a text and a number of votes
const optionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  votes: { type: Number, default: 0 },
});

// Poll itself
const pollSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    options: [optionSchema],
    allowAnonymous: { type: Boolean, default: true },
    published: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "polls" }
);

const Poll = mongoose.model("Poll", pollSchema);

// ====== ROUTES ======

// Simple root route
app.get("/", (req, res) => {
  res.send("Online Polling and Voting System Backend");
});

// Create a new poll
// Body example:
// {
//   "question": "Your favorite language?",
//   "options": ["JavaScript", "Python", "Java"],
//   "allowAnonymous": true
// }
app.post("/api/polls", async (req, res) => {
  try {
    const { question, options, allowAnonymous } = req.body;

    if (!question || !options || !Array.isArray(options) || options.length < 2) {
      return res
        .status(400)
        .json({ message: "Question and at least two options are required." });
    }

    const formattedOptions = options.map((opt) => ({ text: opt }));

    const poll = new Poll({
      question,
      options: formattedOptions,
      allowAnonymous: allowAnonymous ?? true,
    });

    const savedPoll = await poll.save();
    res.status(201).json(savedPoll);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating poll" });
  }
});

// Get all polls (for listing)
app.get("/api/polls", async (req, res) => {
  try {
    const polls = await Poll.find().sort({ createdAt: -1 });
    res.json(polls);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching polls" });
  }
});

// Get a single poll by ID
app.get("/api/polls/:id", async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) {
      return res.status(404).json({ message: "Poll not found" });
    }
    res.json(poll);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching poll" });
  }
});

// Vote on a poll
// Body example:
// { "optionIndex": 0, "userName": "Alice" }
app.post("/api/polls/:id/vote", async (req, res) => {
  try {
    const { optionIndex, userName } = req.body;
    const poll = await Poll.findById(req.params.id);

    if (!poll) {
      return res.status(404).json({ message: "Poll not found" });
    }

    // For non-anonymous polls, require a userName in the request body.
    if (!poll.allowAnonymous && !userName) {
      return res
        .status(400)
        .json({ message: "User is required to vote on this poll." });
    }
    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      return res.status(400).json({ message: "Invalid option index" });
    }

    poll.options[optionIndex].votes += 1;
    const updatedPoll = await poll.save();

    res.json(updatedPoll); // return updated poll with new vote counts
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error voting on poll" });
  }
});

// Clear a vote on a poll (decrement a specific option's votes)
// Body example:
// { "optionIndex": 0, "userName": "Alice" }
app.post("/api/polls/:id/clear-vote", async (req, res) => {
  try {
    const { optionIndex, userName } = req.body;
    const poll = await Poll.findById(req.params.id);

    if (!poll) {
      return res.status(404).json({ message: "Poll not found" });
    }

    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      return res.status(400).json({ message: "Invalid option index" });
    }

    // For non-anonymous polls, also require userName when clearing.
    if (!poll.allowAnonymous && !userName) {
      return res
        .status(400)
        .json({ message: "User is required to clear a vote on this poll." });
    }

    if (poll.options[optionIndex].votes > 0) {
      poll.options[optionIndex].votes -= 1;
    }

    const updatedPoll = await poll.save();
    res.json(updatedPoll);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error clearing vote on poll" });
  }
});

// Delete a poll
app.delete("/api/polls/:id", async (req, res) => {
  try {
    const poll = await Poll.findByIdAndDelete(req.params.id);
    if (!poll) {
      return res.status(404).json({ message: "Poll not found" });
    }
    res.json({ message: "Poll deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting poll" });
  }
});

// Toggle publish status of a poll
app.patch("/api/polls/:id/publish", async (req, res) => {
  try {
    const { published } = req.body;
    const poll = await Poll.findById(req.params.id);
    
    if (!poll) {
      return res.status(404).json({ message: "Poll not found" });
    }
    
    poll.published = published !== undefined ? published : !poll.published;
    const updatedPoll = await poll.save();
    
    res.json(updatedPoll);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating poll publish status" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});



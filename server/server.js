
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Allow both Vite development ports
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

// Test API
app.get("/", (req, res) => {
  res.json({
    message: "Personal Notes API is running!",
    status: "success",
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Node.js and Express backend working!",
  });
});

// Register
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password required",
      });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    res.status(201).json({
      message: data.session
        ? "Account created successfully"
        : "Check your email to confirm your account",
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password required",
      });
    }

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) throw error;

    if (!data.session) {
      return res.status(401).json({
        error: "No session returned",
      });
    }

    res.cookie("access_token", data.session.access_token, {
      ...cookieOptions,
      maxAge: data.session.expires_in * 1000,
    });

    res.json({
      user: data.user,
      message: "Login successful",
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Authentication middleware
async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.access_token;

    if (!token) {
      return res.status(401).json({
        error: "Please log in",
      });
    }

    const { data, error } =
      await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        error: "Invalid or expired session",
      });
    }

    req.user = data.user;

    req.db = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    next();
  } catch (error) {
    res.status(500).json({
      error: "Authentication failed",
    });
  }
}

// Check logged-in user
app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Logout
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("access_token", cookieOptions);
  res.json({
    message: "Logged out successfully",
  });
});

// Get all notes
app.get("/api/notes", requireAuth, async (req, res) => {
  const { data, error } = await req.db
    .from("notes")
    .select("*")
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(400).json({
      error: error.message,
    });
  }

  res.json(data);
});

// Create note
app.post("/api/notes", requireAuth, async (req, res) => {
  const { title, content } = req.body || {};

  if (!title?.trim() || !content?.trim()) {
    return res.status(400).json({
      error: "Title and content required",
    });
  }

  const { data, error } = await req.db
    .from("notes")
    .insert({
      title: title.trim(),
      content: content.trim(),
      user_id: req.user.id,
    })
    .select()
    .single();

  if (error) {
    return res.status(400).json({
      error: error.message,
    });
  }

  res.status(201).json(data);
});

// Edit note
app.put("/api/notes/:id", requireAuth, async (req, res) => {
  const { title, content } = req.body || {};

  if (!title?.trim() || !content?.trim()) {
    return res.status(400).json({
      error: "Title and content required",
    });
  }

  const { data, error } = await req.db
    .from("notes")
    .update({
      title: title.trim(),
      content: content.trim(),
    })
    .eq("id", req.params.id)
    .eq("user_id", req.user.id)
    .select()
    .single();

  if (error) {
    return res.status(400).json({
      error: error.message,
    });
  }

  res.json(data);
});

// Delete note
app.delete("/api/notes/:id", requireAuth, async (req, res) => {
  const { data, error } = await req.db
    .from("notes")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.user.id)
    .select("id")
    .single();

  if (error) {
    return res.status(400).json({
      error: error.message,
    });
  }

  res.json({
    message: "Note deleted successfully",
    note: data,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

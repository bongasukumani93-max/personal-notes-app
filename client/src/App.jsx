
import { useEffect, useState } from "react";

const API = "http://localhost:5000";

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [notesLoading, setNotesLoading] = useState(false);

  useEffect(() => {
    async function checkSession() {
      try {
        const data = await apiRequest("/api/auth/me");
        setUser(data.user);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    checkSession();
  }, []);

  useEffect(() => {
    if (!user) {
      setNotes([]);
      return;
    }

    let active = true;

    async function loadNotes() {
      setNotesLoading(true);

      try {
        const data = await apiRequest("/api/notes");
        if (active) setNotes(data);
      } catch (error) {
        if (active) setMessage(error.message);
      } finally {
        if (active) setNotesLoading(false);
      }
    }

    loadNotes();

    return () => {
      active = false;
    };
  }, [user]);

  async function refreshNotes() {
    const data = await apiRequest("/api/notes");
    setNotes(data);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      if (mode === "register") {
        const data = await apiRequest("/api/auth/signup", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });

        setMessage(data.message);
        setMode("login");
      } else {
        const data = await apiRequest("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });

        setUser(data.user);
        setPassword("");
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);

    try {
      await apiRequest("/api/auth/logout", {
        method: "POST",
      });

      setUser(null);
      setNotes([]);
      cancelEdit();
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveNote(e) {
    e.preventDefault();

    if (!title.trim() || !content.trim()) return;

    setBusy(true);
    setMessage("");

    try {
      const editing = editingId !== null;

      await apiRequest(
        editing ? `/api/notes/${editingId}` : "/api/notes",
        {
          method: editing ? "PUT" : "POST",
          body: JSON.stringify({
            title: title.trim(),
            content: content.trim(),
          }),
        }
      );

      await refreshNotes();
      cancelEdit();
      setMessage(
        editing
          ? "Note updated successfully!"
          : "Note saved successfully!"
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  function editNote(note) {
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setTitle("");
    setContent("");
  }

  async function deleteNote(id) {
    if (!window.confirm("Delete this note?")) return;

    setBusy(true);
    setMessage("");

    try {
      await apiRequest(`/api/notes/${id}`, {
        method: "DELETE",
      });

      await refreshNotes();

      if (editingId === id) cancelEdit();

      setMessage("Note deleted successfully!");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="p-10 text-center">
        Loading...
      </div>
    );
  }

  if (user) {
    return (
      <main className="min-h-screen bg-slate-100 p-4 md:p-8">
        <div className="mx-auto max-w-5xl">
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                📝 My Private Notes
              </h1>
              <p className="mt-2 text-slate-500">
                Signed in as {user.email}
              </p>
            </div>

            <button
              onClick={logout}
              disabled={busy}
              className="rounded-lg bg-red-500 px-5 py-2 text-white disabled:opacity-50"
            >
              Logout
            </button>
          </header>

          {message && (
            <p role="status" className="mb-5 rounded-lg bg-indigo-50 p-4 text-indigo-800">
              {message}
            </p>
          )}

          <section className="mb-8 rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-5 text-xl font-bold">
              {editingId !== null
                ? "Edit Note"
                : "Create a New Note"}
            </h2>

            <form onSubmit={saveNote} className="space-y-4">
              <input
                required
                maxLength={150}
                placeholder="Note title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-3"
              />

              <textarea
                required
                rows={5}
                placeholder="Write your private note here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-3"
              />

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {busy
                    ? "Please wait..."
                    : editingId !== null
                    ? "Update Note"
                    : "Save Note"}
                </button>

                {editingId !== null && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded-lg bg-slate-200 px-5 py-3"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>

          <section>
            <h2 className="mb-5 text-2xl font-bold">
              Your Notes ({notes.length})
            </h2>

            {notesLoading ? (
              <p>Loading notes...</p>
            ) : notes.length === 0 ? (
              <div className="rounded-xl bg-white p-10 text-center shadow">
                No notes yet. Create your first note!
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {notes.map((note) => (
                  <article
                    key={note.id}
                    className="rounded-xl bg-white p-6 shadow"
                  >
                    <h3 className="mb-2 break-words text-xl font-bold">
                      {note.title}
                    </h3>

                    <p className="whitespace-pre-wrap break-words text-slate-600">
                      {note.content}
                    </p>

                    <p className="mt-4 text-xs text-slate-400">
                      {new Date(note.created_at).toLocaleString()}
                    </p>

                    <div className="mt-5 flex gap-3">
                      <button
                        onClick={() => editNote(note)}
                        disabled={busy}
                        className="rounded-lg bg-amber-500 px-4 py-2 text-white disabled:opacity-50"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => deleteNote(note.id)}
                        disabled={busy}
                        className="rounded-lg bg-red-500 px-4 py-2 text-white disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mb-3 text-5xl">📝</div>

          <h1 className="text-3xl font-bold text-slate-900">
            Personal Notes
          </h1>

          <p className="mt-2 text-slate-500">
            Your thoughts, securely stored.
          </p>
        </div>

        <h2 className="mb-5 text-xl font-semibold">
          {mode === "login"
            ? "Welcome back"
            : "Create an account"}
        </h2>

        {message && (
          <p role="status" className="mb-4 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-700">
            {message}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Email address
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Password
            </label>

            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-lg border border-slate-300 px-4 py-3"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white disabled:opacity-50"
          >
            {busy
              ? "Please wait..."
              : mode === "login"
              ? "Login"
              : "Register"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          {mode === "login"
            ? "Don't have an account?"
            : "Already have an account?"}

          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setMessage("");
            }}
            className="ml-2 font-semibold text-indigo-600"
          >
            {mode === "login" ? "Register" : "Login"}
          </button>
        </p>
      </div>
    </main>
  );
}


import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function NotesDashboard({ session, onLogout }) {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const userId = session.user.id;

  useEffect(() => {
    let active = true;

    async function loadNotes() {
      setLoading(true);
      const { data, error } = await supabase
        .from("notes")
        .select("id, title, content, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (active) {
        if (error) setErrorMessage(error.message);
        else setNotes(data || []);
        setLoading(false);
      }
    }

    loadNotes();
    return () => { active = false; };
  }, [userId]);

  async function refreshNotes() {
    const { data, error } = await supabase
      .from("notes")
      .select("id, title, content, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    setNotes(data || []);
  }

  async function saveNote(e) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setBusy(true);
    setErrorMessage("");

    try {
      if (editingId) {
        const { error } = await supabase
          .from("notes")
          .update({
            title: title.trim(),
            content: content.trim(),
          })
          .eq("id", editingId)
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("notes")
          .insert({
            title: title.trim(),
            content: content.trim(),
            user_id: userId,
          });

        if (error) throw error;
      }

      await refreshNotes();
      setTitle("");
      setContent("");
      setEditingId(null);
    } catch (error) {
      setErrorMessage(error.message);
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

  async function deleteNote(id) {
    if (!window.confirm("Delete this note permanently?")) return;

    setBusy(true);
    setErrorMessage("");

    try {
      const { error } = await supabase
        .from("notes")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) throw error;
      await refreshNotes();

      if (editingId === id) cancelEdit();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setTitle("");
    setContent("");
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              📝 My Private Notes
            </h1>
            <p className="mt-2 text-slate-500">
              Signed in as {session.user.email}
            </p>
          </div>
          <button
            onClick={onLogout}
            className="rounded-lg bg-red-500 px-5 py-2 text-white hover:bg-red-600"
          >
            Logout
          </button>
        </header>

        {errorMessage && (
          <p role="alert" className="mb-5 rounded-lg bg-red-100 p-4 text-red-700">
            {errorMessage}
          </p>
        )}

        <section className="mb-8 rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-5 text-xl font-bold">
            {editingId ? "Edit Note" : "Create a New Note"}
          </h2>

          <form onSubmit={saveNote} className="space-y-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title"
              maxLength={150}
              required
              className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-indigo-500"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your private note here..."
              rows={5}
              required
              className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-indigo-500"
            />
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {busy ? "Saving..." : editingId ? "Update Note" : "Save Note"}
              </button>

              {editingId && (
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
          <h2 className="mb-5 text-2xl font-bold text-slate-900">
            Your Notes ({notes.length})
          </h2>

          {loading ? (
            <p>Loading notes...</p>
          ) : notes.length === 0 ? (
            <div className="rounded-xl bg-white p-10 text-center text-slate-500 shadow">
              No notes yet. Create your first note above!
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {notes.map((note) => (
                <article
                  key={note.id}
                  className="rounded-xl bg-white p-6 shadow"
                >
                  <h3 className="mb-2 text-xl font-bold">
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

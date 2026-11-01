"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { Download, FileText, Flame, Heart, Search } from "lucide-react";

import { db } from "@/firebase/firebase";
import type { Note } from "@/types/note";
import LoadingSpinner from "@/components/LoadingSpinner";

type NoteWithStats = Note & {
  likesCount: number;
  trendScore: number;
};

export default function TrendingNotesPage() {
  const [notes, setNotes] = useState<NoteWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [topicFilter, setTopicFilter] = useState("");

  useEffect(() => {
    async function fetchTrendingNotes() {
      try {
        const notesSnap = await getDocs(collection(db, "notes"));
        const likesSnap = await getDocs(collection(db, "likes"));

        const likesMap: Record<string, number> = {};

        likesSnap.docs.forEach((likeDoc) => {
          const data = likeDoc.data();
          const noteId = data.noteId;

          if (noteId) {
            likesMap[noteId] = (likesMap[noteId] || 0) + 1;
          }
        });

        const approvedNotes: NoteWithStats[] = notesSnap.docs
          .map((noteDoc) => {
            const note = {
              id: noteDoc.id,
              ...(noteDoc.data() as Omit<Note, "id">),
            };

            const likesCount = likesMap[noteDoc.id] || 0;
            const downloadsCount = note.downloadsCount ?? 0;

            return {
              ...note,
              likesCount,
              trendScore: likesCount * 3 + downloadsCount,
            };
          })
          .filter((note) => note.status === "approved")
          .sort((a, b) => b.trendScore - a.trendScore);

        setNotes(approvedNotes);
      } catch (err) {
        console.error("TRENDING FETCH ERROR:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchTrendingNotes();
  }, []);

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const matchesSearch = search
        ? note.title.toLowerCase().includes(search.toLowerCase()) ||
          note.description?.toLowerCase().includes(search.toLowerCase()) ||
          note.subject.toLowerCase().includes(search.toLowerCase()) ||
          note.topic.toLowerCase().includes(search.toLowerCase())
        : true;

      const matchesClass = classFilter
        ? note.class.toLowerCase().includes(classFilter.toLowerCase())
        : true;

      const matchesSubject = subjectFilter
        ? note.subject.toLowerCase().includes(subjectFilter.toLowerCase())
        : true;

      const matchesTopic = topicFilter
        ? note.topic.toLowerCase().includes(topicFilter.toLowerCase())
        : true;

      return matchesSearch && matchesClass && matchesSubject && matchesTopic;
    });
  }, [notes, search, classFilter, subjectFilter, topicFilter]);

  if (loading) return <LoadingSpinner />;

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="border-b border-white/10 bg-zinc-950 py-14">
        <div className="container-max">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-400">
            <Flame size={16} />
            Trending Notes
          </div>

          <h1 className="mt-6 text-5xl font-black">
            Most Popular
            <span className="block text-red-500">Study Notes</span>
          </h1>

          <p className="mt-5 max-w-2xl text-white/60">
            Discover notes ranked by likes and downloads from the Edukrate
            community.
          </p>

          <div className="mt-10 grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 md:grid-cols-4">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
              />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes..."
                className="w-full rounded-2xl border border-white/10 bg-black px-11 py-3 outline-none focus:border-red-500"
              />
            </div>

            <input
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              placeholder="Class"
              className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-red-500"
            />

            <input
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              placeholder="Subject"
              className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-red-500"
            />

            <input
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              placeholder="Topic"
              className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-red-500"
            />
          </div>
        </div>
      </section>

      <section className="container-max py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black">Trending Results</h2>
            <p className="mt-1 text-sm text-white/50">
              {filteredNotes.length} notes found
            </p>
          </div>
        </div>

        {filteredNotes.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <FileText className="mx-auto text-white/30" size={54} />
            <h3 className="mt-5 text-2xl font-bold">No notes found</h3>
            <p className="mt-2 text-white/50">
              Try changing filters or search keywords.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredNotes.map((note, index) => (
              <Link
                key={note.id}
                href={`/notes/${note.id}`}
                className="group overflow-hidden rounded-3xl border border-white/10 bg-white/5 transition hover:-translate-y-1 hover:border-red-500/30"
              >
                <div className="relative h-56 overflow-hidden bg-zinc-950">
                  {note.thumbnailUrl ? (
                    <img
                      src={note.thumbnailUrl}
                      alt={note.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <FileText className="text-red-500" size={54} />
                    </div>
                  )}

                  <div className="absolute left-4 top-4 rounded-full bg-red-600 px-3 py-1 text-xs font-bold">
                    #{index + 1}
                  </div>
                </div>

                <div className="p-6">
                  <div className="mb-3 inline-flex rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs text-red-400">
                    {note.subject}
                  </div>

                  <h3 className="line-clamp-2 text-xl font-bold transition group-hover:text-red-400">
                    {note.title}
                  </h3>

                  <p className="mt-3 line-clamp-2 text-sm text-white/55">
                    {note.description || "No description provided."}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/60">
                      Class {note.class}
                    </span>

                    <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/60">
                      {note.topic}
                    </span>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-sm text-white/50">
                    <span className="flex items-center gap-2">
                      <Heart size={16} />
                      {note.likesCount}
                    </span>

                    <span className="flex items-center gap-2">
                      <Download size={16} />
                      {note.downloadsCount ?? 0}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
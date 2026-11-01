
"use client";

import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import {
  Bug,
  CheckCircle2,
  Lightbulb,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  User,
  WandSparkles,
  ArrowRight,
} from "lucide-react";

import { db } from "@/firebase/firebase";

export default function FeedbackPage() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("suggestion");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!message.trim()) {
      toast.error("Please write your feedback message.");
      return;
    }

    setLoading(true);

    try {
      await addDoc(collection(db, "feedback"), {
        name: name.trim() || "Anonymous",
        type,
        message: message.trim(),
        createdAt: serverTimestamp(),
      });

      toast.success("Feedback submitted successfully!");

      setName("");
      setMessage("");
      setType("suggestion");
    } catch (err: unknown) {
      console.error("FEEDBACK ERROR:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to send feedback."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="w-full min-w-0 space-y-7 overflow-x-hidden px-1 py-5 pb-28 sm:px-2 lg:px-3 md:pb-10"
      style={{
        background: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-[2rem] border p-5 sm:p-7 lg:p-9"
        style={{
          borderColor: "var(--border)",
          background:
            "linear-gradient(125deg, color-mix(in srgb, var(--primary) 10%, var(--panel)), var(--panel) 65%, var(--card))",
        }}
      >
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-red-600/10 blur-[90px]" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-red-500/[0.07] blur-[90px]" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 px-3.5 py-2 text-xs font-black text-red-500">
              <Sparkles size={15} />
              COMMUNITY FEEDBACK
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              Help Us <span className="text-red-500">Improve</span>
            </h1>

            <p
              className="mt-3 max-w-2xl text-sm leading-7 sm:text-base"
              style={{ color: "var(--muted)" }}
            >
              Have an idea, found a bug, or want something improved? Share
              your thoughts and help make Edukrate a better learning
              platform.
            </p>

            <div
              className="mt-6 flex flex-wrap items-center gap-3 text-xs font-bold"
              style={{ color: "var(--muted)" }}
            >
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Your voice matters
              </span>
              <span className="h-1 w-1 rounded-full bg-current opacity-40" />
              <span>Ideas welcome</span>
            </div>
          </div>

          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.7rem] border border-red-500/20 bg-red-500/10 text-red-500 lg:h-24 lg:w-24">
            <MessageSquare size={42} />
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.7fr)]">
        {/* Feedback form */}
        <div
          className="min-w-0 overflow-hidden rounded-[1.8rem] border"
          style={{
            borderColor: "var(--border)",
            background: "var(--card)",
          }}
        >
          <div
            className="border-b p-5 sm:p-7"
            style={{
              borderColor: "var(--border)",
              background: "var(--card-soft)",
            }}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-500">
                <MessageSquare size={25} />
              </div>

              <div className="min-w-0">
                <h2 className="text-xl font-black sm:text-2xl">
                  Send Your Feedback
                </h2>
                <p
                  className="mt-1 text-sm leading-6"
                  style={{ color: "var(--muted)" }}
                >
                  Tell us what you think. Every submission helps us improve.
                </p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-6 p-5 sm:p-7 lg:p-8"
          >
            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="mb-2.5 block text-sm font-bold"
                style={{ color: "var(--muted-strong)" }}
              >
                Your Name
                <span
                  className="ml-2 text-xs font-medium"
                  style={{ color: "var(--muted)" }}
                >
                  Optional
                </span>
              </label>

              <div className="relative">
                <User
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--muted)" }}
                />

                <input
                  id="name"
                  name="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter your name"
                  className="w-full rounded-2xl border py-4 pl-12 pr-4 text-sm font-medium outline-none transition focus:border-red-500/60"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--input-background)",
                    color: "var(--foreground)",
                  }}
                />
              </div>
            </div>

            {/* Feedback type */}
            <div>
              <label
                htmlFor="type"
                className="mb-2.5 block text-sm font-bold"
                style={{ color: "var(--muted-strong)" }}
              >
                Feedback Category
              </label>

              <div className="relative">
                <select
                  id="type"
                  name="type"
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                  className="w-full appearance-none rounded-2xl border px-5 py-4 pr-12 text-sm font-semibold outline-none transition focus:border-red-500/60"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--input-background)",
                    color: "var(--foreground)",
                  }}
                >
                  <option value="suggestion">Suggestion</option>
                  <option value="bug">Bug Report</option>
                  <option value="feature">Feature Request</option>
                  <option value="design">Design Improvement</option>
                  <option value="other">Other</option>
                </select>

                <Sparkles
                  size={17}
                  className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--muted)" }}
                />
              </div>

              <p
                className="mt-2 text-xs"
                style={{ color: "var(--muted)" }}
              >
                Choose the category that best describes your feedback.
              </p>
            </div>

            {/* Message */}
            <div>
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <label
                  htmlFor="message"
                  className="text-sm font-bold"
                  style={{ color: "var(--muted-strong)" }}
                >
                  Your Message <span className="text-red-500">*</span>
                </label>

                <span
                  className="text-[11px] font-medium"
                  style={{ color: "var(--muted)" }}
                >
                  {message.length} characters
                </span>
              </div>

              <textarea
                id="message"
                name="message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Describe your suggestion, problem, or idea in detail..."
                rows={8}
                required
                className="min-h-[200px] w-full resize-y rounded-2xl border px-5 py-4 text-sm leading-7 outline-none transition placeholder:opacity-50 focus:border-red-500/60"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--input-background)",
                  color: "var(--foreground)",
                }}
              />

              <p
                className="mt-2 text-xs"
                style={{ color: "var(--muted)" }}
              >
                Please provide enough detail to help us understand your feedback.
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !message.trim()}
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-2xl bg-red-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-red-950/20 transition hover:-translate-y-0.5 hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
            >
              {loading ? (
                <Loader2 size={19} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
              {loading ? "Submitting Feedback..." : "Submit Feedback"}
              {!loading && <ArrowRight size={16} />}
            </button>

            <p
              className="text-center text-xs leading-5"
              style={{ color: "var(--muted)" }}
            >
              Thank you for helping make Edukrate better.
            </p>
          </form>
        </div>

        {/* Information cards */}
        <aside className="flex min-w-0 flex-col gap-4">
          <div className="mb-1">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-500">
              What You Can Share
            </p>
            <h2 className="mt-2 text-2xl font-black">
              Your ideas matter.
            </h2>
            <p
              className="mt-2 text-sm leading-6"
              style={{ color: "var(--muted)" }}
            >
              Here are a few ways you can help improve the platform.
            </p>
          </div>

          <InfoCard
            icon={<Lightbulb size={23} />}
            number="01"
            title="Suggest Ideas"
            description="Recommend features and tools that could make studying and learning easier."
          />

          <InfoCard
            icon={<Bug size={23} />}
            number="02"
            title="Report Problems"
            description="Found something broken? Share what happened so the issue can be investigated."
          />

          <InfoCard
            icon={<WandSparkles size={23} />}
            number="03"
            title="Improve Experience"
            description="Suggest improvements to the interface, uploads, search, performance, or note viewing."
          />

          <div
            className="mt-auto rounded-[1.7rem] border border-emerald-500/20 p-5"
            style={{
              background:
                "color-mix(in srgb, var(--success) 6%, var(--card))",
            }}
          >
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={19} />
              <p className="text-sm font-black">
                Thanks for contributing!
              </p>
            </div>
            <p
              className="mt-2 text-xs leading-6"
              style={{ color: "var(--muted)" }}
            >
              Your feedback helps us make Edukrate more useful for the
              entire student community.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}

function InfoCard({
  icon,
  number,
  title,
  description,
}: {
  icon: React.ReactNode;
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div
      className="group rounded-[1.6rem] border p-5 transition duration-300 hover:border-red-500/30 sm:p-6"
      style={{
        borderColor: "var(--border)",
        background: "var(--card)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-500 transition group-hover:bg-red-500/15">
          {icon}
        </div>

        <span
          className="text-xs font-black tracking-widest"
          style={{ color: "var(--muted)" }}
        >
          {number}
        </span>
      </div>

      <h3 className="mt-5 text-lg font-black">{title}</h3>

      <p
        className="mt-2 text-sm leading-6"
        style={{ color: "var(--muted)" }}
      >
        {description}
      </p>
    </div>
  );
}

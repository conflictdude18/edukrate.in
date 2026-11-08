
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Timestamp } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import type { Note } from "@/types/note";
import NoteDetailsClient from "./NoteDetailsClient";

const SITE_URL = "https://edukrate.in";

export const runtime = "nodejs";

// Convert Firestore values into serializable values for Client Components.
function serializeFirestoreValue(value: unknown): unknown {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(serializeFirestoreValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        serializeFirestoreValue(item),
      ])
    );
  }

  return value;
}

// Shared server-side fetch for metadata and page rendering.
const getNote = cache(async (id: string): Promise<Note | null> => {
  try {
    const snapshot = await adminDb.collection("notes").doc(id).get();

    if (!snapshot.exists) return null;

    const data = serializeFirestoreValue(snapshot.data()) as Omit<
      Note,
      "id"
    >;

    return {
      ...data,
      id: snapshot.id,
    };
  } catch (error) {
    console.error("SERVER NOTE FETCH ERROR:", error);
    return null;
  }
});

function getDescription(note: Note): string {
  const description =
    note.description?.trim() ||
    `${note.subject || "Study"} notes for Class ${note.class || "students"}. Explore educational resources on Edukrate.`;

  return description.replace(/\s+/g, " ").slice(0, 300);
}

function getImage(note: Note): string {
  if (note.thumbnailUrl) {
    try {
      const url = new URL(note.thumbnailUrl);

      if (url.protocol === "https:" || url.protocol === "http:") {
        return url.toString();
      }
    } catch {
      // Fall back to the default image.
    }
  }

  return `${SITE_URL}/og-image.png`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const note = await getNote(id);

  if (!note || note.status !== "approved") {
    return {
      title: "Study Note | Edukrate",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  // Root layout should append "| Edukrate" through its title template.
  const title = note.title || "Study Notes";
  const description = getDescription(note);
  const canonical = `${SITE_URL}/notes/${encodeURIComponent(id)}`;
  const image = getImage(note);

  const keywords = [
    ...(note.tags || []),
    ...(note.keywords || []),
    note.subject,
    note.class ? `Class ${note.class}` : undefined,
    note.topic,
    note.board,
    "Edukrate",
    "Study Notes",
  ].filter((value): value is string => Boolean(value?.trim()));

  return {
    title,
    description,
    keywords: [...new Set(keywords)],

    alternates: {
      canonical,
    },

    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Edukrate",
      type: "article",
      locale: "en_IN",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: note.title || "Edukrate Study Notes",
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },

    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
      },
    },
  };
}

export default async function NoteDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const note = await getNote(id);

  // Only approved notes are publicly rendered.
  if (!note || note.status !== "approved") {
    notFound();
  }

  return <NoteDetailsClient id={id} initialNote={note} />;
}

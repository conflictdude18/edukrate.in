"use client";

import { useState } from "react";

export default function AdminVideos() {
  const [loading, setLoading] =
    useState(false);

  const [result, setResult] =
    useState<any>(null);

  async function syncVideos() {
    setLoading(true);

    const res = await fetch(
      "/api/admin/videos/sync-all"
    );

    const data =
      await res.json();

    setResult(data);

    setLoading(false);
  }

  return (
    <div className="p-6">
      <button
        onClick={syncVideos}
        className="bg-red-600 text-white px-5 py-3 rounded"
      >
        {loading
          ? "Syncing..."
          : "Sync Videos"}
      </button>

      {result && (
        <pre className="mt-4">
          {JSON.stringify(
            result,
            null,
            2
          )}
        </pre>
      )}
    </div>
  );
}
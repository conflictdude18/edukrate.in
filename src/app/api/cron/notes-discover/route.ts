import { NextRequest, NextResponse } from "next/server";
import { enqueuePdf } from "@/lib/notes-import/queue";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const QUERIES = [
  "Class 12 physics notes PDF",
  "Class 12 chemistry notes PDF",
  "Class 12 mathematics notes PDF",
  "Class 12 biology notes PDF",
  "Class 11 physics notes PDF",
  "Class 11 chemistry notes PDF",
  "Class 11 mathematics notes PDF",
  "Class 11 biology notes PDF",
  "Class 12 CBSE notes PDF",
  "Class 11 CBSE notes PDF",
  "Class 12 NCERT notes PDF",
  "Class 11 NCERT notes PDF",
];

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  return (
    !!secret &&
    request.headers.get("authorization") === `Bearer ${secret}`
  );
}

function isPdfCandidate(item: {
  url?: string;
  title?: string;
  content?: string;
}) {
  const url = item.url || "";
  const title = item.title || "";
  const content = item.content || "";

  return (
    /\.pdf(?:$|[?#])/i.test(url) ||
    /application\/pdf/i.test(content) ||
    /\bpdf\b/i.test(title)
  );
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "TAVILY_API_KEY is missing" },
      { status: 500 }
    );
  }

  let discovered = 0;
  let queued = 0;
  const errors: string[] = [];

  const selectedQueries = QUERIES.slice(0, 3);

  for (const query of selectedQueries) {
    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          max_results: 8,
          search_depth: "basic",
          include_raw_content: false,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`Tavily returned ${response.status}`);
      }

      const data = await response.json();
      const results = Array.isArray(data.results) ? data.results : [];

      for (const item of results) {
        if (!isPdfCandidate(item)) continue;

        discovered++;

        const url = item.url?.trim();
        if (!url) continue;

        try {
          const parsed = new URL(url);

          if (!["http:", "https:"].includes(parsed.protocol)) continue;
          if (parsed.username || parsed.password) continue;

          await enqueuePdf(url, item.title || "Imported notes");
          queued++;
        } catch {
          // Skip malformed URLs.
        }
      }
    } catch (error) {
      errors.push(
        error instanceof Error ? error.message : "Search failed"
      );
    }
  }

  return NextResponse.json({
    success: true,
    discovered,
    queued,
    errors,
  });
}
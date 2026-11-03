import { NextRequest, NextResponse } from "next/server";
import { enqueuePdf } from "@/lib/notes-import/queue";

export const runtime = "nodejs";
export const maxDuration = 60;

const SEARCH_QUERIES = [
  "Class 12 Physics notes PDF CBSE",
  "Class 12 Chemistry notes PDF CBSE",
  "Class 12 Mathematics notes PDF CBSE",
  "Class 12 Biology notes PDF CBSE",
  "Class 12 English notes PDF CBSE",
  "Class 12 Accountancy notes PDF CBSE",
  "Class 12 Economics notes PDF CBSE",
  "Class 12 Business Studies notes PDF CBSE",
  "Class 12 Computer Science notes PDF CBSE",
  "Class 12 Informatics Practices notes PDF CBSE",
  "Class 12 Political Science notes PDF CBSE",
  "Class 12 History notes PDF CBSE",
];

function isPdfCandidate(url: string, title: string) {
  const lowerUrl = url.toLowerCase();
  const lowerTitle = title.toLowerCase();

  return (
    lowerUrl.endsWith(".pdf") ||
    lowerUrl.includes(".pdf?") ||
    lowerTitle.includes("pdf")
  );
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (
    !cronSecret ||
    authHeader !== `Bearer ${cronSecret}`
  ) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const tavilyKey = process.env.TAVILY_API_KEY;

  if (!tavilyKey) {
    return NextResponse.json(
      { error: "TAVILY_API_KEY is not configured" },
      { status: 500 }
    );
  }

  let discovered = 0;
  let queued = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Three searches per run to keep execution within the Hobby limit.
  const queries = SEARCH_QUERIES.slice(0, 3);

  for (const query of queries) {
    try {
      const response = await fetch(
        "https://api.tavily.com/search",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            api_key: tavilyKey,
            query,
            search_depth: "basic",
            max_results: 8,
            include_raw_content: false,
          }),
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(`Tavily returned ${response.status}`);
      }

      const data = await response.json();

      for (const result of data.results ?? []) {
        const url = String(result.url ?? "").trim();
        const title = String(result.title ?? "Study Notes").trim();

        if (!url || !isPdfCandidate(url, title)) {
          skipped++;
          continue;
        }

        try {
          const parsedUrl = new URL(url);

          if (
            parsedUrl.protocol !== "https:" &&
            parsedUrl.protocol !== "http:"
          ) {
            skipped++;
            continue;
          }

          discovered++;
          await enqueuePdf(url, title);
          queued++;
        } catch {
          skipped++;
        }
      }
    } catch (error) {
      errors.push(
        error instanceof Error
          ? error.message
          : "Unknown discovery error"
      );
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    queriesRun: queries.length,
    discovered,
    queued,
    skipped,
    errors,
  });
}

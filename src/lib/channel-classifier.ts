
const CHANNEL_POSITIVE_KEYWORDS = [
  "jee",
  "neet",
  "cbse",
  "ncert",
  "class 9",
  "class 10",
  "class 11",
  "class 12",
  "physics",
  "chemistry",
  "biology",
  "mathematics",
  "maths",
  "education",
  "tutorial",
  "academy",
  "foundation",
  "study",
];

const CHANNEL_NEGATIVE_KEYWORDS = [
  "vlog",
  "gaming",
  "prank",
  "roast",
  "podcast",
  "motivation",
  "entertainment",
  "comedy",
  "news",
  "movie",
  "shorts",
];

const VIDEO_POSITIVE_KEYWORDS = [
  "jee",
  "neet",
  "cbse",
  "ncert",
  "class 9",
  "class 10",
  "class 11",
  "class 12",
  "physics",
  "chemistry",
  "biology",
  "mathematics",
  "maths",
  "lecture",
  "tutorial",
  "chapter",
  "one shot",
  "revision",
  "concept",
  "numerical",
  "derivation",
  "question paper",
  "sample paper",
  "mock test",
  "study",
  "syllabus",
  "solution",
  "solved",
  "notes",
  "explanation",
  "complete details",
  "exam preparation",
  "previous year question",
  "pyq",
  "practice questions",
  "important questions",
  "formula",
  "experiment",
  "theorem",
  "worksheet",
  "answer key",
];

const VIDEO_NEGATIVE_KEYWORDS = [
  "meme",
  "memes",
  "prank",
  "roast",
  "gaming",
  "gameplay",
  "vlog",
  "office tour",
  "salary",
  "reaction",
  "comedy",
  "funny moments",
  "funny video",
  "parody",
  "skit",
  "couple goals",
  "relationship goals",
  "dance challenge",
  "movie trailer",
  "movie review",
  "celebrity gossip",
  "daily routine",
  "day in my life",
];

const EDUCATIONAL_FORMAT_KEYWORDS = [
  "lecture",
  "tutorial",
  "chapter",
  "one shot",
  "revision",
  "concept",
  "numerical",
  "derivation",
  "question paper",
  "sample paper",
  "mock test",
  "syllabus",
  "solution",
  "solved",
  "notes",
  "explanation",
  "complete details",
  "exam preparation",
  "previous year question",
  "pyq",
  "practice questions",
  "important questions",
  "formula",
  "experiment",
  "theorem",
  "worksheet",
  "answer key",
  "how to solve",
  "how it works",
  "class",
  "chapter-wise",
];

export function classifyChannel(
  title: string,
  description: string
): boolean {
  const text = `${title} ${description}`.toLowerCase();

  const positiveScore = CHANNEL_POSITIVE_KEYWORDS.filter(
    (keyword) => text.includes(keyword)
  ).length;

  const negativeScore = CHANNEL_NEGATIVE_KEYWORDS.filter(
    (keyword) => text.includes(keyword)
  ).length;

  return positiveScore >= 2 && negativeScore === 0;
}

export function classifyVideo(
  title: string,
  description = ""
): boolean {
  // Use the title for the main decision.
  // Descriptions often contain unrelated hashtags and keywords.
  const titleText = title.toLowerCase();
  const combinedText = `${title} ${description}`.toLowerCase();

  // Reject obvious entertainment and meme titles.
  const hasNegativeKeyword = VIDEO_NEGATIVE_KEYWORDS.some(
    (keyword) => titleText.includes(keyword)
  );

  if (hasNegativeKeyword) {
    return false;
  }

  // Require an educational format or a clear lesson/exam signal.
  const hasEducationalFormat = EDUCATIONAL_FORMAT_KEYWORDS.some(
    (keyword) => titleText.includes(keyword)
  );

  if (!hasEducationalFormat) {
    return false;
  }

  // The title must also indicate a relevant academic topic.
  const hasAcademicKeyword = VIDEO_POSITIVE_KEYWORDS.some(
    (keyword) => titleText.includes(keyword)
  );

  if (!hasAcademicKeyword) {
    return false;
  }

  // Avoid accepting titles that only mention an exam in passing.
  // The educational format and academic topic must both be in the title.
  return combinedText.length > 0;
}
const POSITIVE_KEYWORDS = [
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
  "maths",
  "mathematics",

  "lecture",
  "one shot",
  "revision",
  "chapter",

  "board exam",
  "question paper",

  "mock test",
  "sample paper",

  "numerical",
  "concept",

  "education",
  "tutorial",
  "study",
];

const NEGATIVE_KEYWORDS = [
  "vlog",
  "office tour",
  "salary",

  "podcast",
  "roast",

  "prank",
  "gaming",

  "movie",
  "trailer",

  "comedy",
  "funny",

  "reaction",

  "shorts",

  "behind the scenes",

  "challenge",

  "motivation",
];

export function classifyVideo(
  title: string,
  description = ""
): boolean {
  const text =
    `${title} ${description}`.toLowerCase();

  const positive =
    POSITIVE_KEYWORDS.filter(word =>
      text.includes(word)
    ).length;

  const negative =
    NEGATIVE_KEYWORDS.filter(word =>
      text.includes(word)
    ).length;

  return (
    positive >= 1 &&
    negative === 0
  );
}
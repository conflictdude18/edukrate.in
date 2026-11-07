export type AchievementId =
  | "first_upload"
  | "approved_5"
  | "approved_10"
  | "downloads_100"
  | "views_500"
  | "likes_50"
  | "trusted_creator";

export type Achievement = {
  id: AchievementId;
  title: string;
  description: string;
  emoji: string;
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_upload",
    title: "First Upload",
    description: "Uploaded your first note.",
    emoji: "🚀",
  },
  {
    id: "approved_5",
    title: "Rising Creator",
    description: "Got 5 notes approved.",
    emoji: "🌱",
  },
  {
    id: "approved_10",
    title: "Consistent Creator",
    description: "Got 10 notes approved.",
    emoji: "🔥",
  },
  {
    id: "downloads_100",
    title: "Helpful Notes",
    description: "Reached 100 total downloads.",
    emoji: "📥",
  },
  {
    id: "views_500",
    title: "Popular Creator",
    description: "Reached 500 total views.",
    emoji: "👀",
  },
  {
    id: "likes_50",
    title: "Loved by Students",
    description: "Reached 50 total likes.",
    emoji: "❤️",
  },
  {
    id: "trusted_creator",
    title: "Trusted Creator",
    description: "A reliable contributor on Edukrate.",
    emoji: "🏅",
  },
];

export function getAchievementById(id: string) {
  return ACHIEVEMENTS.find((achievement) => achievement.id === id);
}
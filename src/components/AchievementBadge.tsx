
import { getAchievementById } from "@/lib/achievements";

export default function AchievementBadge({ id }: { id: string }) {
  const achievement = getAchievementById(id);

  if (!achievement) return null;

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs font-bold text-[var(--foreground)] shadow-sm transition duration-200 hover:border-red-500/40 hover:bg-red-500/15">
      <span className="text-base" aria-hidden="true">
        {achievement.emoji}
      </span>
      <span>{achievement.title}</span>
    </div>
  );
}

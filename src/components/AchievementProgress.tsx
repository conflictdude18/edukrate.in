
import { ACHIEVEMENTS } from "@/lib/achievements";
import { CheckCircle2, Lock } from "lucide-react";

type AchievementStats = {
  approvedNotes?: number;
  totalDownloads?: number;
  totalViews?: number;
  totalLikes?: number;
};

type Props = {
  unlockedAchievements?: string[];
  stats?: AchievementStats;
};

function getProgress(id: string, stats: AchievementStats) {
  switch (id) {
    case "first_upload":
      return {
        current: stats.approvedNotes || 0,
        target: 1,
        label: "approved note",
      };

    case "approved_5":
      return {
        current: stats.approvedNotes || 0,
        target: 5,
        label: "approved notes",
      };

    case "approved_10":
      return {
        current: stats.approvedNotes || 0,
        target: 10,
        label: "approved notes",
      };

    case "downloads_100":
      return {
        current: stats.totalDownloads || 0,
        target: 100,
        label: "downloads",
      };

    case "views_500":
      return {
        current: stats.totalViews || 0,
        target: 500,
        label: "views",
      };

    case "likes_50":
      return {
        current: stats.totalLikes || 0,
        target: 50,
        label: "likes",
      };

    case "trusted_creator": {
      const completed =
        Number((stats.approvedNotes || 0) >= 10) +
        Number((stats.totalDownloads || 0) >= 100) +
        Number((stats.totalViews || 0) >= 500);

      return {
        current: completed,
        target: 3,
        label: "requirements",
      };
    }

    default:
      return {
        current: 0,
        target: 1,
        label: "progress",
      };
  }
}

export default function AchievementProgress({
  unlockedAchievements = [],
  stats = {},
}: Props) {
  return (
    <div className="space-y-3">
      {ACHIEVEMENTS.map((achievement) => {
        const unlocked = unlockedAchievements.includes(achievement.id);
        const progress = getProgress(achievement.id, stats);

        const safeCurrent = Math.max(
          0,
          Math.min(progress.current, progress.target)
        );

        const percent =
          progress.target > 0
            ? Math.round((safeCurrent / progress.target) * 100)
            : 0;

        return (
          <div
            key={achievement.id}
            className={`group rounded-2xl border p-4 transition duration-200 ${
              unlocked
                ? "border-green-500/20 bg-green-500/[0.04]"
                : "border-[var(--border)] bg-[var(--background)] hover:border-red-500/30 hover:bg-[var(--surface-hover)]"
            }`}
          >
            {/* Achievement information */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-xl ${
                    unlocked
                      ? "border-green-500/20 bg-green-500/10"
                      : "border-[var(--border)] bg-[var(--card-soft)]"
                  }`}
                >
                  {achievement.emoji}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-black text-[var(--foreground)]">
                    {achievement.title}
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    {achievement.description}
                  </p>
                </div>
              </div>

              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black ${
                  unlocked
                    ? "border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400"
                    : "border-[var(--border)] bg-[var(--card-soft)] text-[var(--muted)]"
                }`}
              >
                {unlocked ? (
                  <CheckCircle2 size={11} />
                ) : (
                  <Lock size={11} />
                )}
                {unlocked ? "Unlocked" : "Locked"}
              </span>
            </div>

            {/* Progress information */}
            {unlocked ? (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 px-3 py-3 text-xs font-bold text-green-600 dark:text-green-400">
                <CheckCircle2 size={16} />
                Achievement successfully unlocked
              </div>
            ) : (
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between gap-2 text-xs font-bold">
                  <span className="text-[var(--muted)]">
                    {safeCurrent.toLocaleString()} /{" "}
                    {progress.target.toLocaleString()} {progress.label}
                  </span>

                  <span className="tabular-nums text-red-500">
                    {percent}%
                  </span>
                </div>

                <div className="h-2.5 overflow-hidden rounded-full bg-[var(--card-soft)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-700"
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <p className="mt-2 text-[11px] font-medium text-[var(--muted)]">
                  {progress.target - safeCurrent > 0
                    ? `${(progress.target - safeCurrent).toLocaleString()} more ${progress.label} to go`
                    : "Goal reached"}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

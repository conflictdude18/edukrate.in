import type { CreatorBadge } from "@/types/creator";

type BadgeInput = {
  uploads: number;
  approvedUploads: number;
  totalLikes: number;
  uploadStreak: number;
  profileCompletion?: number;
};

export function getCreatorBadges(input: BadgeInput): CreatorBadge[] {
  return [
    {
      id: "first_upload",
      title: "First Upload",
      description: "Uploaded your first note.",
      unlocked: input.uploads >= 1,
    },
    {
      id: "rising_creator",
      title: "Rising Creator",
      description: "Uploaded at least 5 notes.",
      unlocked: input.approvedUploads >= 5,
    },
    {
      id: "top_contributor",
      title: "Top Contributor",
      description: "Uploaded at least 20 approved notes.",
      unlocked: input.approvedUploads >= 20,
    },
    {
      id: "streak_master",
      title: "Streak Master",
      description: "Maintained a 7-day upload streak.",
      unlocked: input.uploadStreak >= 7,
    },
    {
      id: "community_favorite",
      title: "Community Favorite",
      description: "Received 25+ likes on notes.",
      unlocked: input.totalLikes >= 25,
    },
    {
      id: "verified_creator",
      title: "Verified Creator",
      description: "Trusted Edukrate creator.",
      unlocked: input.approvedUploads >= 50 && input.totalLikes >= 100,
    },
    {
      id: "profile_complete",
      title: "Complete Profile",
      description: "Completed 100% of creator profile details.",
      unlocked: (input.profileCompletion || 0) >= 100,
    },
  ];
}
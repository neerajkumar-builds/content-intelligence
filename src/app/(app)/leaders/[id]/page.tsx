"use client";

import { useParams } from "next/navigation";
import { ProfileDetailPage } from "@/components/profiles/profile-detail";

export default function LeaderDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <ProfileDetailPage
      profileId={id}
      backUrl="/leaders"
      backLabel="Thought Leaders"
    />
  );
}

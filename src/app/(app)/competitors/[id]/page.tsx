"use client";

import { useParams } from "next/navigation";
import { ProfileDetailPage } from "@/components/profiles/profile-detail";

export default function CompetitorDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <ProfileDetailPage
      profileId={id}
      backUrl="/competitors"
      backLabel="Competitors"
    />
  );
}

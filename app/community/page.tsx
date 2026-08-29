import CommunityClient from "@/components/community/CommunityClient";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Community | AI Cheatbook",
  description:
    "Browse AI prompts shared by the AI Cheatbook community.",
  path: "/community",
});

export default function CommunityPage() {
  return <CommunityClient />;
}

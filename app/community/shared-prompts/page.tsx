import CommunityClient from "@/components/community/CommunityClient";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Shared Prompts | AI Cheatbook",
  description:
    "Browse AI prompts shared by the AI Cheatbook community.",
  path: "/community/shared-prompts",
});

export default function CommunitySharedPromptsPage() {
  return <CommunityClient />;
}

import CommunitySidebar from "@/components/community/layout/CommunitySidebar";

type SiteSidebarShellProps = {
  children: React.ReactNode;
};

/*
 * Same left nav rail as CommunityLayout (Notebook / Prompt
 * Designer / Browse Prompt Book / Stay Ahead with AI / Learn AI
 * with Community), but WITHOUT the community-specific right
 * sidebar (Community Stats, Top Contributors, Poll/Question
 * widgets) — those don't make sense outside the community feed
 * itself. Use this on other light-themed "site" pages so the
 * left nav is a persistent, site-wide fixture rather than only
 * appearing on the community feed, search, and profile pages.
 */
export default function SiteSidebarShell({
  children,
}: SiteSidebarShellProps) {
  return (
    <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8 sm:px-6">
      <CommunitySidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

import CommunityRightSidebar from "./CommunityRightSidebar";

type CommunityLayoutProps = {
  children: React.ReactNode;
};

// Skool-style page: light grey background, one feed column and
// the community right sidebar (About card, Leaderboard,
// Poll/Question widgets). Site navigation lives in the Navbar tabs.
export default function CommunityLayout({
  children,
}: CommunityLayoutProps) {
  return (
    <main className="min-h-screen bg-[#F8F7F5] px-4 py-6 text-zinc-900 home-dark:bg-[#0B0F17]">
      <div className="mx-auto flex max-w-[1100px] gap-8">
        <div className="min-w-0 flex-1">
          {children}
        </div>

        <CommunityRightSidebar />
      </div>
    </main>
  );
}

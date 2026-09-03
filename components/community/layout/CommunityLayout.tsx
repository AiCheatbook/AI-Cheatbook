import CommunityRightSidebar from "./CommunityRightSidebar";

type CommunityLayoutProps = {
  children: React.ReactNode;
};

// The left nav sidebar is now global (rendered once in the root
// app/layout.tsx, same as Navbar) — this only adds the
// community-specific right sidebar (Community Stats, Top
// Contributors, Poll/Question widgets) on top of that.
export default function CommunityLayout({
  children,
}: CommunityLayoutProps) {
  return (
    <main className="min-h-screen bg-white px-4 py-8 text-zinc-900 sm:px-6">
      <div className="mx-auto flex max-w-7xl gap-6">
        <div className="min-w-0 flex-1">
          {children}
        </div>

        <CommunityRightSidebar />
      </div>
    </main>
  );
}

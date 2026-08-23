type BadgeProps = {
  children: React.ReactNode;
};

export default function Badge({
  children,
}: BadgeProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-5 py-2 text-sm font-medium text-orange-400">
      <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
      {children}
    </div>
  );
}
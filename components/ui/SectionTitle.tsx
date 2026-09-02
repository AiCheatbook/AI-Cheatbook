type SectionTitleProps = {
  children: React.ReactNode;
};

export default function SectionTitle({
  children,
}: SectionTitleProps) {
  return (
    <h2 className="mb-10 text-4xl font-bold tracking-tight text-zinc-900">
      {children}
    </h2>
  );
}
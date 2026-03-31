export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-gradient-to-br from-muted/50 via-background to-primary/[0.04] p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage: `radial-gradient(circle at 20% 20%, hsl(var(--primary) / 12%), transparent 45%),
            radial-gradient(circle at 80% 0%, hsl(var(--primary) / 8%), transparent 40%)`,
        }}
      />
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}

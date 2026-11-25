export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-border py-12 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <span className="text-base font-bold tracking-wide text-foreground">
          IG<span className="text-primary">NI</span>S
        </span>
        <p className="text-sm text-muted-foreground">
          © 2026 IGNIS. Built for developers who think differently.
        </p>
      </div>
    </footer>
  );
}

export default function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container py-10 text-sm text-muted-foreground">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} MockInterview</p>
          <p>Respectful sessions • Clear feedback • Real hiring signal</p>
        </div>
      </div>
    </footer>
  );
}

export default function Footer() {
  return (
    <footer className="bg-cafe-white border-t border-border-warm py-4">
      <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
        <p className="text-xs text-text-muted">&copy; {new Date().getFullYear()} Order Manager. All rights reserved.</p>
        <p className="text-xs text-text-muted font-medium">Made by SHA</p>
      </div>
    </footer>
  );
}
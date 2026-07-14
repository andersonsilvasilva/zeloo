export function AppFooter() {
  return (
    <footer className="border-t border-border px-4 py-4 text-center text-xs text-text-secondary print:hidden md:px-6">
      © {new Date().getFullYear()} Zeloo. Todos os direitos reservados.
    </footer>
  );
}

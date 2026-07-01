import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer-bar shrink-0 py-3 px-6 flex items-center justify-center">
      <p className="text-xs text-tertiary text-center">
        Copyright &copy; {year}&nbsp;&nbsp;·&nbsp;&nbsp;Made with{" "}
        <span style={{ color: "#FF3B30" }}>♥</span> by{" "}
        <Link
          href="https://tanisheesh.in/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium transition-opacity hover:opacity-70"
          style={{ color: "#0A84FF" }}
        >
          Tanish Poddar
        </Link>
      </p>
    </footer>
  );
}

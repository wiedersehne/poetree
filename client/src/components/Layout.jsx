import { Link } from 'react-router-dom';
import './Layout.css';

export default function Layout({ children }) {
  return (
    <div className="layout">
      <header className="header">
        <Link to="/" className="logo">
          Poetree
        </Link>
        <nav>
          <Link to="/">Exhibition</Link>
          <Link to="/upload" className="upload-link">+ New Poem</Link>
        </nav>
      </header>
      <main className="main">{children}</main>
      <footer className="footer">
        <span>Your poems, translated, voiced, and painted.</span>
      </footer>
    </div>
  );
}

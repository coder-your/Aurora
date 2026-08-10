export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth-shell">
      <div className="auth-panel auth-panel--story">
        <div className="auth-panel__chrome" />
        <header className="auth-panel__header">
          <div className="auth-logo-mark">AURORA</div>
          <span className="auth-logo-year">EST. 2025</span>
        </header>

        <div className="auth-panel__content">
          <p className="auth-panel__kicker">Dearest gentle readers,</p>
          <h1 className="auth-panel__title">Welcome to AURORA</h1>
          <p className="auth-panel__body">For Readers &amp; Writers</p>

          <p className="auth-panel__body">
            Where stories travel centuries, from candle-lit libraries to glowing
            screens. Where readers never fade, and words simply evolve.
          </p>
          <p className="auth-panel__body">
            Build your shelf. Leave your mark. Write, read, repeat forever.
          </p>
          <p className="auth-panel__body">Readers never die. They simply turn the page.</p>
        </div>

        <footer className="auth-panel__footer">
          <span>— The Aurora Collective</span>
        </footer>
      </div>

      <div className="auth-panel auth-panel--form">
        <div className="auth-form-card">
          <div className="auth-form-card__header">
            <p className="auth-form-card__eyebrow">{subtitle}</p>
            <h2 className="auth-form-card__title">{title}</h2>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

import React, { useMemo } from "react";
import styles from "../styles/terms.module.css";

const STARS_FALLBACK =
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1800&q=80";

const applyImageFallback = (e, fallbackSrc) => {
  const img = e.currentTarget;
  if (img?.dataset?.fallbackApplied) return;
  img.dataset.fallbackApplied = "true";
  img.src = fallbackSrc;
};

const IconHandshake = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M8.5 12.5 6 10a3 3 0 0 1 0-4.2l.3-.3a3 3 0 0 1 4.2 0l1.5 1.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15.5 11.5 18 9a3 3 0 0 0 0-4.2l-.3-.3a3 3 0 0 0-4.2 0L12 6"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8.5 12.5l2.2 2.2a2.2 2.2 0 0 0 3.1 0l.4-.4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10.6 14.6 12 16a2.2 2.2 0 0 0 3.1 0l.4-.4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 16l.6.6a2.2 2.2 0 0 0 3.1 0l.6-.6"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconUserCheck = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M20 21v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M17 10l2 2 4-4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconCopyright = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path
      d="M14.5 15.5a3.5 3.5 0 1 1 0-7"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const IconBan = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path
      d="M6.3 6.3 17.7 17.7"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const IconPower = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M12 2v10"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M7 5.5a8 8 0 1 0 10 0"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconAlert = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M12 9v4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M12 17h.01"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <path
      d="M10.3 3.4 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.4a2 2 0 0 0-3.4 0Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);

const Section = ({ id, eyebrow, title, icon, children }) => (
  <section id={id} className={styles.section}>
    <div className={styles.sectionHeader}>
      <div className={styles.sectionIconWrap}>{icon}</div>
      <div>
        <div className={styles.sectionEyebrow}>{eyebrow}</div>
        <h2 className={styles.sectionTitle}>{title}</h2>
      </div>
    </div>
    <div className={styles.cardGrid}>{children}</div>
  </section>
);

const TermCard = ({ title, body, bullets }) => (
  <article className={styles.card}>
    <h3 className={styles.cardTitle}>{title}</h3>
    {body && <p className={styles.cardBody}>{body}</p>}
    {bullets && bullets.length > 0 && (
      <ul className={styles.cardList}>
        {bullets.map((b) => (
          <li key={b} className={styles.cardListItem}>
            {b}
          </li>
        ))}
      </ul>
    )}
  </article>
);

export default function Terms() {
  const quickRef = useMemo(
    () => [
      {
        title: "You Own Your Work",
        text: "Creators keep copyright. Aurora only needs a license to display and distribute stories on-platform.",
        icon: <IconCopyright className={styles.quickIcon} />,
      },
      {
        title: "Be Legit",
        text: "No illegal use, scams, spam, harassment, or malware. Accounts can be suspended without notice.",
        icon: <IconBan className={styles.quickIcon} />,
      },
      {
        title: "Use at Your Risk",
        text: "Aurora is user-generated content. We can’t guarantee accuracy or quality—read responsibly.",
        icon: <IconAlert className={styles.quickIcon} />,
      },
    ],
    []
  );

  const navItems = useMemo(
    () => [
      { href: "#acceptance", label: "Acceptance" },
      { href: "#eligibility", label: "Eligibility" },
      { href: "#ownership", label: "Ownership" },
      { href: "#conduct", label: "Conduct" },
      { href: "#termination", label: "Termination" },
      { href: "#liability", label: "Liability" },
    ],
    []
  );

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <img
          className={styles.heroImage}
          src="https://images.unsplash.com/photo-1482192596544-9eb780fc7f66?auto=format&fit=crop&w=2400&q=80"
          alt="Open book with warm lighting"
          loading="lazy"
        />
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <div className={styles.heroKicker}>Aurora</div>
          <h1 className={styles.heroTitle}>Terms of Service</h1>
          <p className={styles.heroSubtitle}>
            Clear rules help creativity thrive. These terms explain eligibility, ownership, acceptable conduct, and how we
            keep Aurora running responsibly.
          </p>
          <div className={styles.heroCredits}>Images sourced from Unsplash.</div>
        </div>
      </header>

      <section className={styles.quickRef}>
        <div className={styles.quickRefInner}>
          <div className={styles.quickRefHeader}>
            <div className={styles.quickRefEyebrow}>Quick Reference</div>
            <h2 className={styles.quickRefTitle}>A fast summary before the details</h2>
            <p className={styles.quickRefSubtitle}>
              This page is designed to be readable—scan the essentials, then dive into the clauses if you need them.
            </p>
          </div>
          <div className={styles.quickRefGrid}>
            {quickRef.map((item) => (
              <div key={item.title} className={styles.quickCard}>
                <div className={styles.quickIconWrap}>{item.icon}</div>
                <div>
                  <div className={styles.quickCardTitle}>{item.title}</div>
                  <div className={styles.quickCardText}>{item.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.content}>
        <aside className={styles.stickyNav}>
          <div className={styles.navCard}>
            <div className={styles.navTitle}>Quick Links</div>
            <nav className={styles.navList} aria-label="Terms quick links">
              {navItems.map((item) => (
                <a key={item.href} className={styles.navLink} href={item.href}>
                  {item.label}
                </a>
              ))}
            </nav>
          </div>

          <div className={styles.sideImageCard}>
            <img
              className={styles.sideImage}
              src="https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=1600&q=80"
              alt="Desk with notebook and pen"
              loading="lazy"
            />
            <div className={styles.sideImageOverlay} />
            <div className={styles.sideImageText}>Professional standards. Creative freedom.</div>
          </div>
        </aside>

        <div className={styles.sections}>
          <Section
            id="acceptance"
            eyebrow="1. Aurora Terms of Service"
            title="Acceptance of Terms"
            icon={<IconHandshake className={styles.sectionIcon} />}
          >
            <TermCard
              title="1. Acceptance"
              body="By creating an account on Aurora, you agree to follow these Terms of Service and our Community Guidelines. If you do not agree, please do not use the platform."
            />
            <TermCard
              title="Guidelines are part of the deal"
              body="The Community Guidelines explain how to participate respectfully. If you’re unsure about behavior or content, refer to the Guidelines page before posting."
            />
          </Section>

          <Section
            id="eligibility"
            eyebrow="2. Eligibility"
            title="Who can use Aurora"
            icon={<IconUserCheck className={styles.sectionIcon} />}
          >
            <TermCard
              title="Age requirements"
              body="You must be at least 13 years old to use Aurora. If you are under 18, you represent that you have the permission of a parent or guardian."
            />
            <TermCard
              title="Account integrity"
              body="Provide accurate signup information and keep your account secure. You’re responsible for activity that occurs under your account."
            />
          </Section>

          <Section
            id="ownership"
            eyebrow="3. Ownership & Rights"
            title="Intellectual Property"
            icon={<IconCopyright className={styles.sectionIcon} />}
          >
            <TermCard
              title="Your content"
              body="You retain full ownership of the copyright for any original story you post on Aurora."
            />
            <TermCard
              title="License to Aurora"
              body="By posting, you grant Aurora a non-exclusive, world-wide, royalty-free license to host, display, and distribute your content on our platform so readers can access it."
            />
            <TermCard
              title="Plagiarism"
              body="You represent that you own the rights to anything you post. Posting work that is not yours will result in a permanent ban."
            />
          </Section>

          <Section
            id="conduct"
            eyebrow="4. Prohibited Conduct"
            title="What you agree not to do"
            icon={<IconBan className={styles.sectionIcon} />}
          >
            <TermCard
              title="Prohibited conduct"
              body="You agree not to:"
              bullets={[
                "Use Aurora for any illegal purposes.",
                "Distribute spam or promotional scams.",
                "Upload viruses or malicious code.",
                "Harass, bully, or intimidate other users.",
              ]}
            />
            <TermCard
              title="Enforcement"
              body="We may remove content that violates these rules or the Community Guidelines, and we may restrict platform features to protect the community."
            />
          </Section>

          <Section
            id="termination"
            eyebrow="5. Account Termination"
            title="Suspension & termination"
            icon={<IconPower className={styles.sectionIcon} />}
          >
            <TermCard
              title="Account termination"
              body="Aurora reserves the right to suspend or terminate accounts that violate our Community Guidelines or Terms of Service at our sole discretion, without prior notice."
            />
            <TermCard
              title="Repeat violations"
              body="Serious or repeated violations—especially plagiarism, harassment, or illegal content—may result in permanent removal." 
            />
          </Section>

          <Section
            id="liability"
            eyebrow="6. Limitation of Liability"
            title="Using Aurora responsibly"
            icon={<IconAlert className={styles.sectionIcon} />}
          >
            <TermCard
              title="Limitation of liability"
              body="Aurora is a platform for user-generated content. We are not responsible for the accuracy or quality of stories posted by users. Use of the platform is at your own risk."
            />
            <TermCard
              title="Good faith"
              body="We aim to keep Aurora stable and safe, but we can’t guarantee uninterrupted access. The platform is provided on an as-available basis." 
            />
          </Section>
        </div>
      </section>

      <section className={styles.bottomBand}>
        <div className={styles.bottomInner}>
          <div className={styles.bottomCopy}>
            <h2 className={styles.bottomTitle}>Questions about these terms?</h2>
            <p className={styles.bottomText}>
              If you need clarification, contact us and we’ll point you to the relevant section.
            </p>
            <a className={styles.bottomCta} href="mailto:auroraplatform348@gmail.com">
              Email: auroraplatform348@gmail.com
            </a>
          </div>
          <div className={styles.bottomImageWrap}>
            <img
              className={styles.bottomImage}
              src="https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1800&q=80"
              alt="Night sky with stars"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={(e) => applyImageFallback(e, STARS_FALLBACK)}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

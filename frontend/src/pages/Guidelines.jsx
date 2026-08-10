import React, { useMemo } from "react";
import styles from "../styles/guidelines.module.css";

const STARS_FALLBACK =
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1800&q=80";

const applyImageFallback = (e, fallbackSrc) => {
  const img = e.currentTarget;
  if (img?.dataset?.fallbackApplied) return;
  img.dataset.fallbackApplied = "true";
  img.src = fallbackSrc;
};

const IconLightbulb = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M9 21h6"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M10 18h4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M8.5 14.5c-1.55-1.2-2.5-3.05-2.5-5.05C6 5.91 8.9 3 12.45 3c3.42 0 6.2 2.78 6.2 6.2 0 2.04-.98 3.93-2.6 5.13-.65.48-1.1 1.2-1.3 2.01L14.4 18h-3.8l-.8-1.66c-.25-.7-.7-1.34-1.3-1.84Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);

const IconQuill = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M5 19c6.5 0 12-5.5 14-14 1.5 8.5-4 14-10.5 15.5-1.1.26-2.3.37-3.5.37"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10.2 14.2 4.8 19.6"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M13 11c.3 1.7-.7 3.6-2.3 4.3"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const IconShield = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M12 2 20 5.5V12c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V5.5L12 2Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M9 12l2 2 4-5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconStack = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M12 3 3 8l9 5 9-5-9-5Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M3 12l9 5 9-5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M3 16l9 5 9-5"
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

const RuleCard = ({ title, lead, bullets }) => (
  <article className={styles.card}>
    <h3 className={styles.cardTitle}>{title}</h3>
    {lead && <p className={styles.cardLead}>{lead}</p>}
    {bullets && bullets.length > 0 && (
      <ul className={styles.cardList}>
        {bullets.map((b) => (
          <li key={b.label} className={styles.cardListItem}>
            <span className={styles.cardListLabel}>{b.label}</span>
            <span className={styles.cardListText}>{b.text}</span>
          </li>
        ))}
      </ul>
    )}
  </article>
);

export default function Guidelines() {
  const quickRef = useMemo(
    () => [
      {
        title: "Be Kind",
        text: "Support creators and readers with respectful, workshop-quality feedback.",
        icon: <IconLightbulb className={styles.quickIcon} />,
      },
      {
        title: "No Plagiarism",
        text: "Original work only. Respect intellectual property and give credit where it’s due.",
        icon: <IconQuill className={styles.quickIcon} />,
      },
      {
        title: "Keep It Safe",
        text: "Report harassment, hate speech, and harmful content so Aurora stays a safe harbor.",
        icon: <IconShield className={styles.quickIcon} />,
      },
    ],
    []
  );

  const navItems = useMemo(
    () => [
      { href: "#community", label: "Community" },
      { href: "#safety", label: "Safety" },
      { href: "#writing", label: "Writing" },
      { href: "#metadata", label: "Metadata" },
    ],
    []
  );

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <img
          className={styles.heroImage}
          src="https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?auto=format&fit=crop&w=2400&q=80"
          alt="Aurora lights across a night sky"
          loading="lazy"
        />
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <div className={styles.heroKicker}>Aurora Guidelines</div>
          <h1 className={styles.heroTitle}> Nurturing the Future of Storytelling.</h1>
          <p className={styles.heroSubtitle}>
            Welcome to Aurora. Our mission is to illuminate unique voices and foster a space where stories connect us all.
            To maintain a high-quality environment for both creators and explorers, we ask all members to follow these
            standards.
          </p>
          <div className={styles.heroCredits}>
            Images sourced from Unsplash.
          </div>
        </div>
      </header>

      <section className={styles.quickRef}>
        <div className={styles.quickRefInner}>
          <div className={styles.quickRefHeader}>
            <div className={styles.quickRefEyebrow}>Quick Reference</div>
            <h2 className={styles.quickRefTitle}>A fast, three-point promise</h2>
            
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
            <nav className={styles.navList} aria-label="Guidelines quick links">
              {navItems.map((item) => (
                <a key={item.href} className={styles.navLink} href={item.href}>
                  {item.label}
                </a>
              ))}
            </nav>
            <div className={styles.navNote}>
              Need help fast?
              <a className={styles.navEmail} href="mailto:auroraplatform348@gmail.com">
                auroraplatform348@gmail.com
              </a>
            </div>
          </div>

          <div className={styles.sideImageCard}>
            <img
              className={styles.sideImage}
              src="https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1600&q=80"
              alt="Starfield over mountains"
              loading="lazy"
            />
            <div className={styles.sideImageOverlay} />
            <div className={styles.sideImageText}>Make the space welcoming, and the stories will follow.</div>
          </div>
        </aside>

        <div className={styles.sections}>
          <Section
            id="community"
            eyebrow="I. Community"
            title="Community Guidelines"
            icon={<IconLightbulb className={styles.sectionIcon} />}
          >
            <RuleCard
              title="1. Be Constructive"
              lead="We believe every voice has the potential to shine. When providing feedback, ensure it is actionable."
              bullets={[
                { label: "Do:", text: "Offer specific advice on pacing, character arcs, or showing vs. telling." },
                { label: "Don’t:", text: "Only say ‘this is bad.’ Explain why and how the author can strengthen the scene." },
                { label: "Goal:", text: "Provide tools for fellow writers to level up." },
              ]}
            />
            <RuleCard
              title="2. Be Professional & Objective"
              lead="Storytelling is emotional, but our feedback should stay grounded."
              bullets={[
                { label: "Readers:", text: "Critique the work, not the person. Keep observations objective." },
                { label: "Writers:", text: "Treat feedback as a resource for growth. Not every story is for every reader—and that’s okay." },
                { label: "Goal:", text: "Foster continuous learning and artistic evolution." },
              ]}
            />
            <RuleCard
              title="3. Be Respectful"
              lead="Aurora is a global stage. We insist on radical respect for all members."
              bullets={[
                { label: "Golden Rule:", text: "Treat every user as you would in a professional writer’s workshop." },
                { label: "Disagreement:", text: "You can disagree with themes or opinions, but insults and condescension have no place here." },
              ]}
            />
          </Section>

          <Section
            id="safety"
            eyebrow="I. Community"
            title="Safety & Reporting"
            icon={<IconShield className={styles.sectionIcon} />}
          >
            <RuleCard
              title="4. Safety & Reporting"
              lead="To keep Aurora a safe harbor for creativity, we have a zero-tolerance policy for:"
              bullets={[
                { label: "Hate Speech:", text: "Discrimination based on race, ethnicity, religion, sexual orientation, gender identity, or disability." },
                { label: "Harassment:", text: "Bullying, stalking, or targeted toxicity." },
                { label: "Harmful Content:", text: "Promotion of self-harm, terrorism, or violence against humans or animals." },
                { label: "Illegal/Adult Content:", text: "Child exploitation, non-consensual sexual content, or graphic pornography." },
                { label: "Plagiarism:", text: "Intellectual property theft is strictly prohibited." },
              ]}
            />
            <RuleCard
              title="How to Report"
              lead="Use the Report button on any story or comment, or contact our safety team."
              bullets={[
                { label: "Email:", text: "auroraplatform348@gmail.com" },
              ]}
            />
          </Section>

          <Section
            id="writing"
            eyebrow="II. Writing & Formatting"
            title="Writing & Formatting Guidelines"
            icon={<IconQuill className={styles.sectionIcon} />}
          >
            <RuleCard
              title="1. Clean Formatting"
              lead="Keep stories app-ready so reading feels seamless."
              bullets={[
                { label: "Paragraphs:", text: "Use standard block formatting. Do not use indents or manual spaces at the start of sentences." },
                { label: "Spacing:", text: "Use a single line break between paragraphs. Avoid ‘wall of text’ formatting." },
                { label: "Scene Breaks:", text: "Use the built-in Aurora line tool rather than manual symbols." },
                { label: "Immersion:", text: "Keep story files free of author notes, social links, or external disclaimers. Use your Author Bio page instead." },
              ]}
            />
            <RuleCard
              title="2. Chapter Optimization"
              lead="Shorter chapters load faster and read better on mobile."
              bullets={[
                { label: "Recommended:", text: "1,500–4,000 words per chapter." },
                { label: "Maximum:", text: "Chapters over 10,000 words must be split." },
              ]}
            />
            <RuleCard
              title="3. Grammar & Quality"
              lead="Polish builds trust—and keeps readers immersed."
              bullets={[
                { label: "Consistency:", text: "Use US or UK English, but be consistent throughout." },
                { label: "Dialogue:", text: "Ensure punctuation is correct (e.g., “I’m heading to the Aurora gates,” she whispered.)." },
                { label: "Beta Reading:", text: "We encourage grammar checking or human beta reading before publishing." },
              ]}
            />
          </Section>

          <Section
            id="metadata"
            eyebrow="III. Settings & Metadata"
            title="Story Settings & Metadata"
            icon={<IconStack className={styles.sectionIcon} />}
          >
            <RuleCard
              title="1. Visuals & Titles"
              lead="First impressions matter."
              bullets={[
                { label: "Cover Art:", text: "At least 500×800 pixels. High-resolution, non-pixelated images perform best." },
                { label: "Titles:", text: "Keep titles concise. Don’t include your username or genre in the title field." },
              ]}
            />
            <RuleCard
              title="2. Categorization"
              lead="Help the right readers find your work."
              bullets={[
                { label: "Genres:", text: "Select up to two primary genres (Fantasy, Sci-Fi, Mystery, Romance, etc.)." },
                { label: "Status:", text: "Mark your story as Ongoing or Completed." },
                { label: "Blurb:", text: "Keep your elevator pitch under 1,400 characters and make it hook immediately." },
              ]}
            />
          </Section>
        </div>
      </section>

      <section className={styles.bottomBand}>
        <div className={styles.bottomInner}>
          <div className={styles.bottomCopy}>
            <h2 className={styles.bottomTitle}>Build the future of storytelling with us.</h2>
            <p className={styles.bottomText}>
              Aurora is at its best when feedback is thoughtful, formatting is clean, and everyone feels safe.
            </p>
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

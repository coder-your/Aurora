import React, { useState } from "react";
import { Link } from "react-router-dom";
import styles from "../styles/footer.module.css";
import api from "../services/api";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setStatus("Please enter a valid email.");
      return;
    }
    try {
      setSubmitting(true);
      setStatus("");
      await api.post("/api/subscribe-updates", { email: email.trim() });
      setStatus("You're subscribed to Aurora updates.");
      setEmail("");
    } catch (err) {
      console.error("Subscribe failed", err);
      setStatus("Subscription failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerColumn}>
          <h3 className={styles.footerHeading}>Join Us on Socials</h3>
          <p className={styles.footerText}>
            Stay connected! Follow us on our socials for updates, stories, and more.
          </p>
          <div className={styles.socialRow}>
            <button className={styles.socialBtn} aria-label="Follow on X / Twitter">
              X
            </button>
            <button className={styles.socialBtn} aria-label="Follow on Instagram">
              IG
            </button>
            <button className={styles.socialBtn} aria-label="Follow on TikTok">
              TT
            </button>
          </div>
        </div>

        <div className={styles.footerColumn}>
          <h3 className={styles.footerHeading}>About Us</h3>
          <p className={styles.footerText}>
            Aurora is a next-generation platform for readers and writers, dedicated
            to uncovering unique voices and unforgettable stories. We empower new
            authors to share their work with the world while giving readers a
            space to explore tales that inspire, move, and connect us all.
          </p>
        </div>

        <div className={styles.footerColumn}>
          <h3 className={styles.footerHeading}>Subscribe for Updates</h3>
          <p className={styles.footerText}>Enter your email to stay in the loop.</p>
          <form className={styles.subscribeForm} onSubmit={handleSubscribe}>
            <input
              type="email"
              placeholder="Enter your email"
              className={styles.emailInput}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" className={styles.subscribeBtn} disabled={submitting}>
              {submitting ? "Sending..." : "Subscribe"}
            </button>
          </form>
          {status && <p className={styles.statusText}>{status}</p>}
        </div>
      </div>

      <div className={styles.footerBottom}>
        <span className={styles.copyright}>
          ©️ 2025 Aurora. Crafted with passion. All rights reserved.
        </span>
        <div className={styles.footerLinks}>
          <Link className={styles.linkBtn} to="/guidelines">
            Guidelines
          </Link>
          <Link className={styles.linkBtn} to="/terms">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}

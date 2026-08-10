import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../styles/readerDashboard.module.css";
import * as recApi from "../services/recommendationApi";
import { getPublicMoodboards } from "../services/moodboardService";
import { getMyProfile } from "../services/profileService";
import { getLibrary } from "../services/libraryApi";
import { publicBadgesBatch } from "../services/insightsService";

import enthusiasticCuate from "../assets/Enthusiastic-cuate.svg";
import overwhelmedBro from "../assets/Overwhelmed-bro.svg";
import chaosBro from "../assets/Chaos-bro.svg";
import designProcessPana from "../assets/Design Process-pana.svg";
import amusementParkBro from "../assets/Amusement park-bro.svg";
import mysteryBoxBro from "../assets/Mystery box-bro.svg";
import hauntedHouseAmico from "../assets/Haunted house-amico.svg";
import oilLampAmico from "../assets/Oil lamp-amico.svg";


// All 20 Feed configurations matching backend
const FEED_CONFIG = {
  "mood-picks": { name: "Stories That Match Your Mood", icon: "🎭", short: "Mood Picks" },
  "emotion-feed": { name: "Your Emotional Picks Today", icon: "💝", short: "Emotion Feed" },
  "night-reads": { name: "For Quiet Late-Night Reading", icon: "🌙", short: "Night Reads" },
  "soft-reads": { name: "When You Need Something Gentle", icon: "🌸", short: "Soft Reads" },
  "unputdownable": { name: "Reads You Won't Put Down", icon: "🔥", short: "Unputdownable" },
  "quick-reads": { name: "Short Reads, Big Feelings", icon: "⚡", short: "Quick Reads" },
  "hidden-gems": { name: "Hidden Gems Worth Discovering", icon: "💎", short: "Hidden Gems" },
  "fresh-updates": { name: "Updated Just for You", icon: "✨", short: "Fresh Updates" },
  "write-alikes": { name: "Books That Match Your Writing Style", icon: "✍️", short: "Write-Alikes" },
  "story-patterns": { name: "Patterns You Love in Stories", icon: "🧩", short: "Story Patterns" },
  "vibe-match": { name: "Because You Loved the Vibe", icon: "🎯", short: "Vibe Match" },
  "intense-reads": { name: "High-Emotion, High-Drama Picks", icon: "🎭", short: "Intense Reads" },
  "cozy-corner": { name: "Calm & Comforting Reads", icon: "☕", short: "Cozy Corner" },
  "beloved-characters": { name: "Characters You'll Care About", icon: "💕", short: "Beloved Characters" },
  "literary-aesthetic": { name: "Stories Written Like Art", icon: "🎨", short: "Literary Aesthetic" },
  "your-journey": { name: "Your Personalized Reading Path", icon: "🗺️", short: "Your Journey" },
  "weekly-picks": { name: "This Week's Reader Favorites", icon: "🏆", short: "Weekly Picks" },
  "cinematic-reads": { name: "Stories That Feel Cinematic", icon: "🎬", short: "Cinematic Reads" },
  "soul-lifter": { name: "Books to Lift Your Spirit", icon: "🌈", short: "Soul Lifter" },
  "lasting-impact": { name: "Quiet Stories With a Lasting Impact", icon: "🌟", short: "Lasting Impact" },
};

// Featured feeds to show on home page (now all 20 recommendation types)
const HOME_FEEDS = Object.keys(FEED_CONFIG);

// Vector icon placeholders (replace with UnDraw SVGs later)
const STROKE = "rgba(26, 22, 18, 0.65)";
const FILL = "rgba(26, 22, 18, 0.04)";

const CATEGORY_SVG_FALLBACK = (
  <svg viewBox="0 0 64 64" width="44" height="44" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M18 14C18 12.3431 19.3431 11 21 11H43C44.6569 11 46 12.3431 46 14V48C46 49.6569 44.6569 51 43 51H21C19.3431 51 18 49.6569 18 48V14Z"
      stroke={STROKE}
      strokeWidth="2"
    />
    <path d="M22 22H42" stroke={STROKE} strokeWidth="2" strokeLinecap="round" />
    <path d="M22 30H36" stroke={STROKE} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const PLUS_SVG = (
  <svg viewBox="0 0 64 64" width="44" height="44" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M18 14C18 12.3431 19.3431 11 21 11H43C44.6569 11 46 12.3431 46 14V48C46 49.6569 44.6569 51 43 51H21C19.3431 51 18 49.6569 18 48V14Z"
      stroke={STROKE}
      strokeWidth="2"
      fill={FILL}
    />
    <path d="M32 22V42" stroke={STROKE} strokeWidth="2" strokeLinecap="round" />
    <path d="M22 32H42" stroke={STROKE} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Map categories to vector SVGs (Fluent System Icons).
// Note: these keys must match the exact category strings coming from recApi.getCategories().
const CATEGORY_SVGS = {
  Adventure: (
    <svg
      viewBox="0 0 48 48"
      width="44"
      height="44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M25.333 11.333C15.842 12.482 9.481 21.43 11.006 30.834C12.407 39.44 20.31 45.45 29.071 44.08C37.833 42.712 44.186 34.855 43.006 26.05C41.814 17.155 32.826 10.98 25.333 11.333Z"
        stroke="#8A6F48"
        strokeWidth="2"
      />
      <path
        d="M24 14L31 21L24 30L17 21L24 14Z"
        fill="#F5D77A"
        stroke="#8A6F48"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M31 21L24 30L14 34L17 21L31 21Z"
        fill="none"
        stroke="#8A6F48"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  ),

  Romance: (
    <svg
      viewBox="0 0 48 48"
      width="44"
      height="44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M24 40C24 40 6.5 29.2 6.5 17.7C6.5 12 10.6 8 15.7 8C19.1 8 21.6 9.8 23 11.5C24.4 9.8 26.9 8 30.3 8C35.4 8 39.5 12 39.5 17.7C39.5 29.2 24 40 24 40Z"
        stroke="#8A6F48"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M14 19C14 16.5 16.1 14.5 18.6 14.5C20.8 14.5 22.1 15.8 23 16.9C23.9 15.8 25.2 14.5 27.4 14.5C29.9 14.5 32 16.5 32 19C32 24 24 29.5 24 29.5C24 29.5 14 24 14 19Z"
        fill="#F5D77A"
        opacity="0.35"
      />
    </svg>
  ),

  Fantasy: (
    <svg
      viewBox="0 0 48 48"
      width="44"
      height="44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M33 7L35 15L43 17L35 19L33 27L31 19L23 17L31 15L33 7Z"
        stroke="#8A6F48"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M18 14L19.5 20L25 21.5L19.5 23L18 28.5L16.5 23L11 21.5L16.5 20L18 14Z"
        stroke="#8A6F48"
        strokeWidth="2"
        strokeLinejoin="round"
        opacity="0.9"
      />
      <path
        d="M14 33L16 39L22 41L16 43L14 49L12 43L6 41L12 39L14 33Z"
        fill="#F5D77A"
        opacity="0.25"
      />
      <path
        d="M24 14C26.2 22.7 34.7 26 43 24C35.3 29.7 28.8 37 24 44C19.2 37 12.7 29.7 5 24C13.3 26 21.8 22.7 24 14Z"
        stroke="#8A6F48"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  ),

  "Science Fiction": (
    <svg
      viewBox="0 0 48 48"
      width="44"
      height="44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6.5 24C6.5 14.611 14.111 7 23.5 7C32.889 7 40.5 14.611 40.5 24C40.5 33.389 32.889 41 23.5 41C14.111 41 6.5 33.389 6.5 24Z"
        stroke="#8A6F48"
        strokeWidth="2"
      />
      <path
        d="M23.5 17V27L31 32"
        stroke="#8A6F48"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 31L19 28"
        stroke="#8A6F48"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M27 10L28 14"
        stroke="#8A6F48"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path
        d="M37 16L34 18"
        stroke="#8A6F48"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path
        d="M30 28C28.5 30.5 26 31.5 23.5 31.5C18.8 31.5 15 27.7 15 23C15 18.3 18.8 14.5 23.5 14.5"
        stroke="#F5D77A"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.35"
      />
    </svg>
  ),

  Mystery: (
    <svg
      viewBox="0 0 48 48"
      width="44"
      height="44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M24 34C31.5 34 37.5 24 37.5 24C37.5 24 31.5 14 24 14C16.5 14 10.5 24 10.5 24C10.5 24 16.5 34 24 34Z"
        stroke="#8A6F48"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M24 27C26 27 27.5 25.5 27.5 23.5C27.5 21.5 26 20 24 20C22 20 20.5 21.5 20.5 23.5C20.5 25.5 22 27 24 27Z"
        fill="#F5D77A"
        opacity="0.35"
      />
      <path
        d="M24 27C26 27 27.5 25.5 27.5 23.5C27.5 21.5 26 20 24 20C22 20 20.5 21.5 20.5 23.5C20.5 25.5 22 27 24 27Z"
        stroke="#8A6F48"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M18 30L16 36"
        stroke="#8A6F48"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path
        d="M30 30L32 36"
        stroke="#8A6F48"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  ),

  Thriller: (
    <svg
      viewBox="0 0 48 48"
      width="44"
      height="44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 18L24 12L36 18V30L24 36L12 30V18Z"
        stroke="#8A6F48"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M24 12L18 24L24 36L30 24L24 12Z"
        fill="#F5D77A"
        opacity="0.25"
      />
      <path
        d="M18 24H30"
        stroke="#8A6F48"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M24 18V30"
        stroke="#8A6F48"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),

  Horror: (
    <svg
      viewBox="0 0 48 48"
      width="44"
      height="44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M35 26C34 34 27 41 19 41C11 41 6 35 6 27C6 19 13 12 21 12C24 12 27 13 29 15C28 16 27 18 27 20C27 23 29 25 32 25C33.3 25 34.4 25.4 35 26Z"
        stroke="#8A6F48"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M30 10C31 6 35 4 38 5C36 8 33 11 30 12V10Z"
        fill="#F5D77A"
        opacity="0.3"
      />
      <path
        d="M14 20C14 16 17 13 21 13"
        stroke="#8A6F48"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  ),

  Drama: (
    <svg
      viewBox="0 0 48 48"
      width="44"
      height="44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10 14H38C39.1 14 40 14.9 40 16V32C40 33.1 39.1 34 38 34H10C8.9 34 8 33.1 8 32V16C8 14.9 8.9 14 10 14Z"
        stroke="#8A6F48"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M8 20H40"
        stroke="#8A6F48"
        strokeWidth="2"
        opacity="0.85"
      />
      <path
        d="M16 34V36C16 37.1 16.9 38 18 38H30C31.1 38 32 37.1 32 36V34"
        stroke="#8A6F48"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M20 25L22 23L24 25L26 23L28 25"
        stroke="#F5D77A"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.45"
      />
    </svg>
  ),

  // Additional categories (Fluent System Icons)
  "Historical Fiction": (
    <svg
      viewBox="0 0 48 48"
      width="44"
      height="44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M18.7 6.7H14.2V11.2C14.2 14.3 12.2 17 9.7 19.1C12.2 21.2 14.2 23.9 14.2 27V31.5H18.7V26.3H23.9V34.2H33.4V26.3H38.6V31.5H43.1V27C43.1 23.9 45.1 21.2 47.6 19.1C45.1 17 43.1 14.3 43.1 11.2V6.7H38.6V12H33.4V3H23.9V12H18.7V6.7Z"
        stroke="#8A6F48"
        strokeWidth="2"
      />
    </svg>
  ),

  "General Fiction": (
    <svg
      viewBox="0 0 48 48"
      width="44"
      height="44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7.5 15.5C7.5 12.4624 10.0 10 13 10H35C38.0 10 40.5 12.4624 40.5 15.5V36.5H17.5C13.0 36.5 7.5 34.0 7.5 30.0V15.5Z"
        stroke="#8A6F48"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M17.5 36.5V14.5"
        stroke="#8A6F48"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M24 18H33"
        stroke="#F5D77A"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      />
      <path
        d="M24 23H30"
        stroke="#F5D77A"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  ),

  Humor: (
    <svg
      viewBox="0 0 48 48"
      width="44"
      height="44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M24 6.5C14.4 6.5 6.5 14.4 6.5 24C6.5 33.6 14.4 41.5 24 41.5C33.6 41.5 41.5 33.6 41.5 24C41.5 14.4 33.6 6.5 24 6.5Z"
        stroke="#8A6F48"
        strokeWidth="2"
      />
      <path
        d="M16.5 19.5H16.52"
        stroke="#8A6F48"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M31.5 19.5H31.52"
        stroke="#8A6F48"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M19 28C21 30 27 30 29 28"
        stroke="#F5D77A"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  ),

  Poetry: (
    <svg
      viewBox="0 0 48 48"
      width="44"
      height="44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M23 6.5C23 6.5 13 18 13 26.5C13 34 19 41.5 27.5 41.5C36 41.5 43 34 43 25.5C43 17 34.5 9 27.5 9"
        stroke="#8A6F48"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M13 26.5L26.5 13.0"
        stroke="#F5D77A"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  ),

  Paranormal: (
    <svg
      viewBox="0 0 48 48"
      width="44"
      height="44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M24 6.5C14.6 6.5 7 14.1 7 23.5C7 33.0 14.6 40.5 24 40.5C33.4 40.5 41 33.0 41 23.5C41 14.1 33.4 6.5 24 6.5Z"
        stroke="#8A6F48"
        strokeWidth="2"
      />
      <path
        d="M20 29C21.5 31 26.5 31 28 29"
        stroke="#F5D77A"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  ),


  "Young Adult": (
    <svg
      viewBox="0 0 48 48"
      width="44"
      height="44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.5 21C10.5 17.4101 13.4101 14.5 17 14.5H19C22.5899 14.5 25.5 17.4101 25.5 21V38H10.5V21Z"
        stroke="#8A6F48"
        strokeWidth="2"
      />
      <path
        d="M18 13C21.3137 13 24 15.6863 24 19C24 22.3137 21.3137 25 18 25C14.6863 25 12 22.3137 12 19C12 15.6863 14.6863 13 18 13Z"
        stroke="#8A6F48"
        strokeWidth="2"
      />
      <path
        d="M26.5 38V27C26.5 24.2386 28.7386 22 31.5 22H34.5C37.2614 22 39.5 24.2386 39.5 27V38"
        stroke="#8A6F48"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M33 21C35.2091 21 37 19.2091 37 17C37 14.7909 35.2091 13 33 13C30.7909 13 29 14.7909 29 17C29 19.2091 30.7909 21 33 21Z"
        stroke="#F5D77A"
        strokeWidth="2"
        opacity="0.45"
      />
    </svg>
  ),

  "Short Story": (
    <svg
      viewBox="0 0 48 48"
      width="44"
      height="44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 7H27L36 16V41C36 42.1046 35.1046 43 34 43H12C10.8954 43 10 42.1046 10 41V9C10 7.89543 10.8954 7 12 7Z"
        stroke="#8A6F48"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M27 7V16H36"
        stroke="#8A6F48"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M15 22H30"
        stroke="#8A6F48"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M15 28H24"
        stroke="#F5D77A"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  ),

  // Note: this is the label used by your requested category list.
  // It may not exist in recApi.getCategories(); but mapping it won't break anything.
  "Show Less": (
    <svg
      viewBox="0 0 48 48"
      width="44"
      height="44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M20 19L28 27L36 19"
        stroke="#8A6F48"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),

};


// Mood options
const MOODS = [
  { key: "Calm", icon: enthusiasticCuate, label: "Calm" },
  { key: "Emotional", icon: overwhelmedBro, label: "Emotional" },
  { key: "Dramatic", icon: chaosBro, label: "Dramatic" },
  { key: "Inspiring", icon: designProcessPana, label: "Inspiring" },
  { key: "Fun", icon: amusementParkBro, label: "Fun" },
  { key: "Mysterious", icon: mysteryBoxBro, label: "Mysterious" },
  { key: "Magical", icon: hauntedHouseAmico, label: "Magical" },
];


/* NOTE: mood buttons still use emoji; this task focuses on category/tag discovery icons. */

export default function ReaderDashboard() {
  const navigate = useNavigate();

  const [myProfile, setMyProfile] = useState(null);
  const [moodboardBookNotice, setMoodboardBookNotice] = useState({});

  // State
  const [quote, setQuote] = useState({ content: "", author: "" });
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [feedSections, setFeedSections] = useState({}); // { feedKey: stories[] }
  const [badgesByStoryId, setBadgesByStoryId] = useState({});
  const [searchResults, setSearchResults] = useState([]);
  const [filteredStories, setFilteredStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [selectedMood, setSelectedMood] = useState("");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [viewMode, setViewMode] = useState("home"); // "home" | "search" | "filter"

  const [publicMoodboards, setPublicMoodboards] = useState([]);
  const [currentReads, setCurrentReads] = useState([]);

  const myUserId = myProfile?.user_id || myProfile?.user?.user_id || null;

  // Fetch initial data
  useEffect(() => {
    // Ensure token is available before making API calls
    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("No token available, skipping API calls");
      return;
    }

    getMyProfile()
      .then((res) => setMyProfile(res.data || null))
      .catch((err) => {
        console.error("Failed to fetch profile:", err);
        setMyProfile(null);
      });
    fetchInitialData();
    fetchQuote();
    fetchHomeFeedSections();
    fetchPublicMoodboards();
    fetchCurrentReads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (myUserId) {
      fetchHomeFeedSections();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myUserId]);

  useEffect(() => {
    const handler = () => {
      getMyProfile()
        .then((res) => setMyProfile(res.data || null))
        .catch(() => setMyProfile(null));
    };
    window.addEventListener("profile-updated", handler);
    return () => window.removeEventListener("profile-updated", handler);
  }, []);

  useEffect(() => {
    const onFocus = () => fetchPublicMoodboards();
    const onVisibility = () => {
      if (!document.hidden) fetchPublicMoodboards();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    const id = setInterval(() => {
      fetchPublicMoodboards();
    }, 30000);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(id);
    };
  }, []);

  const fetchPublicMoodboards = async () => {
    try {
      const res = await getPublicMoodboards({ limit: 8, skip: 0 });
      setPublicMoodboards(res.data?.moodboards || []);
    } catch (err) {
      console.error("Failed to fetch public moodboards:", err);
      setPublicMoodboards([]);
    }
  };

  const fetchCurrentReads = async () => {
    try {
      const res = await getLibrary();
      setCurrentReads(res.data?.current || []);
    } catch (err) {
      console.error("Failed to fetch current reads:", err);
      setCurrentReads([]);
    }
  };

  // Fetch filtered stories when filters change
  useEffect(() => {
    if (selectedCategory || selectedTag || selectedMood) {
      setViewMode("filter");
      fetchFilteredStories();
    } else if (!searchQuery) {
      setViewMode("home");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedTag, selectedMood]);

  const fetchInitialData = async () => {
    try {
      const [catRes, tagRes] = await Promise.all([
        recApi.getCategories(),
        recApi.getTags(),
      ]);
      setCategories(catRes.data || []);
      setTags(tagRes.data || []);
    } catch (err) {
      console.error("Failed to fetch initial data:", err);
    }
  };

  const fetchHomeFeedSections = async () => {
    setLoading(true);
    try {
      // Fetch all home feed sections in parallel
      const feedPromises = HOME_FEEDS.map(async (feedKey) => {
        try {
          const res = await recApi.getByFeed(feedKey, { limit: 8, userId: myUserId || undefined });
          return { feedKey, stories: res.data?.stories || res.data || [] };
        } catch (err) {
          console.error(`Failed to fetch ${feedKey}:`, err);
          return { feedKey, stories: [] };
        }
      });

      const results = await Promise.all(feedPromises);
      const sections = {};
      results.forEach(({ feedKey, stories }) => {
        sections[feedKey] = stories;
      });
      setFeedSections(sections);

      try {
        const ids = Array.from(
          new Set(
            results
              .flatMap((r) => r.stories || [])
              .map((s) => s?.story_id)
              .filter(Boolean)
          )
        );
        if (ids.length) {
          const res = await publicBadgesBatch(ids);
          setBadgesByStoryId(res.data?.badgesByStoryId || {});
        }
      } catch (e) {
        console.error("Failed to fetch badges batch", e);
      }
    } catch (err) {
      console.error("Failed to fetch feed sections:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const ids = Array.from(
      new Set(
        [...(searchResults || []), ...(filteredStories || [])]
          .map((s) => s?.story_id)
          .filter(Boolean)
      )
    );

    if (!ids.length) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await publicBadgesBatch(ids);
        if (cancelled) return;
        setBadgesByStoryId((prev) => ({
          ...prev,
          ...(res.data?.badgesByStoryId || {}),
        }));
      } catch (e) {
        console.error("Failed to fetch badges batch", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchResults, filteredStories]);

  const fetchQuote = async (forceRefresh = false) => {
    setQuoteLoading(true);
    try {
      const res = forceRefresh 
        ? await recApi.refreshQuote() 
        : await recApi.getQuote();
      setQuote(res.data);
    } catch (err) {
      console.error("Failed to fetch quote:", err);
      setQuote({
        content: "A reader lives a thousand lives before he dies.",
        author: "George R.R. Martin",
      });
    } finally {
      setQuoteLoading(false);
    }
  };

  const fetchFilteredStories = async () => {
    setSearchLoading(true);
    try {
      let res;
      if (selectedCategory) {
        res = await recApi.getByCategory(selectedCategory);
      } else if (selectedTag) {
        res = await recApi.getByTag(selectedTag);
      } else if (selectedMood) {
        res = await recApi.getByMood(selectedMood);
      }
      setFilteredStories(res?.data?.stories || res?.data || []);
    } catch (err) {
      console.error("Failed to fetch filtered stories:", err);
      setFilteredStories([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setViewMode("home");
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    setViewMode("search");
    setSelectedCategory("");
    setSelectedTag("");
    setSelectedMood("");
    try {
      const res = await recApi.searchStories(searchQuery);
      setSearchResults(res.data?.stories || res.data || []);
    } catch (err) {
      console.error("Search failed:", err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleCategoryClick = (category) => {
    setSearchQuery("");
    setSelectedTag("");
    setSelectedMood("");
    if (category === selectedCategory) {
      setSelectedCategory("");
      setViewMode("home");
    } else {
      setSelectedCategory(category);
    }
  };

  const handleTagClick = (tag) => {
    setSearchQuery("");
    setSelectedCategory("");
    setSelectedMood("");
    if (tag === selectedTag) {
      setSelectedTag("");
      setViewMode("home");
    } else {
      setSelectedTag(tag);
    }
  };

  const handleMoodClick = (mood) => {
    setSearchQuery("");
    setSelectedCategory("");
    setSelectedTag("");
    if (mood === selectedMood) {
      setSelectedMood("");
      setViewMode("home");
    } else {
      setSelectedMood(mood);
    }
  };

  const clearFilters = () => {
    setSelectedCategory("");
    setSelectedTag("");
    setSelectedMood("");
    setSearchQuery("");
    setViewMode("home");
  };

  const handleOpenStoryDetail = (storyId) => {
    navigate(`/story/${storyId}`);
  };

  const handleResumeReading = (storyId) => {
    navigate(`/read/${storyId}`);
  };

  const handleMoodboardClick = (moodboardId) => {
    navigate(`/mood-board`, { state: { moodboardId } });
  };

  const handleConnectedBookClick = (e, mb) => {
    e.stopPropagation();
    const story = mb?.story;
    if (!story?.story_id) return;

    if (story.status !== "published") {
      setMoodboardBookNotice((prev) => ({
        ...prev,
        [mb.moodboard_id]: "Book not yet published",
      }));
      setTimeout(() => {
        setMoodboardBookNotice((prev) => {
          const next = { ...prev };
          delete next[mb.moodboard_id];
          return next;
        });
      }, 2500);
      return;
    }

    navigate(`/story/${story.story_id}`);
  };

  const handleViewAllFeed = (feedKey) => {
    navigate(`/discover?feed=${feedKey}`);
  };

  const getAuthorDisplay = (author) => {
    if (!author) return "Unknown Author";
    // Prefer profile names over user table names (profile is where users update their display name)
    const firstName = author.profile?.first_name || author.first_name;
    const lastName = author.profile?.last_name || author.last_name;
    const name = [firstName, lastName].filter(Boolean).join(" ");
    const handle = author.profile?.handle_name;
    return name || handle || "Unknown Author";
  };

  const displayedCategories = showAllCategories ? categories : categories.slice(0, 8);
  const displayedTags = showAllTags ? tags : tags.slice(0, 12);

  // Book Card Component
  const BookCard = ({ story }) => {
    const badges = badgesByStoryId?.[story.story_id] || [];
    const topBadge = badges[0] || null;

    return (
    <div
      className={styles.bookCard}
      onClick={() => handleOpenStoryDetail(story.story_id)}
    >
      <div className={styles.bookCover}>
        {story.cover_url ? (
          <img src={story.cover_url} alt={story.title} className={styles.bookCoverImage} />
        ) : (
          <div className={styles.bookCoverPlaceholder}>📖</div>
        )}

        {topBadge && (
          <div className={styles.readerBadgeWrap} onClick={(e) => e.stopPropagation()}>
            <div className={styles.readerBadgeIcon} role="img" aria-label={topBadge.label}>
              {topBadge.icon}
            </div>
            <div className={styles.readerBadgeTooltip}>
              <div className={styles.readerBadgeTooltipTitle}>{topBadge.label}</div>
              <div className={styles.readerBadgeTooltipBody}>{topBadge.tooltip}</div>
            </div>
          </div>
        )}
      </div>
      <div className={styles.bookInfo}>
        <h3 className={styles.bookTitle}>{story.title || "Untitled"}</h3>
        <p className={styles.bookAuthor}>
          <span>
            by{" "}
            <button
              type="button"
              className={styles.authorLink}
              onClick={(e) => {
                e.stopPropagation();
                if (story.author?.user_id) navigate(`/writer/${story.author.user_id}`);
              }}
            >
              {getAuthorDisplay(story.author)}
            </button>
          </span>
        </p>
        <div className={styles.bookBadges}>
          {story.category && (
            <span
              className={`${styles.bookBadge} ${styles.bookBadgeCategory}`}
              onClick={(e) => {
                e.stopPropagation();
                handleCategoryClick(story.category);
              }}
            >
              {story.category}
            </span>
          )}
          {story.tags &&
            story.tags.split(",").slice(0, 1).map((tag) => (
              <span
                key={tag}
                className={`${styles.bookBadge} ${styles.bookBadgeTag}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTagClick(tag.trim());
                }}
              >
                {tag.trim()}
              </span>
            ))}
        </div>
      </div>
    </div>
    );
  };

  const MoodboardsExploreSection = ({ moodboards }) => {
    const scrollRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkScrollButtons = () => {
      if (!scrollRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    };

    const scrollByAmount = (direction) => {
      if (!scrollRef.current) return;
      const cardWidth = 180 + 22;
      const scrollAmount = cardWidth * 3;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
      setTimeout(checkScrollButtons, 350);
    };

    useEffect(() => {
      setTimeout(checkScrollButtons, 0);
    }, [moodboards]);

    if (!moodboards || moodboards.length === 0) return null;

    return (
      <section className={styles.feedSection}>
        <div className={styles.feedHeader}>
          <h2 className={styles.feedTitle}>Moodboards to Explore</h2>
        </div>
        <div className={styles.carouselWrapper}>
          {canScrollLeft && (
            <button
              type="button"
              className={`${styles.carouselArrow} ${styles.carouselArrowLeft}`}
              onClick={() => scrollByAmount("left")}
              aria-label="Scroll left"
            >
              ‹
            </button>
          )}
          <div
            className={styles.bookRow}
            ref={scrollRef}
            onScroll={checkScrollButtons}
            onMouseEnter={checkScrollButtons}
          >
            {moodboards.slice(0, 12).map((mb) => {
              const cover =
                mb?.cover_images?.[0] ||
                mb?.story?.cover_url ||
                mb?.vibe_panel?.images?.[0]?.url ||
                null;
              const author = mb?.owner;
              const authorName =
                author?.profile?.handle_name ||
                [author?.first_name, author?.last_name].filter(Boolean).join(" ") ||
                "Unknown";

              return (
                <div
                  key={mb.moodboard_id}
                  className={styles.bookCard}
                  onClick={() => handleMoodboardClick(mb.moodboard_id)}
                >
                  <div className={styles.bookCover}>
                    {cover ? (
                      <img src={cover} alt={mb.title} className={styles.bookCoverImage} />
                    ) : (
                      <div className={styles.bookCoverPlaceholder}>🎨</div>
                    )}
                  </div>
                  <div className={styles.bookInfo}>
                    <h3 className={styles.bookTitle}>{mb.title || "Moodboard"}</h3>
                    <p className={styles.bookAuthor}>
                      <span>by {authorName}</span>
                    </p>
                    {mb?.story?.title && (
                      <div className={styles.bookBadges}>
                        <button
                          type="button"
                          className={`${styles.bookBadge} ${styles.bookBadgeCategory}`}
                          onClick={(e) => handleConnectedBookClick(e, mb)}
                          style={{ cursor: "pointer" }}
                        >
                          Connected to: {mb.story.title}
                        </button>
                      </div>
                    )}

                    {moodboardBookNotice[mb.moodboard_id] && (
                      <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: "#b45309" }}>
                        {moodboardBookNotice[mb.moodboard_id]}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {canScrollRight && (
            <button
              type="button"
              className={`${styles.carouselArrow} ${styles.carouselArrowRight}`}
              onClick={() => scrollByAmount("right")}
              aria-label="Scroll right"
            >
              ›
            </button>
          )}
        </div>
      </section>
    );
  };

  const CurrentReadCard = ({ item }) => (
    <button
      type="button"
      className={styles.currentReadCard}
      onClick={() => handleResumeReading(item.story_id)}
    >
      <div className={styles.currentReadCover}>
        {item.cover_url ? (
          <img src={item.cover_url} alt={item.title} />
        ) : (
          <span>📖</span>
        )}
      </div>
      <div className={styles.currentReadMeta}>
        <p className={styles.currentReadLabel}>Continue</p>
        <h3 className={styles.currentReadTitle}>{item.title || "Untitled"}</h3>
        <p className={styles.currentReadProgress}>
          {Math.round(item.progress || 0)}% read • {item.total_chapters || 0} chapters
        </p>
        <div className={styles.currentReadBar}>
          <span style={{ width: `${Math.min(100, Math.round(item.progress || 0))}%` }} />
        </div>
      </div>
      <div className={styles.currentReadAction}>Resume →</div>
    </button>
  );

  // Feed Section Component (Inkitt-style: heading + horizontal carousel with arrow sliders)
  const FeedSection = ({ feedKey, stories }) => {
    const config = FEED_CONFIG[feedKey];
    const scrollRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    if (!config || !stories || stories.length === 0) return null;

    const checkScrollButtons = () => {
      if (!scrollRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    };

    const scrollByAmount = (direction) => {
      if (!scrollRef.current) return;
      const cardWidth = 180 + 22; // card width + gap
      const scrollAmount = cardWidth * 3; // scroll 3 cards at a time
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
      setTimeout(checkScrollButtons, 350);
    };

    return (
      <section className={styles.feedSection}>
        <div className={styles.feedHeader}>
          <h2 className={styles.feedTitle}>{config.name}</h2>
          <button
            className={styles.viewAllBtn}
            onClick={() => handleViewAllFeed(feedKey)}
          >
            View All →
          </button>
        </div>
        <div className={styles.carouselWrapper}>
          {canScrollLeft && (
            <button
              type="button"
              className={`${styles.carouselArrow} ${styles.carouselArrowLeft}`}
              onClick={() => scrollByAmount("left")}
              aria-label="Scroll left"
            >
              ‹
            </button>
          )}
          <div
            className={styles.bookRow}
            ref={scrollRef}
            onScroll={checkScrollButtons}
            onMouseEnter={checkScrollButtons}
          >
            {stories.slice(0, 12).map((story) => (
              <BookCard key={story.story_id} story={story} />
            ))}
          </div>
          {canScrollRight && (
            <button
              type="button"
              className={`${styles.carouselArrow} ${styles.carouselArrowRight}`}
              onClick={() => scrollByAmount("right")}
              aria-label="Scroll right"
            >
              ›
            </button>
          )}
        </div>
      </section>
    );
  };

  return (
    <div className={styles.dashboard}>



      {myProfile?.role !== "writer" && (
        <div
          style={{
            backgroundColor: "#fff6d9",
            border: "1px solid rgba(0,0,0,0.06)",
            borderRadius: 14,
            padding: "14px 16px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ color: "#1A1A1A" }}>
            <div style={{ fontWeight: 800, marginBottom: 2 }}>Want to start writing books?</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              Switch your role to <strong>Writer</strong> in Profile Settings to unlock the Write dashboard.
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/profile/settings", { state: { tab: "edit" } })}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "none",
              backgroundColor: "#021E47",
              color: "#fff",
              fontWeight: 800,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Click here to start writing
          </button>
        </div>
      )}

      {/* Hero / Quote Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroInner}>
          {/* Extra floating lamp in Inspire Me / Quote area */}
          <div className={styles.floatingQuoteLampLayer} aria-hidden="true">
            <img
              src={oilLampAmico}
              alt=""
              aria-hidden="true"
              className={`${styles.floatingLamp} ${styles.floatingLampUnderQuote}`}
            />
          </div>

          <div className={styles.quoteWrap}>
            <div className={styles.quoteCard}>

              <div className={styles.quoteIcon} aria-hidden="true">
                ❝
              </div>
              <p className={styles.quoteText}>
                {quoteLoading ? "Loading inspiration..." : quote.content}
              </p>
              <p className={styles.quoteAuthor}>— {quote.author || "Unknown"}</p>
            </div>
          </div>

          <aside className={styles.heroAside}>
            <div className={styles.asideCard}>
              <div className={styles.asideLabel}>Tonight’s prompt</div>
              <div className={styles.asideTitle}>A single line to start with</div>
              <button
                className={styles.inspireBtn}
                onClick={() => fetchQuote(true)}
                disabled={quoteLoading}
              >
                <span className={styles.inspireIcon} aria-hidden="true">
                  ✨
                </span>
                <span>{quoteLoading ? "Thinking…" : "Inspire Me"}</span>
                <span className={styles.inspireArrow} aria-hidden="true">
                  →
                </span>
              </button>
            </div>
          </aside>
        </div>
      </section>


      {/* Main Content */}
      <main className={styles.mainContent} style={{ position: "relative", zIndex: 1 }}>
      {/* Decorative lamps layer (Search/Authors/Stories + Categories) */}
      <div className={styles.floatingLampLayer} aria-hidden="true">
        {/* Lamp under Search authors & stories bar */}
        <img
          src={oilLampAmico}
          alt=""
          aria-hidden="true"
          className={`${styles.floatingLamp} ${styles.floatingLampUnderSearchBy}`}
        />

        {/* Lamp under Discover categories (also covers the “all categories” area) */}
        <img
          src={oilLampAmico}
          alt=""
          aria-hidden="true"
          className={`${styles.floatingLamp} ${styles.floatingLampUnderDiscover}`}
        />
      </div>
      {/* Search & Filters */}

        <section className={styles.searchFilterSection}>
          <form className={styles.searchBox} onSubmit={handleSearch}>
            <span className={styles.searchIcon}></span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search stories or authors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
          <div className={styles.filterGroup}>
            <select
              className={styles.filterSelect}
              value={selectedCategory}
              onChange={(e) => handleCategoryClick(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Current Reads */}
        {currentReads.length > 0 && (
          <section className={styles.currentReadsSection}>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.sectionEyebrow}>Books you were reading</p>
                <h2 className={styles.sectionTitle}>Pick up where you left off</h2>
              </div>
              <button
                type="button"
                className={styles.sectionCta}
                onClick={() => navigate("/library")}
              >
                View Library
              </button>
            </div>
            <div className={styles.currentReadsRow}>
              {currentReads.slice(0, 6).map((item) => (
                <CurrentReadCard key={item.story_id} item={item} />
              ))}
            </div>
          </section>
        )}

        {/* Mood Selector */}
        <section className={styles.moodSelector}>
          {MOODS.map((mood) => (
            <button
              key={mood.key}
              className={`${styles.moodBtn} ${selectedMood === mood.key ? styles.active : ""}`}
              onClick={() => handleMoodClick(mood.key)}
            >
              <span className={styles.moodIcon}>
                <img
                  src={mood.icon}
                  alt={mood.label}
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </span>

              <span className={styles.moodLabel}>{mood.label}</span>
            </button>
          ))}
        </section>


        {/* Discovery (wrapped cozy container) */}
        <section className={styles.discoveryWrap}>
          <div className={styles.discoveryGrid}>
            {/* Categories as vector icon cards */}
            <div className={styles.discoveryBlock}>
              <h3 className={styles.discoveryTitle}>Browse by</h3>
              <h2 className={styles.discoverySubtitle}>Categories</h2>

              <div className={styles.iconGrid}>
                {displayedCategories.map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      className={`${styles.iconCard} ${isActive ? styles.iconCardActive : ""}`}
                      onClick={() => handleCategoryClick(cat)}
                    >
                      <div className={styles.iconCardArt} aria-hidden="true">
                        {CATEGORY_SVGS[cat] ? CATEGORY_SVGS[cat] : CATEGORY_SVG_FALLBACK}
                      </div>
                      <div className={styles.iconCardLabel}>{cat}</div>
                    </button>
                  );
                })}

                {categories.length > 8 && (
                  <button
                    type="button"
                    className={styles.iconCard}
                    onClick={() => setShowAllCategories(!showAllCategories)}
                  >
                    <div className={styles.iconCardArt} aria-hidden="true">
                      {PLUS_SVG}
                    </div>
                    <div className={styles.iconCardLabel}>
                      {showAllCategories ? "Show Less" : `+${categories.length - 8} more`}
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Tags pills (secondary tags only) */}
            <div className={styles.discoveryBlock}>
              <h3 className={styles.discoveryTitle}>Browse by</h3>
              <h2 className={styles.discoverySubtitle}>Tags</h2>

              <div className={styles.pillsContainer}>
                {displayedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`${styles.pill} ${styles.pillTag} ${selectedTag === tag ? styles.pillActive : ""}`}
                    onClick={() => handleTagClick(tag)}
                  >
                    {tag}
                  </button>
                ))}

                {tags.length > 12 && (
                  <button
                    type="button"
                    className={`${styles.pill} ${styles.pillTag}`}
                    onClick={() => setShowAllTags(!showAllTags)}
                  >
                    {showAllTags ? "Show Less" : `+${tags.length - 12} more`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>


        {/* Active Filter Banner */}
        {viewMode !== "home" && (
          <div className={styles.filterBanner}>
            <span>
              {viewMode === "search" && `Search results for "${searchQuery}"`}
              {viewMode === "filter" && selectedCategory && `Category: ${selectedCategory}`}
              {viewMode === "filter" && selectedTag && `Tag: ${selectedTag}`}
              {viewMode === "filter" && selectedMood && `Mood: ${selectedMood}`}
            </span>
            <button className={styles.clearFilterBtn} onClick={clearFilters}>
              ✕ Clear
            </button>
          </div>
        )}

        {/* Loading State */}
        {(loading || searchLoading) && (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
          </div>
        )}

        {/* Search Results */}
        {viewMode === "search" && !searchLoading && (
          <section className={styles.feedSection}>
            <div className={styles.feedHeader}>
              <h2 className={styles.feedTitle}>
                <span className={styles.feedTitleIcon}>🔍</span>
                Search Results ({searchResults.length})
              </h2>
            </div>
            {searchResults.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📚</div>
                <p className={styles.emptyText}>No stories found. Try a different search!</p>
              </div>
            ) : (
              <div className={styles.bookGrid}>
                {searchResults.map((story) => (
                  <BookCard key={story.story_id} story={story} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Filtered Results */}
        {viewMode === "filter" && !searchLoading && (
          <section className={styles.feedSection}>
            <div className={styles.feedHeader}>
              <h2 className={styles.feedTitle}>
                <span className={styles.feedTitleIcon}>
                  {selectedCategory ? "📂" : selectedTag ? "🏷️" : "🎭"}
                </span>
                {selectedCategory || selectedTag || `${selectedMood} Stories`} ({filteredStories.length})
              </h2>
            </div>
            {filteredStories.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📚</div>
                <p className={styles.emptyText}>No stories found in this category.</p>
              </div>
            ) : (
              <div className={styles.bookGrid}>
                {filteredStories.map((story) => (
                  <BookCard key={story.story_id} story={story} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Home Feed Sections - All 20 Recommendation Types */}
        {viewMode === "home" && !loading && (
          <>
            <MoodboardsExploreSection moodboards={publicMoodboards} />

            {/* Recommendation Feed Sections */}
            {Object.keys(FEED_CONFIG).map((feedKey) => (
              <FeedSection
                key={feedKey}
                feedKey={feedKey}
                stories={feedSections?.[feedKey] || []}
              />
            ))}
          </>
        )}
      </main>
    </div>
  );

}

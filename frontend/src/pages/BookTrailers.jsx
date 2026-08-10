import React, { useState, useEffect } from "react";
import WatchTrailersTab from "../components/WatchTrailersTab";
import CreateTrailerTab from "../components/CreateTrailerTab";
import MyTrailersTab from "../components/MyTrailersTab";
import { getMyProfile } from "../services/profileService";
import "../styles/bookTrailers.css";

const BookTrailers = () => {
  const [activeTab, setActiveTab] = useState("watch");
  const [isWriter, setIsWriter] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        const response = await getMyProfile();
        const profile = response.data;
        const writer = profile?.role?.toLowerCase() === "writer" || profile?.is_writer === true;

        if (!cancelled) setIsWriter(writer);
      } catch (error) {
        console.error("Error loading trailer access:", error);
        if (!cancelled) setIsWriter(false);
      }
    };

    loadProfile();

    const handleProfileUpdate = () => loadProfile();
    window.addEventListener("profile-updated", handleProfileUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener("profile-updated", handleProfileUpdate);
    };
  }, []);

  // Reset to watch tab if user is not a writer
  useEffect(() => {
    if (isWriter === false && (activeTab === "create" || activeTab === "my-trailers")) {
      setActiveTab("watch");
    }
  }, [isWriter, activeTab]);

  if (isWriter === null) {
    return <div className="trailersPage flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#e8c96e] border-t-[#c49164]" />
    </div>;
  }

  return (
    <div className="trailersPage">
      <header className="trailersHeader">
        <div className="trailersHeaderInner">
          <p className="trailersKicker">Aurora Studio</p>
          <h1>Book Trailers</h1>
          <p>Short films for stories worth getting lost in.</p>
        </div>
      </header>
      <main className="trailersMain">
        <div className={`studioToggle ${activeTab === "create" ? "studioToggleCreate" : ""}`} role="tablist" aria-label="Book trailers">
          <button type="button" role="tab" aria-selected={activeTab === "watch"} onClick={() => setActiveTab("watch")} className="studioTab">
            Explore
          </button>
          <button type="button" role="tab" aria-selected={activeTab === "my-trailers"} onClick={() => isWriter && setActiveTab("my-trailers")} disabled={!isWriter} className="studioTab">
            My studio
          </button>
          <button type="button" role="tab" aria-selected={activeTab === "create"} onClick={() => isWriter && setActiveTab("create")} disabled={!isWriter} className="studioTab">
            Create
          </button>
        </div>
        <div className={activeTab === "watch" ? "trailerWatchSurface" : activeTab === "my-trailers" ? "trailerWatchSurface" : "trailerCreateSurface"}>
          {activeTab === "watch" ? <WatchTrailersTab /> : activeTab === "my-trailers" ? <MyTrailersTab /> : <CreateTrailerTab isWriter={isWriter} />}
        </div>
      </main>
    </div>
  );
};

export default BookTrailers;

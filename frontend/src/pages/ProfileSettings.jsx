import React, { useEffect, useMemo, useState } from "react";
import {
  getMyProfile,
  createProfile,
  updateProfile,
  deleteProfile,
} from "../services/profileService";
import styles from "../styles/ProfileSettingsPremium.module.css";

const getInitials = (first = "", last = "", handle = "") => {
  const primary = `${first} ${last}`.trim();
  if (primary.length > 0) {
    return primary
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return (handle || "AU").slice(0, 2).toUpperCase();
};

const hasPersistedProfile = (profile) => Boolean(profile?.profile_id);

export default function ProfileSettings() {
  const [tab, setTab] = useState("view");
  const [profile, setProfile] = useState(null);

  // CREATE STATE
  const [createData, setCreateData] = useState({
    first_name: "",
    last_name: "",
    handle_name: "",
    nickname: "",
    pronouns: "",
    bio: "",
    gender: "",
    role: "reader",
  });

  const [createImage, setCreateImage] = useState(null);
  const [createPreview, setCreatePreview] = useState(null);
  const [createMsg, setCreateMsg] = useState("");

  // EDIT STATE
  const [editImage, setEditImage] = useState(null);
  const [editPreview, setEditPreview] = useState(null);
  const [updateMsg, setUpdateMsg] = useState("");

  // DELETE
  const [deleteMsg, setDeleteMsg] = useState("");

  const loadProfile = () => {
    getMyProfile()
      .then((res) => {
        const data = res.data || null;
        setProfile(hasPersistedProfile(data) ? data : null);

        if (!hasPersistedProfile(data) && data) {
          setCreateData((prev) => ({
            ...prev,
            first_name: data.first_name || prev.first_name,
            last_name: data.last_name || prev.last_name,
            role: data.role || prev.role,
          }));
        }
      })
      .catch(() => setProfile(null));
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleCreateImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCreateImage(file);
    setCreatePreview(URL.createObjectURL(file));
  };

  const handleCreateChange = (e) => {
    setCreateData({ ...createData, [e.target.name]: e.target.value });
  };

  const submitCreate = async (e) => {
    e.preventDefault();

    const data = new FormData();
    Object.keys(createData).forEach((key) => data.append(key, createData[key]));
    if (createImage) data.append("profile_image", createImage);

    try {
      await createProfile(data);
      setCreateMsg("Profile created successfully!");
      loadProfile();
      setTab("view");
      window.dispatchEvent(new Event("profile-updated"));
    } catch (err) {
      const apiData = err.response?.data;
      if (apiData?.message) setCreateMsg(apiData.message);
      else if (Array.isArray(apiData?.errors) && apiData.errors.length > 0)
        setCreateMsg(apiData.errors.map((e) => `${e.field}: ${e.message}`).join(" | "));
      else setCreateMsg("Error creating profile");
    }
  };

  const handleEditImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditImage(file);
    setEditPreview(URL.createObjectURL(file));
  };

  const handleEditChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const submitUpdate = async (e) => {
    e.preventDefault();

    const allowed = [
      "first_name",
      "last_name",
      "handle_name",
      "nickname",
      "pronouns",
      "bio",
      "gender",
      "role",
    ];

    const data = new FormData();
    allowed.forEach((key) => {
      if (profile?.[key] !== undefined) data.append(key, profile[key]);
    });
    if (editImage) data.append("profile_image", editImage);

    try {
      await updateProfile(data);
      setUpdateMsg("Profile updated successfully!");
      loadProfile();
      window.dispatchEvent(new Event("profile-updated"));
    } catch (err) {
      setUpdateMsg(err.response?.data?.message || "Error updating profile");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteProfile();
      setDeleteMsg("Profile deleted. Goodbye email sent.");
      setProfile(null);
    } catch (err) {
      setDeleteMsg(err.response?.data?.message || "Error deleting profile.");
    }
  };

  const infoChips = useMemo(() => {
    if (!profile) return [];
    return [
      { label: "Nickname", value: profile.nickname || "—" },
      { label: "Pronouns", value: profile.pronouns || "—" },
      { label: "Gender", value: profile.gender || "—" },
      { label: "Role", value: profile.role || "—", isRole: true },
    ];
  }, [profile]);

  const isTabActive = (t) => tab === t;

  return (
    <div className={styles.page}>
      <div className={styles.masterFrame}>
        <div className={styles.split}>
          <aside className={styles.leftAnchor}>
            <div className={styles.identityStack}>
              <div className={styles.avatarWrap}>
                {profile?.profile_image ? (
                  <img className={styles.avatarImg} src={profile.profile_image} alt="Profile avatar" />
                ) : (
                  <div className={styles.initials}>
                    {getInitials(profile?.first_name, profile?.last_name, profile?.handle_name)}
                  </div>
                )}
              </div>

              <div className={styles.nameBlock}>
                <h2>{[profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Profile Settings"}</h2>
                <div className={styles.handle}>@{profile?.handle_name || "—"}</div>
              </div>

              <span
                className={`${styles.roleBadge} ${profile?.role === "writer" ? styles.writer : styles.reader}`}
              >
                {profile?.role || "reader"}
              </span>
            </div>

            <nav className={styles.menu}>
              <button
                className={`${styles.menuBtn} ${isTabActive("view") ? styles.menuBtnActive : ""}`}
                onClick={() => setTab("view")}
              >
                View
              </button>
              <button
                className={`${styles.menuBtn} ${isTabActive("edit") ? styles.menuBtnActive : ""}`}
                onClick={() => setTab("edit")}
              >
                Edit
              </button>
              <button
                className={`${styles.menuBtn} ${isTabActive("create") ? styles.menuBtnActive : ""}`}
                onClick={() => setTab("create")}
              >
                Create
              </button>
              <button
                className={`${styles.menuBtn} ${isTabActive("delete") ? styles.menuBtnActive : ""}`}
                onClick={() => setTab("delete")}
              >
                Delete
              </button>
            </nav>
          </aside>

          <main className={styles.rightWorkspace}>
            <div className={styles.workspaceHeader}>
              <div>
                <h1>Profile Settings</h1>
<p>Fine-tune your persona.</p>
              </div>
            </div>

            <div className={styles.topLedgers}>
              <div className={styles.ledger}>
                <span className={styles.ledgerValue}>{profile?.total_books_read ?? 0}</span>
                <span className={styles.ledgerLabel}>Books Read</span>
              </div>
              <div className={styles.ledger}>
                <span className={styles.ledgerValue}>{profile?.total_books_written ?? 0}</span>
                <span className={styles.ledgerLabel}>Books Written</span>
              </div>
            </div>

            {tab === "view" && (
              !profile ? (
                <p className="profile-empty-state">No profile found. Create one to unlock personalization.</p>
              ) : (
                <div className="profile-view">
                  <div className="profile-hero-card">
                    <div className="profile-avatar-stack">
                      {profile.profile_image ? (
                        <img
                          src={profile.profile_image}
                          alt={profile.first_name || "Profile avatar"}
                          className="profile-hero-img"
                        />
                      ) : (
                        <div className="profile-img-placeholder large">
                          {getInitials(profile.first_name, profile.last_name, profile.handle_name)}
                        </div>
                      )}
                      <span className={`role-badge ${profile.role || "reader"}`}>{profile.role || "reader"}</span>
                    </div>

                    <div className="profile-hero-details">
                      <p className="profile-eyebrow">Reader Card</p>
                      <h2 className="profile-hero-name">
                        {[profile.first_name, profile.last_name]
                          .filter(Boolean)
                          .join(" ") || "Unnamed Reader"}
                      </h2>
                      <p className="profile-handle">@{profile.handle_name || "handle"}</p>
                      <p className="profile-hero-bio">
                        {profile.bio ||
                          "You haven't shared a bio yet. Let writers and readers know what worlds you adore."}
                      </p>
                      <div className="profile-pill-stack">
                        {profile.pronouns && <span className="profile-pill">{profile.pronouns}</span>}
                        {profile.gender && <span className="profile-pill">{profile.gender}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="profile-meta-grid">
                    {infoChips.map((chip) => (
                      <div key={chip.label} className="profile-meta-card">
                        <p className="profile-meta-label">{chip.label}</p>
                        {chip.isRole ? (
                          <span className={`role-badge ${chip.value}`}>{chip.value}</span>
                        ) : (
                          <p className="profile-meta-value">{chip.value}</p>
                        )}
                      </div>
                    ))}
                    <div className="profile-meta-card">
                      <p className="profile-meta-label">Handle</p>
                      <p className="profile-meta-value">@{profile.handle_name || "—"}</p>
                    </div>
                  </div>
                </div>
              )
            )}

            {tab === "create" && (
              <form onSubmit={submitCreate} className="profile-form">
                <div className="profile-upload-block">
                  {createPreview ? (
                    <img src={createPreview} className="profile-img-preview" />
                  ) : (
                    <div className="profile-img-placeholder">📷</div>
                  )}
                  <label htmlFor="create_image" className="file-label">
                    Upload portrait
                  </label>
                  <input id="create_image" type="file" accept="image/*" onChange={handleCreateImage} />
                </div>

                <div className="form-grid two-column">
                  <div className="profile-field">
                    <label htmlFor="create_first_name">First Name</label>
                    <input
                      id="create_first_name"
                      className="input"
                      name="first_name"
                      placeholder="First Name"
                      onChange={handleCreateChange}
                    />
                  </div>
                  <div className="profile-field">
                    <label htmlFor="create_last_name">Last Name</label>
                    <input
                      id="create_last_name"
                      className="input"
                      name="last_name"
                      placeholder="Last Name"
                      onChange={handleCreateChange}
                    />
                  </div>
                  <div className="profile-field">
                    <label htmlFor="create_handle">Handle</label>
                    <input
                      id="create_handle"
                      className="input"
                      name="handle_name"
                      placeholder="@aurora-reader"
                      onChange={handleCreateChange}
                    />
                  </div>
                  <div className="profile-field">
                    <label htmlFor="create_nickname">Nickname</label>
                    <input
                      id="create_nickname"
                      className="input"
                      name="nickname"
                      placeholder="Nickname"
                      onChange={handleCreateChange}
                    />
                  </div>
                </div>

                <div className="form-grid two-column">
                  <div className="profile-field">
                    <label htmlFor="create_pronouns">Pronouns</label>
                    <input
                      id="create_pronouns"
                      className="input"
                      name="pronouns"
                      placeholder="She/Her, They/Them…"
                      onChange={handleCreateChange}
                    />
                  </div>
                  <div className="profile-field">
                    <label htmlFor="create_gender">Gender</label>
                    <select id="create_gender" className="input" name="gender" onChange={handleCreateChange}>
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="nonbinary">Non-Binary</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="profile-field">
                  <label htmlFor="create_bio">Bio</label>
                  <textarea
                    id="create_bio"
                    className="input"
                    name="bio"
                    placeholder="Tell readers about your favourite worlds…"
                    onChange={handleCreateChange}
                  ></textarea>
                </div>

                <div className="profile-field">
                  <label htmlFor="create_role">Primary Role</label>
                  <select id="create_role" className="input" name="role" onChange={handleCreateChange}>
                    <option value="reader">Reader</option>
                    <option value="writer">Writer</option>
                  </select>
                </div>

                <div className="profile-form-actions">
                  <button className="btn-primary" type="submit">
                    Create Profile
                  </button>
                </div>
                {createMsg && <p className="status-text">{createMsg}</p>}
              </form>
            )}

            {tab === "edit" && (
              !profile ? (
                <p className="profile-empty-state">You need to create a profile before editing.</p>
              ) : (
                <form onSubmit={submitUpdate} className="profile-form">
                  <div className="profile-upload-block">
                    {editPreview ? (
                      <img src={editPreview} className="profile-img-preview" />
                    ) : profile.profile_image ? (
                      <img src={profile.profile_image} className="profile-img-preview" />
                    ) : (
                      <div className="profile-img-placeholder">📷</div>
                    )}
                    <label htmlFor="edit_image" className="file-label">
                      Update portrait
                    </label>
                    <input id="edit_image" type="file" accept="image/*" onChange={handleEditImage} />
                  </div>

                  <div className="form-grid two-column">
                    <div className="profile-field">
                      <label htmlFor="edit_first_name">First Name</label>
                      <input
                        id="edit_first_name"
                        className="input"
                        name="first_name"
                        value={profile.first_name || ""}
                        onChange={handleEditChange}
                      />
                    </div>
                    <div className="profile-field">
                      <label htmlFor="edit_last_name">Last Name</label>
                      <input
                        id="edit_last_name"
                        className="input"
                        name="last_name"
                        value={profile.last_name || ""}
                        onChange={handleEditChange}
                      />
                    </div>
                    <div className="profile-field">
                      <label htmlFor="edit_handle">Handle</label>
                      <input
                        id="edit_handle"
                        className="input"
                        name="handle_name"
                        value={profile.handle_name || ""}
                        onChange={handleEditChange}
                      />
                    </div>
                    <div className="profile-field">
                      <label htmlFor="edit_nickname">Nickname</label>
                      <input
                        id="edit_nickname"
                        className="input"
                        name="nickname"
                        value={profile.nickname || ""}
                        onChange={handleEditChange}
                      />
                    </div>
                  </div>

                  <div className="form-grid two-column">
                    <div className="profile-field">
                      <label htmlFor="edit_pronouns">Pronouns</label>
                      <input
                        id="edit_pronouns"
                        className="input"
                        name="pronouns"
                        value={profile.pronouns || ""}
                        onChange={handleEditChange}
                      />
                    </div>
                    <div className="profile-field">
                      <label htmlFor="edit_gender">Gender</label>
                      <select
                        id="edit_gender"
                        className="input"
                        name="gender"
                        value={profile.gender || ""}
                        onChange={handleEditChange}
                      >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="nonbinary">Non-Binary</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="profile-field">
                    <label htmlFor="edit_bio">Bio</label>
                    <textarea
                      id="edit_bio"
                      className="input"
                      name="bio"
                      value={profile.bio || ""}
                      onChange={handleEditChange}
                    ></textarea>
                  </div>

                  <div className="profile-field">
                    <label htmlFor="edit_role">Primary Role</label>
                    <select
                      id="edit_role"
                      className="input"
                      name="role"
                      value={profile.role || ""}
                      onChange={handleEditChange}
                    >
                      <option value="reader">Reader</option>
                      <option value="writer">Writer</option>
                    </select>
                  </div>

                  <div className="profile-form-actions">
                    <button className="btn-primary" type="submit">
                      Update Profile
                    </button>
                  </div>
                  {updateMsg && <p className="status-text success">{updateMsg}</p>}
                </form>
              )
            )}

            {tab === "delete" && (
              <div className="delete-section">
                <div className="warning-icon">⚠️</div>
                <h3>Final goodbye?</h3>
                <p>
                  This action permanently removes your profile details and sends a farewell email. Your reading
                  history stays safe in case you decide to return.
                </p>

                <button className="btn-danger" onClick={handleDelete}>
                  Delete Profile
                </button>

                {deleteMsg && <p className="status-text">{deleteMsg}</p>}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}


import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listCommunityThreads,
  getCommunityExplore,
  listCommunityAuthors,
  getCommunityAuthor,
  getCommunityGenre,
  getCommunityBook,
  followCommunityChannel,
  unfollowCommunityChannel,
  getMyFollowing,
  createCommunityThread,
  deleteCommunityThread,
  createCommunityReply,
  voteCommunityThread,
  saveCommunityThread,
  searchBooks,
} from '../services/communityService';
import styles from '../styles/community.module.css';

const defaultThread = {
  title: '',
  body: '',
  category: 'general',
  channel_type: 'General',
  flair: '',
  spoiler: false,
  story_id: null,
  bookTitle: '',
  tagText: '',
};

const NAV_ITEMS = [
  { id: 'all', label: 'All Discussions' },
  { id: 'following', label: 'Following' },
  { id: 'genres', label: 'Genres' },
  { id: 'authors', label: 'Authors' },
  { id: 'books', label: 'Books' },
  { id: 'writing', label: 'Writing' },
];

const SORT_ITEMS = [
  { id: 'trending', label: 'Trending' },
  { id: 'latest', label: 'Latest' },
  { id: 'top', label: 'Top' },
];

const GENRE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'book-reviews', label: 'Book Reviews' },
  { id: 'general', label: 'Recommendations' },
  { id: 'chapter-discussions', label: 'Characters' },
  { id: 'writing-advice', label: 'Writing' },
];

const formatCategoryLabel = (value) => {
  const normalized = String(value || 'general').trim().toLowerCase().replace(/\s+/g, '-');
  const labels = {
    general: 'General',
    'book-reviews': 'Book Reviews',
    'writing-advice': 'Writing Advice',
    'chapter-discussions': 'Chapter Discussions',
    'adaptation-talk': 'Adaptation Talk',
    'off-topic': 'Off Topic',
  };
  return labels[normalized] || 'General';
};

const formatRelativeTime = (dateStr) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

const formatCount = (n) => {
  const num = Number(n) || 0;
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(num);
};

const displayName = (user) =>
  user?.profile?.handle_name ||
  `${user?.first_name || ''} ${user?.last_name || ''}`.trim() ||
  'Reader';

export default function Community() {
  const [threads, setThreads] = useState([]);
  const [explore, setExplore] = useState({ genres: [], popularAuthors: [], popularBooks: [], trendingTopics: [] });
  const [authors, setAuthors] = useState([]);
  const [authorDetail, setAuthorDetail] = useState(null);
  const [genreDetail, setGenreDetail] = useState(null);
  const [bookDetail, setBookDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState(defaultThread);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [expandedThread, setExpandedThread] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [authError, setAuthError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bookQuery, setBookQuery] = useState('');
  const [bookResults, setBookResults] = useState([]);
  const [, setIsSearchingBooks] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [authorSearch, setAuthorSearch] = useState('');
  const [followingData, setFollowingData] = useState({ genres: [], books: [], authors: [], writers: [] });
  const [isLoadingFollowing, setIsLoadingFollowing] = useState(false);

  const [activeNav, setActiveNav] = useState('all');
  const [sortBy, setSortBy] = useState('trending');
  const [drillDown, setDrillDown] = useState(null);
  const [genreFilter, setGenreFilter] = useState('all');

  const threadParams = useMemo(() => {
    const params = { sort: sortBy };

    if (drillDown?.type === 'author') {
      params.author_id = drillDown.id;
      params.view = 'all';
    } else if (drillDown?.type === 'genre') {
      params.genre = drillDown.name;
      params.view = 'all';
      if (genreFilter !== 'all') params.category_filter = genreFilter;
    } else if (drillDown?.type === 'book') {
      params.story_id = drillDown.id;
      params.view = 'all';
    } else if (activeNav === 'writing') {
      params.view = 'writing';
    } else if (activeNav === 'following') {
      params.view = 'following';
    } else {
      params.view = 'all';
    }

    return params;
  }, [activeNav, sortBy, drillDown, genreFilter]);

  const loadExplore = useCallback(async () => {
    try {
      const res = await getCommunityExplore();
      setExplore({
        genres: res.data?.genres || [],
        popularAuthors: res.data?.popularAuthors || [],
        popularBooks: res.data?.popularBooks || [],
        trendingTopics: res.data?.trendingTopics || [],
      });
      setAuthError(false);
    } catch (error) {
      if (error?.response?.status === 401) setAuthError(true);
    }
  }, []);

  const loadThreads = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await listCommunityThreads(threadParams);
      setThreads(res.data?.threads || []);
      setAuthError(false);
    } catch (error) {
      console.error('Failed to load community threads', error);
      if (error?.response?.status === 401) setAuthError(true);
    } finally {
      setIsLoading(false);
    }
  }, [threadParams]);

  const loadAuthors = useCallback(async (q = '') => {
    try {
      const res = await listCommunityAuthors(q ? { q } : {});
      setAuthors(res.data?.authors || []);
    } catch (error) {
      console.error('Failed to load authors', error);
    }
  }, []);

  useEffect(() => {
    loadExplore();
  }, [loadExplore]);

  useEffect(() => {
    if (activeNav === 'authors' && !drillDown) {
      loadAuthors(authorSearch);
      setIsLoading(false);
      return;
    }
    loadThreads();
  }, [activeNav, drillDown, loadThreads, loadAuthors, authorSearch]);

  const loadFollowingData = useCallback(async () => {
    setIsLoadingFollowing(true);
    try {
      const res = await getMyFollowing();
      setFollowingData(res.data || { genres: [], books: [], authors: [], writers: [] });
      setAuthError(false);
    } catch (error) {
      console.error('Failed to load following data', error);
      if (error?.response?.status === 401) setAuthError(true);
      setFollowingData({ genres: [], books: [], authors: [], writers: [] });
    } finally {
      setIsLoadingFollowing(false);
    }
  }, []);

  useEffect(() => {
    if (activeNav === 'following' && !drillDown) {
      loadFollowingData();
      setIsLoading(false);
    }
  }, [activeNav, drillDown, loadFollowingData]);

  useEffect(() => {
    if (drillDown?.type === 'author') {
      getCommunityAuthor(drillDown.id)
        .then((res) => setAuthorDetail(res.data))
        .catch(() => setAuthorDetail(null));
    } else {
      setAuthorDetail(null);
    }
  }, [drillDown]);

  useEffect(() => {
    if (drillDown?.type === 'genre') {
      getCommunityGenre(drillDown.name)
        .then((res) => setGenreDetail(res.data))
        .catch(() => setGenreDetail(null));
    } else {
      setGenreDetail(null);
    }
  }, [drillDown]);

  useEffect(() => {
    if (drillDown?.type === 'book') {
      getCommunityBook(drillDown.id)
        .then((res) => setBookDetail(res.data))
        .catch(() => setBookDetail(null));
    } else {
      setBookDetail(null);
    }
  }, [drillDown]);

  const visibleThreads = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return threads;
    return threads.filter((thread) => {
      const haystack = [
        thread.title,
        thread.body,
        thread.category,
        thread.story?.title,
        displayName(thread.user),
      ].join(' ').toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [searchQuery, threads]);

  const handleNavClick = (navId) => {
    setActiveNav(navId);
    setDrillDown(null);
    setGenreFilter('all');
  };

  const openGenre = (name) => {
    setActiveNav('genres');
    setDrillDown({ type: 'genre', name });
    setGenreFilter('all');
  };

  const openAuthor = (author) => {
    setActiveNav('authors');
    setDrillDown({ type: 'author', id: author.user_id, name: author.name });
  };

  const openBook = (book) => {
    setActiveNav('books');
    setDrillDown({ type: 'book', id: book.story_id, title: book.title });
  };

  const handleFollow = async (channelType, targetId, genre) => {
    try {
      const payload = { channel_type: channelType, target_id: targetId };
      if (genre) payload.genre = genre;
      await followCommunityChannel(payload);
      if (drillDown?.type === 'author') {
        const res = await getCommunityAuthor(drillDown.id);
        setAuthorDetail(res.data);
      } else if (drillDown?.type === 'genre') {
        const res = await getCommunityGenre(drillDown.name);
        setGenreDetail(res.data);
      } else if (drillDown?.type === 'book') {
        const res = await getCommunityBook(drillDown.id);
        setBookDetail(res.data);
      }
      setNotice('You are now following this community.');
    } catch (error) {
      setNotice(error?.response?.data?.message || 'Unable to follow.');
    }
  };

  const handleUnfollow = async (channelType, targetId, genre) => {
    try {
      const payload = { channel_type: channelType, target_id: targetId };
      if (genre) payload.genre = genre;
      await unfollowCommunityChannel(payload);
      if (drillDown?.type === 'author') {
        const res = await getCommunityAuthor(drillDown.id);
        setAuthorDetail(res.data);
      } else if (drillDown?.type === 'genre') {
        const res = await getCommunityGenre(drillDown.name);
        setGenreDetail(res.data);
      } else if (drillDown?.type === 'book') {
        const res = await getCommunityBook(drillDown.id);
        setBookDetail(res.data);
      }
    } catch (error) {
      setNotice(error?.response?.data?.message || 'Unable to unfollow.');
    }
  };

  const handleCreateThread = async (event) => {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    try {
      const bodyParts = [form.body.trim()].filter(Boolean);
      if (form.tagText.trim()) bodyParts.push(`Tag: ${form.tagText.trim()}`);

      let target_id = null;
      let channel_type = form.channel_type;
      let flair = form.flair || null;

      if (drillDown?.type === 'author') {
        channel_type = 'Author';
        target_id = drillDown.id;
      } else if (drillDown?.type === 'genre') {
        channel_type = 'Genre';
        flair = drillDown.name;
      } else if (drillDown?.type === 'book') {
        channel_type = 'Book';
        target_id = drillDown.id;
      }

      const res = await createCommunityThread({
        title: form.title,
        body: bodyParts.join('\n\n'),
        category: form.category,
        channel_type,
        target_id,
        flair,
        spoiler: form.spoiler,
        story_id: form.story_id || (drillDown?.type === 'book' ? drillDown.id : null),
      });

      const createdThread = res.data?.thread;
      if (createdThread) {
        setThreads((current) => [{ ...createdThread, reply_count: 0, is_saved: false }, ...current]);
        setForm(defaultThread);
        setIsModalOpen(false);
        setNotice('Discussion started.');
      }
    } catch (error) {
      setNotice(error?.response?.data?.message || 'Unable to start discussion.');
    } finally {
      setBusy(false);
    }
  };

  const handleReply = async (threadId) => {
    const draft = (replyDrafts[threadId] || '').trim();
    if (!draft) return;
    setBusy(true);
    try {
      const res = await createCommunityReply(threadId, { body: draft, spoiler: false });
      const reply = res.data?.reply;
      if (reply) {
        setThreads((current) =>
          current.map((thread) =>
            thread.id === threadId
              ? { ...thread, replies: [...(thread.replies || []), reply], reply_count: (thread.reply_count || 0) + 1 }
              : thread
          )
        );
        setReplyDrafts((current) => ({ ...current, [threadId]: '' }));
      }
    } catch (error) {
      setNotice(error?.response?.data?.message || 'Unable to add reply.');
    } finally {
      setBusy(false);
    }
  };

  const handleVoteThread = async (threadId, voteType) => {
    try {
      await voteCommunityThread(threadId, voteType);
      setThreads((current) =>
        current.map((thread) => {
          if (thread.id !== threadId) return thread;
          return {
            ...thread,
            upvotes: voteType === 1 ? (thread.upvotes || 0) + 1 : thread.upvotes,
            downvotes: voteType === -1 ? (thread.downvotes || 0) + 1 : thread.downvotes,
          };
        })
      );
    } catch (error) {
      console.error('Failed to vote', error);
    }
  };

  const handleSaveThread = async (threadId) => {
    try {
      const res = await saveCommunityThread(threadId);
      const isSaved = res.data?.is_saved;
      setThreads((current) =>
        current.map((thread) => (thread.id === threadId ? { ...thread, is_saved: isSaved } : thread))
      );
    } catch (error) {
      setNotice(error?.response?.data?.message || 'Unable to save.');
    }
  };

  const handleBookSearch = async (value) => {
    const nextValue = value.trim();
    setBookQuery(nextValue);
    if (!nextValue) {
      setBookResults([]);
      return;
    }
    setIsSearchingBooks(true);
    try {
      const res = await searchBooks(nextValue);
      setBookResults(res.data?.stories || []);
    } catch (error) {
      console.error('Book search failed', error);
    } finally {
      setIsSearchingBooks(false);
    }
  };

  const selectBook = (story) => {
    if (story === null) {
      setForm((current) => ({ ...current, story_id: null, bookTitle: '' }));
    } else {
      setForm((current) => ({ ...current, story_id: story.story_id, bookTitle: story.title || 'Untitled story' }));
    }
    setBookQuery('');
    setBookResults([]);
  };

  const handleDeleteThread = async (threadId) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
      await deleteCommunityThread(threadId);
      setThreads((current) => current.filter((thread) => thread.id !== threadId));
      setNotice('Post deleted successfully.');
    } catch (error) {
      setNotice(error?.response?.data?.message || 'Unable to delete post.');
    }
  };

  const getCurrentUserId = () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.id || payload.user_id || payload.userId;
    } catch {
      return null;
    }
  };

  const renderThreadCard = (thread) => {
    const score = (thread.upvotes || 0) - (thread.downvotes || 0);
    const replyCount = thread.reply_count ?? thread.replies?.length ?? 0;
    const genreLabel = thread.story?.category || thread.flair || formatCategoryLabel(thread.category);
    const isExpanded = expandedThread === thread.id;
    const currentUserId = getCurrentUserId();
    const isAuthor = thread.user?.user_id === currentUserId;

    return (
      <article key={thread.id} className={styles.feedCard}>
        <div className={styles.feedCardTop}>
          <span className={styles.genrePill}>[Genre] {genreLabel}</span>
          {thread.story ? (
            <button type="button" className={styles.bookPill} onClick={() => openBook(thread.story)}>
              [Book: {thread.story.title}]
            </button>
          ) : null}
          {isAuthor && (
            <button 
              type="button" 
              className={styles.textButton} 
              onClick={() => handleDeleteThread(thread.id)}
              style={{ marginLeft: 'auto', fontSize: '1.2rem' }}
              title="Delete post"
              aria-label="Delete post"
            >
              Delete
            </button>
          )}
        </div>
        <div className={styles.feedMeta}>
          @{displayName(thread.user)} · {formatRelativeTime(thread.created_at)}
        </div>
        <h3 className={styles.feedTitle}>{thread.title}</h3>
        <p className={styles.feedPreview}>
          {thread.body.length > 180 && !isExpanded ? `${thread.body.slice(0, 180)}…` : thread.body}
        </p>
        {thread.body.length > 180 ? (
          <button type="button" className={styles.textButton} onClick={() => setExpandedThread(isExpanded ? null : thread.id)}>
            {isExpanded ? 'Show less' : 'Read more'}
          </button>
        ) : null}
        <div className={styles.feedActions}>
          <button type="button" className={styles.feedActionBtn} onClick={() => handleVoteThread(thread.id, 1)}>
            ↑ {formatCount(score)}
          </button>
          <button type="button" className={styles.feedActionBtn} onClick={() => setExpandedThread(isExpanded ? null : thread.id)}>
            💬 {formatCount(replyCount)}
          </button>
          <button
            type="button"
            className={`${styles.feedActionBtn} ${thread.is_saved ? styles.feedActionActive : ''}`}
            onClick={() => handleSaveThread(thread.id)}
          >
            {thread.is_saved ? 'Saved' : 'Save'}
          </button>
        </div>
        {isExpanded ? (
          <div className={styles.expandedPanel}>
            <div className={styles.repliesSection}>
              {thread.replies?.length ? (
                thread.replies.map((reply) => (
                  <div key={reply.id} className={styles.replyItem}>
                    <p>{reply.body}</p>
                    <span>— @{displayName(reply.user)} · {formatRelativeTime(reply.created_at)}</span>
                  </div>
                ))
              ) : (
                <p className={styles.emptyReply}>No replies yet — be the first.</p>
              )}
            </div>
            <div className={styles.replyComposer}>
              <textarea
                className={styles.textarea}
                rows={2}
                placeholder="Reply thoughtfully…"
                value={replyDrafts[thread.id] || ''}
                onChange={(event) => setReplyDrafts((current) => ({ ...current, [thread.id]: event.target.value }))}
              />
              <button className={styles.replyButton} onClick={() => handleReply(thread.id)} disabled={busy} type="button">
                Reply
              </button>
            </div>
          </div>
        ) : null}
      </article>
    );
  };

  const renderMainContent = () => {
    if (activeNav === 'following' && !drillDown) {
      return (
        <section className={styles.directorySection}>
          <h2 className={styles.sectionHeading}>Your Following</h2>
          {isLoadingFollowing ? (
            <p className={styles.empty}>Loading your follows…</p>
          ) : (
            <>
              {followingData.genres.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 className={styles.subHeading}>Genres</h3>
                  <div className={styles.genreGrid}>
                    {followingData.genres.map((genre) => (
                      <button key={genre.name} type="button" className={styles.genreCard} onClick={() => openGenre(genre.name)}>
                        {genre.name} ({formatCount(genre.book_count)} books)
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {followingData.writers.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 className={styles.subHeading}>Writers</h3>
                  <div className={styles.directoryGrid}>
                    {followingData.writers.map((writer) => (
                      <div key={writer.user_id} className={styles.directoryCard}>
                        <div className={styles.directoryAvatar}>
                          {writer.profile_image ? <img src={writer.profile_image} alt="" /> : '✍️'}
                        </div>
                        <div>
                          <strong>{writer.name}</strong>
                        </div>
                        <button type="button" className={styles.viewCommunityBtn} onClick={() => openAuthor(writer)}>
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {followingData.books.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 className={styles.subHeading}>Books</h3>
                  <div className={styles.bookGrid}>
                    {followingData.books.map((book) => (
                      <button key={book.story_id} type="button" className={styles.bookCardMini} onClick={() => openBook(book)}>
                        {book.cover_url ? <img src={book.cover_url} alt="" /> : <span>📖</span>}
                        <div>
                          <strong>{book.title}</strong>
                          <p>{book.author_name} · {book.discussion_count} discussions</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {followingData.genres.length === 0 && followingData.writers.length === 0 && followingData.books.length === 0 && (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIllustration}>🔭</div>
                  <h3>Not following anything yet</h3>
                  <p>Follow genres, writers, and books to see them here.</p>
                </div>
              )}
            </>
          )}
        </section>
      );
    }

    if (activeNav === 'authors' && !drillDown) {
      return (
        <section className={styles.directorySection}>
          <h2 className={styles.sectionHeading}>Authors</h2>
          <input
            className={styles.input}
            placeholder="Search authors…"
            value={authorSearch}
            onChange={(e) => setAuthorSearch(e.target.value)}
          />
          <div className={styles.directoryGrid}>
            {authors.map((author) => (
              <div key={author.user_id} className={styles.directoryCard}>
                <div className={styles.directoryAvatar}>
                  {author.profile_image ? <img src={author.profile_image} alt="" /> : '✍️'}
                </div>
                <div>
                  <strong>{author.name}</strong>
                  <p>{formatCount(author.reader_count)} readers · {author.book_count} books</p>
                </div>
                <button type="button" className={styles.viewCommunityBtn} onClick={() => openAuthor(author)}>
                  View Community
                </button>
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (activeNav === 'genres' && !drillDown) {
      return (
        <section className={styles.directorySection}>
          <h2 className={styles.sectionHeading}>Browse by genre</h2>
          <div className={styles.genreGrid}>
            {explore.genres.map((genre) => (
              <button key={genre} type="button" className={styles.genreCard} onClick={() => openGenre(genre)}>
                {genre}
              </button>
            ))}
          </div>
        </section>
      );
    }

    if (activeNav === 'books' && !drillDown) {
      return (
        <section className={styles.directorySection}>
          <h2 className={styles.sectionHeading}>Popular books</h2>
          <div className={styles.bookGrid}>
            {explore.popularBooks.map((book) => (
              <button key={book.story_id} type="button" className={styles.bookCardMini} onClick={() => openBook(book)}>
                {book.cover_url ? <img src={book.cover_url} alt="" /> : <span>📖</span>}
                <div>
                  <strong>{book.title}</strong>
                  <p>{book.author_name} · {book.discussion_count} discussions</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      );
    }

    return (
      <>
        {drillDown?.type === 'author' && authorDetail ? (
          <section className={styles.detailHeader}>
            <button type="button" className={styles.backBtn} onClick={() => setDrillDown(null)}>← Back</button>
            <div className={styles.detailHero}>
              <div>
                <h2>{authorDetail.author.name}</h2>
                <p>{formatCount(authorDetail.author.reader_count)} readers · {authorDetail.author.book_count} books · {authorDetail.author.discussion_count} discussions</p>
              </div>
              <button
                type="button"
                className={styles.followBtn}
                onClick={() =>
                  authorDetail.author.is_following
                    ? handleUnfollow('Author', authorDetail.author.user_id)
                    : handleFollow('Author', authorDetail.author.user_id)
                }
              >
                {authorDetail.author.is_following ? 'Following' : 'Follow'}
              </button>
            </div>
            <div className={styles.detailTabs}>
              <span className={styles.detailTabActive}>Books</span>
              <span className={styles.detailTab}>Discussions</span>
            </div>
            <div className={styles.bookGrid}>
              {authorDetail.books.map((book) => (
                <button key={book.story_id} type="button" className={styles.bookCardMini} onClick={() => openBook(book)}>
                  {book.cover_url ? <img src={book.cover_url} alt="" /> : <span>📖</span>}
                  <div><strong>{book.title}</strong><p>{book.category}</p></div>
                </button>
              ))}
            </div>
            <h3 className={styles.subHeading}>Latest discussions</h3>
          </section>
        ) : null}

        {drillDown?.type === 'genre' && genreDetail ? (
          <section className={styles.detailHeader}>
            <button type="button" className={styles.backBtn} onClick={() => setDrillDown(null)}>← Back</button>
            <div className={styles.detailHero}>
              <div>
                <h2>{genreDetail.genre} Community</h2>
                <p>{formatCount(genreDetail.member_count)} books · {genreDetail.discussion_count} discussions</p>
              </div>
              <button
                type="button"
                className={styles.followBtn}
                onClick={() =>
                  genreDetail.is_following
                    ? handleUnfollow('Genre', null, genreDetail.genre)
                    : handleFollow('Genre', null, genreDetail.genre)
                }
              >
                {genreDetail.is_following ? 'Following' : 'Follow'}
              </button>
            </div>
            <div className={styles.chipsRow}>
              {GENRE_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`${styles.chip} ${genreFilter === f.id ? styles.chipActive : ''}`}
                  onClick={() => setGenreFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <h3 className={styles.subHeading}>Popular books in {genreDetail.genre}</h3>
            <div className={styles.bookGrid}>
              {(genreDetail.books || []).map((book) => (
                <button key={book.story_id} type="button" className={styles.bookCardMini} onClick={() => openBook(book)}>
                  {book.cover_url ? <img src={book.cover_url} alt="" /> : <span>📖</span>}
                  <div><strong>{book.title}</strong><p>{book.author_name} · {book.discussion_count} discussions</p></div>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {drillDown?.type === 'book' && bookDetail ? (
          <section className={styles.detailHeader}>
            <button type="button" className={styles.backBtn} onClick={() => setDrillDown(null)}>← Back</button>
            <div className={styles.detailHero}>
              <div>
                <h2>{bookDetail.book.title}</h2>
                <p>by {bookDetail.book.author_name} · {bookDetail.book.discussion_count} discussions</p>
              </div>
              <button
                type="button"
                className={styles.followBtn}
                onClick={() =>
                  bookDetail.book.is_following
                    ? handleUnfollow('Book', bookDetail.book.story_id)
                    : handleFollow('Book', bookDetail.book.story_id)
                }
              >
                {bookDetail.book.is_following ? 'Following' : 'Follow'}
              </button>
            </div>
            <Link to={`/story/${bookDetail.book.story_id}`} className={styles.bookLink}>Read book →</Link>
          </section>
        ) : null}

        <section className={styles.feedSection}>
          <div className={styles.feedSectionHeader}>
            <h2 className={styles.sectionHeading}>Community discussions</h2>
            <div className={styles.sortRow}>
              {SORT_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.sortBtn} ${sortBy === item.id ? styles.sortBtnActive : ''}`}
                  onClick={() => setSortBy(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          {notice ? <p className={styles.notice}>{notice}</p> : null}
          {authError ? <p className={styles.notice}>Please sign in again to use the community space.</p> : null}
          {isLoading ? <p className={styles.empty}>Loading discussions…</p> : null}
          {!isLoading && visibleThreads.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIllustration}>☕📖</div>
              <h3>No discussions yet</h3>
              <p>Start the first conversation in this space.</p>
            </div>
          ) : null}
          <div className={styles.threadList}>{visibleThreads.map(renderThreadCard)}</div>
        </section>
      </>
    );
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Aurora Community</p>
          <h1>Reading nooks, writer circles, and cozy discussion spaces.</h1>
        </div>
        <div className={styles.heroActions}>
          <label className={styles.searchBar}>
            <span className={styles.searchIcon}>🔎</span>
            <input
              type="text"
              placeholder="Search discussions…"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
          <button className={styles.heroButton} onClick={() => setIsModalOpen(true)} type="button">
            + New Post
          </button>
        </div>
      </section>

      <nav className={styles.communityNav}>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`${styles.navPill} ${activeNav === item.id && !drillDown ? styles.navPillActive : ''}`}
            onClick={() => handleNavClick(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className={styles.layout}>
        <main className={styles.mainPane}>{renderMainContent()}</main>

        <aside className={styles.sidebar}>
          <div className={styles.sidebarCard}>
            <h3>📚 Trending Books</h3>
            <div className={styles.bookGrid}>
              {explore.popularBooks.slice(0, 4).map((book) => (
                <button key={book.story_id} type="button" className={styles.bookCardMini} onClick={() => openBook(book)}>
                  {book.cover_url ? <img src={book.cover_url} alt="" /> : <span>📖</span>}
                  <div>
                    <strong>{book.title}</strong>
                    <p>{book.author_name}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          <div className={styles.sidebarCard}>
            <h3>✍️ Featured Authors</h3>
            <div className={styles.directoryGrid}>
              {explore.popularAuthors.slice(0, 4).map((author) => (
                <div key={author.user_id} className={styles.directoryCard}>
                  <div className={styles.directoryAvatar}>
                    {author.profile_image ? <img src={author.profile_image} alt="" /> : '✍️'}
                  </div>
                  <div>
                    <strong>{author.name}</strong>
                    <p>{formatCount(author.reader_count)} readers</p>
                  </div>
                  <button type="button" className={styles.viewCommunityBtn} onClick={() => openAuthor(author)}>
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.sidebarCard}>
            <h3>🏷️ Trending Topics</h3>
            <ul className={styles.tagList}>
              {explore.trendingTopics.map((tag) => (
                <li key={tag}>
                  <button type="button" className={styles.tagChip} onClick={() => setSearchQuery(tag.replace('#', ''))}>{tag}</button>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.sidebarCard}>
            <h3>🎭 Browse Genres</h3>
            <div className={styles.genreGrid}>
              {explore.genres.slice(0, 6).map((genre) => (
                <button key={genre} type="button" className={styles.genreCard} onClick={() => openGenre(genre)}>
                  {genre}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.sidebarCard}>
            <h3>☕ Cozy Guidelines</h3>
            <p style={{color: 'rgba(139, 127, 119, 0.8)', lineHeight: '1.6', fontSize: '0.9rem'}}>Keep the space warm, respectful, and spoiler-aware so readers can feel safe sharing their thoughts.</p>
          </div>
        </aside>
      </div>

      {isModalOpen ? (
        <div className={styles.modalBackdrop} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modalCard} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>New post</p>
                <h3>Start a new discussion</h3>
              </div>
              <button className={styles.secondaryButton} onClick={() => setIsModalOpen(false)} type="button">Close</button>
            </div>
            <form onSubmit={handleCreateThread} className={styles.form}>
              <input className={styles.input} placeholder="Title your discussion…" value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} required />
              <textarea className={styles.textarea} placeholder="Share your thoughts…" rows={5} value={form.body} onChange={(e) => setForm((c) => ({ ...c, body: e.target.value }))} required />
              <select className={styles.select} value={form.category} onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))}>
                <option value="general">General</option>
                <option value="book-reviews">Book Reviews</option>
                <option value="writing-advice">Writing Advice</option>
                <option value="chapter-discussions">Chapter Discussions</option>
              </select>
              <div className={styles.bookSearchWrap}>
                <input
                  className={styles.input}
                  placeholder="Link a book from Aurora…"
                  value={bookQuery !== '' ? bookQuery : form.bookTitle}
                  onChange={(e) => {
                    const value = e.target.value;
                    setBookQuery(value);
                    if (!value) {
                      setForm((c) => ({ ...c, story_id: null, bookTitle: '' }));
                      setBookResults([]);
                      return;
                    }
                    handleBookSearch(value);
                  }}
                />
                {bookResults.length > 0 && bookQuery ? (
                  <div className={styles.bookResults}>
                    {bookResults.map((story) => (
                      <button key={story.story_id} className={styles.bookResult} onClick={() => selectBook(story)} type="button">
                        <span>{story.title || 'Untitled'}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <input className={styles.input} placeholder="#writingtips or #chapter4" value={form.tagText} onChange={(e) => setForm((c) => ({ ...c, tagText: e.target.value }))} />
              <div className={styles.formActions}>
                <button className={styles.submitButton} disabled={busy} type="submit">{busy ? 'Posting…' : 'Publish discussion'}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

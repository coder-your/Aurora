export const CATEGORIES = [
  "Adventure","Romance","Fantasy","Science Fiction","Mystery","Thriller",
  "Horror","Drama","Historical Fiction","General Fiction","Humor","Poetry",
  "Paranormal","Young Adult","Short Story"
];

export const TAGS = [
  "Adventure","Friendship","Found Family","Inspiring","Hopeful","Uplifting","Wholesome",
  "Funny","Lighthearted","Heartwarming","Emotional","Nostalgic","Imaginative","Magical",
  "Mystery Vibes","Calm","Cozy","Creative","Exciting","Dramatic","Motivational",
  "Slice of Life","Courage","Teamwork","Discovery","Problem-Solving","Coming of Age",
  "Fantasy Elements","Thought-Provoking","Short & Sweet"
];

export const AUTOSAVE = {
  MINUTES: Number(process.env.AUTOSAVE_SNAPSHOT_MINUTES || 2),
  CHANGE_THRESHOLD: Number(process.env.AUTOSAVE_CHANGE_THRESHOLD || 0.08),
  KEEP_VERSIONS: Number(process.env.VERSION_KEEP || 10)
};

export const MAX_UPLOAD_SIZE = Number(process.env.MAX_UPLOAD_SIZE || 5_242_880); // 5MB

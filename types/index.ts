export interface User {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Song {
  id: string;
  spotify_id: string;
  spotify_album_id: string | null;
  title: string;
  artist: string;
  album_name: string;
  album_art_url: string | null;
  duration_seconds: number;
  created_at: string;
}

export interface Rating {
  id: string;
  user_id: string;
  song_id: string;
  vibe: "loved" | "liked" | "didnt_like";
  replay_value: number;
  lyrics: number;
  production: number;
  overall_score: number;
  notes: string | null;
  best_for_tags: string[];
  genre_tags: string[];
  listened_at: string;
  created_at: string;
  song?: Song;
}

export interface Album {
  id: string;
  spotify_album_id: string;
  title: string;
  artist: string;
  album_art_url: string | null;
  release_year: number;
  created_at: string;
}

export interface AlbumRating {
  id: string;
  user_id: string;
  album_id: string;
  manual_overall_score: number | null;
  calculated_score: number | null;
  created_at: string;
}

export interface Comparison {
  id: string;
  user_id: string;
  winner_song_id: string;
  loser_song_id: string;
  created_at: string;
}

export type VibeOption = "loved" | "liked" | "didnt_like";

export const BEST_FOR_TAGS = [
  "Late Night",
  "Workout",
  "Focus",
  "Heartbreak",
  "Hype",
  "Road Trip",
  "Chill",
  "Other",
] as const;

export const GENRE_TAGS = [
  "Rap", "R&B", "Pop", "Indie", "Electronic", "Alternative",
  "Jazz", "Classical", "Country", "Latin", "Afrobeats", "Soul",
  "Metal", "Folk", "K-Pop", "Drill", "Trap", "House", "Ambient",
  "Other",
] as const;

export type BestForTag = (typeof BEST_FOR_TAGS)[number];
export type GenreTag = (typeof GENRE_TAGS)[number];

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { id?: string; name: string }[];
  album: {
    id: string;
    name: string;
    images: { url: string }[];
    release_date: string;
  };
  duration_ms: number;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  artists: { name: string }[];
  images: { url: string }[];
  release_date: string;
  total_tracks: number;
  tracks?: {
    items: SpotifyTrack[];
  };
}

export interface RatingFormState {
  song: SpotifyTrack | null;
  vibe: VibeOption | null;
  replay_value: number | null;
  lyrics: number | null;
  production: number | null;
  comparisonWon: boolean | null;
  comparisonSongId: string | null;
  best_for_tags: string[];
  genre_tags: string[];
  custom_vibe_tag: string;
  album_id: string | null;
  listened_at: string;
  notes: string;
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  email: string;
  display_name: string;
  is_admin: boolean;
  created_at: string;
  profile_photo_url?: string | null;
  bio?: string | null;
  spotify_playlist_url?: string | null;
};

export type Submission = {
  id: string;
  user_id: string;
  year: number;
  artists: string[];
  songs: string[];
  submitted_at: string;
};

export type Result = {
  id: string;
  user_id: string;
  year: number;
  actual_artists: string[];
  actual_songs: string[];
  entered_at: string;
};

export type Score = {
  id: string;
  user_id: string;
  year: number;
  correct_artists: number;
  correct_songs: number;
  total_correct: number;
  ranking_accuracy_score: number;
  exact_match_score: number;
  final_rank: number;
  calculated_at: string;
};

export type BuffaloBalance = {
  id: string;
  year: number;
  caller_id: string;
  recipient_id: string;
  balance: number;
};

export type BuffaloCall = {
  id: string;
  caller_id: string;
  recipient_id: string;
  year: number;
  called_at: string;
  photo_url: string | null;
  photo_uploaded_at: string | null;
  timer_deadline?: string | null;
  status?: 'pending' | 'completed' | 'expired';
  message?: string | null;
  video_url?: string | null;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
};

export type FeedEvent = {
  id: string;
  event_type: 'submission' | 'buffalo_call' | 'result' | 'playlist_share' | 'ranking';
  user_id: string;
  related_user_id: string | null;
  year: number;
  title: string;
  description: string | null;
  media_url: string | null;
  metadata: Record<string, any>;
  created_at: string;
};

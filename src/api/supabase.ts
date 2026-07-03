import { invoke } from '@tauri-apps/api/core';
import { createLogger } from '../utils/logger';

const log = createLogger('supabase-api');

// ── Types (matching Rust structs) ──────────────────────────────────────────

export interface Comment {
  id: string;
  package_id: string;
  user_id: string;
  user_name: string;
  user_avatar_url: string | null;
  user_banner_url: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Rating {
  id: string;
  package_id: string;
  user_id: string;
  score: number;
  created_at: string;
  updated_at: string;
}

export interface RatingStats {
  average: number;
  count: number;
  distribution: number[];
}

// ── Comments API ───────────────────────────────────────────────────────────

export async function getComments(packageId: string): Promise<Comment[]> {
  log.info(`getComments("${packageId}")`);
  const result = await invoke<Comment[]>('sb_get_comments', { packageId });
  log.info(`getComments => ${result.length} comments`);
  return result;
}

export async function addComment(
  packageId: string,
  content: string,
): Promise<Comment> {
  log.info(`addComment("${packageId}")`);
  const result = await invoke<Comment>('sb_add_comment', { packageId, content });
  log.info(`addComment => ${result.id}`);
  return result;
}

export async function updateComment(
  commentId: string,
  content: string,
): Promise<Comment> {
  log.info(`updateComment("${commentId}")`);
  const result = await invoke<Comment>('sb_update_comment', { commentId, content });
  log.info(`updateComment => OK`);
  return result;
}

export async function deleteComment(commentId: string): Promise<void> {
  log.info(`deleteComment("${commentId}")`);
  await invoke<void>('sb_delete_comment', { commentId });
  log.info(`deleteComment => OK`);
}

// ── Ratings API ────────────────────────────────────────────────────────────

export async function getUserRating(packageId: string): Promise<Rating | null> {
  log.info(`getUserRating("${packageId}")`);
  const result = await invoke<Rating | null>('sb_get_user_rating', { packageId });
  log.info(`getUserRating => ${result ? result.score : 'null'}`);
  return result;
}

export async function getRatingStats(packageId: string): Promise<RatingStats> {
  log.info(`getRatingStats("${packageId}")`);
  const result = await invoke<RatingStats>('sb_get_rating_stats', { packageId });
  log.info(`getRatingStats => avg=${result.average.toFixed(1)}, count=${result.count}`);
  return result;
}

export async function setRating(
  packageId: string,
  score: number,
): Promise<Rating> {
  log.info(`setRating("${packageId}", ${score})`);
  const result = await invoke<Rating>('sb_set_rating', { packageId, score });
  log.info(`setRating => OK`);
  return result;
}

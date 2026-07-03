import { invoke } from '@tauri-apps/api/core';
import { createLogger } from '../utils/logger';

const log = createLogger('api.rating');

export async function getRating(packageId: string): Promise<number | null> {
  const result = await invoke<number | null>('get_rating', { packageId });
  return result;
}

export async function setRating(packageId: string, score: number): Promise<void> {
  log.info(`setRating("${packageId}", ${score})`);
  await invoke('set_rating', { packageId, score });
}

export async function getAvgRating(packageId: string): Promise<{ avg: number; count: number }> {
  const result = await invoke<[number, number]>('get_avg_rating', { packageId });
  return { avg: result[0], count: result[1] };
}

export interface Comment {
  id: number;
  package_id: string;
  author: string;
  content: string;
  created_at: string;
}

export async function getComments(packageId: string): Promise<Comment[]> {
  return invoke<Comment[]>('get_comments', { packageId });
}

export async function addComment(packageId: string, author: string, content: string): Promise<number> {
  log.info(`addComment("${packageId}", "${author}")`);
  return invoke<number>('add_comment', { packageId, author, content });
}

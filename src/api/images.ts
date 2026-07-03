import { invoke } from '@tauri-apps/api/core';
import { createLogger } from '../utils/logger';

const log = createLogger('api.images');

export async function uploadImage(base64Data: string, filename: string): Promise<string> {
  log.info(`uploadImage("${filename}", ${base64Data.length} bytes)`);
  const url = await invoke<string>('upload_image', { imageData: base64Data, filename });
  log.info(`uploadImage => ${url.substring(0, 60)}...`);
  return url;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

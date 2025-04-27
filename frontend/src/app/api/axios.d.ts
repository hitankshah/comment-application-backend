import { AxiosInstance } from 'axios';

declare module 'axios' {
  interface AxiosInstance {
    /**
     * Clears the API request cache
     * @param url Optional URL path to clear specific cache entries
     */
    clearCache(url?: string): void;
  }
}
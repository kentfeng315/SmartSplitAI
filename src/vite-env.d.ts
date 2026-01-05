/// <reference types="vite/client" />

declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY?: string;
    FIREBASE_CONFIG?: string;
    [key: string]: string | undefined;
  }
}

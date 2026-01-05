import { Bill, Member } from '../types';

export interface CloudData {
  members: Member[];
  bills: Bill[];
  updatedAt: number;
}

// Service disabled to prevent "Failed to fetch" errors.
// Using LocalStorage + URL Snapshot + File Export instead.
export const cloudService = {
  saveNew: async (data: CloudData): Promise<string> => {
    console.warn("Cloud service disabled in favor of local storage");
    return "";
  },

  update: async (id: string, data: CloudData): Promise<void> => {
    console.warn("Cloud service disabled in favor of local storage");
  },

  load: async (id: string): Promise<CloudData> => {
    throw new Error("Cloud service disabled");
  }
};
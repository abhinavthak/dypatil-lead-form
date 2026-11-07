import type { LeadApi, LeadData } from './types';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Mock backend for the prototype. Swap for real endpoints by passing your own `LeadApi`.
 * - OTP `1111` is rejected (matches the "Wrong OTP" screen); any other code passes.
 * - Phone numbers ending in 2168 are treated as an existing lead (matches the "Existing User" screen).
 */
export const mockApi: LeadApi = {
  async sendOtp(phone) {
    await wait(500);
    console.info('[mockApi] OTP sent to', phone);
  },
  async verifyOtp(_phone, code) {
    await wait(500);
    return code !== '1111';
  },
  async lookupLead(phone) {
    await wait(300);
    if (phone.endsWith('2168')) {
      return { name: 'Himanshu Potdar', email: 'himanshu@upgrad.com', qualification: 'Graduate' };
    }
    return null;
  },
  async submitLead(lead: LeadData) {
    await wait(800);
    console.info('[mockApi] lead submitted', lead);
  },
};

import { authAPI } from './api';

const TOKEN_KEY = 'dropmap_admin_token';
const PARTNER_KEY = 'dropmap_admin_partner';

export function isLoggedIn() {
  return !!localStorage.getItem(TOKEN_KEY);
}

export function getPartner() {
  const stored = localStorage.getItem(PARTNER_KEY);
  return stored ? JSON.parse(stored) : null;
}

export async function login(phone, pin) {
  const res = await authAPI.login(phone, pin);
  const { token, partner } = res.data;

if (partner.role !== 'admin') {
    throw new Error('This account does not have dashboard access. Admin only.');
  }

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(PARTNER_KEY, JSON.stringify(partner));
  return partner;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PARTNER_KEY);
}
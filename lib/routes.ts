import type { Href } from 'expo-router';

// Rutas tipadas en un solo sitio; los segmentos dinámicos se montan aquí.
export const routes = {
  home: '/' as Href,
  pacts: '/pacts' as Href,
  copilot: '/copilot' as Href,
  onboarding: '/onboarding' as Href,
  profile: '/profile' as Href,
  progress: '/progress' as Href,
  vault: '/vault' as Href,
  wallet: '/wallet' as Href,
  newPact: '/pact/new' as Href,
  kit: '/kit' as Href,
  pact: (id: string, query = '') => `/pact/${id}${query}` as Href,
  proof: (id: string) => `/pact/${id}/proof` as Href,
  result: (id: string) => `/pact/${id}/result` as Href,
  appeal: (id: string) => `/pact/${id}/appeal` as Href,
  witness: (id: string) => `/witness/${id}` as Href,
};

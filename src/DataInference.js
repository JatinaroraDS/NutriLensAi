/**
 * DataInference.js
 * Collects and stores user context in localStorage.
 */

export const DataInference = {
  async getContext() {
    const local = JSON.parse(localStorage.getItem('nl_ctx')) || {};
    return {
      sleepScore: local.sleepScore ?? 70,
      stressLevel: local.stressLevel ?? 'medium',
      lastMeal: local.lastMeal ?? null,
      hour: new Date().getHours(),
      goal: local.goal ?? 'maintain',
      diet: local.diet ?? 'none'
    };
  },
  save(data) {
    const current = JSON.parse(localStorage.getItem('nl_ctx')) || {};
    localStorage.setItem('nl_ctx', JSON.stringify({ ...current, ...data }));
  }
};

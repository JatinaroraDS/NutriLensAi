/**
 * ContextAnalysis.js
 * Applies risk rules based on user context.
 */

export const ContextAnalysis = {
  evaluate(ctx) {
    const flags = [];
    if (ctx.sleepScore < 60)
      flags.push({ type: 'HIGH_RISK', focus: ['low-glycemic', 'magnesium-rich', 'protein'] });
    if (ctx.stressLevel === 'high')
      flags.push({ type: 'STRESS', focus: ['anti-inflammatory', 'hydration', 'omega-3'] });
    if (ctx.hour >= 17 && ctx.hour <= 20)
      flags.push({ type: 'EVENING', focus: ['light-meal', 'avoid-sugar'] });
    return flags;
  }
};

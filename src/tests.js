/**
 * tests.js
 * Unit tests for core logic.
 */
import { ContextAnalysis } from './ContextAnalysis.js';

export const runTests = () => {
  const results = [];

  // Test 1: Sleep Rule
  const ctxLowSleep = { sleepScore: 50, stressLevel: 'medium', hour: 10 };
  const flagsSleep = ContextAnalysis.evaluate(ctxLowSleep);
  results.push({
    test: "Sleep rule (score=50 -> HIGH_RISK)",
    success: flagsSleep.some(f => f.type === 'HIGH_RISK')
  });

  // Test 2: Stress Rule
  const ctxHighStress = { sleepScore: 80, stressLevel: 'high', hour: 10 };
  const flagsStress = ContextAnalysis.evaluate(ctxHighStress);
  results.push({
    test: "Stress rule (high -> STRESS)",
    success: flagsStress.some(f => f.type === 'STRESS')
  });

  // Test 3: Calorie Goal Mock Validator
  const validateGoal = (goal) => ['lose weight', 'build muscle', 'maintain'].includes(goal);
  results.push({
    test: "Goal validator",
    success: validateGoal('maintain') && !validateGoal('fly')
  });

  console.table(results);
  return results;
};

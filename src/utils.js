// utils.js - Debounce Utility

/**
 * Creates a debounced function that delays invoking `func` until after `delay` milliseconds
 * have passed since the last time the debounced function was invoked.
 * 
 * @param {Function} func - The function to debounce
 * @param {number} delay - The delay in milliseconds
 * @returns {Function} - The debounced function
 */
export const debounce = (func, delay) => {
  let timeoutId;
  return function(...args) {
    // Clear any existing timeout
    clearTimeout(timeoutId);
    
    // Set a new timeout
    timeoutId = setTimeout(() => {
      // Apply the original function with the provided arguments
      func.apply(this, args);
    }, delay);
  };
};

/**
 * Creates a throttled function that only invokes `func` at most once per
 * every `limit` milliseconds.
 *
 * @param {Function} func - The function to throttle
 * @param {number} limit - The time limit in milliseconds
 * @returns {Function} - The throttled function
 */
export const throttle = (func, limit) => {
  let lastCall = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      func.apply(this, args);
    }
  };
};

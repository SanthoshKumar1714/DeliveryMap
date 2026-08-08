// Prevents firing the same request again while one is still in-flight.
// Usage: wrap any async function that shouldn't overlap with itself.
export function preventOverlap(asyncFn) {
  let inFlight = false;

  return async (...args) => {
    if (inFlight) {
      return null; // silently skip — a call is already running
    }
    inFlight = true;
    try {
      return await asyncFn(...args);
    } finally {
      inFlight = false;
    }
  };
}

// Debounce: delays calling fn until `delay` ms of silence.
// Usage: for search-as-you-type inputs.
export function debounce(fn, delay = 400) {
  let timer = null;

  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
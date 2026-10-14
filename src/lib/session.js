// Session inactivity timeouts (in seconds).
// Business and staff get 15 minutes; admin gets 5 for extra safety.
export const SESSION_TIMEOUTS = {
  business: 15 * 60,
  staff: 15 * 60,
  admin: 5 * 60,
};

export const WARNING_WINDOW_SECONDS = 60;

// Keys used across tabs.
export const ACTIVITY_KEY = "booking-saas-last-activity";
export const LOGOUT_KEY = "booking-saas-logout-at";
export const BROADCAST_CHANNEL = "booking-saas-session";
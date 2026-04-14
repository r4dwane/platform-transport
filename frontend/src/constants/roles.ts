export const API_BASE_URL = "http://192.168.1.x:8000"; // ← replace x with your local IP
// To find your IP on Windows: run `ipconfig` and look for IPv4 Address
 
export const ENDPOINTS = {
  // Auth
  register:   "/api/v1/auth/register",
  login:      "/api/v1/auth/login",
  me:         "/api/v1/auth/me",
 
  // Loads
  loads:      "/api/v1/loads",
  myLoads:    "/api/v1/loads/my/loads",
 
  // Offers
  offers:     "/api/v1/offers",
  myOffers:   "/api/v1/offers/my/offers",
 
  // Trips
  trips:      "/api/v1/trips",
  myTrips:    "/api/v1/trips/my/trips",
 
  // Payments
  payments:   "/api/v1/payments",
 
  // Users
  users:      "/api/v1/users",
  vehicles:   "/api/v1/users/vehicles",
 
  // Fleet
  fleet:      "/api/v1/fleet",
 
  // Tracking & Notifications
  tracking:   "/api/v1/tracking",
  notifications: "/api/v1/notifications",
 
  // WebSocket
  ws: (userId: string) => `ws://192.168.1.x:8000/ws/${userId}`,
};
import api from "./api";
export const paymentsService = {
  getForTrip: (tripId: string) =>
    api.get(`/api/v1/payments/trip/${tripId}`),
 
  confirm: (tripId: string, transaction_id?: string) =>
    api.post(`/api/v1/payments/trip/${tripId}/confirm`, { transaction_id }),
};
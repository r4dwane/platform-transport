import { useEffect, useState } from "react";
import { useLoadsStore } from "@/store/loads.store";
import { CreateLoadPayload } from "@/types/load.types";
 
export const useLoads = () => {
  const [error, setError] = useState<string | null>(null);
  const store = useLoadsStore();
 
  const handleCreate = async (payload: CreateLoadPayload) => {
    setError(null);
    try {
      return await store.createLoad(payload);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Erreur lors de la publication.");
      throw e;
    }
  };
 
  const handleCancel = async (id: string) => {
    setError(null);
    try {
      await store.cancelLoad(id);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Erreur lors de l'annulation.");
      throw e;
    }
  };
 
  return {
    ...store,
    error,
    createLoad: handleCreate,
    cancelLoad: handleCancel,
  };
};
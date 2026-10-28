"use client";
import { useEffect, useState } from "react";
import { demoVehicles, Vehicle } from "./data";
import { supabase, isDemo } from "./supabase";
export const demoKey = "cs-car-demo-vehicles-v1";
export function readDemo(): Vehicle[] {
  try {
    return JSON.parse(localStorage.getItem(demoKey) || "null") || demoVehicles;
  } catch {
    return demoVehicles;
  }
}
export function saveDemo(v: Vehicle[]) {
  localStorage.setItem(demoKey, JSON.stringify(v));
  window.dispatchEvent(new Event("cs-data"));
}
export function useVehicles(network = false) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(
      isDemo ? demoVehicles : [],
    ),
    [loading, setLoading] = useState(!isDemo),
    [error, setError] = useState("");
  async function refresh() {
    setError("");
    if (isDemo) {
      setVehicles(readDemo());
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase!
      .from("vehicles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setError(
        "Não foi possível carregar os veículos. Verifique a conexão e tente novamente.",
      );
      setLoading(false);
      return;
    }
    let rows = (data || []) as Vehicle[];
    if (network) {
      const [fees, garages] = await Promise.all([
        supabase!.from("vehicle_terms").select("*"),
        supabase!.from("garages").select("id,name"),
      ]);
      if (fees.error || garages.error)
        setError("Não foi possível carregar as condições da rede.");
      rows = rows.map((v) => ({
        ...v,
        ...fees.data?.find((f) => f.vehicle_id === v.id),
        garage_name: garages.data?.find((g) => g.id === v.garage_id)?.name,
      }));
    }
    setVehicles(rows);
    setLoading(false);
  }
  useEffect(() => {
    refresh();
    window.addEventListener("cs-data", refresh);
    return () => window.removeEventListener("cs-data", refresh);
  }, [network]);
  return { vehicles, loading, error, refresh };
}

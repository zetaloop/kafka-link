import { fetchEarthquakes } from "@/lib/api/client";

export async function earthquakesLoader() {
  return fetchEarthquakes();
}

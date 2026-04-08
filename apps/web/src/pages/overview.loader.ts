import { fetchOverview } from "@/lib/api/client";

export async function overviewLoader() {
  return fetchOverview();
}

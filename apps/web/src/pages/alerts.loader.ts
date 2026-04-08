import { fetchAlerts, listCities, listRules } from "@/lib/api/client";

export async function alertsLoader() {
  const [alerts, rules, cities] = await Promise.all([fetchAlerts(), listRules(), listCities()]);

  return {
    alerts: alerts.items,
    rules,
    cities,
  };
}

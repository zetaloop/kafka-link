import type {
  AlertsResponse,
  CityDetailData,
  CityRecord,
  EarthquakeResponse,
  KafkaClusterData,
  KafkaGroupDetail,
  KafkaGroupsResponse,
  OverviewData,
  PresetLoadResult,
  RuleRecord,
} from "@/lib/api/types";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(text || response.statusText, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function fetchOverview() {
  return requestJson<OverviewData>("/api/views/overview");
}

export function fetchCityDetail(cityId: string) {
  return requestJson<CityDetailData>(`/api/views/cities/${cityId}`);
}

export function fetchEarthquakes() {
  return requestJson<EarthquakeResponse>("/api/views/earthquakes");
}

export function fetchAlerts() {
  return requestJson<AlertsResponse>("/api/views/alerts");
}

export function fetchKafkaCluster() {
  return requestJson<KafkaClusterData>("/api/kafka/cluster");
}

export function fetchKafkaGroups() {
  return requestJson<KafkaGroupsResponse>("/api/kafka/groups");
}

export function fetchKafkaGroup(groupId: string) {
  return requestJson<KafkaGroupDetail>(`/api/kafka/groups/${groupId}`);
}

export function listCities() {
  return requestJson<CityRecord[]>("/api/cities");
}

export function createCity(query: string) {
  return requestJson<CityRecord>("/api/cities", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

export function deleteCity(cityId: string) {
  return requestJson<void>(`/api/cities/${cityId}`, { method: "DELETE" });
}

export function listRules() {
  return requestJson<RuleRecord[]>("/api/rules");
}

export function createRule(payload: {
  name: string;
  city_id: string;
  source: RuleRecord["source"];
  metric: RuleRecord["metric"];
  operator: RuleRecord["operator"];
  threshold: number;
  enabled: boolean;
}) {
  return requestJson<RuleRecord>("/api/rules", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteRule(ruleId: string) {
  return requestJson<void>(`/api/rules/${ruleId}`, { method: "DELETE" });
}

export function loadDemoPreset() {
  return requestJson<PresetLoadResult>("/api/preset/demo", { method: "POST" });
}

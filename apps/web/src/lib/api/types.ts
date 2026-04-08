export type CityRecord = {
  city_id: string;
  name: string;
  country_code: string;
  admin1: string | null;
  latitude: number;
  longitude: number;
  timezone: string | null;
  created_at: string;
};

export type RuleRecord = {
  rule_id: string;
  name: string;
  city_id: string;
  source: "weather" | "airquality" | "earthquake";
  metric: "temperature_c" | "aqi_us" | "pm2_5" | "earthquake_magnitude";
  operator: "gt" | "gte" | "lt" | "lte";
  threshold: number;
  enabled: boolean;
  created_at: string;
  updated_at?: string | null;
};

export type CitySnapshotItem = {
  event_id: string;
  observed_at: string;
  metrics: Record<string, number>;
  summary: string;
};

export type AlertFeedItem = {
  event_id: string;
  rule_id: string;
  city_id: string;
  metric: string;
  actual_value: number;
  threshold: number;
  source_event_id: string;
  triggered_at: string;
  summary: string;
};

export type EarthquakeFeedItem = {
  event_id: string;
  observed_at: string;
  summary: string;
  city_ids: string[];
  magnitude: number | null;
  location: {
    latitude: number;
    longitude: number;
    depth_km: number | null;
    place: string | null;
  } | null;
};

export type OverviewData = {
  source: string;
  summary: {
    city_count: number;
    rule_count: number;
    earthquake_count: number;
    alert_count: number;
    last_kind?: string;
  };
  cities: CityRecord[];
  updated_at: string;
};

export type CityDetailData = {
  city: CityRecord | null;
  latest: {
    weather?: CitySnapshotItem;
    airquality?: CitySnapshotItem;
    updated_at?: string;
  } | null;
  weather_history: CitySnapshotItem[];
  airquality_history: CitySnapshotItem[];
  earthquakes?: EarthquakeFeedItem[];
  alerts: AlertFeedItem[];
};

export type PresetLoadResult = {
  inserted_city_ids: string[];
  inserted_rule_ids: string[];
};

export type KafkaNode = {
  id: number | null;
  host: string | null;
  port: number | null;
  rack: string | null;
};

export type KafkaTopicPartition = {
  partition: number;
  leader: number | null;
  replicas: number[];
  isrs: number[];
};

export type KafkaTopic = {
  name: string;
  partition_count: number;
  partitions: KafkaTopicPartition[];
};

export type KafkaClusterData = {
  cluster_id: string | null;
  controller: KafkaNode | null;
  brokers: KafkaNode[];
  topics: KafkaTopic[];
};

export type KafkaGroupListItem = {
  group_id: string;
  state: string | null;
  type: string | null;
  is_simple_consumer_group: boolean | null;
};

export type KafkaGroupDetail = {
  group: {
    group_id: string;
    state: string | null;
    type: string | null;
    partition_assignor: string | null;
    coordinator: KafkaNode | null;
  };
  members: {
    member_id: string;
    client_id: string;
    host: string;
    assignment: {
      topic: string;
      partition: number;
      offset: number;
    }[];
  }[];
  offsets: {
    topic: string;
    partition: number;
    committed: number;
    latest: number | null;
    lag: number | null;
  }[];
};

export type KafkaGroupsResponse = {
  items: KafkaGroupListItem[];
};

export type EarthquakeResponse = {
  items: EarthquakeFeedItem[];
};

export type AlertsResponse = {
  items: AlertFeedItem[];
};

export type RealtimeMessage =
  | { type: "connected"; service: string; connections: number }
  | { type: "pong" }
  | { type: "ack"; message: string }
  | ({ type: "preset.loaded" } & PresetLoadResult)
  | { type: "overview.updated"; kind: string }
  | { type: "city.snapshot.updated"; city_id: string; kind: string }
  | { type: "earthquakes.updated"; event_id: string }
  | { type: "alert.new"; city_id: string; rule_id: string; event_id: string }
  | { type: "alert.feed.updated"; city_id: string; event_id: string }
  | { type: "city.upserted"; city_id: string }
  | { type: "city.deleted"; city_id: string }
  | { type: "rule.upserted"; rule_id: string }
  | { type: "rule.deleted"; rule_id: string };

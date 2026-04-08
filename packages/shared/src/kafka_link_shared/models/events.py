from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class EventKind(StrEnum):
    WEATHER = "weather"
    AIR_QUALITY = "airquality"
    EARTHQUAKE = "earthquake"
    ALERT = "alert"


class EventLocation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    depth_km: float | None = None
    place: str | None = None


class RawWeatherEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: int = 1
    provider: str = "openmeteo"
    city_id: str = Field(min_length=1)
    observed_at: datetime
    ingested_at: datetime
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    temperature_c: float
    weather_code: int
    is_day: bool | None = None
    wind_speed_10m_ms: float | None = None


class RawAirQualityEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: int = 1
    provider: str = "openmeteo"
    city_id: str = Field(min_length=1)
    observed_at: datetime
    ingested_at: datetime
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    aqi_us: float
    pm2_5: float | None = None
    pm10: float | None = None
    ozone: float | None = None
    nitrogen_dioxide: float | None = None


class RawEarthquakeEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: int = 1
    provider: str = "usgs"
    event_id: str = Field(min_length=1)
    observed_at: datetime
    ingested_at: datetime
    magnitude: float
    location: EventLocation
    source_url: str | None = None


class NormalizedEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    event_id: str = Field(min_length=1)
    kind: EventKind
    source_topic: str = Field(min_length=1)
    city_ids: list[str] = Field(default_factory=list)
    observed_at: datetime
    ingested_at: datetime
    metrics: dict[str, float] = Field(default_factory=dict)
    summary: str = Field(min_length=1)
    location: EventLocation | None = None


class AlertEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    event_id: str = Field(min_length=1)
    rule_id: str = Field(min_length=1)
    city_id: str = Field(min_length=1)
    metric: str = Field(min_length=1)
    actual_value: float
    threshold: float
    source_event_id: str = Field(min_length=1)
    triggered_at: datetime
    summary: str = Field(min_length=1)

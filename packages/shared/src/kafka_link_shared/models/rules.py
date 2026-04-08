from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class AlertSource(StrEnum):
    WEATHER = "weather"
    AIR_QUALITY = "airquality"
    EARTHQUAKE = "earthquake"


class AlertMetric(StrEnum):
    TEMPERATURE_C = "temperature_c"
    AQI_US = "aqi_us"
    PM2_5 = "pm2_5"
    EARTHQUAKE_MAGNITUDE = "earthquake_magnitude"


class ThresholdOperator(StrEnum):
    GT = "gt"
    GTE = "gte"
    LT = "lt"
    LTE = "lte"

    def compare(self, actual: float, threshold: float) -> bool:
        match self:
            case ThresholdOperator.GT:
                return actual > threshold
            case ThresholdOperator.GTE:
                return actual >= threshold
            case ThresholdOperator.LT:
                return actual < threshold
            case ThresholdOperator.LTE:
                return actual <= threshold


class AlertRule(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    rule_id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    city_id: str = Field(min_length=1)
    source: AlertSource
    metric: AlertMetric
    operator: ThresholdOperator
    threshold: float
    enabled: bool = True
    created_at: datetime
    updated_at: datetime | None = None

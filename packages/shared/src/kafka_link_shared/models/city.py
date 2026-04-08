from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CityRecord(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    city_id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    country_code: str = Field(min_length=2, max_length=2)
    admin1: str | None = None
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    timezone: str | None = None
    created_at: datetime

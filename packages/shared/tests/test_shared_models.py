from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from kafka_link_shared.models import AlertRule, CityRecord, RawWeatherEvent, ThresholdOperator
from kafka_link_shared.topics import REQUIRED_TOPICS


def test_required_topics_cover_plan_topics() -> None:
    assert REQUIRED_TOPICS == (
        "raw.weather",
        "raw.airquality",
        "raw.earthquake",
        "normalized.events",
        "alerts",
    )


def test_city_record_rejects_invalid_coordinates() -> None:
    with pytest.raises(ValidationError):
        CityRecord(
            city_id="beijing",
            name="Beijing",
            country_code="CN",
            latitude=120,
            longitude=116.4,
            created_at=datetime.now(UTC),
        )


def test_raw_weather_event_requires_temperature() -> None:
    with pytest.raises(ValidationError):
        RawWeatherEvent(
            city_id="beijing",
            observed_at=datetime.now(UTC),
            ingested_at=datetime.now(UTC),
            latitude=39.9,
            longitude=116.4,
            weather_code=1,
        )


def test_alert_rule_operator_compare_matches_threshold() -> None:
    rule = AlertRule(
        rule_id="bj-pm25",
        name="Beijing PM2.5",
        city_id="beijing",
        source="airquality",
        metric="pm2_5",
        operator="gte",
        threshold=150,
        created_at=datetime.now(UTC),
    )

    assert rule.operator is ThresholdOperator.GTE
    assert rule.operator.compare(180, rule.threshold)
    assert not rule.operator.compare(120, rule.threshold)

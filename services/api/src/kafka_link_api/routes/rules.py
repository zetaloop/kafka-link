from uuid import uuid4

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from kafka_link_shared.models import AlertMetric, AlertRule, AlertSource, ThresholdOperator
from kafka_link_shared.settings import utc_now

from ..dependencies import RuntimeDep

router = APIRouter(prefix="/api/rules", tags=["rules"])


class CreateRuleRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str = Field(min_length=1)
    city_id: str = Field(min_length=1)
    source: AlertSource
    metric: AlertMetric
    operator: ThresholdOperator
    threshold: float
    enabled: bool = True


class UpdateRuleRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = None
    operator: ThresholdOperator | None = None
    threshold: float | None = None
    enabled: bool | None = None


@router.get("")
async def list_rules(runtime: RuntimeDep) -> list[dict[str, object]]:
    rules = await runtime.store.list_rules()
    return [rule.model_dump(mode="json") for rule in rules]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_rule(
    payload: CreateRuleRequest,
    runtime: RuntimeDep,
) -> dict[str, object]:
    if await runtime.store.get_city(payload.city_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="City not found")

    rule = AlertRule(
        rule_id=f"rule-{uuid4().hex[:12]}",
        name=payload.name,
        city_id=payload.city_id,
        source=payload.source,
        metric=payload.metric,
        operator=payload.operator,
        threshold=payload.threshold,
        enabled=payload.enabled,
        created_at=utc_now(),
    )
    stored = await runtime.store.upsert_rule(rule)
    await runtime.hub.broadcast_json({"type": "rule.upserted", "rule_id": stored.rule_id})
    return stored.model_dump(mode="json")


@router.patch("/{rule_id}")
async def update_rule(
    rule_id: str,
    payload: UpdateRuleRequest,
    runtime: RuntimeDep,
) -> dict[str, object]:
    current = await runtime.store.get_rule(rule_id)
    if current is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")

    updated = current.model_copy(
        update={key: value for key, value in payload.model_dump(exclude_unset=True).items()}
        | {"updated_at": utc_now()}
    )
    stored = await runtime.store.upsert_rule(updated)
    await runtime.hub.broadcast_json({"type": "rule.upserted", "rule_id": stored.rule_id})
    return stored.model_dump(mode="json")


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rule(rule_id: str, runtime: RuntimeDep) -> None:
    deleted = await runtime.store.delete_rule(rule_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")

    await runtime.hub.broadcast_json({"type": "rule.deleted", "rule_id": rule_id})

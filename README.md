# Kafka Link

Kafka Link 是一个本地单用户的事件驱动演示系统。它接入天气、空气质量和地震这三类真实公开数据，通过 Kafka 串起采集、标准化、告警和聚合链路，再由 React 前端展示业务视图和 Kafka 状态。

项目当前已经包含完整的本地运行栈：3 节点 Kafka 4.x KRaft、Redis、多个 Python 服务，以及一个基于 Vite 的前端仪表盘。

## 架构概览

系统围绕几类服务展开：

- 数据采集服务负责拉取天气、空气质量和地震数据，并写入 `raw.*` Kafka topics
- `processor` 将原始事件统一映射到 `normalized.events`
- `alert-engine` 依据规则评估标准化事件，并写入 `alerts`
- `analytics` 将事件流投影到 Redis 视图，供 API 和前端读取
- `api` 提供城市、规则、预设、业务视图、Kafka 状态和 WebSocket 接口
- `web` 提供总览、城市详情、地震、告警和 Kafka 页面

服务之间的主链路是：

`collectors -> raw topics -> processor -> normalized.events -> alert-engine / analytics -> Redis views + alerts -> api -> web`

## 目录结构

- `apps/web/` 前端应用，使用 React、TypeScript、Vite、Tailwind、Recharts
- `packages/shared/` Python 共享包，包含 topic 常量、Pydantic schema、共享配置和 Redis key 约定
- `services/api/` FastAPI 服务
- `services/collector-weather/` 天气采集服务
- `services/collector-airquality/` 空气质量采集服务
- `services/collector-earthquake/` 地震采集服务
- `services/processor/` 标准化处理服务
- `services/alert-engine/` 告警规则评估服务
- `services/analytics/` Redis 视图投影服务
- `infra/` Docker 构建文件和 Kafka 初始化脚本

## 页面说明

- Overview：总览页，显示城市数、规则数、地震数、告警数，并支持添加城市、删除城市、加载 demo preset
- City Detail：单城市详情页，显示天气快照、空气质量快照、趋势图、附近地震和最近告警
- Earthquakes：按时间倒序显示地震事件流
- Alerts：规则创建、规则删除和告警历史
- Kafka：展示 cluster、brokers、topics、consumer groups 和 lag 摘要

## 本地启动

第一次启动建议直接构建并拉起整套环境：

```bash
docker compose up -d --build
```

查看运行状态：

```bash
docker compose ps
```

查看服务日志：

```bash
docker compose logs -f api processor analytics alert-engine
```

如果需要回到真正的空状态，再重新启动：

```bash
docker compose down -v
docker compose up -d --build
```

## 访问地址

- 前端仪表盘：`http://localhost:4173`
- API：`http://localhost:8000`
- Kafka brokers：`localhost:29092`、`localhost:39092`、`localhost:49092`
- Redis：`localhost:6379`

前端容器会把 `/api` 和 `/ws` 代理到 API 容器，因此浏览器侧不需要额外配置 API 地址。

## 运行后的观察点

全新启动后，Overview 会先呈现空城市、空规则状态，同时保留全局地震流。点击 `Load demo preset` 后，会写入一组示例城市和规则，随后天气、空气质量、地震和告警会逐步出现在页面上。

Kafka 页可以用来对照业务链路是否在流动：

- `raw.weather` / `raw.airquality` / `raw.earthquake`
- `normalized.events`
- `alerts`

以及 `normalization`、`alerting`、`analytics` 这几个 consumer groups 的消费状态。

## 开发与验证

Python 使用 `uv`，前端使用 `pnpm`。

Python 侧常用检查：

```bash
uv run --group dev ruff check .
uv run --group dev pytest
```

前端常用检查：

```bash
pnpm --dir apps/web exec biome check src
pnpm --dir apps/web exec tsc --noEmit
pnpm --dir apps/web build
```

## 故障排查

- `docker compose ps` 先看服务是否都在运行，尤其是 Kafka brokers、Redis、api、processor、analytics、alert-engine
- 如果业务页没数据，先看 `api/views/overview`、`api/views/alerts`、`api/kafka/groups`
- 如果是全新启动后没有城市和规则，先在 Overview 里加载 demo preset
- 如果只看到空页面，先确认 `http://localhost:4173` 能正常返回前端页面，`http://localhost:8000/api/healthz` 返回 `ok`

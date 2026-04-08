# Kafka Link

Kafka Link 是一个由事件驱动的本地单用户演示系统。它接入了真实且公开的天气、空气质量和地震数据，通过 Kafka 将数据采集、标准化、告警和聚合分析串联起来，最后由基于 React 的前端为您呈现丰富的业务视图和实时的 Kafka 运行状态。

目前，项目中已经配备了完整的本地运行环境，包含 3 节点的 Kafka 4.x KRaft 集群、Redis、一组相互协作的 Python 微服务，以及由 Vite 驱动的前端仪表盘。

## 架构概览

系统主要由以下几类服务协同工作：

- **数据采集器 (Collectors)**：负责从公开 API 拉取最新的天气、空气质量和地震数据，并将它们写入 `raw.*` 相关的 Kafka topics 中。
- **数据处理 (Processor)**：将原始数据清洗并统一映射为标准的 `normalized.events` 格式。
- **告警引擎 (Alert Engine)**：根据用户配置的规则对标准化事件进行评估，一旦触发便将告警事件写入 `alerts` topic。
- **分析聚合 (Analytics)**：将流动的事件流投影聚合到 Redis 视图中，以便后续的 API 查询和前端展示。
- **API 服务**：为前端提供城市管理、规则配置、系统预设、业务视图读取，以及 Kafka 状态和 WebSocket 实时推送接口。
- **前端 Web**：提供直观的总览、城市详情、地震速报、告警管理和专门的 Kafka 监控页面。

整个系统的数据流转链路如下：

`Collectors -> Raw Topics -> Processor -> Normalized Events -> Alert Engine / Analytics -> Redis Views + Alerts -> API -> Web`

## 目录结构

- `apps/web/`：前端应用，基于 React、TypeScript、Vite、Tailwind CSS 和 Recharts 构建。
- `packages/shared/`：Python 共享依赖包，维护了统一的 topic 名称、Pydantic schema、服务配置以及 Redis key 命名约定。
- `services/api/`：基于 FastAPI 构建的核心接口服务。
- `services/collector-weather/`：天气数据采集服务。
- `services/collector-airquality/`：空气质量数据采集服务。
- `services/collector-earthquake/`：地震数据采集服务。
- `services/processor/`：数据标准化处理服务。
- `services/alert-engine/`：告警规则评估服务。
- `services/analytics/`：Redis 视图数据投影服务。
- `infra/`：存放 Docker 镜像构建文件及 Kafka 初始化脚本。

## 页面概览

- **Overview（总览）**：展示当前关注的城市数量、规则总数、地震频次和告警统计。在这里，您可以随时添加或移除关注的城市，也可以一键加载系统预设。
- **City Detail（城市详情）**：聚焦于单个城市，展示当前的天气与空气质量快照、近期趋势图表、周边发生的地震事件以及最近的相关告警。
- **Earthquakes（地震速报）**：以时间倒序呈现全球最新的地震事件流。
- **Alerts（告警管理）**：供您创建和删除自定义告警规则，并查阅历史告警记录。
- **Kafka（监控）**：实时反映 Kafka 集群状态，包括 Brokers 列表、Topics 信息、Consumer Groups 概况及消费延迟（Lag）数据。

## 本地启动指南

在第一次运行时，建议您直接构建并启动整套运行环境：

```bash
docker compose up -d --build
```

您可以随时查看各容器的运行状态：

```bash
docker compose ps
```

或者跟踪后台服务的实时日志：

```bash
docker compose logs -f api processor analytics alert-engine
```

如果您想清理所有数据并回到全新的初始状态，可以执行以下命令后再次启动：

```bash
docker compose down -v
docker compose up -d --build
```

## 访问地址

- **前端仪表盘**：`http://localhost:4173`
- **API 接口**：`http://localhost:8000`
- **Kafka Brokers**：`localhost:29092`、`localhost:39092`、`localhost:49092`
- **Redis**：`localhost:6379`

> 前端容器已配置代理，会将 `/api` 和 `/ws` 请求自动转发至 API 容器，因此您无需在浏览器端做任何额外的接口地址配置。

## 运行后的观察点

在全新启动后，Overview 页面默认不会包含任何城市和规则（不过全局的地震流依然会实时更新）。推荐您直接点击页面上的 `Load demo preset`，系统会自动写入一组示例城市和配套的告警规则。随后，天气、空气质量、地震以及被触发的告警数据就会源源不断地呈现在您的仪表盘上。

此时，您可以前往 **Kafka** 页面，观察业务数据是否正在链路中顺畅流转：

- `raw.weather` / `raw.airquality` / `raw.earthquake`
- `normalized.events`
- `alerts`

您也可以一并查看 `normalization`、`alerting` 和 `analytics` 这几个核心消费组的当前消费状态和延迟情况。

## 开发与代码校验

项目后端主要使用 `uv` 进行 Python 环境管理，前端则使用 `pnpm`。

**Python 侧常用检查**：

```bash
uv run --group dev ruff check .
uv run --group dev pytest
```

**前端常用检查**：

```bash
pnpm --dir apps/web exec biome check src
pnpm --dir apps/web exec tsc --noEmit
pnpm --dir apps/web build
```

## 常见问题排查

- 请首先通过 `docker compose ps` 确认所有关键服务（尤其是 Kafka Brokers、Redis、api、processor、analytics、alert-engine）都在正常运行。
- 如果页面上显示没有数据，可以检查 `api/views/overview`、`api/views/alerts` 接口，或查看 `api/kafka/groups` 是否有滞后。
- 全新启动时，如果没有关注的城市或规则，请在 Overview 页面先点击加载 demo preset。
- 如果只能看到一个无法加载内容的空白页面，请确认 `http://localhost:4173` 能否正常访问，同时通过 `http://localhost:8000/api/healthz` 确认 API 服务的健康状态是否为 `ok`。

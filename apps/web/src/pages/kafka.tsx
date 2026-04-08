import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const sections = [
  {
    title: "Brokers",
    description: "健康状态卡片，后续接 broker 列表和 cluster metadata。",
  },
  {
    title: "Topics",
    description: "展示 raw / normalized / alerts 的分区数、消息数和流转层次。",
  },
  {
    title: "Consumer groups",
    description: "展示 normalization、alerting、analytics 这些 group 的 lag 和消费进度。",
  },
];

export function KafkaPage() {
  return (
    <section className="grid gap-5 lg:grid-cols-3">
      {sections.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
            <CardDescription>{section.description}</CardDescription>
          </CardHeader>
          <CardContent className="min-h-52 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)]" />
        </Card>
      ))}
    </section>
  );
}

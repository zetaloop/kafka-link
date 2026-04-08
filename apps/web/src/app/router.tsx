import { createBrowserRouter, Navigate } from "react-router-dom";

import { AppLayout } from "@/app/app-layout";
import { AlertsPage } from "@/pages/alerts";
import { alertsLoader } from "@/pages/alerts.loader";
import { CityDetailPage } from "@/pages/city-detail";
import { cityDetailLoader } from "@/pages/city-detail.loader";
import { EarthquakesPage } from "@/pages/earthquakes";
import { earthquakesLoader } from "@/pages/earthquakes.loader";
import { KafkaPage } from "@/pages/kafka";
import { kafkaLoader } from "@/pages/kafka.loader";
import { OverviewPage } from "@/pages/overview";
import { overviewLoader } from "@/pages/overview.loader";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/overview" replace />,
      },
      {
        path: "overview",
        element: <OverviewPage />,
        loader: overviewLoader,
      },
      {
        path: "cities/:cityId",
        element: <CityDetailPage />,
        loader: cityDetailLoader,
      },
      {
        path: "earthquakes",
        element: <EarthquakesPage />,
        loader: earthquakesLoader,
      },
      {
        path: "alerts",
        element: <AlertsPage />,
        loader: alertsLoader,
      },
      {
        path: "kafka",
        element: <KafkaPage />,
        loader: kafkaLoader,
      },
    ],
  },
]);

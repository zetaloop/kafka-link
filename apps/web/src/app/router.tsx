import { createBrowserRouter, Navigate } from "react-router-dom";

import { AppLayout } from "@/app/app-layout";
import { AlertsPage } from "@/pages/alerts";
import { CityDetailPage } from "@/pages/city-detail";
import { EarthquakesPage } from "@/pages/earthquakes";
import { KafkaPage } from "@/pages/kafka";
import { OverviewPage } from "@/pages/overview";

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
      },
      {
        path: "cities/:cityId",
        element: <CityDetailPage />,
      },
      {
        path: "earthquakes",
        element: <EarthquakesPage />,
      },
      {
        path: "alerts",
        element: <AlertsPage />,
      },
      {
        path: "kafka",
        element: <KafkaPage />,
      },
    ],
  },
]);

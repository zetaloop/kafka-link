import { ApiError, fetchCityDetail } from "@/lib/api/client";
import type { CityDetailData } from "@/lib/api/types";

export async function cityDetailLoader({ params }: { params: { cityId?: string } }) {
  const cityId = params.cityId ?? "city";

  try {
    return await fetchCityDetail(cityId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return {
        city: null,
        latest: null,
        weather_history: [],
        airquality_history: [],
        alerts: [],
      } satisfies CityDetailData;
    }

    throw error;
  }
}

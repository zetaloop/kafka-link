import { ApiError, fetchCityDetail, fetchEarthquakes } from "@/lib/api/client";
import type { CityDetailData } from "@/lib/api/types";

export async function cityDetailLoader({ params }: { params: { cityId?: string } }) {
  const cityId = params.cityId ?? "city";

  try {
    const [detail, earthquakes] = await Promise.all([fetchCityDetail(cityId), fetchEarthquakes()]);
    return {
      ...detail,
      earthquakes: earthquakes.items.filter((item) => item.city_ids.includes(cityId)),
    } satisfies CityDetailData;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return {
        city: null,
        latest: null,
        weather_history: [],
        airquality_history: [],
        earthquakes: [],
        alerts: [],
      } satisfies CityDetailData;
    }

    throw error;
  }
}

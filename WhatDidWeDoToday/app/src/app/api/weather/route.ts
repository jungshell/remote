import { NextResponse } from "next/server";
import { weatherMap } from "@/lib/utils";

export const runtime = "nodejs";

/** GET /api/weather?location=아산시&date=2026-01-25 → { location, weather } */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const location = url.searchParams.get("location")?.trim();
  const dateStr = url.searchParams.get("date")?.trim();

  if (!location || location.length < 2) {
    return NextResponse.json({ error: "location required" }, { status: 400 });
  }

  const targetDate = dateStr?.match(/^\d{4}-\d{2}-\d{2}$/)
    ? dateStr
    : new Date().toISOString().slice(0, 10);

  try {
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location + " 대한민국")}&limit=1`,
      { headers: { "Accept-Language": "ko" } },
    );
    if (!geoRes.ok) {
      return NextResponse.json({ error: "Geocode failed" }, { status: 502 });
    }
    const geoData = await geoRes.json();
    const lat = parseFloat(geoData[0]?.lat);
    const lon = parseFloat(geoData[0]?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json({ error: "Place not found" }, { status: 404 });
    }

    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&start_date=${targetDate}&end_date=${targetDate}&daily=weather_code,temperature_2m_max,temperature_2m_min`,
    );
    if (!weatherRes.ok) {
      return NextResponse.json({ error: "Weather API failed" }, { status: 502 });
    }
    const weatherData = await weatherRes.json();
    const daily = weatherData?.daily;
    const code = daily?.weather_code?.[0];
    const tempMin = daily?.temperature_2m_min?.[0];
    const tempMax = daily?.temperature_2m_max?.[0];
    const label = weatherMap[code] ?? "날씨 정보";
    const weather =
      typeof tempMin === "number" && typeof tempMax === "number"
        ? `${label} ${tempMin} ~ ${tempMax}°C`
        : label;

    return NextResponse.json({
      location: geoData[0]?.display_name?.split(",")[0]?.trim() || location,
      weather,
    });
  } catch (e) {
    console.error("Weather API error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}

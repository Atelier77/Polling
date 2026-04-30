from fastapi import APIRouter, Query
from typing import Optional
import httpx
import os

router = APIRouter(tags=["Weather"])

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")
OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5"

@router.get("/current")
async def get_current_weather(city: str = Query(default="Moscow", max_length=100)):
    """Получение текущей погоды"""
    
    if not OPENWEATHER_API_KEY:
        return {
            "success": True,
            "data": {
                "city": city,
                "temperature": 20,  # ← Демо-данные
                "feels_like": 18,
                "description": "Сервис погоды не настроен (нет API ключа)",
                "icon": "01d",
                "humidity": 60,
                "wind_speed": 5,
                "is_fallback": True,
                "warning": "Укажите OPENWEATHER_API_KEY в .env для реальных данных"
            }
        }
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{OPENWEATHER_BASE_URL}/weather",
                params={
                    "q": city,
                    "appid": OPENWEATHER_API_KEY,
                    "units": "metric",
                    "lang": "ru"
                }
            )
            
            if response.status_code == 404:
                return {
                    "success": True,
                    "data": {
                        "city": city,
                        "temperature": None,
                        "description": "Город не найден",
                        "icon": None,
                        "humidity": None,
                        "wind_speed": None,
                        "is_fallback": True
                    }
                }
            
            response.raise_for_status()
            data = response.json()
            
            return {
                "success": True,
                "data": {
                    "city": data.get("name", city),
                    "temperature": data.get("main", {}).get("temp"),
                    "feels_like": data.get("main", {}).get("feels_like"),
                    "description": data.get("weather", [{}])[0].get("description", ""),
                    "icon": data.get("weather", [{}])[0].get("icon"),
                    "humidity": data.get("main", {}).get("humidity"),
                    "wind_speed": data.get("wind", {}).get("speed"),
                    "is_fallback": False
                }
            }
            
    except Exception as e:
        print(f"❌ Weather API error: {e}")
        return {
            "success": True,
            "data": {
                "city": city,
                "temperature": None,
                "description": "Ошибка получения данных",
                "icon": None,
                "humidity": None,
                "wind_speed": None,
                "is_fallback": True,
                "warning": str(e)
            }
        }
from flask import Blueprint, request

weather_bp = Blueprint('weather', __name__, url_prefix='/weather')
import requests

@weather_bp.route("/current", methods=["GET"])
def get_current_weather():
    lat = request.args.get("lat")
    lng = request.args.get("lng")
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lng,
        "current_weather": "true",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum",
        "forecast_days": 5,
        "timezone": "auto"
    }
    resp = requests.get(url, params=params, timeout=5)
    resp.raise_for_status()
    resp = resp.json()
    print("Received weather info: ")
    print(resp)
    
    # Map current weather code
    resp["current_weather"]["weathercode"] = map_weather_code(resp["current_weather"]["weathercode"])
    
    # Map weather codes in daily forecast
    if "daily" in resp:
        for i, code in enumerate(resp["daily"]["weather_code"]):
            resp["daily"]["weather_code"][i] = map_weather_code(code)
    
    return {
        "current": resp["current_weather"],
        "forecast_5day": resp.get("daily", {})
    }

def map_weather_code(code):
    mapping = {
        0: "Bầu trời quang đãng",
        1: "Chủ yếu quang đãng",
        2: "Nhiều mây một phần",
        3: "U ám",
        45: "Sương mù",
        48: "Sương mù lắng đọng",
        51: "Mưa phùn nhẹ",
        53: "Mưa phùn vừa phải",
        55: "Mưa phùn dày đặc",
        56: "Mưa phùn đóng băng nhẹ",
        61: "Mưa nhẹ",
        63: "Mưa vừa phải",
        65: "Mưa lớn",
        66: "Mưa đóng băng nhẹ",
        67: "Mưa phùn đóng băng lớn",
        71: "Tuyết rơi nhẹ",
        73: "Tuyết rơi vừa phải",
        75: "Tuyết rơi dày",
        77: "Hạt tuyết",
        80: "Mưa rào nhẹ",
        81: "Mưa rào vừa phải",
        82: "Mưa rào dữ dội",
        85: "Mưa tuyết nhẹ",
        86: "Mưa tuyết dày",
        95: "Giông bão",
        96: "Giông bão với mưa đá nhẹ",
        99: "Giông bão với mưa đá nặng"
    }
    return mapping.get(code, f"Unknown code {code}")
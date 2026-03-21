from flask import Blueprint, jsonify, request

weather_bp = Blueprint('weather', __name__, url_prefix='/weather')
import requests

@weather_bp.route("/current", methods=["GET"])
def get_current_weather():
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current_weather": "true",
        "timezone": "auto"
    }
    resp = requests.get(url, params=params, timeout=5)
    resp.raise_for_status()
    resp = resp.json()
    resp["current_weather"]["weathercode"] = map_weather_code(resp["current_weather"]["weathercode"])
    resp["current_weather"]["location"] = nominatim_reverse(lat, lon)
    return resp["current_weather"]

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
    }
    return mapping.get(code, f"Unknown code {code}")

def nominatim_reverse(lat, lng):
    url = "https://nominatim.openstreetmap.org/reverse"
    params = {"lat": lat, "lon": lng, "format": "jsonv2"}
    resp = requests.get(url, params=params, timeout=5, headers={"User-Agent": "SmartTravel/1.0"})
    resp.raise_for_status()
    print(f"Nominatim reverse geocode response: {resp.text}")
    return resp.json().get("display_name", "Unknown location")
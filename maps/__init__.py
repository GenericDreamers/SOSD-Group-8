from flask import Blueprint, logging, render_template, request, jsonify
from flask_jwt_extended import jwt_required
from db import query_db
import requests
import urllib.parse

maps_bp = Blueprint("maps", __name__, url_prefix="/map")

# ---- Nominatim reverse geocode (lat,lng → address) ----
@maps_bp.route("/nominatim/reverse", methods=["GET"])
@jwt_required()
def nominatim_reverse():
    lat = request.args.get("lat")
    lng = request.args.get("lon")
    url = "https://nominatim.openstreetmap.org/reverse"
    params = {"lat": lat, "lon": lng, "format": "jsonv2"}
    resp = requests.get(url, params=params, timeout=5, headers={"User-Agent": "SmartTravel/1.0"})
    resp.raise_for_status()
    return resp.json().get("display_name", "Unknown location")

@maps_bp.route("/api/places", methods=["GET"])
def get_places():
    places = query_db("SELECT * FROM Places")
    places = [{"lat": p["Latitude"], "lng": p["Longitude"], "name": p["Name"], "category": p["Category"], "price": p["Price"], "rating": p["Rating"], "opening_hours": p["Opening_hours"]} for p in places]
    return places

@maps_bp.route("/api/autocomplete")
def autocomplete():
    q = request.args.get("q", "")
    q = urllib.parse.unquote(q)
    q = f"%{q}%"
    
    places = query_db("SELECT Name, Latitude, Longitude FROM Places WHERE Name LIKE ?", [q])
    places = [{"lat": p["Latitude"], "lng": p["Longitude"], "name": p["Name"]} for p in places]
    return places

# frontend
@maps_bp.route("/")
def map_view():
    return render_template("map.html")
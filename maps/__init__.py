from flask import Blueprint, render_template, request, jsonify
from flask_jwt_extended import jwt_required
from review import get_average
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
@maps_bp.route("/api/places/<int:placeID>", methods=["GET"])
def get_places(placeID = None):
    if placeID:
        places = query_db("SELECT * FROM Places WHERE ID = ?",[placeID])
    else:
        places = query_db("SELECT * FROM Places")
    if not places:
        return jsonify({"msg": "get_places API returned no places"}), 404

    places = [{"id": str(p["ID"]), "lat": str(p["Latitude"]), "lng": str(p["Longitude"]), "name": p["Name"], "category": p["Category"], "price": str(p["Price"]), "opening_hours": p["Opening_hours"], "rating": str(get_average(p["ID"])), "confirmed": str(p["Confirmed"])} for p in places]

    return jsonify(places)

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
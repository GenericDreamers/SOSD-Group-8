from flask import Blueprint, render_template, request, jsonify
from flask_jwt_extended import jwt_required
import requests

maps_bp = Blueprint("maps", __name__)

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
    return jsonify(resp.json())

# frontend
@maps_bp.route("/map")
def map_view():
    return render_template("map.html")
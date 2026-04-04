from flask import Blueprint, render_template, request, jsonify
from flask_jwt_extended import get_jwt, jwt_required
from review import get_average
from db import query_db, execute_db
import requests

maps_bp = Blueprint("maps", __name__, url_prefix="/map")

@maps_bp.route("/api/reverse", methods=["GET"])
def nominatim_reverse():
    lat = request.args.get("lat")
    lng = request.args.get("lng")
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

@maps_bp.route("/api/places", methods=["POST"])
@jwt_required()
def add_place():
    data = request.get_json()
    isAdmin = get_jwt().get("role") == "Admin" if get_jwt() else False
    if not isAdmin:
        confirmed = 0
        msg = "Place submitted successfully. Awaiting admin confirmation."
    else:
        confirmed = 1
        msg = "Place added successfully."
    
    # Validate required fields
    if not data or not data.get('name') or not data.get('category'):
        return jsonify({'error': 'Name and category are required'}), 400
    
    lat = data.get('lat')
    lng = data.get('lng')
    
    if lat is None or lng is None:
        return jsonify({'error': 'Latitude and longitude are required'}), 400
    
    try:
        execute_db("INSERT INTO Places(Name, Category, Price, Latitude, Longitude, Opening_hours, Confirmed) VALUES (?, ?, ?, ?, ?, ?, ?)", [data.get('name'), data.get('category'), data.get('price', "?"), float(lat), float(lng), data.get('opening_hours', "?"), confirmed])
        
        return jsonify({
            'message': msg
        }), 201
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# frontend
@maps_bp.route("/")
def map_view():
    return render_template("map.html")
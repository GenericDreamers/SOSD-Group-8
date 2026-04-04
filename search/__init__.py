from flask import Blueprint, jsonify, request
from db import query_db
from review import get_average
import urllib.parse

search_bp = Blueprint('search', __name__, url_prefix='/search')

@search_bp.route("/api/autocomplete")
def autocomplete():
    q = request.args.get("q", "")
    q = urllib.parse.unquote(q)
    q = f"%{q}%"
    
    places = query_db("SELECT ID, Name, Latitude, Longitude FROM Places WHERE Name LIKE ?", [q])
    places = [{"lat": p["Latitude"], "lng": p["Longitude"], "name": p["Name"], "id": str(p["ID"])} for p in places]
    return places

@search_bp.route("/api/filter", methods=["GET"])
def filter_places():
    """Filter places based on query parameters."""
    
    # Build WHERE clause conditions
    conditions = []
    params = []
    
    city = request.args.get("city")
    if city:
        conditions.append("City LIKE ?")
        params.append(f"%{city}%")
    
    min_price = request.args.get("price_min")
    if min_price:
        conditions.append("Price >= ?")
        params.append(float(min_price))
    
    max_price = request.args.get("price_max")
    if max_price:
        conditions.append("Price <= ?")
        params.append(float(max_price))
    
    category = request.args.get("category")
    if category == "Hotel":
        conditions.append("(Category = ? OR Category = 'Khách sạn')")
        params.append(category)
    elif category == "Restaurant":
        conditions.append("(Category = ? OR Category = 'Nhà hàng')")
        params.append(category)
    elif category == "Attraction":
        conditions.append("Category NOT IN ('Hotel', 'Restaurant', 'Khách sạn', 'Nhà hàng')")
    
    # Build complete WHERE clause
    where_clause = " AND ".join(conditions) if conditions else "1=1"
    
    # Get filtered and sorted results
    query = f"SELECT * FROM Places WHERE {where_clause}"
    places = query_db(query, params)
    
    places = [{"id": str(p["ID"]), "lat": str(p["Latitude"]), "lng": str(p["Longitude"]), "name": p["Name"], "category": p["Category"], "price": str(p["Price"]), "opening_hours": p["Opening_hours"], "rating": str(get_average(p["ID"])), "confirmed": str(p["Confirmed"])} for p in places]

    rating = request.args.get("rating")
    if rating:
        places = [p for p in places if p["rating"] != "-" and float(p["rating"]) >= float(rating)]

    return jsonify(places)
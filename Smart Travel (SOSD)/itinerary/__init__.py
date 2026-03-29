from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import query_db, execute_db
from auth import require_ownership_or_admin

itinerary_bp = Blueprint('itinerary', __name__, url_prefix='/itinerary')

@itinerary_bp.route("/api/create/<int:user_id>", methods=["POST"])
@jwt_required()
@require_ownership_or_admin
def create(user_id):
    payload = request.form
    itinerary = {
        "user_id": user_id,
        "title": payload["title"],
        "CreatedAt": datetime.now(),
    }
    execute_db("INSERT INTO Itineraries (UserID, Title, CreatedAt) VALUES (?, ?, ?)", [itinerary["user_id"], itinerary["title"], itinerary["CreatedAt"]])
    
    return jsonify({"msg": "Itinerary created"}), 201

@itinerary_bp.route("/api/<int:it_id>", methods=["GET"])
@jwt_required()
@require_ownership_or_admin
def get_itinerary(it_id):
    itinerary = query_db("SELECT * FROM Itineraries WHERE ID = ?", [it_id], one=True)
    if not itinerary:
        return jsonify({"msg": "Itinerary not found"}), 404
    return jsonify(itinerary), 200

@itinerary_bp.route("/api/<int:it_id>", methods=["PUT"])
@jwt_required()
@require_ownership_or_admin
def update_itinerary(it_id):
    payload = request.form
    itinerary = query_db("SELECT * FROM Itineraries WHERE ID = ?", [it_id], one=True)
    if not itinerary:
        return jsonify({"msg": "Itinerary not found"}), 404
    execute_db("UPDATE Itineraries SET Title = ? WHERE ID = ?", [payload["title"], it_id])
    return jsonify({"msg": "Itinerary updated"}), 200

@itinerary_bp.route("/api/<int:it_id>", methods=["DELETE"])
@jwt_required()
@require_ownership_or_admin
def delete_itinerary(it_id):
    itinerary = query_db("SELECT * FROM Itineraries WHERE ID = ?", [it_id], one=True)
    if not itinerary:
        return jsonify({"msg": "Itinerary not found"}), 404
    execute_db("DELETE FROM Itineraries WHERE ID = ?", [it_id])
    return jsonify({"msg": "Itinerary deleted"}), 200

@itinerary_bp.route("/api/<int:it_id>/items", methods=["GET"])
@jwt_required()
@require_ownership_or_admin
def get_items(it_id):
    items = query_db("SELECT * FROM ItineraryItems WHERE ItineraryID = ?", [it_id])
    return jsonify(items), 200

@itinerary_bp.route("/api/<int:it_id>/items", methods=["POST"])
@jwt_required()
@require_ownership_or_admin
def add_item(it_id):
    payload = request.form
    itinerary = query_db("SELECT * FROM Itineraries WHERE ID = ?", [it_id], one=True)
    if not itinerary:
        return jsonify({"msg": "Itinerary not found"}), 404
    item = {
        "itinerary_id": it_id,
        "place_id": payload["place_id"],
        "day": payload["day"],
        "start_time": payload.get("start_time"),
        "end_time": payload.get("end_time"),
        "notes": payload.get("notes", ""),
    }
    execute_db("INSERT INTO ItineraryItems (ItineraryID, PlaceID, Day, StartTime, EndTime, Notes) VALUES (?, ?, ?, ?, ?, ?)", [item["itinerary_id"], item["place_id"], item["day"], item["start_time"], item["end_time"], item["notes"]])
    return jsonify({"msg": "Item added to itinerary"}), 201

@itinerary_bp.route("/api/<int:it_id>/items", methods=["PUT"])
@jwt_required()
@require_ownership_or_admin
def update_item(it_id, item_id):
    payload = request.form
    itinerary = query_db("SELECT * FROM Itineraries WHERE ID = ?", [it_id], one=True)
    if not itinerary:
        return jsonify({"msg": "Itinerary not found"}), 404
    execute_db("UPDATE ItineraryItems SET PlaceID = ?, Day = ?, StartTime = ?, EndTime = ?, Notes = ? WHERE ID = ?", [
        payload["place_id"],
        payload["day"],
        payload["start_time"],
        payload["end_time"],
        payload["notes"],
        item_id
    ])
    return jsonify({"msg": "Item updated in itinerary"}), 200

@itinerary_bp.route("/api/<int:it_id>/items/<int:item_id>", methods=["DELETE"])
@jwt_required()
@require_ownership_or_admin
def delete_item(it_id, item_id): #it_id is used to check ownership, item_id is used to delete the item
    execute_db("DELETE FROM ItineraryItems WHERE ID = ?", [item_id])
    return jsonify({"msg": "Item deleted from itinerary"}), 200
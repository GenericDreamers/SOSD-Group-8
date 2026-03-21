from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import query_db, execute_db
booking_bp = Blueprint('booking', __name__, url_prefix='/booking')
@booking_bp.route("/api/create", methods=["POST"])
@jwt_required()
def create():
    payload = request.get_json()
    user = get_jwt_identity()
    booking = {
        "user_id": user["id"],
        "place_id": payload["place_id"],
        "check_in": payload["check_in"],
        "check_out": payload["check_out"],
        "amount": payload["amount"],
    }

    execute_db("INSERT INTO Bookings (UserID, PlaceID, CheckIn, CheckOut, CreatedAt) VALUES (?, ?, ?, ?, ?)", [booking["user_id"], booking["place_id"], booking["check_in"], booking["check_out"], datetime.now()])
    return jsonify({"msg": "Booking created"}), 201

@booking_bp.route("/api/my", methods=["GET"])
@jwt_required()
def my_bookings():
    user = get_jwt_identity()
    bookings = query_db("SELECT * FROM Bookings WHERE UserID = ?", [user["id"]])
    return jsonify(bookings), 200
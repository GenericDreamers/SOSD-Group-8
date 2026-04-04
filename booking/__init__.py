from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import query_db, execute_db

booking_bp = Blueprint('booking', __name__, url_prefix='/api/booking')

@booking_bp.route("/create", methods=["POST"])
@jwt_required()
def create():
    payload = request.get_json()
    user_data = get_jwt_identity()
    
    # Xử lý triệt để lỗi TypeError: Kiểm tra xem user_data là Dict hay String/Int
    user_id = user_data["id"] if isinstance(user_data, dict) else user_data

    execute_db(
        "INSERT INTO Bookings (UserID, PlaceID, CheckIn, CheckOut, Status, CreatedAt) VALUES (?, ?, ?, ?, ?, ?)", 
        [user_id, payload["place_id"], payload["check_in"], payload["check_out"], "Pending", datetime.now()]
    )
    
    new_booking = query_db("SELECT ID FROM Bookings WHERE UserID = ? ORDER BY CreatedAt DESC LIMIT 1", [user_id], one=True)
    
    return jsonify({"msg": "Booking created", "booking_id": new_booking["ID"]}), 201

@booking_bp.route("/my", methods=["GET"])
@jwt_required()
def my_bookings():
    user_data = get_jwt_identity()
    user_id = user_data["id"] if isinstance(user_data, dict) else user_data
    
    bookings = query_db("SELECT * FROM Bookings WHERE UserID = ?", [user_id])
    return jsonify([dict(b) for b in bookings]), 200
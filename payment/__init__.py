from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import execute_db

payment_bp = Blueprint('payment', __name__, url_prefix='/api/payment')


@payment_bp.route("/process", methods=["POST"])
@jwt_required()
def process():
    payload = request.get_json()
    user = get_jwt_identity()
    booking_id = payload.get("booking_id")
    user_id = user["id"] if isinstance(user, dict) else user
    
    # 1. (Mô phỏng ESB) Gọi sang Booking Service để cập nhật trạng thái
    execute_db("UPDATE Bookings SET Status = ? WHERE ID = ? AND UserID = ?", ["Paid", booking_id, user_id])
    
    # 2. (Mô phỏng ESB) Gọi ngầm sang Notification Service
    try:
        from notification import send_internal_notification
        send_internal_notification(user["id"], "Thanh toán thành công", f"Đơn đặt phòng số {booking_id} đã thanh toán.")
    except ImportError:
        print(f"Chưa có module Notification để gửi thông báo cho Booking {booking_id}")
    
    return jsonify({"msg": "Payment processed successfully, booking updated to Paid"}), 200
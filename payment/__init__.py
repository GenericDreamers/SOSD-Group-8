from flask import Blueprint, request, jsonify, render_template
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import execute_db, query_db

payment_bp = Blueprint('payment', __name__, url_prefix='/payment')

# ── Frontend page ──
@payment_bp.route("/")
def payment_page():
    return render_template("payment.html")

# ── API ──
@payment_bp.route("/api/process", methods=["POST"])
@jwt_required()
def process():
    payload = request.get_json()
    user = get_jwt_identity()
    booking_id = payload.get("booking_id")
    user_id = user["id"] if isinstance(user, dict) else user

    # Kiểm tra booking tồn tại và thuộc về user
    booking = query_db("SELECT * FROM Bookings WHERE ID = ? AND UserID = ?", [booking_id, user_id], one=True)
    if not booking:
        return jsonify({"msg": "Booking not found or unauthorized"}), 404

    # Cập nhật trạng thái booking
    execute_db("UPDATE Bookings SET Status = ? WHERE ID = ? AND UserID = ?", ["Paid", booking_id, user_id])

    # Ghi nhận vào bảng Payments
    execute_db("INSERT INTO Payments (BookingID, Amount, Status) VALUES (?, ?, ?)",
               [booking_id, payload.get("amount", 0), "Completed"])

    # Gọi notification service nội bộ (mô phỏng ESB)
    try:
        from notification import send_internal_notification
        send_internal_notification(user_id, "Thanh toán thành công",
                                   f"Đơn đặt chỗ #{booking_id} đã được thanh toán thành công.")
    except Exception:
        pass

    return jsonify({"msg": "Payment processed successfully"}), 200
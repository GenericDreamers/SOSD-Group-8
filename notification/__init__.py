from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

notification_bp = Blueprint('notification', __name__, url_prefix='/api/notification')

# Hàm này là "công nhân" chạy ngầm, được gọi từ Payment Service (ESB)
def send_internal_notification(user_id, subject, message):
    # Trong thực tế, đoạn này sẽ gọi API của SendGrid (gửi Email) hoặc Twilio (gửi SMS)
    # Tạm thời chúng ta in ra Terminal để chứng minh luồng chạy thành công
    print(f"\n{'='*50}")
    print(f"🔔 [HỆ THỐNG EMAIL TỰ ĐỘNG] Gửi tới User ID: {user_id}")
    print(f"Tiêu đề: {subject}")
    print(f"Nội dung: {message}")
    print(f"{'='*50}\n")
    return True

@notification_bp.route("/send", methods=["POST"])
@jwt_required()
def send():
    payload = request.get_json()
    user_data = get_jwt_identity()
    user_id = user_data["id"] if isinstance(user_data, dict) else user_data
    
    send_internal_notification(user_id, payload.get("subject"), payload.get("message"))
    return jsonify({"msg": "Notification triggered manually"}), 200
import urllib.parse
import hashlib
import hmac
from datetime import datetime
from flask import Blueprint, request, jsonify, render_template, redirect
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import execute_db, query_db

# Kéo cấu hình VNPAY vào
from vnpay_config import VNPAY_CONFIG

payment_bp = Blueprint('payment', __name__, url_prefix='/payment')

# ── Frontend page ──
@payment_bp.route("/")
def payment_page():
    return render_template("payment.html")

# ── API TẠO LINK THANH TOÁN VNPAY ──
@payment_bp.route("/api/process", methods=["POST"])
@jwt_required()
def process():
    payload = request.get_json()
    user = get_jwt_identity()
    booking_id = payload.get("booking_id")
    amount = payload.get("amount", 0)
    user_id = user["id"] if isinstance(user, dict) else user

    try:
        amount = int(float(amount))
    except (TypeError, ValueError):
        return jsonify({"msg": "Số tiền thanh toán không hợp lệ."}), 400

    if amount < 10000:
        return jsonify({"msg": "Số tiền thanh toán tối thiểu là 10.000 VNĐ."}), 400

    # 1. Kiểm tra booking tồn tại (Giữ nguyên logic của bạn)
    booking = query_db("SELECT * FROM Bookings WHERE ID = ? AND UserID = ?", [booking_id, user_id], one=True)
    if not booking:
        return jsonify({"msg": "Booking not found or unauthorized"}), 404

    # 2. Xây dựng tham số gửi sang VNPAY
    ipaddr = request.remote_addr
    # VNPAY bắt buộc mã giao dịch (TxnRef) phải là duy nhất, nên ta ghép thêm giờ phút giây vào
    vnp_TxnRef = f"{booking_id}_{datetime.now().strftime('%H%M%S')}" 
    vnp_OrderInfo = f"Thanh toan don dat cho {booking_id}"
    vnp_Amount = amount * 100 # Quy định của VNPAY: Tiền phải nhân 100

    vnpay_data = {
        "vnp_Version": "2.1.0",
        "vnp_Command": "pay",
        "vnp_TmnCode": VNPAY_CONFIG["vnp_TmnCode"],
        "vnp_Amount": str(vnp_Amount),
        "vnp_CurrCode": "VND",
        "vnp_TxnRef": vnp_TxnRef,
        "vnp_OrderInfo": vnp_OrderInfo,
        "vnp_OrderType": "billpayment",
        "vnp_Locale": "vn",
        "vnp_ReturnUrl": VNPAY_CONFIG["vnp_ReturnUrl"],
        "vnp_IpAddr": ipaddr,
        "vnp_CreateDate": datetime.now().strftime('%Y%m%d%H%M%S')
    }

    # 3. Tạo chữ ký bảo mật (Secure Hash)
    # Sắp xếp data theo thứ tự A-Z
    vnpay_data = dict(sorted(vnpay_data.items()))
    query_string = urllib.parse.urlencode(vnpay_data)
    
    # Băm mã
    hash_secret = VNPAY_CONFIG["vnp_HashSecret"].encode('utf-8')
    sign_value = hmac.new(hash_secret, query_string.encode('utf-8'), hashlib.sha512).hexdigest()
    
    # 4. Gắn chữ ký vào link và gửi cho Frontend
    vnpay_url = f"{VNPAY_CONFIG['vnp_Url']}?{query_string}&vnp_SecureHash={sign_value}"

    return jsonify({"vnpay_url": vnpay_url}), 200


@payment_bp.route("/api/vnpay_return", methods=["GET"])
def vnpay_return():
    # Lấy toàn bộ dữ liệu VNPAY trả về trên thanh địa chỉ
    vnp_args = request.args.to_dict()
    vnp_SecureHash = vnp_args.pop('vnp_SecureHash', '')
    vnp_args.pop('vnp_SecureHashType', None)
    
    # Tách lấy booking_id 
    vnp_TxnRef = vnp_args.get('vnp_TxnRef', '')
    booking_id = vnp_TxnRef.split('_')[0] if vnp_TxnRef else ''
    vnp_ResponseCode = vnp_args.get('vnp_ResponseCode', '')
    vnp_Amount = int(vnp_args.get('vnp_Amount', 0)) / 100

    # Xác thực lại chữ ký xem có đúng VNPAY gửi không (chống hacker sửa URL)
    vnp_args = dict(sorted(vnp_args.items()))
    query_string = urllib.parse.urlencode(vnp_args)
    hash_secret = VNPAY_CONFIG["vnp_HashSecret"].encode('utf-8')
    sign_value = hmac.new(hash_secret, query_string.encode('utf-8'), hashlib.sha512).hexdigest()

    failed_params = {"payment_status": "failed"}
    if booking_id:
        failed_params["booking_id"] = booking_id
    if vnp_ResponseCode:
        failed_params["vnp_code"] = vnp_ResponseCode
    if vnp_TxnRef:
        failed_params["payment_ref"] = vnp_TxnRef

    success_params = {"payment_status": "success"}
    if booking_id:
        success_params["booking_id"] = booking_id
    success_params["vnp_code"] = "00"
    if vnp_TxnRef:
        success_params["payment_ref"] = vnp_TxnRef

    if sign_value == vnp_SecureHash:
        if vnp_ResponseCode == '00': # Code '00' là quẹt thẻ thành công
            
            execute_db("UPDATE Bookings SET Status = 'Paid' WHERE ID = ?", [booking_id])
            
            execute_db("INSERT INTO Payments (BookingID, Amount, Status) VALUES (?, ?, ?)",
                       [booking_id, vnp_Amount, "Completed"])
            
            try:
                from notification import send_internal_notification
                # Vì API này VNPAY gọi bằng GET nên không có JWT, ta cần query UserID từ booking_id
                booking_info = query_db("SELECT UserID FROM Bookings WHERE ID = ?", [booking_id], one=True)
                if booking_info:
                    send_internal_notification(booking_info["UserID"], "Thanh toán thành công",
                                               f"Đơn đặt chỗ #{booking_id} đã thanh toán qua VNPAY.")
            except Exception:
                pass

            return redirect(f"/booking/?{urllib.parse.urlencode(success_params)}")
        
        else:
            return redirect(f"/payment/?{urllib.parse.urlencode(failed_params)}")
    else:
        failed_params["vnp_code"] = "invalid_signature"
        return redirect(f"/payment/?{urllib.parse.urlencode(failed_params)}")
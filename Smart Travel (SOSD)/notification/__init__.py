from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

notification_bp = Blueprint('notification', __name__, url_prefix='/api/notification')
@notification_bp.route("/send", methods=["POST"])
@jwt_required()
def send():
    payload = request.form
    # Simulate sending notification
    return jsonify({"msg": f"Sending notification to {payload['to']} with subject '{payload['subject']}' and message '{payload['message']}' for user {payload['id']}"}), 200

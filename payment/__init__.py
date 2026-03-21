from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import query_db
payment_bp = Blueprint('payment', __name__, url_prefix='/api/payment')
@payment_bp.route("/process", methods=["POST"])
def process():
    # Placeholder for payment processing logic
    return {"msg": "Payment processed successfully"}, 200

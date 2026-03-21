import datetime

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import query_db, execute_db

review_bp = Blueprint('review', __name__, url_prefix='/api/review')

@review_bp.route("/", methods=["POST"])
@jwt_required()
def add():
    payload = request.get_json()
    user = get_jwt_identity()
    review = {
        "user_id": user["id"],
        "service_id": payload["service_id"],
        "rating": payload["rating"],
        "comment": payload.get("comment", ""),
    }
    execute_db("INSERT INTO Reviews (UserID, PlaceID, Stars, Content, CreatedAt) VALUES (?, ?, ?, ?, ?)", [review["user_id"], review["service_id"], review["rating"], review["comment"], datetime.now()])
    # current_app.logger.info(f"User {user['id']} added review for service {review['service_id']}")
    return jsonify({"msg": "Review added"}), 201

@review_bp.route("/service/<int:service_id>", methods=["GET"])
def list_reviews(service_id):
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    pagination = query_db("SELECT * FROM Reviews WHERE ServiceID = ?", [service_id]).paginate(page=page, per_page=per_page, error_out=False)
    # current_app.logger.info(f"Listed reviews for service {service_id}, page {page}")
    return jsonify(
        items=query_db("SELECT * FROM Reviews WHERE ServiceID = ? LIMIT ? OFFSET ?", [service_id, per_page, (page - 1) * per_page]),
        total=pagination.total,
        page=page,
        per_page=per_page,
    )
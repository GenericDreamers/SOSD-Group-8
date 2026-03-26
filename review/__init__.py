import datetime

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import query_db, execute_db

review_bp = Blueprint('review', __name__, url_prefix='/review')

@review_bp.route("/api/add", methods=["POST"])
@jwt_required()
def add():
    payload = request.get_json()
    user = get_jwt_identity()
    review = {
        "user_id": user["id"],
        "placeID": payload["placeID"],
        "rating": payload["rating"],
        "comment": payload.get("comment", ""),
    }
    execute_db("INSERT INTO Reviews (UserID, PlaceID, Stars, Content, CreatedAt) VALUES (?, ?, ?, ?, ?)", [review["user_id"], review["placeID"], review["rating"], review["comment"], datetime.now()])
    return jsonify({"msg": "Review added"}), 201

@review_bp.route("/api/list/<int:placeID>", methods=["GET"])
def list_reviews(placeID):
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    total = query_db("SELECT ID FROM Reviews WHERE PlaceID = ?", [placeID])
    count = 0
    for x in total:
        count += 1
    return jsonify(
        items=query_db("SELECT * FROM Reviews WHERE PlaceID = ? LIMIT ? OFFSET ?", [placeID, per_page, (page - 1) * per_page]),
        total=count,
        page=page,
        per_page=per_page,
    )

@review_bp.route("/api/average/<int:placeID>", methods=["GET"])
def get_average(placeID):
    reviews = query_db("SELECT Stars FROM Reviews WHERE PlaceID = ?", [placeID])
    if not reviews:
        return "-"
    
    total = count = 0
    for r in reviews:
        total += r["Stars"]
        count += 1
    return (total/count)

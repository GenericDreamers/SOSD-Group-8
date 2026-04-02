from datetime import datetime

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
        "user_id": user,
        "placeID": payload["placeID"],
        "stars": payload["stars"],
        "comment": payload.get("comment", ""),
    }
    execute_db("INSERT INTO Reviews (UserID, PlaceID, Stars, Content, CreatedAt) VALUES (?, ?, ?, ?, ?)", [review["user_id"], review["placeID"], review["stars"], review["comment"], datetime.now()])
    return jsonify({"msg": "Review added"}), 201

@review_bp.route("/api/list/<int:placeID>", methods=["GET"])
def list_reviews(placeID):
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    total_rows = query_db("SELECT COUNT(*) as count FROM Reviews WHERE PlaceID = ?", [placeID], one=True)
    count = total_rows["count"]

    reviews = query_db(
        """SELECT Reviews.*, UserProfiles.Username 
           FROM Reviews 
           LEFT JOIN UserProfiles ON Reviews.UserID = UserProfiles.UserID 
           WHERE Reviews.PlaceID = ? 
           LIMIT ? OFFSET ?""", 
        [placeID, per_page, (page - 1) * per_page]
    )

    reviews_list = [dict(row) for row in reviews]
    return jsonify(
        items=reviews_list,
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

@review_bp.route("/api/user/<int:placeID>", methods=["GET"])
@jwt_required()
def get_user_review(placeID):
    user_id = get_jwt_identity()
    review = query_db(
        "SELECT * FROM Reviews WHERE PlaceID = ? AND UserID = ?", 
        [placeID, user_id], 
        one=True
    )
    
    if review:
        return jsonify(dict(review)), 200
    else:
        return jsonify({"msg": "No review found"}), 404

@review_bp.route("/api/update/<int:reviewID>", methods=["PUT"])
@jwt_required()
def update_review(reviewID):
    user_id = get_jwt_identity()
    payload = request.get_json()
    
    # Verify ownership
    review = query_db("SELECT UserID FROM Reviews WHERE ID = ?", [reviewID], one=True)
    if not review or review["UserID"] != int(user_id):
        return jsonify({"msg": "Unauthorized"}), 403
    
    execute_db(
        "UPDATE Reviews SET Stars = ?, Content = ? WHERE ID = ?",
        [payload["stars"], payload["comment"], reviewID]
    )
    return jsonify({"msg": "Review updated"}), 200

@review_bp.route("/api/delete/<int:reviewID>", methods=["DELETE"])
@jwt_required()
def delete_review(reviewID):
    user_id = get_jwt_identity()
    
    # Verify ownership
    review = query_db("SELECT UserID FROM Reviews WHERE ID = ?", [reviewID], one=True)
    if not review or review["UserID"] != int(user_id):
        return jsonify({"msg": "Unauthorized"}), 403
    
    execute_db("DELETE FROM Reviews WHERE ID = ?", [reviewID])
    return jsonify({"msg": "Review deleted"}), 200

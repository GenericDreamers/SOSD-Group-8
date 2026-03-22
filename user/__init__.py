from flask import Blueprint, request, jsonify
from auth import require_ownership_or_admin
from flask_jwt_extended import get_jwt_identity, jwt_required
from db import query_db, execute_db
user_bp = Blueprint('user', __name__, url_prefix='/user')

@user_bp.route("/api/delete-user/<int:user_id>", methods=["DELETE"])
@jwt_required()
@require_ownership_or_admin
def delete_user(user_id):
    execute_db("DELETE FROM Users WHERE ID = ?", [user_id])
    execute_db("DELETE FROM UserProfiles WHERE UserID = ?", [user_id])
    return jsonify({"msg": "User deleted"}), 200

@user_bp.route("/api/profile/<int:user_id>", methods=["GET"])
@jwt_required()
@require_ownership_or_admin
def get_profile(user_id):
    profile = query_db("SELECT * FROM UserProfiles WHERE UserID = ?", [user_id])
    if not profile:
        return jsonify({"msg": "Profile not found"}), 404
    return jsonify(profile)

@user_bp.route("/api/profile/<int:user_id>", methods=["POST"])
@jwt_required()
@require_ownership_or_admin
def create_profile(user_id):
    if query_db("SELECT * FROM UserProfiles WHERE UserID = ?", [user_id]):
        return jsonify({"msg": "Profile already exists"}), 409

    payload = request.form
    execute_db("INSERT INTO UserProfiles (UserID, Name, DateOfBirth, Gender) VALUES (?, ?, ?, ?)", [
        user_id,
        payload.get("name"),
        payload.get("date_of_birth"),
        payload.get("gender")
    ])
    return jsonify({"msg": "Profile created"}), 201

@user_bp.route("/api/profile/<int:user_id>", methods=["PUT"])
@jwt_required()
@require_ownership_or_admin
def update_profile(user_id):
    requester_id = get_jwt_identity()["id"]
    if requester_id != user_id or query_db("SELECT Role FROM Users WHERE UserID = ?", [requester_id]) != "Admin":
        return jsonify({"msg": "Unauthorized"}), 403
    profile = query_db("SELECT * FROM UserProfiles WHERE UserID = ?", [user_id], one=True)
    if not profile:
        return jsonify({"msg": "Profile not found"}), 404
    payload = request.form
    execute_db("UPDATE UserProfiles SET Name = ?, DateOfBirth = ?, Gender = ? WHERE UserID = ?", [
        payload.get("name"),
        payload.get("date_of_birth"),
        payload.get("gender"),
        user_id
    ])

    return jsonify({"msg": "Profile updated"}), 200

@user_bp.route("/api/profile/<int:user_id>", methods=["DELETE"])
@jwt_required()
@require_ownership_or_admin
def delete_profile(user_id):
    requester_id = get_jwt_identity()["id"]
    if requester_id != user_id or query_db("SELECT Role FROM Users WHERE UserID = ?", [requester_id]) != "Admin":
        return jsonify({"msg": "Unauthorized"}), 403
    profile = query_db("SELECT * FROM UserProfiles WHERE UserID = ?", [user_id], one=True)
    if not profile:
        return jsonify({"msg": "Profile not found"}), 404
    execute_db("DELETE FROM UserProfiles WHERE UserID = ?", [user_id])
    return jsonify({"msg": "Profile deleted"}), 200
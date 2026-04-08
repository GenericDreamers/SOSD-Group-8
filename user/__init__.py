from flask import Blueprint, request, jsonify, render_template
from auth import require_ownership_or_admin
from flask_jwt_extended import jwt_required
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
    # Merge with User table to get Email and Role
    user = query_db("SELECT Email, Role FROM Users WHERE ID = ?", [user_id], one=True)
    if not profile:
        return jsonify([]), 200
    result = []
    for p in profile:
        p_dict = dict(p)
        if user:
            p_dict['Email'] = user['Email']
            p_dict['Role'] = user['Role']
        result.append(p_dict)
    return jsonify(result), 200

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
    profile = query_db("SELECT * FROM UserProfiles WHERE UserID = ?", [user_id], one=True)
    if not profile:
        return jsonify({"msg": "Profile not found"}), 404
    payload = request.form
    execute_db("UPDATE UserProfiles SET Username = ?, Birthday = ?, Gender = ? WHERE UserID = ?", [
        payload.get("username"),
        payload.get("birthday"),
        payload.get("gender"),
        user_id
    ])
    return jsonify({"msg": "Profile updated"}), 200

@user_bp.route("/api/profile/<int:user_id>", methods=["DELETE"])
@jwt_required()
@require_ownership_or_admin
def delete_profile(user_id):
    profile = query_db("SELECT * FROM UserProfiles WHERE UserID = ?", [user_id], one=True)
    if not profile:
        return jsonify({"msg": "Profile not found"}), 404
    execute_db("DELETE FROM UserProfiles WHERE UserID = ?", [user_id])
    return jsonify({"msg": "Profile deleted"}), 200


# Frontend
@user_bp.route("/profile")
def profile_page():
    return render_template("profile.html")
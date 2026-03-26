from flask import Blueprint, jsonify, render_template, request
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt_identity, jwt_required
from db import query_db, execute_db

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

@auth_bp.route("/api/register", methods=["POST"])
def register():
    data = request.form
    if not data:
        return jsonify({"msg": "Missing or invalid POST data"}), 400

    if query_db("SELECT * FROM Users WHERE Email = ?", [data["email"]], one=True):
        return jsonify({"msg": "Email already registered"}), 409
    
    if (data["password"] != data["confirm-password"]):
        return jsonify({"msg": "Password fields don't match"}), 403
    
    execute_db("INSERT INTO Users (Email, Password, Role) VALUES (?, ?, ?)", [data["email"], generate_password_hash(data["password"]), "User"])
    userId = query_db("Select ID FROM Users WHERE Email = ?", [data["email"]], True)["ID"]
    execute_db("INSERT INTO UserProfiles VALUES (?, ?, ?, ?)", [userId, data["username"], data["birthday"], data["gender"]])

    return jsonify({"msg": "User created"}), 201

@auth_bp.route("/api/login", methods=["POST"])
def login():
    data = request.form
    if not data:
        return jsonify({"msg": "Missing or invalid POST data"}), 400
    user = query_db("SELECT * FROM Users WHERE Email = ?", [data["email"]], one=True)
    if not user or not check_password_hash(user['Password'], data["password"]):
        return jsonify({"msg": "Invalid credentials"}), 401
    access = create_access_token(identity={"id": user["ID"], "role": user["Role"]})
    refresh = create_refresh_token(identity={"id": user["ID"], "role": user["Role"]})
    return jsonify(access_token=access, refresh_token=refresh), 200

@auth_bp.route("/api/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    new_access = create_access_token(identity=identity)
    return jsonify(access_token=new_access), 200

@auth_bp.route("/api/me", methods=["GET"])
@jwt_required()
def me():
    user = get_jwt_identity()
    return jsonify(user), 200

@auth_bp.route("/api/change-password", methods=["POST"])
@jwt_required()
def change_password():
    user = get_jwt_identity()
    data = request.form
    current_user = query_db("SELECT * FROM Users WHERE ID = ?", [user["id"]], one=True)
    if not check_password_hash(current_user['Password'], data["current_password"]):
        return jsonify({"msg": "Current password is incorrect"}), 401
    query_db("UPDATE Users SET Password = ? WHERE ID = ?", [generate_password_hash(data["new_password"]), user["id"]], one=True)
    return jsonify({"msg": "Password changed successfully"}), 200

def require_ownership_or_admin(func):
    """Wrap a view to ensure the caller is the owner or an admin."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        user_id = kwargs.get("user_id")
        if user_id is None:
            if "it_id" in kwargs:
                query = query_db("SELECT UserID FROM Itineraries WHERE ID = ?", [kwargs["it_id"]], one=True)
                if query:
                    user_id = query["UserID"]
                else:
                    return jsonify({"msg": "Itinerary not found"}), 404
            else:
                return jsonify({"msg": "Missing user_id"}), 400

        requester = get_jwt_identity()
        if not requester:
            return jsonify({"msg": "Missing JWT"}), 401

        requester_id = requester["id"]
        if requester_id != user_id:
            row = query_db("SELECT Role FROM Users WHERE UserID = ?", [requester_id], one=True)
            if not row or row["Role"] != "Admin":
                return jsonify({"msg": "Unauthorized"}), 403
        # All checks passed – call the original view
        return func(*args, **kwargs)
    return wrapper

def admin_required(func):
    """Wrap a view to require admin role."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        requester = get_jwt_identity()
        if not requester:
            return jsonify({"msg": "Missing JWT"}), 401
        requester_id = requester["id"]
        row = query_db("SELECT Role FROM Users WHERE ID = ?", [requester_id], one=True)
        if not row or row["Role"] != "Admin":
            return jsonify({"msg": "Admin access required"}), 403
        return func(*args, **kwargs)
    return wrapper

#Frontend routes for registration and login pages
@auth_bp.route("/register", methods=["GET", "POST"])
def register_page():
    if request.method == "POST":
        api_response = register()
        if api_response[1] == 201:
            return render_template("login.html", msg=api_response[0].json["msg"])
        else:
            return render_template("register.html", msg=api_response[0].json["msg"])
    return render_template("register.html")

@auth_bp.route("/login", methods=["GET", "POST"])
def login_page():
    if request.method == "POST":
        api_response = login()
        if api_response[1] == 200:
            return render_template("map.html") #placeholder, probably should redirect user to a dashboard or something
        else:
            return render_template("login.html", msg=api_response[0].json["msg"])
    return render_template("login.html")
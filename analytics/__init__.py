from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from datetime import datetime, timedelta
from db import query_db
from auth import admin_required

analytics_bp = Blueprint('analytics', __name__, url_prefix='/analytics')

@analytics_bp.route("/api/list-users", methods=["GET"])
@jwt_required()
@admin_required
def admin_list_users():
    users = query_db("SELECT ID, Email, Role FROM Users")
    return jsonify([dict(u) for u in users]), 200

@analytics_bp.route("/api/bookings/daily", methods=["GET"])
@jwt_required()
@admin_required
def bookings_daily():
    end = datetime.now()
    start = end - timedelta(days=30)
    result = query_db(
        """
        SELECT DATE(CreatedAt) as date, COUNT(ID) as count
        FROM Bookings
        WHERE CreatedAt BETWEEN ? AND ?
        GROUP BY DATE(CreatedAt)
        ORDER BY date
        """,
        [start.isoformat(), end.isoformat()]
    )
    data = [{"date": r["date"], "bookings": r["count"]} for r in result]
    return jsonify(data), 200

@analytics_bp.route("/api/places/top", methods=["GET"])
@jwt_required()
@admin_required
def top_places():
    result = query_db(
        """
        SELECT p.ID as place_id, p.Name as name,
               ROUND(AVG(r.Stars), 2) as avg_rating,
               COUNT(r.ID) as review_cnt
        FROM Places p
        JOIN Reviews r ON p.ID = r.PlaceID
        GROUP BY p.ID, p.Name
        ORDER BY avg_rating DESC
        LIMIT 10
        """
    )
    data = [
        {
            "place_id": r["place_id"],
            "name": r["name"],
            "average_rating": r["avg_rating"],
            "review_count": r["review_cnt"],
        }
        for r in result
    ]
    return jsonify(data), 200
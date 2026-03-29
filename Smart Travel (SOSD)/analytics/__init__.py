from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from datetime import datetime, timedelta
from db import query_db, execute_db
from auth import admin_required

analytics_bp = Blueprint('analytics', __name__, url_prefix='/analytics')

@analytics_bp.route("/api/list-users", methods=["GET"])
@jwt_required()
@admin_required
def admin_list_users():
    users = query_db("SELECT ID, Email, Role FROM Users")
    return jsonify(users), 200

@analytics_bp.route("/api/bookings/daily", methods=["GET"])
@jwt_required()
@admin_required
def bookings_daily():
    end = datetime.now()
    start = end - timedelta(days=30)
    result = (
        query_db(
            """
            SELECT DATE(created_at) as date, COUNT(id) as count
            FROM Bookings
            WHERE created_at BETWEEN ? AND ?
            GROUP BY DATE(created_at)
            ORDER BY date
            """,
            [start, end]
        )
    )
    data = [{"date": r.date.isoformat(), "bookings": r.count} for r in result]
    return jsonify(data)

@analytics_bp.route("/api/places/top", methods=["GET"])
@jwt_required()
@admin_required
def top_places():
    # average rating per place
    subq = (
        query_db(
            """
            SELECT service_id as place_id, AVG(rating) as avg_rating, COUNT(id) as review_cnt
            FROM Reviews
            GROUP BY service_id
            """
        )
    )
    query = (
        query_db(
            """
            SELECT Place.id, Place.name, subq.avg_rating, subq.review_cnt
            FROM Places Place
            JOIN ? subq ON Place.id = subq.place_id
            ORDER BY subq.avg_rating DESC
            LIMIT 10
            """,
            [subq]
        )
    )
    data = [
        {
            "place_id": r.id,
            "name": r.name,
            "average_rating": round(r.avg_rating, 2),
            "review_count": r.review_cnt,
        }
        for r in query
    ]
    return jsonify(data)
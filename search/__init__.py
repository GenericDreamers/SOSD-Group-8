from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from db import query_db
search_bp = Blueprint('search', __name__, url_prefix='/api/search')

@search_bp.route("/autocomplete", methods=["GET"])
@jwt_required()
def autocomplete():
    q = request.args.get("q", "")
    if q:
        suggestions = query_db("SELECT Name FROM Places WHERE Name LIKE ?", [f"%{q}%"])
    else:
        suggestions = []
    return jsonify(suggestions=suggestions), 200

@search_bp.route("/results", methods=["GET"])
@jwt_required()
def results():
    filters = []
    city = request.args.get("city")
    if city:
        filters.append(query_db("SELECT * FROM Places WHERE City like ?", [f"%{city}%"]))
    min_price = request.args.get("price_min")
    if min_price:
        filters.append(query_db("SELECT * FROM Places WHERE Price >= ?", [float(min_price)]))
    max_price = request.args.get("price_max")
    if max_price:
        filters.append(query_db("SELECT * FROM Places WHERE Price <= ?", [float(max_price)]))
    rating = request.args.get("rating")
    if rating:
        filters.append(query_db("SELECT * FROM Places WHERE Rating >= ?", [float(rating)]))

    query = query_db("SELECT * FROM Places")
    for f in filters:
        query = query.intersect(f)  # combine filters using intersection

    # sorting
    sort = request.args.get("sort")
    if sort == "price_asc":
        query = query.order_by("Price ASC")
    elif sort == "rating_asc":
        query = query.order_by("Rating ASC")
    elif sort == "price_desc":
        query = query.order_by("Price DESC")
    elif sort == "rating_desc":
        query = query.order_by("Rating DESC")

    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify(
        items=query_db("SELECT * FROM Places WHERE ID IN (SELECT ID FROM Places LIMIT ? OFFSET ?)", [per_page, (page - 1) * per_page]),
        total=pagination.total,
        page=page,
        per_page=per_page,
    )
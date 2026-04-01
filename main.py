import datetime
from flask import Flask, render_template
from flask_jwt_extended import JWTManager

from auth import auth_bp
from user import user_bp
from search import search_bp
from maps import maps_bp
from weather import weather_bp
from booking import booking_bp
from itinerary import itinerary_bp
from review import review_bp
from payment import payment_bp
from notification import notification_bp
from analytics import analytics_bp

app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = 'Group8SmartTravelVeryLongSecretKeyStopGivingWarnings'
JWT_ACCESS_TOKEN_EXPIRES = datetime.timedelta(hours=1)
JWT_REFRESH_TOKEN_EXPIRES = datetime.timedelta(days=1)
jwt = JWTManager(app)
app.secret_key = "Group8SmartTravel"   
app.template_folder = "templates"
app.static_folder = "static"

app.register_blueprint(auth_bp)
app.register_blueprint(user_bp)
app.register_blueprint(search_bp)
app.register_blueprint(maps_bp)
app.register_blueprint(weather_bp)
app.register_blueprint(booking_bp)
app.register_blueprint(itinerary_bp)
app.register_blueprint(review_bp)
app.register_blueprint(payment_bp)
app.register_blueprint(notification_bp)
app.register_blueprint(analytics_bp)

@app.route("/")
def index():
    return render_template("index.html")

if __name__ == "__main__":
    app.run(debug=True, port=5002)
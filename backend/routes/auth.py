from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from pymongo import MongoClient
from bson.objectid import ObjectId
from datetime import datetime
import bcrypt
import os

# MongoDB Connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DB_NAME = os.getenv("DB_NAME", "binary_trade_db")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
users_collection = db.users

# Create Blueprint
auth_bp = Blueprint('auth', __name__)

# Helper functions
def hash_password(password):
    """Hash a password for storing."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt)

def check_password(stored_password, provided_password):
    """Verify a stored password against one provided by user"""
    return bcrypt.checkpw(provided_password.encode('utf-8'), stored_password)

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['username', 'email', 'password']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400
    
    # Check if email already exists
    if users_collection.find_one({"email": data['email']}):
        return jsonify({"error": "Email already registered"}), 409
    
    # Check if username already exists
    if users_collection.find_one({"username": data['username']}):
        return jsonify({"error": "Username already taken"}), 409
    
    # Create new user
    new_user = {
        "username": data['username'],
        "email": data['email'],
        "password": hash_password(data['password']),
        "balance": 10000.00,  # Default starting balance
        "created_at": datetime.now()
    }
    
    # Insert user into database
    result = users_collection.insert_one(new_user)
    
    if result.inserted_id:
        return jsonify({"message": "User registered successfully"}), 201
    else:
        return jsonify({"error": "Failed to register user"}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login a user"""
    data = request.get_json()
    
    # Validate required fields
    if 'email' not in data or 'password' not in data:
        return jsonify({"error": "Email and password are required"}), 400
    
    # Find user by email
    user = users_collection.find_one({"email": data['email']})
    
    if not user:
        return jsonify({"error": "Invalid email or password"}), 401
    
    # Check password
    if not check_password(user['password'], data['password']):
        return jsonify({"error": "Invalid email or password"}), 401
    
    # Create access token
    access_token = create_access_token(identity=str(user['_id']))
    
    return jsonify({
        "message": "Login successful",
        "access_token": access_token,
        "user": {
            "id": str(user['_id']),
            "username": user['username'],
            "email": user['email'],
            "balance": user['balance']
        }
    }), 200

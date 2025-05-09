from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from pymongo import MongoClient
from bson.objectid import ObjectId
import os

# MongoDB Connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DB_NAME = os.getenv("DB_NAME", "binary_trade_db")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
users_collection = db.users

# Create Blueprint
user_bp = Blueprint('user', __name__)

@user_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """Get user profile"""
    current_user_id = get_jwt_identity()
    
    user = users_collection.find_one({"_id": ObjectId(current_user_id)})
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify({
        "id": str(user['_id']),
        "username": user['username'],
        "email": user['email'],
        "balance": user['balance']
    }), 200

@user_bp.route('/balance', methods=['GET'])
@jwt_required()
def get_balance():
    """Get user balance"""
    current_user_id = get_jwt_identity()
    
    user = users_collection.find_one({"_id": ObjectId(current_user_id)})
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify({
        "balance": user['balance']
    }), 200

@user_bp.route('/update-balance', methods=['POST'])
@jwt_required()
def update_balance():
    """Update user balance based on trade results"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    if 'amount' not in data:
        return jsonify({"error": "Amount is required"}), 400
    
    try:
        amount = float(data['amount'])
    except ValueError:
        return jsonify({"error": "Amount must be a number"}), 400
    
    # Find user and update balance
    result = users_collection.update_one(
        {"_id": ObjectId(current_user_id)},
        {"$inc": {"balance": amount}}
    )
    
    if result.modified_count == 0:
        return jsonify({"error": "Failed to update balance"}), 500
    
    # Get updated user
    user = users_collection.find_one({"_id": ObjectId(current_user_id)})
    
    return jsonify({
        "message": "Balance updated successfully",
        "balance": user['balance']
    }), 200

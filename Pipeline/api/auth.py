"""
Authentication module for the Protein Pipeline API.
Handles user registration, login, logout, password changes, and authentication middleware.
"""

from flask import Blueprint, request, jsonify, session
from functools import wraps

# Create blueprint for authentication routes
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# Global variables to be injected by app factory
auth_manager = None
app_logger = None

def init_auth_module(auth_mgr, logger):
    """Initialize the auth module with dependencies."""
    global auth_manager, app_logger
    auth_manager = auth_mgr
    app_logger = logger

def require_auth(f):
    """Authentication decorator for protected routes."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not auth_manager:
            return jsonify({'success': False, 'error': 'Authentication service unavailable'}), 503
        
        if 'user' not in session:
            return jsonify({'success': False, 'error': 'Authentication required'}), 401
        
        return f(*args, **kwargs)
    return decorated_function

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user."""
    if not auth_manager:
        return jsonify({'success': False, 'error': 'Authentication service unavailable'}), 503
    
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
            
        required_fields = ['username', 'email', 'password', 'full_name']
        
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    'success': False, 
                    'error': f'Missing required field: {field}'
                }), 400
        
        result = auth_manager.register_user(
            username=data['username'],
            email=data['email'],
            password=data['password'],
            full_name=data['full_name'],
            institution=data.get('institution')
        )
        
        if result['success']:
            return jsonify(result), 201
        else:
            return jsonify(result), 400
            
    except Exception as e:
        if app_logger:
            app_logger.error(f"Registration error: {str(e)}")
        return jsonify({'success': False, 'error': 'Registration failed'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate user and create session."""
    if not auth_manager:
        return jsonify({'success': False, 'error': 'Authentication service unavailable'}), 503
    
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
            
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({
                'success': False, 
                'error': 'Username and password are required'
            }), 400
        
        result = auth_manager.authenticate_user(username, password)
        
        if result['success']:
            # Store user in session
            session['user'] = result['user']
            session.permanent = True
            
            return jsonify({
                'success': True,
                'user': result['user'],
                'message': 'Login successful'
            })
        else:
            return jsonify(result), 401
            
    except Exception as e:
        if app_logger:
            app_logger.error(f"Login error: {str(e)}")
        return jsonify({'success': False, 'error': 'Login failed'}), 500

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Logout user and clear session."""
    try:
        if app_logger:
            app_logger.info(f"Logout request for session: {session.get('user', {}).get('user_name', 'unknown')}")
        
        # Clear all session data
        session.clear()
        
        # Create response
        response = jsonify({'success': True, 'message': 'Logout successful'})
        
        # Clear session cookie by setting it to expire immediately
        response.set_cookie('session', '', 
                          expires=0, 
                          httponly=True, 
                          samesite='Lax',
                          path='/')
        
        if app_logger:
            app_logger.info("Logout completed successfully")
            
        return response
    except Exception as e:
        if app_logger:
            app_logger.error(f"Logout error: {str(e)}")
        return jsonify({'success': False, 'error': 'Logout failed'}), 500

@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    """Get current authenticated user."""
    try:
        if 'user' in session and session['user']:
            # Validate that the session is still valid
            user_data = session['user']
            if app_logger:
                app_logger.info(f"Session check for user: {user_data.get('user_name', 'unknown')}")
            
            return jsonify({
                'success': True,
                'user': user_data
            })
        else:
            if app_logger:
                app_logger.info("No valid session found")
            return jsonify({
                'success': False,
                'error': 'Not authenticated'
            }), 401
    except Exception as e:
        if app_logger:
            app_logger.error(f"Session validation error: {str(e)}")
        # Clear potentially corrupted session
        session.clear()
        return jsonify({
            'success': False,
            'error': 'Session invalid'
        }), 401

@auth_bp.route('/change-password', methods=['POST'])
@require_auth
def change_password():
    """Change user password."""
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
            
        old_password = data.get('old_password')
        new_password = data.get('new_password')
        
        if not old_password or not new_password:
            return jsonify({
                'success': False, 
                'error': 'Old password and new password are required'
            }), 400
        
        username = session['user']['user_name']
        if auth_manager:
            result = auth_manager.change_password(username, old_password, new_password)
            
            if result['success']:
                return jsonify(result)
            else:
                return jsonify(result), 400
        else:
            return jsonify({'success': False, 'error': 'Authentication service unavailable'}), 503
            
    except Exception as e:
        if app_logger:
            app_logger.error(f"Password change error: {str(e)}")
        return jsonify({'success': False, 'error': 'Password change failed'}), 500

@auth_bp.route('/credits', methods=['GET'])
@require_auth
def get_user_credits():
    """Get current user's credits."""
    try:
        username = session['user']['user_name']
        if auth_manager:
            credits = auth_manager.get_user_credits(username)
            return jsonify({
                'success': True,
                'credits': credits
            })
        else:
            return jsonify({'success': False, 'error': 'Authentication service unavailable'}), 503
    except Exception as e:
        if app_logger:
            app_logger.error(f"Get credits error: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to get credits'}), 500

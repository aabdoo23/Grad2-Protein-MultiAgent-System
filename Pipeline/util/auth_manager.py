"""
User authentication and database management utilities.
"""
import hashlib
import secrets
import re
from database.db_manager import DatabaseManager
from datetime import datetime
from typing import Optional, Dict, Any
import logging

# Configure logging
logger = logging.getLogger(__name__)

class AuthManager:
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager
    
    def _hash_password(self, password: str, salt: str = None) -> tuple:
        """Hash a password with salt."""
        if salt is None:
            salt = secrets.token_hex(16)
        
        # Combine password and salt, then hash
        combined = (password + salt).encode('utf-8')
        hashed = hashlib.sha256(combined).hexdigest()
        return hashed, salt
    
    def _validate_email(self, email: str) -> bool:
        """Validate email format."""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    def _validate_password(self, password: str) -> tuple:
        """Validate password strength."""
        errors = []
        
        if len(password) < 8:
            errors.append("Password must be at least 8 characters long")
        
        if not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter")
        
        if not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter")
        
        if not re.search(r'\d', password):
            errors.append("Password must contain at least one number")
        
        return len(errors) == 0, errors
    
    def _validate_username(self, username: str) -> tuple:
        """Validate username format."""
        errors = []
        
        if len(username) < 3:
            errors.append("Username must be at least 3 characters long")
        
        if len(username) > 50:
            errors.append("Username must be no more than 50 characters long")
        
        if not re.match(r'^[a-zA-Z0-9_]+$', username):
            errors.append("Username can only contain letters, numbers, and underscores")
        
        return len(errors) == 0, errors
    
    def register_user(self, username: str, email: str, password: str, 
                     full_name: str, institution: str = None) -> Dict[str, Any]:
        """Register a new user."""
        try:
            # Validate inputs
            if not self._validate_email(email):
                return {'success': False, 'error': 'Invalid email format'}
            
            username_valid, username_errors = self._validate_username(username)
            if not username_valid:
                return {'success': False, 'error': '; '.join(username_errors)}
            
            password_valid, password_errors = self._validate_password(password)
            if not password_valid:
                return {'success': False, 'error': '; '.join(password_errors)}
            
            if not full_name or len(full_name.strip()) < 2:
                return {'success': False, 'error': 'Full name is required'}
            
            # Check if username or email already exists
            existing_user = self.get_user_by_username(username)
            if existing_user:
                return {'success': False, 'error': 'Username already exists'}
            
            existing_email = self.get_user_by_email(email)
            if existing_email:
                return {'success': False, 'error': 'Email already registered'}
            
            # Hash password
            hashed_password, salt = self._hash_password(password)
            stored_password = f"{hashed_password}:{salt}"
            
            logger.info(f"Registering user {username}")
            logger.info(f"Password hash: {hashed_password[:20]}...")
            logger.info(f"Salt: {salt[:10]}...")
            logger.info(f"Stored password format: {stored_password[:50]}...")
            
            # Insert user into database
            query = """
                INSERT INTO user_account 
                (user_name, email, full_name, hashed_password, institution, credits, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            
            now = datetime.utcnow()
            params = (
                username,
                email,
                full_name.strip(),
                stored_password,
                institution.strip() if institution else None,
                100,  # Initial credits
                1,    # is_active = True
                now,
                now
            )
            
            self.db.execute_query(query, params)
            
            return {
                'success': True,
                'message': 'User registered successfully',
                'user': {
                    'username': username,
                    'email': email,
                    'full_name': full_name,
                    'institution': institution,
                    'credits': 100
                }
            }
            
        except Exception as e:
            return {'success': False, 'error': f'Registration failed: {str(e)}'}
    
    def authenticate_user(self, username: str, password: str) -> Dict[str, Any]:
        """Authenticate a user with username and password."""
        try:
            logger.info(f"Attempting authentication for username: {username}")
            
            user = self.get_user_by_username(username)
            if not user:
                logger.warning(f"User not found: {username}")
                return {'success': False, 'error': 'Invalid username or password'}
            
            logger.info(f"User found: {username}, is_active: {user.get('is_active')}")
            
            if not user.get('is_active'):
                logger.warning(f"User account disabled: {username}")
                return {'success': False, 'error': 'Account is disabled'}
            
            # Get stored password and salt
            stored_password = user['hashed_password']
            logger.info(f"Stored password format: {type(stored_password)} - {stored_password[:50]}...")
            
            if ':' not in stored_password:
                logger.error(f"Invalid password format for user {username}: no salt separator found")
                return {'success': False, 'error': 'Invalid password format'}
            
            hashed_password, salt = stored_password.split(':', 1)
            logger.info(f"Extracted - Hash: {hashed_password[:20]}..., Salt: {salt[:10]}...")
            
            # Hash the provided password with the stored salt
            test_hash, _ = self._hash_password(password, salt)
            logger.info(f"Test hash: {test_hash[:20]}...")
            logger.info(f"Hash match: {test_hash == hashed_password}")
            
            if test_hash == hashed_password:
                logger.info(f"Authentication successful for user: {username}")
                # Remove sensitive information before returning
                user_data = {k: v for k, v in user.items() if k != 'hashed_password'}
                return {
                    'success': True,
                    'user': user_data
                }
            else:
                logger.warning(f"Password mismatch for user: {username}")
                return {'success': False, 'error': 'Invalid username or password'}
                
        except Exception as e:
            logger.error(f"Authentication error for {username}: {str(e)}")
            return {'success': False, 'error': f'Authentication failed: {str(e)}'}
    
    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user by username."""
        try:
            query = "SELECT * FROM user_account WHERE user_name = ?"
            logger.info(f"Querying for user: {username}")
            result = self.db.fetch_one(query, (username,))
            if result:
                user_dict = dict(result)
                logger.info(f"User found: {username}, has password: {bool(user_dict.get('hashed_password'))}")
                return user_dict
            else:
                logger.warning(f"User not found in database: {username}")
                return None
        except Exception as e:
            logger.error(f"Error fetching user {username}: {e}")
            return None
    
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email."""
        try:
            query = "SELECT * FROM user_account WHERE email = ?"
            result = self.db.fetch_one(query, (email,))
            return dict(result) if result else None
        except Exception:
            return None
    
    def update_user_credits(self, username: str, credits_change: int) -> bool:
        """Update user credits (can be positive or negative)."""
        try:
            query = """
                UPDATE user_account 
                SET credits = credits + ?, updated_at = ?
                WHERE user_name = ? AND is_active = 1
            """
            params = (credits_change, datetime.utcnow(), username)
            rows_affected = self.db.execute_query(query, params)
            return rows_affected > 0
        except Exception:
            return False
    
    def get_user_credits(self, username: str) -> int:
        """Get current user credits."""
        try:
            query = "SELECT credits FROM user_account WHERE user_name = ? AND is_active = 1"
            result = self.db.fetch_one(query, (username,))
            return result['credits'] if result else 0
        except Exception:
            return 0
    
    def change_password(self, username: str, old_password: str, new_password: str) -> Dict[str, Any]:
        """Change user password."""
        try:
            # Authenticate with old password first
            auth_result = self.authenticate_user(username, old_password)
            if not auth_result['success']:
                return {'success': False, 'error': 'Current password is incorrect'}
            
            # Validate new password
            password_valid, password_errors = self._validate_password(new_password)
            if not password_valid:
                return {'success': False, 'error': '; '.join(password_errors)}
            
            # Hash new password
            hashed_password, salt = self._hash_password(new_password)
            stored_password = f"{hashed_password}:{salt}"
            
            # Update password in database
            query = """
                UPDATE user_account 
                SET hashed_password = ?, updated_at = ?
                WHERE user_name = ?
            """
            params = (stored_password, datetime.utcnow(), username)
            self.db.execute_query(query, params)
            
            return {'success': True, 'message': 'Password changed successfully'}
            
        except Exception as e:
            return {'success': False, 'error': f'Password change failed: {str(e)}'}

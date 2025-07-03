"""
Database configuration and connection management for Protein Pipeline Finetuning System
"""

import os
import psycopg2
import psycopg2.extras
import logging
from contextlib import contextmanager
from typing import Optional, Dict, Any
import json
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatabaseConfig:
    """Database configuration management"""
    
    def __init__(self):
        # Load PostgreSQL configuration from environment variables
        self.connection_string = os.getenv('PG_CONNECTION_STRING', '')
        
        if not self.connection_string:
            # Fallback to individual parameters if connection string not provided
            self.host = os.getenv('PG_HOST', 'localhost')
            self.database = os.getenv('PG_DATABASE', 'postgres')
            self.username = os.getenv('PG_USERNAME', 'postgres')
            self.password = os.getenv('PG_PASSWORD', '')
            self.port = os.getenv('PG_PORT', '5432')
            self.sslmode = os.getenv('PG_SSLMODE', 'prefer')
            
            self.connection_string = (
                f"postgresql://{self.username}:{self.password}@{self.host}:{self.port}/{self.database}"
                f"?sslmode={self.sslmode}"
            )
        
    def get_connection_string(self) -> str:
        """Get PostgreSQL connection string"""
        return self.connection_string

class DatabaseManager:
    """Database connection and query management"""
    
    def __init__(self, config: Optional[DatabaseConfig] = None):
        self.config = config or DatabaseConfig()
        self.connection_string = self.config.get_connection_string()
        
    @contextmanager
    def get_connection(self):
        """Context manager for database connections"""
        conn = None
        try:
            conn = psycopg2.connect(self.connection_string)
            conn.autocommit = False  # Use transactions
            yield conn
        except psycopg2.Error as e:
            logger.error(f"Database connection error: {e}")
            if conn:
                conn.rollback()
            raise
        finally:
            if conn:
                conn.close()
    
    def execute_query(self, query: str, params: Optional[tuple] = None, fetch: bool = False) -> Optional[Any]:
        """Execute a query and optionally fetch results"""
        with self.get_connection() as conn:
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            try:
                # Convert ? placeholders to %s for PostgreSQL
                if params and '?' in query:
                    query = query.replace('?', '%s')
                
                if params:
                    cursor.execute(query, params)
                else:
                    cursor.execute(query)
                
                if fetch:
                    results = []
                    for row in cursor.fetchall():
                        results.append(dict(row))
                    return results
                else:
                    conn.commit()
                    return cursor.rowcount
                    
            except psycopg2.Error as e:
                logger.error(f"Query execution error: {e}")
                conn.rollback()
                raise
    
    def fetch_all(self, query: str, params: Optional[tuple] = None) -> list:
        """Execute query and fetch all results"""
        return self.execute_query(query, params, fetch=True) or []
    
    def fetch_one(self, query: str, params: Optional[tuple] = None) -> Optional[dict]:
        """Execute query and fetch one result"""
        results = self.execute_query(query, params, fetch=True) or []
        return results[0] if results else None
    
    def execute_scalar(self, query: str, params: Optional[tuple] = None) -> Any:
        """Execute a query and return a single value"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            try:
                # Convert ? placeholders to %s for PostgreSQL
                if params and '?' in query:
                    query = query.replace('?', '%s')
                    
                if params:
                    cursor.execute(query, params)
                else:
                    cursor.execute(query)
                
                result = cursor.fetchone()
                conn.commit()  # Ensure the transaction is committed
                return result[0] if result else None
                
            except psycopg2.Error as e:
                logger.error(f"Scalar query execution error: {e}")
                conn.rollback()
                raise
    
    def test_connection(self) -> bool:
        """Test database connectivity"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
                logger.info("Database connection successful")
                return True
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            return False
    
    def create_schema(self, schema_file: str = 'schema_postgres.sql') -> bool:
        """Execute schema creation script"""
        try:
            schema_path = os.path.join(os.path.dirname(__file__), schema_file)
            with open(schema_path, 'r') as f:
                schema_script = f.read()
            
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(schema_script)
                conn.commit()
                
            logger.info("Database schema created successfully")
            return True
            
        except Exception as e:
            logger.error(f"Schema creation failed: {e}")
            return False
    
    def insert_sample_data(self, sample_data_file: str = 'sample_data.sql') -> bool:
        """Insert sample data"""
        try:
            sample_path = os.path.join(os.path.dirname(__file__), sample_data_file)
            with open(sample_path, 'r') as f:
                sample_script = f.read()
            
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(sample_script)
                conn.commit()
                
            logger.info("Sample data inserted successfully")
            return True
            
        except Exception as e:
            logger.error(f"Sample data insertion failed: {e}")
            return False

# Example usage and testing
if __name__ == "__main__":
    # Initialize database manager
    db_manager = DatabaseManager()
    
    # Test connection
    if db_manager.test_connection():
        print("✅ Database connection successful!")
        
        # Create schema
        if db_manager.create_schema():
            print("✅ Database schema created!")
            
            # Insert sample data
            if db_manager.insert_sample_data():
                print("✅ Sample data inserted!")
            else:
                print("❌ Failed to insert sample data")
        else:
            print("❌ Failed to create schema")
    else:
        print("❌ Database connection failed!")
        print("\nPlease ensure:")
        print("1. PostgreSQL is running")
        print("2. Database exists or you have permissions to create it")
        print("3. Connection string is correct")
        print("4. Required environment variables are set:")
        print("   - PG_CONNECTION_STRING (full connection string)")
        print("   OR individual parameters:")
        print("   - PG_HOST")
        print("   - PG_DATABASE") 
        print("   - PG_USERNAME")
        print("   - PG_PASSWORD")
        print("   - PG_PORT (optional, defaults to 5432)")
        print("   - PG_SSLMODE (optional, defaults to prefer)")

"""
Database configuration and connection management for Protein Pipeline Finetuning System
"""

import os
import pyodbc
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
        # Load configuration from environment variables
        self.server = os.getenv('SQL_SERVER', 'localhost')
        self.database = os.getenv('SQL_DATABASE', 'ProteinFinetuning')
        self.username = os.getenv('SQL_USERNAME', '')
        self.password = os.getenv('SQL_PASSWORD', '')
        self.driver = os.getenv('SQL_DRIVER', 'ODBC Driver 17 for SQL Server')
        self.port = os.getenv('SQL_PORT', '1433')
        self.trust_server_certificate = os.getenv('SQL_TRUST_CERT', 'yes')
        
    def get_connection_string(self) -> str:
        """Generate SQL Server connection string"""
        if self.username and self.password:
            # SQL Server authentication
            conn_str = (
                f"DRIVER={{{self.driver}}};"
                f"SERVER={self.server},{self.port};"
                f"DATABASE={self.database};"
                f"UID={self.username};"
                f"PWD={self.password};"
                f"TrustServerCertificate={self.trust_server_certificate};"
            )
        else:
            # Windows/Integrated authentication
            conn_str = (
                f"DRIVER={{{self.driver}}};"
                f"SERVER={self.server},{self.port};"
                f"DATABASE={self.database};"
                f"Trusted_Connection=yes;"
                f"TrustServerCertificate={self.trust_server_certificate};"
            )
        
        return conn_str

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
            conn = pyodbc.connect(self.connection_string)
            conn.autocommit = False  # Use transactions
            yield conn
        except pyodbc.Error as e:
            logger.error(f"Database connection error: {e}")
            if conn:
                conn.rollback()
            raise
        finally:
            if conn:
                conn.close()
    
    def execute_query(self, query: str, params: tuple = None, fetch: bool = False) -> Optional[list]:
        """Execute a query and optionally fetch results"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            try:
                if params:
                    cursor.execute(query, params)
                else:
                    cursor.execute(query)
                
                if fetch:
                    columns = [column[0] for column in cursor.description]
                    results = []
                    for row in cursor.fetchall():
                        results.append(dict(zip(columns, row)))
                    return results
                else:
                    conn.commit()
                    return cursor.rowcount
                    
            except pyodbc.Error as e:
                logger.error(f"Query execution error: {e}")
                conn.rollback()
                raise
    
    def fetch_all(self, query: str, params: tuple = None) -> list:
        """Execute query and fetch all results"""
        return self.execute_query(query, params, fetch=True) or []
    
    def fetch_one(self, query: str, params: tuple = None) -> Optional[dict]:
        """Execute query and fetch one result"""
        results = self.execute_query(query, params, fetch=True) or []
        return results[0] if results else None
    
    def execute_scalar(self, query: str, params: tuple = None) -> Any:
        """Execute a query and return a single value"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            try:
                if params:
                    cursor.execute(query, params)
                else:
                    cursor.execute(query)
                
                result = cursor.fetchone()
                return result[0] if result else None
                
            except pyodbc.Error as e:
                logger.error(f"Scalar query execution error: {e}")
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
    
    def create_schema(self, schema_file: str = 'schema.sql') -> bool:
        """Execute schema creation script"""
        try:
            schema_path = os.path.join(os.path.dirname(__file__), schema_file)
            with open(schema_path, 'r') as f:
                schema_script = f.read()
            
            # Split script by GO statements for SQL Server
            statements = schema_script.split('GO')
            
            with self.get_connection() as conn:
                cursor = conn.cursor()
                for statement in statements:
                    statement = statement.strip()
                    if statement:
                        cursor.execute(statement)
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
            
            # Split script by GO statements
            statements = sample_script.split('GO')
            
            with self.get_connection() as conn:
                cursor = conn.cursor()
                for statement in statements:
                    statement = statement.strip()
                    if statement:
                        cursor.execute(statement)
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
        print("1. SQL Server is running")
        print("2. Database exists or you have permissions to create it")
        print("3. Connection string is correct")
        print("4. Required environment variables are set:")
        print("   - SQL_SERVER")
        print("   - SQL_DATABASE") 
        print("   - SQL_USERNAME (if using SQL auth)")
        print("   - SQL_PASSWORD (if using SQL auth)")

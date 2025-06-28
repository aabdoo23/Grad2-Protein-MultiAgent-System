"""
Setup script for database initialization
Run this script to set up the database with schema and sample data
"""

import os
import sys
from dotenv import load_dotenv

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db_manager import DatabaseManager, DatabaseConfig
from dal import FinetuningDAL

def main():
    # Load environment variables
    load_dotenv('.env')
    
    print("🚀 Setting up Protein Pipeline Finetuning Database...")
    print("="*60)
    
    try:
        # Initialize database manager
        config = DatabaseConfig()
        db_manager = DatabaseManager(config)
        
        print(f"📡 Connecting to SQL Server: {config.server}")
        print(f"📊 Database: {config.database}")
        
        # Test connection
        if not db_manager.test_connection():
            print("❌ Database connection failed!")
            print("\nTroubleshooting steps:")
            print("1. Ensure SQL Server is running")
            print("2. Check your .env file configuration")
            print("3. Verify database exists or you have creation permissions")
            print("4. Test connection string manually")
            return False
        
        print("✅ Database connection successful!")
        
        # Create schema
        print("\n📋 Creating database schema...")
        if db_manager.create_schema():
            print("✅ Database schema created successfully!")
        else:
            print("❌ Failed to create schema")
            return False
        
        # Insert sample data
        print("\n📝 Inserting sample data...")
        if db_manager.insert_sample_data():
            print("✅ Sample data inserted successfully!")
        else:
            print("❌ Failed to insert sample data")
            return False
        
        # Test DAL operations
        print("\n🧪 Testing Data Access Layer...")
        dal = FinetuningDAL(db_manager)
        
        # Test getting users
        users = dal.db.execute_query("SELECT COUNT(*) as user_count FROM user_account", fetch=True)
        user_count = users[0]['user_count'] if users else 0
        print(f"📊 Users in database: {user_count}")
        
        # Test getting base models
        models = dal.get_base_models()
        print(f"🤖 Base models available: {len(models)}")
        
        # Test getting a user's datasets
        if user_count > 0:
            test_user = dal.db.execute_query("SELECT TOP 1 user_name FROM user_account", fetch=True)
            if test_user:
                datasets = dal.get_user_datasets(test_user[0]['user_name'])
                print(f"📁 Datasets for test user: {len(datasets)}")
        
        print("\n" + "="*60)
        print("🎉 Database setup completed successfully!")
        print("\nNext steps:")
        print("1. Update your main application to use the database")
        print("2. Configure authentication and authorization")
        print("3. Set up the finetuning pod management endpoints")
        print("4. Test the complete workflow")
        
        return True
        
    except Exception as e:
        print(f"❌ Setup failed with error: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

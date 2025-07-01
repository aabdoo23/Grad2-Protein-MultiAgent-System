"""
Main entry point for the Protein Pipeline application.
This file creates the app using the app factory pattern.
"""

from app_factory import create_app

# Create the Flask application
app = create_app()

if __name__ == '__main__':
    app.run(debug=True)

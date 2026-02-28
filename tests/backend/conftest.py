import os

# Set DATABASE_URL via environment variable before app config is loaded
# so that the testing framework uses the correct database path 
# relative to the project root where pytest is executed.
os.environ["DATABASE_URL"] = "sqlite:///backend/data/nightsky.db"

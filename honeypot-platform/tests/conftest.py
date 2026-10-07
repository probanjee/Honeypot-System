import sys
import os
from unittest.mock import MagicMock

# Set up PYTHONPATH for the backend app
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../services/backend"))

# Mock asyncpg to allow SQLAlchemy dialect to import successfully under Python 3.14
mock_asyncpg = MagicMock()
mock_asyncpg.__version__ = "0.29.0"
sys.modules['asyncpg'] = mock_asyncpg

# Mock password hashing in security module to bypass passlib/bcrypt incompatibility under Python 3.14
import app.core.security
app.core.security.hash_password = lambda p: f"mock_hash_{p}"
app.core.security.verify_password = lambda p, h: h == f"mock_hash_{p}"

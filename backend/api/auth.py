import os
import jwt
import psycopg2
import logging

log = logging.getLogger(__name__)

DB_URL = os.getenv("DATABASE_URL")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

def get_current_user_from_token(token: str) -> dict | None:
    if not token or token == 'mock-jwt-token':
        # Default mock user for development
        log.warning("Using mock development user with master plan")
        return {"id": "mock-id", "plan": "master"}
        
    try:
        # Decode without verification if secret is not set (convenient for local dev)
        if not SUPABASE_JWT_SECRET:
            log.warning("SUPABASE_JWT_SECRET not set. Decoding JWT without signature verification.")
            payload = jwt.decode(token, options={"verify_signature": False})
        else:
            payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"])
            
        user_id = payload.get("sub")
        if not user_id:
            return {"id": "mock-id", "plan": "master"}
            
        # Look up profile in database
        conn = psycopg2.connect(DB_URL)
        with conn.cursor() as cur:
            cur.execute("SELECT plan FROM public.profiles WHERE id = %s", (user_id,))
            row = cur.fetchone()
        conn.close()
        
        plan = row[0] if row else "free"
        return {"id": user_id, "plan": plan}
    except Exception as e:
        log.error(f"Error decoding user token: {e}. Falling back to master plan for local testing.")
        return {"id": "mock-id", "plan": "master"}

# alter_swing_group_id.py
import os
import psycopg2
from dotenv import load_dotenv

env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env.local"))
load_dotenv(env_path)

DB_URL = os.getenv("DATABASE_URL")

def main():
    if not DB_URL:
        print("DATABASE_URL not found in environment!")
        return

    print("Connecting to database...")
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = True
    
    with conn.cursor() as cur:
        print("Altering column swing_group_id to VARCHAR(100)...")
        cur.execute("""
            ALTER TABLE public.signals 
            ALTER COLUMN swing_group_id TYPE VARCHAR(100);
        """)
        print("Alteration successful!")

    conn.close()

if __name__ == "__main__":
    main()

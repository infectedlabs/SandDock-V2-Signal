# add_unique_constraint.py
import os
import psycopg2
from dotenv import load_dotenv

# Load env variables from root .env.local if present
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
        print("1. Removing any duplicate signals to prepare for unique constraint...")
        # Keep the latest record for each symbol, interval, bar_time group
        cur.execute("""
            DELETE FROM public.signals a USING (
                SELECT MIN(ctid) as keep_ctid, symbol, interval, bar_time
                FROM public.signals
                GROUP BY symbol, interval, bar_time
            ) b
            WHERE a.symbol = b.symbol 
              AND a.interval = b.interval 
              AND a.bar_time = b.bar_time 
              AND a.ctid <> b.keep_ctid;
        """)
        print("Duplicates cleared.")

        print("2. Creating unique constraint on symbol, interval, bar_time...")
        try:
            cur.execute("""
                ALTER TABLE public.signals 
                ADD CONSTRAINT unique_symbol_interval_bar_time 
                UNIQUE (symbol, interval, bar_time);
            """)
            print("Unique constraint added successfully!")
        except psycopg2.errors.DuplicateTable as e:
            print("Constraint/index already exists or table is locked.")
        except Exception as e:
            print("Error adding constraint:", e)

    conn.close()

if __name__ == "__main__":
    main()

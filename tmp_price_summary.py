import sqlite3
conn = sqlite3.connect(r"static/SOSDdatabase.db")
cur = conn.cursor()
raw_mn, raw_mx = cur.execute('SELECT MIN(Price), MAX(Price) FROM Places').fetchone()
num_mn, num_mx = cur.execute('SELECT MIN(CAST(Price AS REAL)), MAX(CAST(Price AS REAL)) FROM Places').fetchone()
placeholder = cur.execute("SELECT COUNT(*) FROM Places WHERE TRIM(COALESCE(Price,'')) IN ('', '?')").fetchone()[0]
print(f"RAW_MIN={raw_mn}")
print(f"RAW_MAX={raw_mx}")
print(f"NUMERIC_MIN={num_mn}")
print(f"NUMERIC_MAX={num_mx}")
print(f"PLACEHOLDER_OR_EMPTY_PRICE_ROWS={placeholder}")
conn.close()

from flask import current_app, g
from pathlib import Path
import sqlite3

def get_db_path():
    return Path(current_app.root_path) / 'static' / 'SOSDdatabase.db'

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(get_db_path())
        db.row_factory = sqlite3.Row
    return db

def query_db(query, args=(), one=False):
    cur = get_db().execute(query, args)
    rv = cur.fetchall()
    cur.close()
    return (rv[0] if rv else None) if one else rv

def execute_db(query, args=()):
    conn = get_db().execute(query, args)
    conn.commit()
    conn.close()
    return
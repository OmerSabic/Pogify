// Just a file for creating the DB, can be run with `npm run init` 

const sqlite3 = require('sqlite3').verbose();

var db = new sqlite3.Database('pogifyDB.db');

db.run('CREATE TABLE songs (id TEXT PRIMARY KEY, title TEXT NOT NULL, length INTEGER NOT NULL, thumbId TEXT NOT NULL, authorName TEXT, authorId TEXT)')
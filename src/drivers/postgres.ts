import { PGlite } from "npm:@electric-sql/pglite";

const db = new PGlite();

db.exec(`
    CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`);

db.exec(`INSERT INTO users (name, email) VALUES ('John Doe', 'john.doe@example.com')`);

console.log(await db.query(`SELECT * FROM users`));

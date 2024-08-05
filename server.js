require('dotenv/config');
const mysql = require('mysql2');
const cors = require('cors');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const port = 5500;

// Use express
const app = express();
app.use(cors());
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ limit: '30mb', extended: true }));
app.use(express.static(__dirname));


// inserting configurations of database.
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

// Connect to database
db.connect((err) => {
    if (err) {
        return console.log('Error connecting to database: ', err)
    }

    console.log('Connected to database successfully.');

    db.query(`CREATE DATABASE IF NOT EXISTS plp;`, (err) => {
        if (err) {
            return console.log('Error creating database: ', err);
        }
        console.log('Database was creating successfully.');


        // Select the database.
        db.changeUser({database: 'plp'}, (err) => {
            if (err) {
                return console.log('Erorr changing to Database: ', err);
            }
            console.log('Changed to database successfully.');

            // Create users table.
            const createUsersTable = `
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    email VARCHAR(100) NOT NULL UNIQUE,
                    username VARCHAR(50) NOT NULL,
                    password VARCHAR(255) NOT NULL
                );
            `;

            db.query(createUsersTable, (err) => {
                if (err) {
                    return console.log('Error creating table: ', err);
                }
                console.log('users table created successfully.');
            });

            const createExpenseTable = `
                CREATE TABLE IF NOT EXISTS expenses (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT,
                    amount DECIMAL(10, 2) NOT NULL,
                    _date DATE NOT NULL,
                    category VARCHAR(50) NOT NULL,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                );
            `;

            db.query(createExpenseTable, (err) => {
                if (err) {
                    return console.log('Failed to create expense table: ', err);
                }
                console.log('Successfully created expense table');
            });
        });
    });
});

// Middle for authentication
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split('')[1];
    if (!token) {
        return res.status(401).json({message: 'Unauthorized'});
    }
    try {
        // Verify token before extracting user
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        console.log(decoded);
        req.userId = decoded.id; // This is fixed case for user id
        next();
    } catch(err) {
        return res.status(401).json({message: 'Invalid token'});
    }
};



// define user registration routes
app.post('/register', async (req, res) => {
    try {
        const { email, username, password } = req.body;

        // Check if input is empty
        if (!email || !username || !password) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        // Check if user already exists
        const usersQuery = `SELECT * FROM users WHERE email = ?`;
        const [data] = await db.promise().query(usersQuery, [email]);

        if (data.length) {
            return res.status(409).json({ message: 'User already exists' });
        }

        // Hash the password with bcrypt
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user
        const newUser = `INSERT INTO users(email, username, password) VALUES(?, ?, ?)`;
        await db.promise().query(newUser, [email, username, hashedPassword]);

        return res.status(200).json({ message: 'User created successfully.' });

    } catch (err) {
        console.error(err); // Log the error for debugging
        return res.status(500).json({ message: 'Internal server error', error: err.message });
    }
});


app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/register.html');
});

// Login route
app.post('/login', async (req, res) => {
    try {
        const {username, password} = req.body;

        // fetch username
        const query = `SELECT * FROM users WHERE username = ?`;
        db.query(query,[username], async (err, result) => {
            if (err) {
                return res.status(500).json({ message: 'Database query error' });
            }
            
            // Checking if user exists
            if (result.length === 0) {
                return res.status(401).json({ message: 'Invalid credentials.' });
            }
            const user = result[0];

            // Comparing password with hashedPassword
            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                    return res.status(401).json({ message: 'Invalid details' });
                }

             // Generate JWT token
            const token = jwt.sign(
                { username: user.username, id: user.id },
                process.env.JWT_SECRET,
                { expiresIn: '1h' } // Token expires in 1 hour
            );

        // Respond with success message and token
            return res.status(200).json({
                message: 'Login successful',
                token: token
            });
        })
    } catch(err) {
        console.log(err);
        res.status(500).json({ message: 'Internal server error.' });
    }
})

app.listen(port, () => {
    console.log('Listening at port 5500');
});
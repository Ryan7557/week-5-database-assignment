require('dotenv/config');
const mysql = require('mysql2');
const cors = require('cors');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
// const jwt = require('jsonwebtoken');
const port = 5500;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));


app.use(session({
    secret: process.env.SESSION_SECRET, // Use a strong secret key
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false, // Set to true if using HTTPS
        maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
}));


const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

db.connect((err) => {
    if (err) {
        return console.error('Error connecting to database:', err);
    }
    console.log('Connected to database successfully.');

    // Create the database if it doesn't exist
    db.query('CREATE DATABASE IF NOT EXISTS plp;', (err) => {
        if (err) {
            return console.error('Error creating database:', err);
        }
        console.log('Database created successfully.');

        // Change to the new database
        db.changeUser({ database: 'plp' }, (err) => {
            if (err) {
                return console.error('Error changing to database:', err);
            }
            console.log('Changed to database successfully.');

            // Define the users table creation query
            const createUsersTable = `
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(50) NOT NULL UNIQUE,
                    email VARCHAR(100) NOT NULL UNIQUE,
                    password VARCHAR(255) NOT NULL
                );
            `;

            // Create the users table
            db.query(createUsersTable, (err) => {
                if (err) {
                    return console.error('Error creating users table:', err);
                }
                console.log('Users table created successfully.');

                // Define the expenses table creation query
                const createExpensesTable = `
                    CREATE TABLE IF NOT EXISTS expenses (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        user_id INT NOT NULL,
                        amount DECIMAL(10, 2) NOT NULL,
                        _date DATE NOT NULL,
                        category VARCHAR(50) NOT NULL,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    );
                `;

                // Create the expenses table
                db.query(createExpensesTable, (err) => {
                    if (err) {
                        return console.error('Error creating expenses table:', err);
                    }
                    console.log('Expenses table created successfully.');

                    // Close the database connection
                    // db.end((err) => {
                    //     if (err) {
                    //         return console.error('Error closing connection:', err);
                    //     }
                    //     console.log('Database connection closed.');
                    // });
                });
            });
        });
    });
});

// const authenticate = (req, res, next) => {
//     if (!req.session.user) {
//         return res.status(401).json({ message: 'Unauthorized' });
//     }
//     next();
// };

app.post('/register', async (req, res) => {
    try {
        const { email, username, password } = req.body;

        // Basic validation
        if (!email || !username || !password) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        // Check if the email already exists
        const emailQuery = 'SELECT * FROM users WHERE email = ?';
        const [existingEmail] = await db.promise().query(emailQuery, [email]);

        if (existingEmail.length > 0) {
            return res.status(409).json({ message: 'Email is already in use.' });
        }

        // Check if the username already exists
        const usernameQuery = 'SELECT * FROM users WHERE username = ?';
        const [existingUsername] = await db.promise().query(usernameQuery, [username]);

        if (existingUsername.length > 0) {
            return res.status(409).json({ message: 'Username is already in use.' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the new user into the database
        const insertUserQuery = 'INSERT INTO users (email, username, password) VALUES (?, ?, ?)';
        await db.promise().query(insertUserQuery, [email, username, hashedPassword]);

        // Respond with success
        return res.status(201).json({ message: 'User created successfully.' });

    } catch (err) {
        console.error('Error during user registration:', err);
        return res.status(500).json({ message: 'Internal server error.', error: err.message });
    }
});

app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/register.html');
});

// Login route
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Query the database for the user by username
        const query = 'SELECT * FROM users WHERE username = ?';
        db.query(query, [username], async (err, result) => {
            if (err) {
                return res.status(500).json({ message: 'Database query error' });
            }

            // Check if user exists
            if (result.length === 0) {
                return res.status(401).json({ message: 'Invalid credentials.' });
            }

            const user = result[0];

            // Compare provided password with stored hash
            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                return res.status(401).json({ message: 'Invalid credentials.' });
            }

            // If credentials are correct, respond with a success message
            req.session.user = { id: user.id, username: user.username };
            return res.status(200).json({ message: 'Login successful' });
        });
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

const authenticate = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    req.userId = req.session.user.id;
    next();
};

app.post('/add-expense', authenticate, async (req, res) => {
    try {
        const { amount, _date, category } = req.body;
        const userId = req.userId;

        // Basic validation
        if (!amount || !_date || !category) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        // Ensure amount is a number and convert it to a proper format if needed
        const formattedAmount = parseFloat(amount);
        if (isNaN(formattedAmount) || formattedAmount <= 0) {
            return res.status(400).json({ message: 'Invalid amount.' });
        }

        const insertExpenseQuery = 'INSERT INTO expenses (user_id, amount, _date, category) VALUES (?, ?, ?, ?)';
        await db.promise().query(insertExpenseQuery, [userId, formattedAmount, _date, category]);

        return res.status(201).json({ message: 'Expense added successfully.' });

    } catch (err) {
        console.error('Error adding expense:', err);
        return res.status(500).json({ message: 'Internal server error.', error: err.message });
    }
});

app.get('/transactions', authenticate, async (req, res) => {
    try {
        const userId = req.userId;

        const transactionsQuery = 'SELECT * FROM expenses WHERE user_id = ? ORDER BY _date DESC';
        const [transactions] = await db.promise().query(transactionsQuery, [userId]);

        // Format transactions to ensure amounts are numbers
        const formattedTransactions = transactions.map(tx => ({
            id: tx.id,
            amount: parseFloat(tx.amount), // Ensure amount is a number
            _date: tx._date.toISOString().split('T')[0], // Format date to YYYY-MM-DD
            category: tx.category
        }));

        return res.status(200).json(formattedTransactions);

    } catch (err) {
        console.error('Error fetching transactions:', err);
        return res.status(500).json({ message: 'Internal server error.', error: err.message });
    }
});


app.get('/balance', authenticate, async (req, res) => {
    try {
        const userId = req.userId;

        const balanceQuery = 'SELECT COALESCE(SUM(amount), 0) AS balance FROM expenses WHERE user_id = ?';
        const [balanceRows] = await db.promise().query(balanceQuery, [userId]);
        const balance = parseFloat(balanceRows[0].balance) || 0;

        const incomeQuery = 'SELECT COALESCE(SUM(amount), 0) AS income FROM expenses WHERE user_id = ? AND amount > 0';
        const [incomeRows] = await db.promise().query(incomeQuery, [userId]);
        const income = parseFloat(incomeRows[0].income) || 0;

        const expenseQuery = 'SELECT COALESCE(SUM(amount), 0) AS expense FROM expenses WHERE user_id = ? AND amount < 0';
        const [expenseRows] = await db.promise().query(expenseQuery, [userId]);
        const expense = parseFloat(expenseRows[0].expense) || 0;

        res.json({ balance, income, expense });
    } catch (err) {
        console.error('Error fetching balance:', err);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

app.listen(port, () => {
    console.log('Listening at port 5500');
});
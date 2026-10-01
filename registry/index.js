const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(express.json());
app.use(cors());

let tasks = [];
let taskIdCounter = 1;

app.post('/tasks', (req, res) => {
    const { agentName, userPrompt } = req.body;
    const task = {
        id: taskIdCounter++,
        agentName,
        status: 'Awaiting Payment',
        userPrompt,
        createdAt: new Date().toISOString()
    };
    tasks.unshift(task);
    if (tasks.length > 50) tasks.pop();
    res.status(200).json({ id: task.id });
});

app.put('/tasks/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body;
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.status = status;
        res.status(200).json({ success: true });
    } else {
        res.status(404).json({ error: "Task not found" });
    }
});

app.get('/tasks', (req, res) => {
    res.status(200).json(tasks);
});

app.use(express.static(__dirname)); // Serve static files like index.html

let db;

async function setupDB() {
    db = await open({
        filename: './registry.db',
        driver: sqlite3.Database
    });
    
    await db.exec(`
        CREATE TABLE IF NOT EXISTS agents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            description TEXT,
            price TEXT,
            endpointUrl TEXT,
            walletAddress TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agentName TEXT,
            status TEXT,
            userPrompt TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
}

app.post('/register', async (req, res) => {
    const { name, description, price, endpointUrl, walletAddress } = req.body;
    
    if (!name || !description || !price || !endpointUrl || !walletAddress) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        await db.run(`
            INSERT INTO agents (name, description, price, endpointUrl, walletAddress)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET
                description=excluded.description,
                price=excluded.price,
                endpointUrl=excluded.endpointUrl,
                walletAddress=excluded.walletAddress
        `, [name, description, price, endpointUrl, walletAddress]);
        
        res.status(200).json({ success: true, message: 'Agent registered successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/agents', async (req, res) => {
    try {
        const agents = await db.all('SELECT * FROM agents ORDER BY createdAt DESC');
        res.status(200).json(agents);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});



const PORT = 5000;
setupDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Registry Service running on http://localhost:${PORT}`);
    });
});

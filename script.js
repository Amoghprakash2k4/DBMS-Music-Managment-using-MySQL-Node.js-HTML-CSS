import React from 'react';
import LoginPage from './LoginPage'; // Adjust the path as necessary

const App = () => {
    return (
        <div>
            <LoginPage />
        </div>
    );
};

export default App;


const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Set up routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html')); // Adjust path if necessary
});

app.get('/addsong', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'addsong.html')); // Replace with your file names
});

app.get('/addtoplaylist', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'addtoplaylist.html')); // Replace with your file names
});

app.get('/createplaylist', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'createplaylist.html')); // Replace with your file names
});
app.get('/deletesong', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'deletesong.html')); // Replace with your file names
});
app.get('/searchsong', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'searchsong.html')); // Replace with your file names
});

// Add other routes as needed

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

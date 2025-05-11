const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;

const server = http.createServer((req, res) => {
    console.log(`Request received: ${req.url}`);

    // Serve index.html for root path
    if (req.url === '/') {
        fs.readFile('index.html', (err, content) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading index.html');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content);
        });
        return;
    }

    // Serve CSS file
    if (req.url === '/styles.css') {
        fs.readFile('styles.css', (err, content) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading styles.css');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/css' });
            res.end(content);
        });
        return;
    }

    // Serve JavaScript file
    if (req.url === '/script.js') {
        fs.readFile('script.js', (err, content) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading script.js');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/javascript' });
            res.end(content);
        });
        return;
    }

    // Serve COVID-19 data
    if (req.url === '/data/covid19_data.csv') {
        fs.readFile('data/covid19_data.csv', (err, content) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading COVID-19 data');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/csv' });
            res.end(content);
        });
        return;
    }

    // Handle 404
    res.writeHead(404);
    res.end('Not found');
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log('Available files:');
    console.log('  - index.html');
    console.log('  - styles.css');
    console.log('  - script.js');
    console.log('  - data/covid19_data.csv');
    console.log('\nPress Ctrl+C to stop the server');
}); 
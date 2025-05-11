const fs = require('fs');
const path = require('path');
const https = require('https');

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// URL for the COVID-19 dataset
const url = 'https://raw.githubusercontent.com/owid/covid-19-data/master/public/data/owid-covid-data.csv';
const filename = 'covid19_data.csv';

// Function to download the file
function downloadFile(url, filename) {
    return new Promise((resolve, reject) => {
        console.log(`Downloading ${filename}...`);
        const file = fs.createWriteStream(path.join(dataDir, filename));
        
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download ${filename}: ${response.statusCode}`));
                return;
            }

            response.pipe(file);

            file.on('finish', () => {
                file.close();
                console.log(`Successfully downloaded ${filename}`);
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(path.join(dataDir, filename), () => {}); // Delete the file if there was an error
            reject(err);
        });
    });
}

// Download the file
downloadFile(url, filename)
    .then(() => {
        console.log('\nFile downloaded successfully!');
        console.log(`File is located at: ${path.join(dataDir, filename)}`);
    })
    .catch(err => {
        console.error('\nError downloading file:', err.message);
    }); 
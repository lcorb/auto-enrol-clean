const fs = require('fs');
const dir = process.cwd() + '/data';

function initDataDir() {
    return new Promise((resolve) => {
        fs.mkdir(dir + '/archive', { recursive: true }, (e) => {
            if (e) throw e;
            console.log('Initialised data and archive directories.');
            resolve();
        });
    })
}

function checkCreds() {
    return new Promise((resolve) => {
        const files = fs.readdirSync(process.cwd());

        let credsFound = false;

        console.log('Checking credentials.');
        files.forEach(async v => {
            if (v === 'creds.json') {
                credsFound = true;
            }
        })

        if (!credsFound) {
            console.log('No credentials found!\nPlease enter your details.\n\n');

            const prompt = require('prompt-sync')();
            let u = prompt('Enter your username (leave out @eq.edu.au):');            
            let p = prompt('Enter your password:');
        
            const user = Buffer.from(u + '@eq.edu.au', 'binary').toString('base64');
            const pw = Buffer.from(p, 'binary').toString('base64');
        
            let creds = JSON.stringify({"user": user, "pw": pw});
            fs.writeFileSync('creds.json', creds);
            console.log('Encoded and saved to creds.json!');
        }
        resolve();
    })
}

function initLog() {
    return new Promise((resolve) => {
        fs.mkdir(dir + '/logs', { recursive: true }, (e) => {
            if (e) throw e;
            console.log('Initialised log directory.');
            resolve();
        });
    })
}

function ensureDataIsArchived() {
    return new Promise((resolve, reject) => {
        const files = fs.readdirSync(dir);

        if (files.length > 1) {
            console.log('Archiving old files.');
            files.forEach(async v => {
                if (v !== 'archive') {
                    await move(dir + '/' + v, dir + '/archive/' + v);
                }

            })
        }
        resolve();
    })
}

function archiveData() {
    return new Promise((resolve, reject) => {
        const files = fs.readdirSync(dir);

        console.log('Archiving files.');
        files.forEach(async v => {
            if (v !== 'archive') {
                await move(dir + '/' + v, dir + '/archive/' + v);
            }
        })
        resolve();
    })
}


function checkDataDir() {
    return new Promise(async (resolve, reject) => {
        try {
            const files = fs.readdirSync(dir);

            if (!files) {
                throw (new Error('Malformed data directory or missing data files.'));
            }

            await find(dir, 'DynamicStudentList').catch(e => { throw (new Error('Unable to locate DynamicStudentList file.')) });
            await find(dir, 'ExportStudentClass').catch(e => { throw (new Error('Unable to locate ExportStudentClass file.')) });

            resolve();
        } catch (e) {
            reject(e);
        }
    })
}

function find(dir, type) {
    return new Promise((resolve, reject) => {
        fs.readdir(dir, function (e, files) {
            if (e) throw e;
            files.forEach((v) => {
                if (v.startsWith(type) && v !== 'archive') {
                    resolve(dir + '/' + v);
                }
            });

            reject();
        });
    });
}

function move(file, new_location) {
    return new Promise((resolve, reject) => {
        fs.rename(file, new_location, (e) => {
            if (e) throw e;
            resolve();
        })
    })
}

module.exports = { initDataDir, checkCreds, initLog, ensureDataIsArchived, archiveData, checkDataDir, move }
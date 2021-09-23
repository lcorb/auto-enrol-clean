const fs = require('fs');

const { fetchResources } = require('./fetch');
const { parseResources } = require('./parse');
const { Browser } = require('./enrol');
const { queueEmails, enrolEmail, unenrolEmail, CSMEmail, DiffEmail } = require('./email/email');
const { initDataDir, initLog, ensureDataIsArchived, archiveData, checkDataDir, move } = require('./check');

const { exec } = require('child_process');
const last_run = require('./last_run.json');

async function main() {


    let classDataPackage = []

    try {
        // Fetch two resources:
        // ExportStudentClass - list of all eqids and associated classes
        // DynamicStudentList - new students as of the start of this week
        // Add to /data
        let date = new Date(last_run.date)
        console.log(`Last run: ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}\n`);

        // await initLog();
        await initDataDir();
        await ensureDataIsArchived();

        console.log('Fetching sheets.');
        await fetchResources();

        await checkDataDir();

        console.log('Parsing sheets.');
        // Determines whether any new students are in classes listed in ./classcodes.json
        // Creates bulk enroll lists containing student's MIS, named after the classes they need to be used for
        // Returns array of bulk list class codes that were created
        // returns:
        // created codes and student data for each of those
        classDataPackage = await parseResources();

    } catch (e) {
        if (e.message === 'No students found to enrol.') {
            console.log(e.message);
        } else {
            console.error(e);
        }
    }

    // Archive files
    await archiveData();

    // Load this late since the absolute values will be updated in parse
    const classCodes = require('./classcodes.json');


    //
    // Skip removing students for now..
    //
    // Remove old students (if any)
    if (classCodes !== undefined && false) {
        const browser = new Browser(false);
        await browser.init(false, 20);

        // Classes that have been combined
        let combinedClasses = [];
        // Class groups (multiple classes that are in a single course)
        let groups = [];

        const codes = Object.keys(classCodes);

        codes.forEach((c) => {
            if (!combinedClasses.includes(c)) {
                // skip primary for now, as there are some students not in the class list who
                // participate in some primary classes
                if (!classCodes[c].primary) {
                    let participants = [];
                    codes.forEach((v) => {
                        if (classCodes[c].group === classCodes[v].group) {
                            participants.push({
                                "enrolled": classCodes[v].absolute,
                                "class": v
                            });
                            combinedClasses.push(v);
                        }
                    })
    
                    groups.push({
                        "search": classCodes[c].search,
                        "participants": participants,
                    })
                }
            }
        })

        let unenrolledClassParticipants = {};

        const funcChain = groups.map((v) => {
            return new Promise (async (resolve, reject) => {
                const f = async () => {
                    // Add all participants together
                    // We will have to work out which student was unenrolled from which class (within the group) later
                    let participants = [];
                    v.participants.forEach((p) => {
                        participants = participants.concat(p.enrolled.filter(x => !participants.includes(x)));
                    });

                    const unenrolled = await browser.unenrollClass(v.search, participants);

                    unenrolled.forEach((u) => {
                        v.participants.forEach((p) => {
                            if (classCodes[p.class].enrolled.includes(u)) {
                                // Remove student from classcodes
                                classCodes[p.class].enrolled = classCodes[p.class].enrolled.filter(x => x !== u);

                                unenrolledClassParticipants[p.class] === undefined ?
                                    unenrolledClassParticipants[p.class] = [ u ] :
                                    unenrolledClassParticipants[p.class].push( u );
                            }
                        })
                    })
                }
                try {
                    await f();
                    resolve();                    
                } catch (error) {
                    reject();
                }
            })
        })

        try {
            await Promise.allSettled(funcChain);
            await browser.close();

            if (Object.keys(unenrolledClassParticipants).length > 0) {
                unenrolEmail(unenrolledClassParticipants);
            };
        } catch (e) {
            console.error('Failed unenrolling: ' + e);
        }
    }

    // Finally, execute each bulk enroll list

    if (classDataPackage.createdLists !== undefined) {
        const browser = new Browser(false);
        await browser.init(true, 20);

        let emails = [];
    
        const funcChain = classDataPackage.createdLists.map((v, i) => {
            return new Promise (async (resolve, reject) => {
                console.log(`Enrolling students for ${v}.`);
                if (classCodes[v].group === 'CSM') {
                    let batch = [];
    
                    classDataPackage.data[v].forEach((j) => {
                        batch.push(j.mis);
                    })

                    classCodes[v].enrolled = classCodes[v].enrolled.concat(batch);

                    emails.push(CSMEmail(classDataPackage.data[v], classCodes[v].teacherEmail, `${v}`));
                    //CSMEmail(classDataPackage.data[v], 't@t.com', `${v}`);

                    resolve();
                } else if (classCodes[v].group === 'Diff') {
                    let batch = [];
    
                    classDataPackage.data[v].forEach((j) => {
                        batch.push(j.mis);
                    })

                    classCodes[v].enrolled = classCodes[v].enrolled.concat(batch);

                    emails.push(DiffEmail(classDataPackage.data[v], classCodes[v].teacherEmail, `${v}`));
                    
                    resolve();
                } else {
                    try {
                        await browser.addStudentsToClass(classCodes[v].search, `./bulk_lists/${v}.csv`, v, false);
    
                        let batch = [];
    
                        classDataPackage.data[v].forEach((j) => {
                            batch.push(j.mis);
                        })
    
                        classCodes[v].enrolled = classCodes[v].enrolled.concat(batch);
    
                        emails.push(enrolEmail(classDataPackage.data[v], classCodes[v].teacherEmail, `${v}`));
                        //enrolEmail(classDataPackage.data[v],'t@t.com', `${v}`);
    
                        resolve();
                    } catch (e) {
    
                        // While it doesn't really do anything to discern the errors, keep this here for future purposes
    
                        if (e.name === 'TimeoutError') {
                            console.error(`${v} - Operation timed out...\n(the student may not exist in CAMS yet!)`);
                            console.log(`Attempting to enrol again for ${v}.`);
                            try {
                                await browser.addStudentsToClass(classCodes[v].search, `./bulk_lists/${v}.csv`, v, false);
                                
                                let batch = [];
    
                                classDataPackage.data[v].forEach((j) => {
                                    batch.push(j.mis);
                                })
            
                                classCodes[v].enrolled = classCodes[v].enrolled.concat(batch);
            
                                emails.push(enrolEmail(classDataPackage.data[v], classCodes[v].teacherEmail, `${v}`));
                                
                                resolve();
                                return;
                            } catch (err) {
                                console.error(`${v} - failed again...\n:(\nPlease check these students, and run me again: ${Object.values(classDataPackage.data[v]).map(x => x.mis).join(', ')}`);
                                reject();
                                return;
                            }
                        }
    
                        // ------
                        // Errors above here mean the student hasn't been/wasn't enrolled
                        // ------
    
                        let batch = [];
    
                        classDataPackage.data[v].forEach((j) => {
                            batch.push(j.mis);
                        })
    
                        classCodes[v].enrolled = classCodes[v].enrolled.concat(batch);
                                          
                        // Pupeteer throws an error if we close page early
                        // 'Protocol error (Runtime.callFunctionOn): Session closed. Most likely the page has been closed.'
                        // This also means that all (?? need to test this <<<) students were already enrolled, so don't send email
                        if (e.message.startsWith('Protocol error')) {
                            reject(e);
                        }
    
                        // Just in case..
                        reject(e);
                    }
                }
            })
        })
    
        try {
            await Promise.allSettled(funcChain);
            if (emails) {
                await queueEmails(emails);
            }        
        } catch (e) {
            console.error(e);
        }
        browser.close();
        

    }
    // We now use a static start date to capture students who may be transitioning from mainstream to ISS, who will have an old start date
    // But still record last_run date
    let run_date = JSON.stringify({"date": (new Date())});
    fs.writeFileSync('last_run.json', run_date);

    // Update classCodes with any new data
    let newData = JSON.stringify(classCodes, '', 4);
    fs.writeFileSync('classcodes.json', newData);
    console.log('Finished.');
    return;
}

main();
const { Browser } = require('./enrol');
const { unenrollEmail } = require('./email/email');

async function test() {
    let classCodes = {
        "Test": {
            "primary": false,
            "group": "1",
            "search": "BrisbaneSDE Generic Course",
            "title": "ff",
            "teacherEmail": "",
            "enrolled": [
                "t1",
                "t2"
            ],
            "absolute": [
                "t3"
            ]
        }
    }

    // Remove old students (if any)
    if (classCodes !== undefined) {
        const browser = new Browser(false);
        await browser.init(false, 20);

        // Classes that have been combined
        let combinedClasses = [];
        // Class groups (multiple classes that are in a single course)
        let groups = [];

        const codes = Object.keys(classCodes);

        codes.forEach((c) => {
            if (!combinedClasses.includes(c)) {
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
        })

        let unenrolledClassParticipants = {};

        const funcChain = groups.map((v) => {
            return new Promise (async (resolve, reject) => {
                // Add all participants together
                // We will have to work out which student was unenrolled from which class (within the group) later
                let participants = [];
                v.participants.forEach((p) => {
                    participants = participants.concat(p.enrolled.filter(x => !participants.includes(x)));
                });

                //const unenrolled = await browser.unenrollClass(v.search, v.participants);
                const unenrolled = ['t1'];

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

                console.log(classCodes);
                console.log(unenrolledClassParticipants);

                // classCodes[v].enrolled = classCodes[v].enrolled.filter(x => !unenrolled.includes(x));
                resolve();
            })
        })

        try {
            await Promise.allSettled(funcChain);
            await browser.close();

            if (unenrolledClassParticipants !== {}) {
                unenrollEmail(unenrolledClassParticipants);
            };
        } catch (e) {
            console.error('Failed unenrolling: ' + e);
        }
    }
}

test();
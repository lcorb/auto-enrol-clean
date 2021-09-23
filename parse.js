const xlsx = require('xlsx');
const fs = require('fs');

function fetchEQIDs(workbook) {
    return new Promise((resolve, reject) => {
        const sheetList = workbook.SheetNames;
        const data = workbook.Sheets[sheetList[0]];
        const parsed = xlsx.utils.sheet_to_json(data, {header: 
            ["Student_Name", "EQ_ID", "Roll_Class", "Year", "MIS_ID", "Email_address"]});

        if (!parsed.length) {
            reject(new Error('Couldn\'t resolve EQIDs.'));
        }
    
        let eqids = [];
    
        // Start off reading from the 5th line
        for (i = 5; i < parsed.length; i++) {
            eqids.push({[parsed[i].EQ_ID]: {"mis": parsed[i].MIS_ID, "name": parsed[i].Student_Name, "eqid": parsed[i].EQ_ID}});
        }
    
        resolve(eqids);
    })
}

function generateListToEnroll(workbook, eqids, classCodes) {
    return new Promise((resolve, reject) => {
        const sheetList = workbook.SheetNames;
        const data = workbook.Sheets[sheetList[0]];
        const parsed = xlsx.utils.sheet_to_json(data, {skipHeader: true});
        let enroll = {};

        if (!parsed.length) {
            reject(new Error('The data appears to be empty... Most likely an invalid file.'));
        }

        // Extract the ids to compare from the key of 'eqids'
        const parsedEQIDs = eqids.map((v) => {return Object.keys(v).join('')});

        // Extract list of class codes from KVs
        const codeKeys = Object.keys(classCodes);

        // Wipe absolute values for fresh regeneration
        codeKeys.forEach((v) => { classCodes[v].absolute = [] });
        
        parsed.forEach((v) => {
            if (parsedEQIDs.includes(v.EQID)) {
                if (codeKeys.includes(v.Class_Name)) {
                    let student = findMISWithEQID(v.EQID, eqids);

                    // if the student does not have a valid MIS, skip for now
                    if (student.mis) {
                        // If the MIS is already in the list of enrolled students, skip
                        if (!classCodes[v.Class_Name].enrolled.includes(student.mis)) {
                            enroll[v.Class_Name] === undefined ?
                                enroll[v.Class_Name] = [ student ] :
                                enroll[v.Class_Name].push( student );
                        }
    
                        // Add to the absolute list of students
                        classCodes[v.Class_Name].absolute.push(student.mis);
                    }

                }
            }
        });

        // update the absolute values
        updateClassCodes(classCodes);

        resolve(enroll);
    })
}

function updateClassCodes(classCodes) {
    fs.writeFileSync('classcodes.json', JSON.stringify(classCodes, '', 4));
}

// finds a student's MIS with EQID within an array of EQID: MIS kv
function findMISWithEQID(eqid, arr) {
    for (let i = 0; i < arr.length; i++) {
        if (Object.keys(arr[i])[0] === eqid) {
            return Object.values(arr[i])[0];
        }
    }
}

// The names are variable, so search for key words
function find(type) {
    const path = './data';
    return new Promise ((resolve, reject) => {
        fs.readdir (path, function(e, files) {
          if (e) throw e;
          files.forEach((v) => {
              if (v.startsWith(type)) {
                  resolve(path + '/' + v);
              }
          });
        });
    });
}

function createBulkEnrollLists(data) {
    return new Promise((resolve, reject) => {
        const keys = Object.keys(data);
        if (!keys.length) {
            reject(new Error('No students found to enrol.'));
        }
    
        keys.forEach((v) => {
            fs.writeFile(`./bulk_lists/${v}.csv`, 'Logon ID\n' + data[v].join('\n'), (e) => { if (e) throw e });
        });

        resolve(keys);
    })
}

function readXLSX(file) {
    return new Promise (function (resolve, reject) {
      const workbook = xlsx.readFile(file);
      if (!workbook) {
        reject(new Error('Unable to read xlsx file!'));
      } else {
        resolve (workbook);
      }
    });
}

function dataToEnrollList(data) {
    const keys = Object.keys(data);
    let enrollList = [];

    keys.forEach((v) => {
        data[v].forEach((s, i) => {
            enrollList[v] === undefined ?
                enrollList[v] = [ s.mis ] :
                enrollList[v].push( s.mis );  
        })

    });

    return enrollList;
}


function parseResources() {
    return new Promise(async (resolve, reject) => {
        try {
            // fetch workbook objects
            let dynamicList = await find('DynamicStudentList');
            let classList = await find('ExportStudentClass');

            // read list of all eqids and mis
            dynamicList = await readXLSX(dynamicList);
            
            // read list of all classes and associated eqids
            // we use this data to see which classes have new students
            classList = await readXLSX(classList);

            // we only control a certain number of courses
            // so only pull new students from classes which are in this list
            const classCodes = require('./classcodes.json');

            // convert data to array of objects (duplicated eqid because the name and eqid are needed for emails now): {
            //      eqID: {misID, name, eqid}
            // }, ...
            const eqids = await fetchEQIDs(dynamicList);

            // compare list all classes (classList) with new class data (eqids)
            // generate object that can easily be converted to bulk enroll lists: {
            //      class: [...{name, mis, eqid}],
            //      ...
            // }
            const data = await generateListToEnroll(classList, eqids, classCodes);

            // convert to
            //       {
            //          class: [...mis],
            //          ...
            // }            
            const enrollList = dataToEnrollList(data);

            const createdLists = await createBulkEnrollLists(enrollList);

            const classDataPackage = {createdLists, data};

            resolve(classDataPackage);
        } catch (e) {
            reject(e);
        }

    })
}

module.exports = {parseResources}
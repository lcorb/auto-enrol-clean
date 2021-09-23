const pup = require('puppeteer');

class Browser {
    constructor() {
        this.browser = null;
    }

    async init(headless = false, slowMo = 0) {
        this.browser = await pup.launch({
            args: ['--no-sandbox'],
            headless,
            slowMo,
            ignoreHTTPSErrors: true
        });
    }

    async getFirstPage(){
        const pages = await this.browser.pages();
        return pages[0];
    }

    async closeCurrentPage(){
        const pages = await this.browser.pages();
        await pages[page.length - 1].close();
        return;
    }

    async unenrollAll(className, EQIDs) {
        const page = await this.browser.newPage();
        
        page.on('dialog', async dialog => {
            await dialog.accept();
        });
    
        await page.goto('https://learningplace.eq.edu.au/CAMS/Default.aspx');
        const courseSelector = '#a_ac_lnkFindCourse';
        await page.waitForSelector(courseSelector);
        await page.click(courseSelector);
    
        const searchSelector = '#a_ac_txtTitle_text';
        await page.waitForSelector(searchSelector);
        await page.type('#a_ac_txtTitle_text', className);
    
        const searchButtonSelector = '#a_ac_btnSearch';
        await page.click(searchButtonSelector);
    
        // Selects first checkbox
        const checkSelector = '#a_ac_grdResults_ctl00_ctl04_chkSelect';
        await page.waitForSelector(checkSelector);
    
        // action sometimes misses
        while (!await page.$eval(checkSelector, c => c.checked)) {
            await page.click(checkSelector);
        }
    
        const participantsSelector = '#a_ac_btnParticipants';
        await page.click(participantsSelector);
    
        // wait for a unique button to appear (only occurs when there are students in course)
        await page.waitForSelector('#a_ac_btnUpgradeRole', {timeout: 1000, visible: true}).catch(() => {
            console.log('No students to unenroll.');
            return;
        }).then(async (r) => {
            if (r) {
                await page.evaluate(() => {
                    SelectAllCheckboxes('a_ac_grdResults');
                  });
            
                const deleteSelector = '#a_ac_btnDelete';
                await page.click(deleteSelector);
                page.close();
            }
        });
        return;
    }

    async unenrollClass(search, pars) {

        if (pars.length > 0) {
            const page = await this.browser.newPage();
            //await page.setDefaultTimeout(0);
            try {
        
                page.on('dialog', async dialog => {
                    await dialog.accept();
                });
            
                await page.goto('https://learningplace.eq.edu.au/CAMS/Default.aspx');
                const courseSelector = '#a_ac_lnkFindCourse';
                await page.waitForSelector(courseSelector);
                await page.click(courseSelector);
            
                const searchSelector = '#a_ac_txtTitle_text';
                await page.waitForSelector(searchSelector);
                await page.type('#a_ac_txtTitle_text', search);
            
                const searchButtonSelector = '#a_ac_btnSearch';
                await page.click(searchButtonSelector);
            
                // Selects first checkbox
                const checkSelector = '#a_ac_grdResults_ctl00_ctl04_chkSelect';
                await page.waitForSelector(checkSelector);
            
                // action sometimes misses
                while (!await page.$eval(checkSelector, c => c.checked)) {
                    await page.click(checkSelector);
                }
            
                const participantsSelector = '#a_ac_btnParticipants';
                await page.click(participantsSelector);
            
                // Check if there are any rows using the first row selector
                // try {
                //     await page.waitForSelector('#a_ac_grdResults_ctl00_ctl04_chkSelect', {timeout: 1000, visible: true});
                // } catch (error) {
                //     console.error('[Unenroll] No participants are in the course!!');
                //     return [];
                // }
            
                const displaySelector = '#a_ac_grdResults_ctl00_ctl03_ctl01_lnkDisplayAll';
                try {
                    await page.waitForSelector(displaySelector, {timeout: 1000});
                    await page.click(displaySelector);
                    // wait for page to reload
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (e) { }
        
            
                const participants = await page.$$('[id^="a_ac_grdResults_ctl00__"]');
            
                const currentNames = [];
            
                // There's a couple of ways we can go about this
                // We collect every name first so we can compare who is NOT on the student list
                // rather than just clicking every textbox, then clicking again for everyone who is on the student list
                // the latter solution is a bit more destructive if it fails, so we avoid it
                const getNames = () => {
                    return new Promise((resolve) => {
                        participants.forEach(async (v, i) => {
                            const mis = await v.$('[id$="lnkUserName"]');
                            const name = await page.evaluate(el => el.innerText, mis);
                            currentNames.push(name);
            
                            if (i === participants.length - 1) {
                                resolve();
                            }
                        })
                })}
            
                await getNames();
            
                const participantsToUnenroll = currentNames.filter((x) => {
                    if (!pars.includes(x)) {
                        return true
                    }
                    

                });
            
                const selectParticipants = () => {
                    return new Promise((resolve) => {
                        participants.forEach(async (v, i) => {
                            const mis = await v.$('[id$="lnkUserName"]');
                            const name = await page.evaluate(el => el.innerText, mis);
    
                            const user = await v.$$('td');         
                            const type = await page.evaluate(el => el.innerText, user[3]);
                        
                            // Leave any staff members
                            if (type === 'EQ student') {
                                participantsToUnenroll.forEach(async (p) => {
                                    if (name === p) {
                                        await v.$eval('[id$="chkSelect"]', elem => elem.click());
                                    }
                                })
                            }
    
                            if (i === participants.length - 1) {
                                resolve();
                            }
                        })
                })}
    
                await selectParticipants();
                
                if (participantsToUnenroll.length > 0) {
                    const deleteSelector = '#a_ac_btnDelete';
                    await page.click(deleteSelector);
                }
    
                await page.close();        
                return participantsToUnenroll;                
            } catch (error) {
                await page.close();
                return [];
            }
        };

        return [];        
    }

    async addStudentsToClass(className, pathToClassList, classCode, customEmail = null) {
        const page = await this.browser.newPage();
    
        page.on('dialog', async dialog => {
            if (dialog.message() === 'Please make a selection.') {
                console.log(`${classCode} is already up to date.`);
                await page.close();
                return;
            } else {
                await dialog.accept();
            }
          });
        
        try {
            await page.goto('https://learningplace.eq.edu.au/CAMS/Default.aspx');
            const courseSelector = '#a_ac_lnkFindCourse';
            await page.waitForSelector(courseSelector);
            await page.click(courseSelector);
        
            const searchSelector = '#a_ac_txtTitle_text';
            await page.waitForSelector(searchSelector);
            await page.type('#a_ac_txtTitle_text', className);
        
            const searchButtonSelector = '#a_ac_btnSearch';
            await page.click(searchButtonSelector);
        
            // Selects first checkbox
            const checkSelector = '#a_ac_grdResults_ctl00_ctl04_chkSelect';
            await page.waitForSelector(checkSelector);
        
            // action sometimes misses
            while (!await page.$eval(checkSelector, c => c.checked)) {
                await page.click(checkSelector);
            }
        
            const bulkSelector = '#a_ac_btnBulkEnrolParticipant';
            await page.click(bulkSelector);
        
            const spreadsheetSelector = '#a_ac_btnSelectUpload';
            await page.waitForSelector(spreadsheetSelector);
            await page.click(spreadsheetSelector);
            
            const fileSelector = '#a_ac_txtFileToUpload';
            await page.waitForSelector(fileSelector);
            const inputElement = await page.$(fileSelector);
            await inputElement.uploadFile(pathToClassList);
        
            const uploadSelector = '#a_ac_btnAcceptUpload';
            await page.click(uploadSelector);
            
            const emailSelector = '#a_ac_ucEmailOptions_optEmailOptions_2';
            await page.waitForSelector(emailSelector);
            await page.click(emailSelector);
        
            const addUserSelector = '#a_ac_btnAddUser';
            await page.click(addUserSelector).catch(e => e);
        
            const acceptSelector = '#a_ac_btnAccept';
            await page.waitForSelector(acceptSelector);
        
            if (!customEmail) {
                // Don't send an email
                await page.click(emailSelector);
            } else {
                const customEmailSelector = '#a_ac_ucEmailOptions_optEmailOptions_1';
                await page.click(customEmailSelector);        
            }
            
            const dropDownSelector = '#a_ac_cboParticipantStatus_Arrow';
            await page.click(dropDownSelector);
            
            const pendingText = 'Pending authorisation';
            const filterHandle = await page.$('.rcbList');
            await filterHandle.$$eval(
                '#rcbItem',
                (async (items) => {
                    for (li in items) {
                        if (li.innerText === pendingText) {
                            await page.click(li);
                        }
                    }
                })
            );
        
            await page.evaluate(() => {
                SelectAllCheckboxes('a_ac_grdResults');
            });
        
            await page.click(acceptSelector);
        
            if (customEmail) {
                const subjectSelector = '#a_ac_txtSubject_text';
                const bodySelector = '#a_ac_txtMessage_text';
                await page.waitForSelector(subjectSelector);
        
                await page.click(subjectSelector);
                await page.keyboard.down('ControlLeft');
                await page.keyboard.press('KeyA');
                await page.keyboard.up('ControlLeft');
                await page.type(subjectSelector, customEmail.heading);
        
                await page.click(bodySelector);
                await page.keyboard.down('ControlLeft');
                await page.keyboard.press('KeyA');
                await page.keyboard.up('ControlLeft');
                await page.type(bodySelector, customEmail.body);

                const sendSelector = '#a_ac_btnSend';
                await page.click(sendSelector);
            }
            console.log(`Finished enrolling for ${classCode}.`)
            await page.close();
            return;
        } catch (error) {
            if (error.message.startsWith('waiting for selector "#a_ac_lnkFindCourse"')) {

            }
            await page.close();
            throw(error);
        }        
    }

    close() {
        this.browser.close();
    }
}

module.exports = {
    Browser
}
const pup = require('puppeteer-extra');
const fs = require('fs');
const mv = require('mv');
const { findNumbersInKeypad, locations } = require('./auth.js');
// const { installMouseHelper } = require('./mouse.js');
const { exec } = require('child_process');

const location = require('./location.json');

const data_dir = process.cwd() + '/data';
const download_dir = require('./config.json').download;
const OS_PIN = [1, 8, 7, 1, 6, 9];

class Browser {
    constructor() {
        this.browser = null;
    }

    init(headless = false, slowMo = 0) {
        return new Promise(async (resolve, reject) => {
            pup.use(require('puppeteer-extra-plugin-user-preferences')(
                {
                    userPrefs: {
                        download: {
                            default_directory: process.cwd() + '\\data',
                        }
                    }
                }
                ));
                
            this.browser = await pup.launch({
                args: ['--no-sandbox'],
                headless,
                slowMo
            });
            resolve();
        })
    }

    // Unused - now uses move.bat to transfer from default DL dest to DAT_DIR
    // async checkPage() {
    //     const pageList = await this.browser.pages();
    //     pageList[pageList.length - 1]._client.send('Page.setDownloadBehavior', {
    //         behavior: 'allow',
    //         downloadPath: DATA_DIR,
    //     });
    // }

    async fetchDynamicList() {
        return new Promise(async (resolve) => {
            const pages = await this.browser.pages();
            const page = pages[0];
            //await page._client.send('Page.setDownloadBehavior', {behavior: 'allow', downloadPath: process.cwd() + '/data'});
            // await installMouseHelper(page);

            // ensure desktop version loading
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36');

            page.on('dialog', async dialog => {
                await dialog.accept();
            });

            
            await this.auth(page);
            
            await page.waitForSelector('#Report23');
            await page.goto('https://oslp.eq.edu.au/OSLP/ReportFrameworkReports/ReportCriteria.aspx?ReportId=2471');
                        
            const dateSelector = '#a_ocph_ucReportCriteriaControl_rptParameterGroups_ctl00_rptParameters_ctl14_rptControls_ctl00_ucReportParamrpId6582_pcId462_txtDate';
            await page.type(dateSelector, '');

            const misCheckSelector = '#a_ocph_ucReportCriteriaControl_rptParameterGroups_ctl00_rptParameters_ctl18_rptControls_ctl17_ucReportParamrpId12422_pcId705_cbParameter';
            await this.waitAndClick(page, misCheckSelector);

            const reportTypeSelector = '#a_ocph_ucReportCriteriaControl_rptParameterGroups_ctl01_rptParameters_ctl02_rptControls_ctl00_ucReportParamrpId-11_pcId-11_ddlParameter';
            const excelOption = '#a_ocph_ucReportCriteriaControl_rptParameterGroups_ctl01_rptParameters_ctl02_rptControls_ctl00_ucReportParamrpId-11_pcId-11_ddlParameter > option:nth-child(2)';

            // These don't seem to be consistent, so try a couple of times
            // Either a problem with lib or OneSchool
            // :(

            await page.$eval(excelOption, node => {
                node.selected = true;
            });
            await page.select('select' + reportTypeSelector, '13');

            await page.$eval(excelOption, node => {
                node.selected = true;
            });
            await page.select('select' + reportTypeSelector, '13');

            await page.$eval(excelOption, node => {
                node.selected = true;
            });
            await page.select('select' + reportTypeSelector, '13');
            await page.$eval(excelOption, node => {
                node.selected = true;
            });
            await page.select('select' + reportTypeSelector, '13');
            await page.$eval(excelOption, node => {
                node.selected = true;
            });
            await page.select('select' + reportTypeSelector, '13');

            await this.waitAndClick(page, '#a_ocph_ucReportCriteriaControl_btnGenerateReport');

            resolve();
        })
    }

    async auth(page) {
        await page.goto('https://oslp.eq.edu.au');
        // need to enter details manually...
        if (location.home) {
            // console.log('\nEnter your details!');
            // await new Promise(resolve => setTimeout(resolve, 15_000)); 
            // console.log(':)\n');
            const creds = require('./creds.json');
            const EQ_USER = Buffer.from(creds.user, 'base64').toString('binary').replace('@eq.edu.au', '');
            const EQ_PASS = Buffer.from(creds.pw, 'base64').toString('binary');

            await page.type('#username', EQ_USER);
            await page.type('#password', EQ_PASS);

            await this.waitAndClick(page, '#sso-cou');
            await this.waitAndClick(page, '#sso-signin');
            await page.goto('https://oslp.eq.edu.au');
        }
        const keypad = await page.$('#a_ocph_ucKeypad_imgKeypad');
        const box = await keypad.boundingBox();
        const imgSelector = '#a_ocph_ucKeypad_imgKeypad'
        const keypadImage = await page.$(imgSelector);

        const keypadPath = './keypad/KeypadImage.png';

        await keypadImage.screenshot({
            path: keypadPath,
            omitBackground: true
        })

        const keys = await findNumbersInKeypad(keypadPath);

        try {
            OS_PIN.forEach(async (v) => {
                await page.mouse.click(
                    box.x + locations[keys[v]][0],
                    box.y + locations[keys[v]][1]);
            })

            await this.waitAndClick(page, '#a_ocph_ucKeypad_imgSubmit');
        } catch (e) {
            // Theres a really weird edge case that causes this function fail
            // when the '1' generates in the pos above Del (pos 9)
            // So we just refresh page to generate a new keypad image and try again..
            // await page.reload({ waitUntil: ["networkidle0", "domcontentloaded"] });
            this.auth(page);
        }
    }


    async fetchStudentClassList() {
        const page = await this.browser.newPage();

        //await page._client.send('Page.setDownloadBehavior', {behavior: 'allow', downloadPath: process.cwd() + '/data'});

        // ensure desktop version loading
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36');

        await page.goto('https://oslp.eq.edu.au/OSLP/ReportFrameworkReports/ReportCriteria.aspx?ReportId=2212');
        const startDateSelector = '#a_ocph_ucReportCriteriaControl_rptParameterGroups_ctl00_rptParameters_ctl01_rptControls_ctl00_ucReportParamrpId4101_pcId462_txtDate';
        const endDateSelector = '#a_ocph_ucReportCriteriaControl_rptParameterGroups_ctl00_rptParameters_ctl02_rptControls_ctl00_ucReportParamrpId5083_pcId462_txtDate';
        const startDate = generateDate();
        const endDate = generateDate('end');

        await page.type(startDateSelector, startDate);
        await page.type(endDateSelector, endDate);

        const buttonSelector = '#a_ocph_ucReportCriteriaControl_btnGenerateReport';
        await this.waitAndClick(page, buttonSelector);

        // const progressSelector = '#a_pnlProgress';
        // await page.waitForSelector(page, progressSelector, { hidden: true });
    }

    async waitAndClick(page, selector) {
        await page.waitForSelector(selector);
        await page.click(selector);
        return;
    }

    close() {
        this.browser.close();
    }
}

async function fetchResources() {
    try {
        const browser = new Browser(false);
        await browser.init(false, 0);
        await browser.fetchDynamicList();
        await browser.fetchStudentClassList();
    
        // Unfortunately there's no event for downloads finishing
        // So try after x seconds
        await new Promise(resolve => setTimeout(resolve, 20_000));
        //await moveFiles().catch(e => { throw (e) });
        browser.close();
    } catch (e) {
        throw(e);
    }
}

function generateDate(type = '') {
    const last_run = require('./last_run.json');

    if (type === 'start') {
        if (last_run.date) {
            let last_date = new Date(last_run.date);
            return `${last_date.getDate()}/${last_date.getMonth() + 1}`;
        }
    }

    const date = new Date();
    const day = date.getDay()
    const difference = date.getDate() - day;
    const newDate = new Date(date.setDate(difference));

    type === 'end' ? newDate.setDate(newDate.getDate() + 7) : {};

    return `${newDate.getDate()}/${newDate.getMonth() + 1}`;
}

function moveFiles() {
    return new Promise(async (resolve, reject) => {
        try {
            let files = fs.readdirSync(download_dir);
            files.sort((a, b) => {
                return fs.statSync(`${download_dir}/${b}`).mtime.getTime() -
                    fs.statSync(`${download_dir}/${a}`).mtime.getTime();
            })

            if (files.length < 2) { throw (new Error('File retrieval failed.')) };

            mv(download_dir + '/' + files[0], data_dir + '/' + files[0], (e) => {
                if (e) throw (e)
                mv(download_dir + '/' + files[1], data_dir + '/' + files[1], (e) => {
                    if (e) throw (e)
                    resolve();
                });
            });
        } catch (e) {
            reject(e);
        }
    })
}

module.exports = {
    fetchResources
}
const nodemailer = require('nodemailer');
const unenrol = require('./unenrollemail');
const base = require('./base');
const { delayExecution } = require('../utils');

const { checkCreds } = require('../check');

checkCreds();
const creds = require('../creds.json');
const EQ_USER = Buffer.from(creds.user, 'base64').toString('binary');
const EQ_PASS = Buffer.from(creds.pw, 'base64').toString('binary');

function CSMEmail(content, to, classCode) {
    const from = "t@t.com";

    let table_rows = []

    content.forEach((student) => {
        table_rows.push(`
            <li style="margin:0 0 10px 30px; padding: 15px">
                ${student.name}
                    <a href="mailto:${student.mis}@eq.edu.au" class="dne" style="color: #ffffff; background-color: rgb(87, 176, 235); text-align: center; border-radius: 3px; padding: 3px; margin-left: 10px;">
                        Draft New Email
                    </a>
                    <a href="https://oslp.eq.edu.au/OSLP/student/MaintainStudent/MaintainStudent.aspx?EQId=${student.eqid}" class="oop" style="color: #ffffff; background-color: #F08B24; text-align: center; border-radius: 3px; padding: 3px; margin-left: 15px">                                   
                        Open OneSchool Profile
                    </a>
            </li>
        `)
    })

    // sendEmail(from, to, `New Student${table_rows.length > 1 ? 's' : ''} - ${classCode}`, base.generate('Case Management Update', `Your case management class has ${table_rows.length > 1 ? 'new students:' : 'a new student:'}`, table_rows.join(''), classCode));
    return {
        to: to,
        subject: `New Student${table_rows.length > 1 ? 's' : ''} - ${classCode}`,
        message: base.generate('Case Management Update', `Your case management class has ${table_rows.length > 1 ? 'new students:' : 'a new student:'}`, table_rows.join(''), classCode)
    }    
}

function DiffEmail(content, to, classCode) {
    const from = "t@t.com";

    let table_rows = []

    content.forEach((student) => {
        table_rows.push(`
            <li style="margin:0 0 10px 30px; padding: 15px">
                ${student.name}
                    <a href="mailto:${student.mis}@eq.edu.au" class="dne" style="color: #ffffff; background-color: rgb(87, 176, 235); text-align: center; border-radius: 3px; padding: 3px; margin-left: 10px;">
                        Draft New Email
                    </a>
                    <a href="https://oslp.eq.edu.au/OSLP/student/MaintainStudent/MaintainStudent.aspx?EQId=${student.eqid}" class="oop" style="color: #ffffff; background-color: #F08B24; text-align: center; border-radius: 3px; padding: 3px; margin-left: 15px">                                   
                        Open OneSchool Profile
                    </a>
            </li>
        `)
    })

    // sendEmail(from, to, `New Student${table_rows.length > 1 ? 's' : ''} - ${classCode}`, base.generate('Case Management Update', `Your case management class has ${table_rows.length > 1 ? 'new students:' : 'a new student:'}`, table_rows.join(''), classCode));
    return {
        to: to,
        subject: `New Student${table_rows.length > 1 ? 's' : ''} - ${classCode}`,
        message: base.generate('Differentiation Class Update', `One of your differentiation classes has ${table_rows.length > 1 ? 'new students:' : 'a new student:'}`, table_rows.join(''), classCode)
    }    
}

function enrolEmail(content, to, classCode) {
    const from = "t@t.com";

    let table_rows = []

    content.forEach((student) => {
        table_rows.push(`
            <li style="margin:0 0 10px 30px; padding: 15px">
                ${student.name}
                    <a href="mailto:${student.mis}@eq.edu.au" class="dne" style="color: #ffffff; background-color: rgb(87, 176, 235); text-align: center; border-radius: 3px; padding: 3px; margin-left: 10px;">
                        Draft New Email
                    </a>
                    <a href="https://oslp.eq.edu.au/OSLP/student/MaintainStudent/MaintainStudent.aspx?EQId=${student.eqid}" class="oop" style="color: #ffffff; background-color: #F08B24; text-align: center; border-radius: 3px; padding: 3px; margin-left: 15px">                                   
                        Open OneSchool Profile
                    </a>
            </li>
        `)
    })

    return {
        to: to,
        subject: `Student${table_rows.length > 1 ? 's' : ''} Enrolled - ${classCode}`,
        message: base.generate('Class Update', `One of your classes has ${table_rows.length > 1 ? 'new students' : 'a new student'} (and they have been enrolled in Blackboard):`, table_rows.join(''), classCode)
    }
}

function unenrolEmail(unenrolledClassParticipants) {
    const from = "t@t.com";
    const to = "dkeen27@eq.edu.au";
    const subject = "Students Unenrolled";

    let table_rows = []

    const keys = Object.keys(unenrolledClassParticipants);

    keys.forEach((s) => {
        unenrolledClassParticipants[s].forEach((v) => {
            table_rows.push(`
            <div style="background-color:transparent;">
                <div class="block-grid mixed-two-up" style="min-width: 320px; max-width: 620px; overflow-wrap: break-word; word-wrap: break-word; word-break: break-word; Margin: 0 auto; ">
                    <div style="border-collapse: collapse;display: table;width: 100%;">
                    <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:transparent;"><tr><td align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:620px"><tr class="layout-full-width" style=""><![endif]-->
                    <!--[if (mso)|(IE)]><td align="center" width="413" style="width:413px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 0px; padding-left: 0px; padding-top:15px; padding-bottom:0px;"><![endif]-->
                        <div class="col num8" style="display: table-cell; vertical-align: top; min-width: 320px; max-width: 408px; width: 413px;">
                        <div class="col_cont" style="width:100% !important;">
                        <!--[if (!mso)&(!IE)]><!-->
                            <div style="border-top:0px solid transparent; border-left:0px solid transparent; border-bottom:0px solid transparent; border-right:0px solid transparent; padding-top:15px; padding-bottom:0px; padding-right: 0px; padding-left: 0px;">
                        <!--<![endif]-->
                        <!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 20px; padding-left: 20px; padding-top: 10px; padding-bottom: 10px; font-family: Tahoma, Verdana, sans-serif"><![endif]-->
                                <div style="color:#000000;font-family:Lato, Tahoma, Verdana, Segoe, sans-serif;line-height:1.2;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;">
                                    <div style="font-size: 12px; line-height: 1.2; color: #000000; font-family: Lato, Tahoma, Verdana, Segoe, sans-serif; mso-line-height-alt: 14px;">
                                        <p style="font-size: 14px; line-height: 1.2; word-break: break-word; mso-line-height-alt: 17px; margin: 0;"><span style="color: #000000; font-size: 14px;">${v}</span></p>
                                    </div>
                                </div>
                            <!--[if mso]></td></tr></table><![endif]-->
                            <!--[if (!mso)&(!IE)]><!-->
                        </div>
                        <!--<![endif]-->
                </div>
            </div>
            <!--[if (mso)|(IE)]></td></tr></table><![endif]-->
            <!--[if (mso)|(IE)]></td><td align="center" width="206" style="width:206px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 0px; padding-left: 0px; padding-top:15px; padding-bottom:0px;"><![endif]-->
            <div class="col num4" style="display: table-cell; vertical-align: top; max-width: 320px; min-width: 204px; width: 206px;">
                <div class="col_cont" style="width:100% !important;">
                <!--[if (!mso)&(!IE)]><!-->
                    <div style="border-top:0px solid transparent; border-left:0px solid transparent; border-bottom:0px solid transparent; border-right:0px solid transparent; padding-top:15px; padding-bottom:0px; padding-right: 0px; padding-left: 0px;">
                <!--<![endif]-->
                <!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 20px; padding-left: 20px; padding-top: 10px; padding-bottom: 10px; font-family: Tahoma, Verdana, sans-serif"><![endif]-->
                        <div style="color:#000000;font-family:Lato, Tahoma, Verdana, Segoe, sans-serif;line-height:1.2;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;">
                            <div style="font-size: 12px; line-height: 1.2; color: #000000; font-family: Lato, Tahoma, Verdana, Segoe, sans-serif; mso-line-height-alt: 14px;">
                                <p style="font-size: 14px; line-height: 1.2; word-break: break-word; mso-line-height-alt: 17px; margin: 0;">${s}</p>
                            </div>
                        </div>
            <!--[if mso]></td></tr></table><![endif]-->
            <!--[if (!mso)&(!IE)]><!-->
            </div>
            <!--<![endif]-->
            </div>
            </div>
            <!--[if (mso)|(IE)]></td></tr></table><![endif]-->
            <!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]-->
            </div>
            </div>
            </div>
            `
            )
        })
    })

    sendEmail(from, to, subject, unenrol.generate(table_rows));
}

async function sendEmail(from, to, subject, message) {
    let transport = nodemailer.createTransport({
        host: "smtp.office365.com", // hostname smtp-mail.outlook.com
        secureConnection: false, // TLS requires secureConnection to be false
        port: 587, // port for secure SMTP
        auth: {
            user: EQ_USER,
            pass: EQ_PASS
        },
        tls: {
            ciphers:'SSLv3'
        }
    });
    
    const f = transport.sendMail({
        from: from,
        to: 't@t.com',
        subject: subject,
        html: `${message}`
        }, (e) => {if (e) console.error(e)});

    await delayExecution(f, Math.random() * 10000);
}

// to
// subject
// message

async function queueEmails(emails) {
    let transport = nodemailer.createTransport({
        host: "smtp.office365.com", // hostname smtp-mail.outlook.com
        secureConnection: false, // TLS requires secureConnection to be false
        port: 587, // port for secure SMTP
        auth: {
            user: EQ_USER,
            pass: EQ_PASS
        },
        tls: {
            ciphers:'SSLv3'
        }
    });

    for (const email of emails) {
        const m = {
          from: 't@t.com',
          to: email.to,
          subject: email.subject,
          html: email.message
        };
        await transport.sendMail(m);
        console.log(`Emailed ${email.to}.`);
    }
}

module.exports = { queueEmails, enrolEmail, unenrolEmail, CSMEmail, DiffEmail };
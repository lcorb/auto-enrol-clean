const same = require('looks-same');
const sharp = require('sharp');

const size = [50, 43]

const locations = {
    1: [15, 10],
    2: [75, 10],
    3: [135, 10],
    4: [15, 63],
    5: [75, 63],
    6: [135, 63],
    7: [15, 116],
    8: [75, 116],
    9: [135, 116],
    10: [75, 169]
}

async function findNumbersInKeypad(keypad) {
    const keys = Object.keys(locations);
    keys.forEach((v) => {
        sharp(keypad)
        .extract({
            left: locations[v][0],
            top: locations[v][1],
            width: size[0],
            height: size[1]})
        .toFile(`./keypad/Pos_${v}.png`)
    })

    let map = {};

    const compare = await new Promise((resolve, reject) => {
        try {
            keys.forEach((v) => {
                for (let i = 0; i < keys.length; i++) {
                    same(`./keypad/Key_${i}.png`, `./keypad/Pos_${v}.png`, (e, same) => {
                        if (e) reject(e);
                        if (same.equal) {
                            // V is positions 1-10
                            // I is numbers 0-9
                            map[i] = v;
                            if (Number(v) === 10) {
                                resolve();
                            } 
                        }
                    })
                }
            })
        } catch (e) {
            reject(e)
        }
    }).catch(e => { throw (e) });
    return map;
}

module.exports = {findNumbersInKeypad, locations};

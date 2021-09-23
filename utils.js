const delayExecution = (f, delay) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(f);
        }, delay);
    });
}

module.exports = { delayExecution }
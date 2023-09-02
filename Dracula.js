const UTIL = require("./utilities.js");
const fs = require('fs');
const _ = require('lodash');

class Dracula {
    static async flow(interaction) {
        let array = fs.readFileSync('flow.txt').toString().split("\n");
        let line = _.sample(array);
        await UTIL.safeRespond(interaction, {
            content: line
        });
    }
}

module.exports = Dracula;
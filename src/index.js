
const coder = require("./coder");

const main = async () => {
    const response = await coder("how is this repository actual scenario?");
    console.log(response);
}

main();
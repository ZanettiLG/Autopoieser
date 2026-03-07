
const coder = require("./coder");

const main = async () => {
    const response = await coder("/ask how is this repository actual scenario? write SPEC");
    console.log(response);
}

main();
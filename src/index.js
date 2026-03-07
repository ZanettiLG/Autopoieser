
const coder = require("./coder");

const main = async () => {
    const response = coder.code("@Branch how is this repository actual scenario? write SPEC");
    console.log("RESPONSE:\n\n", await response.response);
}

main();
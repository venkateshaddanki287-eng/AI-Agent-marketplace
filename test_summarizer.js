const { summarize } = require('./agents/summarizer');

console.log("Testing Summarizer Logic (NO ALGO USED)...");
const input = "This is the first sentence. This is the second. And a third!";
const result = summarize(input);

console.log(`Input: ${input}`);
console.log(`Result: ${result}`);

if (result === "This is the first sentence.") {
    console.log("Test PASSED!");
} else {
    console.error("Test FAILED!");
}

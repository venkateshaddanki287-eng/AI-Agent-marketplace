async function runTests() {
    console.log("Testing POST /register...");
    const postRes = await fetch('http://localhost:5000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: "Test Summarizer",
            description: "Summarizes text",
            price: "1000",
            endpointUrl: "http://localhost:5001/task",
            walletAddress: "DUMMY_ADDRESS"
        })
    });
    const postData = await postRes.json();
    console.log(postData);

    console.log("\nTesting GET /agents...");
    const getRes = await fetch('http://localhost:5000/agents');
    const getData = await getRes.json();
    console.log(getData);
}
runTests();

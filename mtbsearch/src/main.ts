import { MTBSearch } from "./mtbsearch";

console.log("Starting MTBSearch...");

let app = new MTBSearch(process.argv) ;
app.run().then(() => {
    console.log("MTBSearch completed successfully.");
}).catch((error) => {
    console.error("Error starting MTBSearch:", error);
});

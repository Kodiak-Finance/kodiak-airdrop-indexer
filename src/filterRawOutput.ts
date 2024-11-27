import * as fs from "fs";
import csv from "csv-parser";

const args = process.argv.slice(2);
const minPoints = parseInt(args[0] ?? "4");
const input_file = args[1] ?? "raw_output.csv";
const output_file = args[2] ?? "filtered_raw_output.csv";

interface UserPoints {
    user_: string;
    points: number;
}

const loadCSV = async (filePath: string): Promise<UserPoints[]> => {
    return new Promise((resolve, reject) => {
        const results: UserPoints[] = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on("data", (data) =>
                results.push({ user_: data.user_, points: Number(data.points) })
            )
            .on("end", () => resolve(results))
            .on("error", (error) => reject(error));
    });
};

const writeCSV = (filePath: string, data: UserPoints[]) => {
    const header = "user_,points\n";
    const rows = data.map((row) => `${row.user_},${row.points}`).join("\n");
    fs.writeFileSync(filePath, header + rows);
};

const processCSV = async (inputFile: string, outputFile: string) => {
    const data = await loadCSV(inputFile);

    const updatedData = data.filter((item) => item.points >= minPoints);
    writeCSV(outputFile, updatedData);
};

processCSV(input_file, output_file)
    .then(() => console.log("CSV processing complete"))
    .catch((err) => console.error("Error processing CSV:", err));

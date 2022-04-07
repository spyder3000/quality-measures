const fs = require("fs");
const path = require("path");
const axios = require("axios");
const nReadlines = require("n-readlines");
const lineReader = require("line-reader");

const dest =
	"https://2swdepm0wa.execute-api.us-east-1.amazonaws.com/prod/NavaInterview/measures";

// Read Data file one line at a time & put in final JSON format based on matching schema.  Call POST for each line of data.
const sendData = ({ schemaLayout, txtFile }) => {
	console.log(
		"PART 3 -- read a single file in ./files directory & process line by line"
	);
	const txtFileLines = new nReadlines("./files/" + txtFile);
	let line;

	const finalRec = {};
	while ((line = txtFileLines.next())) {
		let modLine = line.toString("ascii");
		let offset = 0;
		for (let i = 0; i < schemaLayout.length; i++) {
			finalRec[schemaLayout[i].name] = fixFormat(
				modLine,
				offset,
				parseInt(schemaLayout[i].width),
				schemaLayout[i].datatype
			);
			offset += parseInt(schemaLayout[i].width);
		}
		// console.log("*** Call POST data *** ");
		// console.log(finalRec);
		postData(finalRec);
	}
};

// POST data to destination
const postData = (dat) => {
	let tmpdat = { ...dat };
	axios
		.post(dest, dat)
		.then(function (response) {
			console.log(`POST success for id = ${tmpdat.measure_id}`);
			// console.log(response);
		})
		.catch(function (error) {
			console.log(
				`POST failure: Error code ${error.code};  id = ${tmpdat.measure_id};  URL = ${error.config.url}`
			);
		});
};

// Adjust format of data based on type (Text, Integer, or Boolean)
const fixFormat = (line, offset, dat_length, dat_type) => {
	if (dat_type == "TEXT") return line.substring(offset, offset + dat_length);
	if (dat_type === "INTEGER")
		return parseInt(line.substring(offset, offset + dat_length));
	if (dat_type === "BOOLEAN")
		return line.substring(offset, offset + dat_length) == 1 ? true : false;
	return "";
};

// PART 2 -- Find the corresponding csv Schema file;  creates a Schema array w/ name, width, & datatype
const processFile = async (datfile) => {
	console.log("PART 2 -- process File = " + datfile);
	let tmpfile = datfile.replace(".txt", ".csv");

	// Check for a corresponding schema record
	fs.readFile(
		path.join(__dirname, "/schemas", tmpfile),
		"utf8",
		(err, data) => {
			if (err) {
				console.log("Error -- could not find file " + tmpfile);
				// throw err;
			} else {
				const schemaLines = new nReadlines("./schemas/" + tmpfile);
				let line;
				let schema_array = [];
				let schema_obj_array = [];

				while ((line = schemaLines.next())) {
					schema_array.push(line.toString("ascii"));
				}
				// console.log("Schema tot found = " + schema_array.length);
				for (let j = 0; j < schema_array.length; j++) {
					let x = schema_array[j]
						.replace("\r", "")
						.replace("\n", "")
						.split(",");
					schema_obj_array.push({ name: x[0], width: x[1], datatype: x[2] });
				}
				sendData({ schemaLayout: schema_obj_array, txtFile: datfile });
			}
		}
	);
};

// PART 1 -- Read the contents of the /files folder.  Process each file found
console.log("PART 1 (BEGIN) -- read ./files directory");
fs.readdir("./files", (err, files) => {
	if (err) throw err;
	// console.log(files);
	for (let i = 0; i < files.length; i++) {
		processFile(files[i]);
	}
});

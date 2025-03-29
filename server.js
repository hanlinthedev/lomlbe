const express = require("express");
const AWS = require("aws-sdk");
const cors = require("cors");

const app = express();

app.use(express.json());

const s3 = new AWS.S3({
	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
	region: process.env.AWS_REGION,
});

const bucketName = process.env.S3_BUCKET_NAME;

/**
 * Function to parse date from "March 29th, 2025" to Date object
 */
function parseDateString(dateStr) {
	return new Date(dateStr.replace(/(\d+)(st|nd|rd|th)/, "$1"));
}

/**
 * Fetches all folders (dates) and their images from S3
 */
async function getImagesByDate() {
	try {
		// List "folders" (prefixes in S3)
		const listParams = {
			Bucket: bucketName,
			Prefix: "images/", // Assuming images are stored inside 'images/' folder
			Delimiter: "/",
		};

		const folderResponse = await s3.listObjectsV2(listParams).promise();
		const folders = folderResponse.CommonPrefixes.map((prefix) =>
			prefix.Prefix.replace("images/", "").replace("/", "")
		);

		let result = {};

		for (const folder of folders) {
			const imageParams = {
				Bucket: bucketName,
				Prefix: `images/${folder}/`,
			};

			const imagesResponse = await s3.listObjectsV2(imageParams).promise();
			const images = imagesResponse.Contents.map(
				(obj) => `https://${bucketName}.s3.amazonaws.com/${obj.Key}`
			);

			result[folder] = images;
		}

		// Sort the result by date
		result = Object.keys(result)
			.sort((a, b) => parseDateString(a) - parseDateString(b))
			.reduce((sortedObj, key) => {
				sortedObj[key] = result[key];
				return sortedObj;
			}, {});

		return result;
	} catch (error) {
		console.error("Error fetching images:", error);
		return {};
	}
}

// API Route
app.get("/images", async (req, res) => {
	const images = await getImagesByDate();
	res.json(images);
});

// Start Server
const PORT = 3000;
app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});

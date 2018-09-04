/**
 * github ianmaddox/gcs-cf-tokenizer
 * Utility script to generate OAuth 2.0 authentication tokens
 * See ../README.md for license and more info
 *
 * USAGE:
 * This tool is designed to be executed within the the GCS Cloud Shell or a PChell that is configured to use NodeJS
 * terminal that is configured to use NodeJS.
 * 1) To initialize the environment run "npm install"
 * 2) Download your service account credential .json file and assign the pathand filename to the environment variable GOOGLE_APPLICATION_CREDENTIALS
 *    and filename to the environment variable GOOGLE_APPLICATION_CREDENTIALS
 *    Linux/Mac: "export GOOGLE_APPLICATION_CREDENTIALS='/path/to/credentials.json'"
 * 3) Define the GCP project in the environment variable GCLOUD_PROJECT
 *    Linux/Mac: "export GCLOUD_PROJECT='YOUR_PROJECT'"
 * 4) Run the script
 *    "node getToken.js"
 *    The auth_token will be printed to stdout
 */
"use strict";
const {google} = require('googleapis');

async function main () {
  // This method looks for the GCLOUD_PROJECT and GOOGLE_APPLICATION_CREDENTIALS
  // environment variables.
  const auth = await google.auth.getClient({
    // Scopes can be specified either as an array or as a single, space-delimited string.
    scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/datastore']
  });
  return auth.getAccessToken();
}

module.exports.getAccessToken = main;

(async () => {
  let tokens = await main().catch(console.error);
  // console.log(tokens);
  console.log(tokens.token);
})();

/**
Copyright 2018 Ian Maddox

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

'use strict';
const DEBUG = false;

/* Helpful init stuff */
const fileVersion = require('fs').statSync('index.js').mtimeMs;
// This log line is helpful to keep track of which version of the CF is running.
// The timestamp of index.js is logged at initial script launch as well as each
// individual execution of tokenize() and detokenize()
console.log(`CF LAUNCHED ver ${fileVersion}`);

/* Required libraries */
const {google} = require('googleapis');
const crypto = require('crypto');
const Datastore = require('@google-cloud/datastore');

/* Project variables */
const projectId = 'tokenizer-sol'; // Used for both KMS and DS

/* KMS variables */
const keyRingLocation = 'us';
const keyRingId = 'tokenization-service-kr';
const cryptoKeyId = 'cc-tokenization';

/* Datastore variables */
const dsNamespace = 'tokenizer';
const kind = 'cc';
const datastores = [];

/**
 * Accepts the following params as an HTTP POST:
 *  auth_token - OAuth 2.0 authentication token
 *  cc         - 14-16 digit credit card number
 *  mm         - 2 digit month
 *  yyyy       - 4 digit year
 *  userid     - arbitrary user ID string (optional)
 *
 * Returns an alphanumeric string which can be used as a PCI DSS compliant token
 * in-place of a credit card number in out-of-scope data storage environments.
 *
 * @param {object} req - CF request object
 * @param {object} res - CF response object
 */
exports.tokenize = async (req, res) => {
  console.log(`tokenizing ver ${fileVersion}`);
  // The value contains a JSON document representing the entity we want to save
  var cc = req.body.cc;
  var mm = req.body.mm;
  var yyyy = req.body.yyyy;
  var userid = req.body.userid;
  var authToken = req.body.auth_token;

  if(!authToken) {
    return res.status(401).send("An OAuth acess token must be provided in the param 'auth_token'");
  }

  if (!cc || cc.length < 14 || cc.length > 16) {
    return res.status(500).send('Invalid input for CC');
  }

  if(!mm || mm < 0 || mm > 12) {
    return res.status(500).send("Invalid input for mm");
  }

  if(!yyyy || yyyy < 2010 || yyyy > 3000) {
    return res.status(500).send("Invalid input for yyyy");
  }
  try {
    var datastore = await dsAuth(authToken);
    buildAndAuthorizeKMS((err, cloudkms) => {
      if (err) {
        console.log(err);
        return;
      }

      const request = {
        name: `projects/${projectId}/locations/${keyRingLocation}/keyRings/${keyRingId}/cryptoKeys/${cryptoKeyId}`,
        resource: {
          plaintext: cc.toString('base64')
        }
      };

      // Encrypts the file using the specified crypto key
      cloudkms.projects.locations.keyRings.cryptoKeys.encrypt(request, (err, response) => {
        if (err) {
          console.log(err);
          res.status(401).send(err.message);
          return;
        }

        const buf = new Buffer.from(response.data.ciphertext);
        var cipher = buf.toString();
        var authToken = crypto.createHash('sha256').update(userid + "::" + cipher).digest("hex");
        const entity = {
          key: {kind: kind, namespace: dsNamespace},
          data: {
            userid: userid,
            token: authToken,
            mm: mm,
            yyyy: yyyy,
            cipher: cipher
          }
        };
        datastore.save(entity)
          .then(() => {
            res.status(200).send(authToken);
            return true;
          })
          .catch((err) => {
            console.error(err);
            res.status(500).send(err.message);
            return false;
          });
      });
    });
  }
  catch(err) {
    res.status(500).send(err.message);
    return false;
  }
}


/**
 * Accepts the following params as an HTTP POST:
 *  auth_token - OAuth 2.0 authentication token
 *  cc_token   - The tokenized CC number
 *
 * If the auth_token was valid, this returns a JSON object containing the
 * sensitive payment card data that was stored under the given token.
 *
 * @param {object} req - CF request object
 * @param {object} res - CF response object
 */
exports.detokenize = async (req, res) => {
  console.log(`detokenizing ver ${fileVersion}`);
  var ccToken = req.body.cc_token;
  var authToken = req.body.auth_token;

  if(!authToken) {
    res.status(401).send("An OAuth acess token must be provided in the param 'auth_token'");
    return false;
  }

  if (!ccToken || ccToken.length < 16) {
    throw new Error('Invalid input for token: ' + ccToken);
  }

  try {
    var datastore = await dsAuth(authToken);

    buildAndAuthorizeKMS((err, cloudkms) => {
      if (err) {
        console.log(err);
        return;
      }
      const query = datastore
        .createQuery(dsNamespace, kind)
        .filter('token', '=', ccToken);

        datastore.runQuery(query)
        .then((rs) => {
          var row = rs[0][0];

          if(!row || row === undefined) {
            res.status(404).send("Record not found");
            return false;
          }
          var cipher = row.cipher;
          var buff = new Buffer.from(cipher);
          let cipherB64 = buff.toString('base64');
          var payload = {
            cc: '',
            mm: row.mm,
            yyyy: row.yyyy,
            userid: row.userid
          };

        const request = {
          name: `projects/${projectId}/locations/${locationId}/keyRings/${keyRingId}/cryptoKeys/${cryptoKeyId}`,
          resource: {
            ciphertext: cipher
          }
        };
        cloudkms.projects.locations.keyRings.cryptoKeys.decrypt(request, (err, response) => {
          if (err) {
            console.log(err);
            res.status(401).send(err.message);
          }

          payload.cc = response.data.plaintext;
          res.status(200).send(payload);
          return true;
        });
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send(`Datastore query error: ${err.message}`);
        return false;
      })
    });
  }
  catch(e) {
    res.status(500).send(err.message);
    return false;
  }
};


/**
 * Authenticate against the Datastore API. If we already have a DS client
 * instantiated for the given auth_token, return that one instead.
 *
 * @param {string} authToken - The OAuth2.0 authentication token given to the CF
 * @return {Datastore} - A cached or newly created DS object
 */
async function dsAuth(authToken) {
  debug(`dsAuth with token '${authToken}'`);
  if(datastores[authToken] !== undefined) {
    debug("Using cached DS");
    return datastores[authToken];
  }
  debug("Generating new DS");
  const oauth2client = new google.auth.OAuth2();
  const tokenInfo = await oauth2client.getTokenInfo(authToken);

  debug("token info:");
  debug(tokenInfo);
  let now = Date.now();
  debug('exp:', tokenInfo.expiry_date, 'now:', Date.now(), 'remainder:', (tokenInfo.expiry_date - Date.now()));
  if(!tokenInfo.expiry_date || tokenInfo.expiry_date < now) {
    throw new Error('Token did not validate: ' + authToken);
  }

  oauth2client.setCredentials({token:authToken, res: null});
  let options = {
    access_token: oauth2client,
    projectId: projectId
  };
  datastores[authToken] = Datastore(options);

  return datastores[authToken];
}


/**
 * Authenticate to the Cloud KMS API with the previously provided auth_token
 */
function buildAndAuthorizeKMS(callback) {
  // Imports the Google APIs client library

  // Acquires credentials
  google.auth.getApplicationDefault((err, authClient) => {
    if (err) {
      callback(err);
      return;
    }

    if (authClient.createScopedRequired && authClient.createScopedRequired()) {
      authClient = authClient.createScoped([
        'https://www.googleapis.com/auth/cloud-platform'
      ]);
    }

    // Instantiates an authorized client
    const cloudkms = google.cloudkms({
      version: 'v1',
      auth: authClient
    });

    callback(null, cloudkms);
  });
}

function debug(...args) {
  if(DEBUG) console.log(...args);
}

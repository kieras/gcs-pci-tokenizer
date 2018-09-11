# Google Cloud Functions Credit Card Tokenization Service
A PCI DSS compliant credit card tokenization service built for Google Cloud Functions.

This project employs KMS and Datastore to securely encrypt and tokenize sensitive credit card data in a manner consistent with the PCI Data Security Standard. This code is applicable to SAQ A-EP and SAQ D type merchants of any compliance level.

For more information, see the Google Cloud solution paper on [Tokenizing Sensitive Cardholder Data for PCI DSS](https://TBD).

# Usage
Open the GCP Cloud Console and then open the Cloud Shell. Cloud Shell can be opened with the ">_" icon in the top-right of the console.
Run the following command to check out the project code and move into the working directory:

```
git clone https://github.com/ianmaddox/gcs-cf-tokenizer
cd gcs-cf-tokenizer
```

This folder contains the file index.js which is the source for two different cloud functions we will be creating. It also contains package.json which tells Cloud Functions which packages it needs to run.

Run the following commands to deploy both of the cloud functions:
```
gcloud beta functions deploy tokenize --runtime=nodejs8 --trigger-http --entry-point=tokenize --memory=256MB --source=.

gcloud beta functions deploy detokenize --runtime=nodejs8 --trigger-http --entry-point=detokenize --memory=256MB --source=.
```

These commands create two separate Cloud Functions: one for turning the card number into a token and another to reverse the process. The differing entry-points direct execution to the proper starting function within index.js.

These same deploy commands are available in convenient utility scripts:
```
src/deploy-tokenize.sh
src/deploy-detokenize.sh
```

Once the functions are deployed, you can verify they were successfully created by navigating to the Cloud Functions page in the Google Cloud Console. Doing so will not close the Cloud Shell. You should see your two functions with green checkmarks next to each.

# Apache 2.0 License
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

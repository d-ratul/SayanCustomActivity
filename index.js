/*
 * Copyright (c) 2018.  Ratul Mahato
 *
 *
 */

'use strict';

// Import libraries
const Path = require('path');
const express = require('express');
const Pkg = require(Path.join(__dirname, './package.json'));
// const marketingCloudService = require('./private/marketing-cloud-service');
const verifyToken = require('./private/jwt-verification').verifyToken;
const BASE_URL = '/activity';//'/salesforceMarketingCloud/customActivities/blackoutActivity';
const SUCCESS_STATUS_CODE = 200;
const axios = require('axios');


const app = express();

// Register middleware that parses the request payload.

app.use(require('body-parser').raw({
    type: 'application/jwt'
}));


// Route that is called for every contact who reaches the custom split activity
app.post(BASE_URL + '/execute', (req, res) => {
    console.log('Getting new Request...' , req.body);
    console.log('JwT...' , Pkg.options.salesforce.marketingCloud.jwtSecret);    
    verifyToken(req.body, Pkg.options.salesforce.marketingCloud.jwtSecret, (err, decoded) => {
        console.log('REQUEST RECEIVED', JSON.stringify(decoded));
        // verification error -> unauthorized request
        if (err) {
            console.error('ERROR VERIFICATION: ', err);
            return res.status(401).end();
        }

        // Get all the details entered by the user on the UI.
        let subscriberKey = decoded.inArguments[0].contactIdentifier;
        let blackoutDEName = decoded.inArguments[1].dataExtensionName;
        let blackoutDEHolidayField = decoded.inArguments[2].fieldToUpdate;
        let daysToSendEmailOn = decoded.inArguments[3].daysToSendEmailOn;
        let holidayDE = decoded.inArguments[4].holidayDataExtensionName;
        let holidayDEField = decoded.inArguments[4].holidayDataExtensionFieldName;
        let blackoutDESubscriberField = 'SubscriberKey';

        if (!blackoutDEName || !blackoutDEHolidayField || !daysToSendEmailOn || !subscriberKey) {
            return res.status(400).end();
        } else {
            console.log('MC');
            return marketingCloudService.updateDataExtension(blackoutDEName, blackoutDEHolidayField,
                blackoutDESubscriberField, subscriberKey, holidayDE,
                holidayDEField, daysToSendEmailOn, res);
        }
    });
});

// Routes for saving, publishing and validating the custom activity. In this case
// nothing is done except decoding the jwt and replying with a success message.
app.post([BASE_URL + '/publish', BASE_URL + '/validate', BASE_URL + '/stop'], (req, res) => {
    console.log("Validate");
    return res.status(SUCCESS_STATUS_CODE).json({success: true});
});


//TODO : Add logic to verify if you have received the parameters
app.post(BASE_URL + '/save', (req, res) => {
    console.log("Save");
    return res.status(SUCCESS_STATUS_CODE).json({success: true});
});


// Serve the custom activity's interface, config, etc.
app.use(express.static(Path.join(__dirname, 'public')));

// Start the server and listen on the port specified by Heroku or defaulting to 12345
app.listen(process.env.PORT || 4433, () => {
    console.log('Service Cloud custom split backend is now running at port! ' + (process.env.PORT || 443));
});








/*
 * Copyright (c) 2018.  Ratul
 *
 * Permission to use, copy, modify, and/or distribute this software inside for any purpose with or without fee is hereby
 * granted, provided that the above copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS
 * SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL
 * THE  AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT,
 * NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
 * PERFORMANCE OF THIS SOFTWARE.
 */

"use strict";

const path = require("path");
const cache = require("./cache");
const packageFile = require(path.join(__dirname, '../package.json'));
const moment = require('moment');

const sfmcInstanceConfigs = packageFile.options.salesforce.marketingCloud;
const sfmcApiConfigs = packageFile.options.salesforce.apiConfigs;


// const FuelSDK = require('fuelsdk-node');
const SUCCESS_STATUS_CODE = 200;
const DAY_OF_WEEK_FORMAT = "dddd";
let expressResponse;


// //TODO : Move to config vars
// const SFMC_Client = new FuelSDK(loginOptions.clientId, loginOptions.clientSecret, loginOptions.marketingCloudInstance);

const ET_Client = require('sfmc-fuelsdk-node');
const clientId = sfmcApiConfigs.clientId
const clientSecret = sfmcApiConfigs.clientSecret
const origin = sfmcApiConfigs.origin
const authOrigin = sfmcApiConfigs.authOrigin
const soapOrigin = sfmcApiConfigs.soapOrigin
const accountId = sfmcApiConfigs.accountId

const obj = {
  origin: origin,
  authOrigin: authOrigin,
  soapOrigin: soapOrigin,
  authOptions: { 
    authVersion: 2,
    accountId: accountId
  }
}
const stack = 's7';
const client = new ET_Client(clientId, clientSecret, stack, obj);

module.exports.updateDataExtension = function (blackoutDE, blackoutDEHolidayField, blackoutDESubscriberField,
                                               subscriberKey, holidayDE, holidayDEField,
                                               daysToSendEmailOn, response) {

    const todayDateUTC = moment.utc().format(sfmcInstanceConfigs.defaultDateFormat);
    expressResponse = response;

    // Only get holidays starting today. Default 2500 holidays will be fetched.

    // let options = {
    //     Name: "SDKDataExtension",
    //     props: [
    //         holidayDEField
    //     ],
    //     filter: {
    //         leftOperand: holidayDEField,
    //         operator: 'greaterThanOrEqual',
    //         rightOperand: todayDateUTC
    //     }
    // };

    // let deRow = SFMC_Client.dataExtensionColumn(options);
    // deRow.objName = `DataExtensionObject[${holidayDE}]`;

    var holidayDEDetails= {
        Name: holidayDE,
        props: [holidayDEField]
      };
      
    var holidayRow = client.dataExtensionRow(deOpt);

    return new Promise(function (resolve, reject) {
        deRow.get(function (err, response) {
            if (err) {
                reject(err);
            } else {
                let holidayList = fetchHolidayListfromHolidayDE(response,holidayDEField)
                // let parsedHolidays = _parseHolidayServiceResponse(response, holidayDEField);
                resolve(holidayList);
            }
        })
    }).then(function (holidayList) {
        let isHoliday = true;

        // Get current day from date i.e. Monday / Tuesday etc
        let currentDayOfWeek = todayDateUTC.format(DAY_OF_WEEK_FORMAT);
        let temporaryDate = todayDateUTC;

        //Run this loop until you get a desired day when the email is to be sent and
        // that day is not in the holiday list
        while (daysToSendEmailOn.indexOf(currentDayOfWeek) === -1 || isHoliday === true) {

            temporaryDate = temporaryDate.add('1', 'days');

            //Find the day again after incrementing
            currentDayOfWeek = temporaryDate.format(DAY_OF_WEEK_FORMAT);
            if (holidayList.length > 0) {
                isHoliday = holidayList.includes(temporaryDate.format(loginOptions.defaultDateFormat));
            }
        }
        return {
            temporaryDate: temporaryDate.format(loginOptions.defaultDateFormat),
            subscriberKey: subscriberKey,
            blackoutDESubscriberField: blackoutDESubscriberField,
            blackoutDE: blackoutDE,
            blackoutDEHolidayField: blackoutDEHolidayField
        }
    }).then(function (parameters) {
        return _fetchSubscriberRowInBlackoutDataExtension(parameters)
    }).then(function (parameters) {
        return _createLastHolidayRow(parameters);
    }).catch(reason => {
        console.log('Error in while updating.js: ', reason);
        return expressResponse.status(400).end();
    });

};

let fetchHolidayListfromHolidayDE = function(parameters){
    return "true"
}




// let _fetchSubscriberRowInBlackoutDataExtension = function (parameters) {
//     // Check if a subscriber row exists and then fire an insert or update to insert data row.
//     return new Promise(function (resolve, reject) {
//         let options = {
//             Name: "SDKDataExtension",
//             props: [
//                 parameters.blackoutDE
//             ],
//             filter: {
//                 leftOperand: parameters.blackoutDESubscriberField,
//                 operator: 'equals',
//                 rightOperand: parameters.subscriberKey
//             }
//         };

//         let deRow = SFMC_Client.dataExtensionColumn(options);
//         deRow.objName = `DataExtensionObject[${parameters.blackoutDE}]`;

//         deRow.get(function (err, response) {
//             if (err) {
//                 reject(err);
//             } else {
//                 let isSubscriber = _parseSubscriberKeyQueryResponse(response);
//                 resolve({
//                     isSubscriber: isSubscriber,
//                     lastHolidayDate: parameters.temporaryDate,
//                     subscriberKey: parameters.subscriberKey,
//                     blackoutDEHolidayField: parameters.blackoutDEHolidayField,
//                     blackoutDE: parameters.blackoutDE
//                 });
//             }
//         })

//     })
// };

// let _createLastHolidayRow = function (parameters) {
//     return new Promise(function (resolve, reject) {
//         let options = {};
//         options.CustomerKey = parameters.blackoutDE;
//         options.Name = "SDKDataExtension";
//         options.props[parameters.blackoutDEHolidayField] = parameters.lastHolidayDate;
//         options.props["SubscriberKey"] = parameters.subscriberKey;

//         let deRow = SFMC_Client.dataExtensionRow(options);

//         if (parameters.isSubscriber) {
//             deRow.post(function (err, response) {
//                 if (err) {
//                     return expressResponse.status(500).send(err)
//                 } else {
//                     return expressResponse.status(SUCCESS_STATUS_CODE).json({branchResult: 'forward'});
//                 }
//             });
//         } else {
//             deRow.patch(function (err, response) {
//                 if (err) {
//                     return expressResponse.status(500).send(err)
//                 } else {
//                     return expressResponse.status(SUCCESS_STATUS_CODE).json({branchResult: 'forward'});
//                 }
//             });
//         }

//     })
// };

// let _parseSubscriberKeyQueryResponse = function (result) {
//     return result.body
//         && result.body.Results
//         && result.body.Results[0]
//         && result.body.Results[0].Properties
//         && result.body.Results[0].Properties.length > 0;
// };

// let _parseHolidayServiceResponse = function (response, fieldName) {
//     const todayDateUTC = moment.utc().format(loginOptions.defaultDateFormat);
//     if (cache.get(todayDateUTC)) {
//         return cache.get(todayDateUTC);
//     } else {
//         let holidayList = [];
//         fieldName = fieldName || 'Holiday Date';

//         if (result.body && result.body.Results) {
//             result.body.Results.forEach(function (value) {
//                 value.Properties.Property.forEach(function (innerValue) {
//                     if (innerValue.Name.toLowerCase() === fieldName.toLowerCase()) {
//                         let receivedDate = moment.utc(innerValue.Value, loginOptions.defaultDateFormat);
//                         holidayList.push(receivedDate.format(loginOptions.defaultDateFormat));
//                     }
//                 })
//             })
//         }
//         //Cache the holiday response so that we do not have to make call out again and again.
//         cache.set(todayDateUTC, holidayList);
//         return holidayList;
//     }
// };

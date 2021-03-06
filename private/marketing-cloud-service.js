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


// //TODO : Move to config var
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
        props: [holidayDEField],
        filter: {
            leftOperand: holidayDEField,
            operator: 'greaterThanOrEqual',
            rightOperand: todayDateUTC
        }
      };
      
    var holidayRow = client.dataExtensionRow(holidayDEDetails);

    return new Promise(function (resolve, reject) {
        holidayRow.get(function (err, response) {
            if (err) {
                reject(err);
            } else {
                let holidayList = fetchHolidayListfromHolidayDE(response,holidayDEField)
                // let parsedHolidays = _parseHolidayServiceResponse(response, holidayDEField);
                console.log(" -- Holi List --",holidayList)
                resolve(holidayList);
            }
        })
    }).then(function (holidayList) {
        let isHoliday = true;

        // Get current day from date i.e. Monday / Tuesday etc
        // let currentDayOfWeek = todayDateUTC.format(DAY_OF_WEEK_FORMAT);
        let currentDayOfWeek = moment(todayDateUTC).format(DAY_OF_WEEK_FORMAT);
        let temporaryDate = todayDateUTC;

        //Run this loop until you get a desired day when the email is to be sent and
        // that day is not in the holiday list
        while (daysToSendEmailOn.indexOf(currentDayOfWeek) === -1 || isHoliday === true) {

            // temporaryDate = temporaryDate.add('1', 'days');
            temporaryDate = moment(temporaryDate).add('1', 'days');


            //Find the day again after incrementing
            currentDayOfWeek = temporaryDate.format(DAY_OF_WEEK_FORMAT);
            if (holidayList.length > 0) {
                isHoliday = holidayList.includes(temporaryDate.format(sfmcInstanceConfigs.defaultDateFormat));
            }
        }
        console.log("Temprory Date",moment(temporaryDate).format('MM/DD/YYYY'));
        return {
            temporaryDate: moment(temporaryDate).format(sfmcInstanceConfigs.defaultDateFormat),
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

let fetchHolidayListfromHolidayDE = function(result, fieldName){
    const todayDateUTC = moment.utc().format(sfmcInstanceConfigs.defaultDateFormat);

    if (cache.get(todayDateUTC)) {
        return cache.get(todayDateUTC);
    } else {
        let holidayList = [];
        fieldName = fieldName || 'HolidayDate';

        // if (result.body && result.body.Results) {
        //     result.body.Results.forEach(function (value) {
        //         value.Properties.Property.forEach(function (innerValue) {
        //             if (innerValue.Name.toLowerCase() === fieldName.toLowerCase()) {
        //                 let receivedDate = moment.utc(innerValue.Value, sfmcInstanceConfigs.defaultDateFormat);
        //                 holidayList.push(receivedDate.format(sfmcInstanceConfigs.defaultDateFormat));
        //             }
        //         })
        //     })
        // }
        if (result.body && result.body.Results) {
            result.body.Results.forEach(function (value) {
                
                if(value.Properties.hasOwnProperty('Property'))	{
                    if (value.Properties.Property.Name.toLowerCase() === fieldName.toLowerCase()) {
                        let receivedDate = moment.utc(value.Properties.Property.Value, sfmcInstanceConfigs.defaultDateFormat);
                        holidayList.push(receivedDate.format(sfmcInstanceConfigs.defaultDateFormat));
                        console.log("date- holi ",receivedDate.format(sfmcInstanceConfigs.defaultDateFormat));
                    }
            
                }
            })
            
        }
        //Cache the holiday response so that we do not have to make call out again and again.
        cache.set(todayDateUTC, holidayList);
        return holidayList;
    }
}

let _fetchSubscriberRowInBlackoutDataExtension = function (parameters) {
    // Check if a subscriber row exists and then fire an insert or update to insert data row.

    console.log(" DE",parameters.blackoutDE,"SubAttr",parameters.blackoutDESubscriberField,"blaAttr",parameters.blackoutDEHolidayField,"subskey",parameters.subscriberKey);

    return new Promise(function (resolve, reject) {
        let options = {
            Name: parameters.blackoutDE,
            props: [
                parameters.blackoutDESubscriberField
            ],
            filter: {
                leftOperand: parameters.blackoutDESubscriberField,
                operator: 'equals',
                rightOperand: parameters.subscriberKey
            }
        };

        let deRow = client.dataExtensionRow(options);
        // deRow.objName = `DataExtensionObject[${parameters.blackoutDE}]`;

        deRow.get(function (err, response) {
            if (err) {
                reject(err);
            } else {
                let isSubscriber = _parseSubscriberKeyQueryResponse(response);
                console.log("IsSubscriber - ",isSubscriber);
                resolve({
                    isSubscriber: isSubscriber,
                    lastHolidayDate: parameters.temporaryDate,
                    subscriberKey: parameters.subscriberKey,
                    blackoutDESubscriberField:parameters.blackoutDESubscriberField,
                    blackoutDEHolidayField: parameters.blackoutDEHolidayField,
                    blackoutDE: parameters.blackoutDE
                });
            }
        })

    })
};

let _createLastHolidayRow = function (parameters) {

    console.log("rrr DE",parameters.blackoutDE,"SubAttr",parameters.blackoutDESubscriberField,"blaAttr",parameters.blackoutDEHolidayField,"subskey",parameters.subscriberKey,"fhfsaye",parameters.lastHolidayDate);


    return new Promise(function (resolve, reject) {
        let options = {};
        // options.CustomerKey = parameters.blackoutDE;
        // options.Name = "SDKDataExtension";
        // options.props[parameters.blackoutDEHolidayField] = parameters.lastHolidayDate;
        // options.props["SubscriberKey"] = parameters.subscriberKey;

        let deProps ={};
						
        deProps[parameters.blackoutDEHolidayField]=parameters.lastHolidayDate;
        deProps[parameters.blackoutDESubscriberField]=parameters.subscriberKey;
        
        options.Name = parameters.blackoutDE;
        options.props=deProps;


        let deRow = client.dataExtensionRow(options);

        if (parameters.isSubscriber==false) {
            deRow.post(function (err, response) {
                if (err) {
                    console.log("Error Post",err)
                    return expressResponse.status(500).send(err)
                } else {
                    console.log("Response Post",response)
                    return expressResponse.status(SUCCESS_STATUS_CODE).json({branchResult: 'forward'});
                }
            });
        } else {
            deRow.patch(function (err, response) {
                if (err) {
                    console.log("Error Patch",err)
                    return expressResponse.status(500).send(err)
                } else {
                    console.log("Response Patch",response)
                    return expressResponse.status(SUCCESS_STATUS_CODE).json({branchResult: 'forward'});
                }
            });
        }

    })
};

let _parseSubscriberKeyQueryResponse = function (result) {
    return result.body
        && result.body.Results
        && result.body.Results.length > 0;
};



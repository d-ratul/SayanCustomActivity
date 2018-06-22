'use strict';

define(function (require) {
    let postMonger = require('postmonger');
    let connection = new postMonger.Session();
    let payload = {};
    let steps = [
        {'key': 'message_only', 'label': 'Holiday Check'}
    ];
    let currentStep = steps[0].key;
    let eventDefinitionKey = '';
    let deFields = [];

    $(window).ready(function () {
        connection.trigger('ready');
        connection.trigger('requestInteraction');
    });

    function initialize(data) {
        console.log('INIT-------------------------------------------------------');
        if (data) {
            console.log(data);
            payload = data;
        }
    }

    function onClickedNext() {
        console.log('NEXT-------------------------------------------------------');
        if (currentStep.key === 'message_only') {
            save();
        } else {
            connection.trigger('nextStep');
        }
    }

    function onClickedBack() {
        console.log('BACK-------------------------------------------------------');
        connection.trigger('prevStep');
    }

    function onGotoStep(step) {
        console.log('STEP-------------------------------------------------------');
        showStep(step);
        connection.trigger('ready');
    }

    function showStep(step, stepIndex) {
        console.log('SHOW STEP-------------------------------------------------------');
        if (stepIndex && !step) {
            step = steps[stepIndex - 1];
        }

        currentStep = step;

        $('.step').hide();

        switch (currentStep.key) {
            case 'message_only':
                $('#step1').show();
                break;
        }
    }

    function save() {
        console.log('SAVE-------------------------------------------------------');
        payload['arguments'] = payload['arguments'] || {};
        payload['arguments'].execute = payload['arguments'].execute || {};
        payload['metaData'] = payload['metaData'] || {};
        payload['metaData'].isConfigured = true;

        console.log(JSON.stringify(payload));

        connection.trigger('updateActivity', payload);
    }

    connection.on('initActivity', initialize);
    connection.on('clickedNext', onClickedNext);
    connection.on('clickedBack', onClickedBack);
    connection.on('gotoStep', onGotoStep);
});

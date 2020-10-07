# Holiday Check Activity

The holiday check activity is a custom activity built for enabling marketing cloud to send email on specific selected days excluding holidays.

## Setup

1. Prepare deployment (gather knowledge of the URL the application will be hosted, etc.) to a server you manage or any Node.js-ready cloud service like [heroku.com](https://www.heroku.com).
2. A package containing a Journey Builder Activity needs to be created in [Salesforce Marketing Cloud App Center](https://appcenter-auth.s1.marketingcloudapps.com). A documentation for this task can be found here: [Create a Marketing Cloud App](https://developer.salesforce.com/docs/atlas.en-us.noversion.mc-app-development.meta/mc-app-development/create-a-mc-app.htm).
3. To secure the backend and make sure only requests from your marketing cloud instance are processed, you need to create a salt key in marketing cloud.
    - Information can be found in the documentation on [Key Management](http://help.marketingcloud.com/en/documentation/marketing_cloud/administration/keymanagement/) and [Encode with Customer Key](https://developer.salesforce.com/docs/atlas.en-us.noversion.mc-app-development.meta/mc-app-development/encode-custom-activities-using-jwt-customer-key.htm).
4. The unique key of the created Journey Builder Activity needs to be added to public/config.json properties `key` and `configurationArguments.applicationExtensionKey`
5. _Optional_: Replace the icons for the custom activity in public/images.
6. Deploy the application to the service you selected in step 1.
Edited

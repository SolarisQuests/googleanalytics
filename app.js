const express = require('express');
const { google } = require('googleapis');
const { OAuth2 } = google.auth;

const app = express();
const port = process.env.PORT || 3000;

// Load OAuth2 credentials from environment variable
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
const { client_id, client_secret, redirect_uris } = credentials.web;

// Use the Render URL as the redirect URI
const redirectUri = redirect_uris[0]; // Ensure this matches the authorized redirect URI in Google Cloud Console
const oAuth2Client = new OAuth2(client_id, client_secret, redirectUri);

// Generate the URL for Google authentication
app.get('/auth', (req, res) => {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
            'https://www.googleapis.com/auth/analytics.readonly',
            'https://www.googleapis.com/auth/analytics.manage.users.readonly',
            'https://www.googleapis.com/auth/analytics.edit',
        ],
    });
    res.redirect(authUrl);
});

// OAuth2 callback endpoint
app.get('/oauth2callback', async (req, res) => {
    const code = req.query.code;
    try {
        console.log('Authorization code received:', code);
        const { tokens } = await oAuth2Client.getToken(code);
        console.log('Tokens received:', tokens);
        oAuth2Client.setCredentials(tokens);

        // Fetch the Analytics account details using the Admin API v1beta
        const analyticsAdmin = google.analyticsadmin({
            version: 'v1beta',
            auth: oAuth2Client,
        });

        const response = await analyticsAdmin.accountSummaries.list();
        console.log('Account summaries response:', response.data);

        const accounts = response.data.accountSummaries;
        if (!accounts || accounts.length === 0) {
            res.send('No Google Analytics accounts found.');
            return;
        }

        // Extract and log all properties
        let properties = [];
        accounts.forEach(account => {
            if (account.propertySummaries) {
                account.propertySummaries.forEach(property => {
                    properties.push(property);
                });
            }
        });

        console.log('Properties found:', properties);

        // Display all properties to the user
        let responseHtml = '<h1>Google Analytics Properties</h1><ul>';
        properties.forEach(property => {
            responseHtml += `<li>Property ID: ${property.property}, Display Name: ${property.displayName}</li>`;
        });
        responseHtml += '</ul>';
        res.send(responseHtml);

    } catch (error) {
        console.error('Error during authentication:', error);
        res.status(500).send('Authentication failed. Error: ' + error.message);
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

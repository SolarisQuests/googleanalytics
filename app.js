const express = require('express');
const { google } = require('googleapis');
const { OAuth2 } = google.auth;

const app = express();
const port = process.env.PORT || 3000;

// Load OAuth2 credentials from environment variable
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
const { client_id, client_secret, redirect_uris } = credentials.web;

// Use the Render URL as the redirect URI
const oAuth2Client = new OAuth2(client_id, client_secret, redirect_uris[0]);

// Generate the URL for Google authentication
app.get('/auth', (req, res) => {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/analytics.readonly'],
    });
    res.redirect(authUrl);
});

// OAuth2 callback endpoint
app.get('/oauth2callback', async (req, res) => {
    const code = req.query.code;
    try {
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);

        // Fetch the Analytics account details
        const analytics = google.analytics('v3');
        const response = await analytics.management.accountSummaries.list({
            auth: oAuth2Client,
        });

        const accounts = response.data.items;
        if (accounts.length === 0) {
            res.send('No Google Analytics accounts found.');
            return;
        }

        // Extract the first property's ID (you might want to handle multiple properties)
        const propertyId = accounts[0].webProperties[0].id;
        res.send(`Google Analytics connected successfully. Property ID: ${propertyId}`);
    } catch (error) {
        console.error('Error during authentication', error);
        res.status(500).send('Authentication failed.');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

// Load environment variables
require('dotenv').config();

// Import the app
const app = require('./app');

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

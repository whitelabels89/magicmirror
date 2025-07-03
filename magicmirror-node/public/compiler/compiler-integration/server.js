const express = require('express');
const path = require('path');
const app = express();

// Set port from environment or default to 3000
const PORT = process.env.PORT || 3000;

// Serve static files from the current directory
app.use(express.static('./'));

// Handle all routes by serving compiler.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'compiler.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
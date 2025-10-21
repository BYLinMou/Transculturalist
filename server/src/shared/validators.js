// Helper function to validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper function to validate password (minimum 6 characters)
function isValidPassword(password) {
  return password && password.length >= 6;
}

// Helper function to validate username
function isValidUsername(username) {
  return username && username.trim().length > 0 && username.trim().length <= 50;
}

// Helper function to validate difficulty level
function isValidDifficulty(difficulty) {
  return ['easy', 'medium', 'hard'].includes(difficulty);
}

module.exports = {
  isValidEmail,
  isValidPassword,
  isValidUsername,
  isValidDifficulty
};

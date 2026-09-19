const { checkAndCreateExpiryReminders } = require('../controllers/pantryController');

// Periodic scheduler to scan pantry expiry every 4 hours
const initExpiryScheduler = () => {
  console.log('⏰ Expiry Reminder Scheduler initialized');
  
  // Run an initial check 10 seconds after server startup
  setTimeout(async () => {
    try {
      await checkAndCreateExpiryReminders(
        { query: {} },
        { status: () => ({ json: () => {} }) },
        (err) => { if (err) console.error('Expiry scan error:', err); }
      );
    } catch (e) {
      console.error('Error running initial expiry scan:', e?.message);
    }
  }, 10000);

  // Run periodic check every 4 hours (4 * 60 * 60 * 1000 ms)
  setInterval(async () => {
    try {
      await checkAndCreateExpiryReminders(
        { query: {} },
        { status: () => ({ json: () => {} }) },
        (err) => { if (err) console.error('Expiry scan error:', err); }
      );
    } catch (e) {
      console.error('Error running scheduled expiry scan:', e?.message);
    }
  }, 4 * 60 * 60 * 1000);
};

module.exports = { initExpiryScheduler };

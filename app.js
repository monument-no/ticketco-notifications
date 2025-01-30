require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────────────────────────
// 1. MongoDB Setup (optional) - define a simple schema/model to store your data
// ─────────────────────────────────────────────────────────────────────────────
async function connectToMongoDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected.');
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
}

// Example Mongoose Schema/Model if you want to store logs or daily stats
const ticketSaleSchema = new mongoose.Schema({
  createdAt: { type: Date, default: Date.now },
  herbalWalkCount: Number,
  parkingCount: Number,
  saunaCount: Number,
  transportationBusCount: Number,
  merchCount: Number,
  glampingCount: Number,
  festivalThursdayCount: Number,
  festivalOtherCount: Number,
});

const TicketSaleLog = mongoose.model('TicketSaleLog', ticketSaleSchema);

// ─────────────────────────────────────────────────────────────────────────────
// 2. Fetch data from TicketCo
// ─────────────────────────────────────────────────────────────────────────────
async function fetchTicketCoData() {
  const token = process.env.TICKETCO_API_KEY;
  const endpoint = 'https://ticketco.events/api/public/v1/item_grosses';

  // This is your event ID for "Monument Festival 2025"
  const eventId = '668574';

  // We'll accumulate results for each capacity (ALL-TIME)
  let herbalWalkCount = 0;
  let parkingCount = 0;
  let saunaCount = 0;
  let transportationBusCount = 0;
  let merchCount = 0;
  let glampingCount = 0;
  let festivalThursdayCount = 0;
  let festivalOtherCount = 0;

  // We'll also track the same counts, but only for the LAST 24 HOURS
  let dailyHerbalWalkCount = 0;
  let dailyParkingCount = 0;
  let dailySaunaCount = 0;
  let dailyTransportationBusCount = 0;
  let dailyMerchCount = 0;
  let dailyGlampingCount = 0;
  let dailyFestivalThursdayCount = 0;
  let dailyFestivalOtherCount = 0;

  // Determine the cutoff time for "last 24 hours"
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  let page = 1;

  while (true) {
    const url = new URL(endpoint);
    url.searchParams.set('token', token);
    url.searchParams.set('event_id', eventId);
    url.searchParams.set('page', page.toString());
    // optional
    url.searchParams.set('pii', 'false');

    const { data } = await axios.get(url.toString());
    const itemGrosses = data.item_grosses || [];

    // If no items on this page, we are done
    if (!itemGrosses.length) {
      break;
    }

    itemGrosses.forEach((item) => {
      const capacityName = item.capacity_name || '';
      const itemTypeTitle = item.item_type_title || '';
      const transactionDate = new Date(item.transaction_datestamp);

      // ALL TIME counters
      if (capacityName === 'Herbal walk and wild forest tea workshop') {
        herbalWalkCount++;
      } else if (capacityName === 'Parking') {
        parkingCount++;
      } else if (capacityName === 'Sauna') {
        saunaCount++;
      } else if (capacityName === 'Transportation: Bus') {
        transportationBusCount++;
      } else if (capacityName === 'Merch') {
        merchCount++;
      } else if (capacityName === 'Glamping & Sleeping options') {
        glampingCount++;
      } else if (capacityName === 'Festival Tickets') {
        // We look at the item type title to check for Thursday or exclude it
        if (itemTypeTitle.includes('Thursday')) {
          festivalThursdayCount++;
        } else {
          festivalOtherCount++;
        }
      }

      // LAST 24 HOURS counters
      if (transactionDate >= oneDayAgo) {
        if (capacityName === 'Herbal walk and wild forest tea workshop') {
          dailyHerbalWalkCount++;
        } else if (capacityName === 'Parking') {
          dailyParkingCount++;
        } else if (capacityName === 'Sauna') {
          dailySaunaCount++;
        } else if (capacityName === 'Transportation: Bus') {
          dailyTransportationBusCount++;
        } else if (capacityName === 'Merch') {
          dailyMerchCount++;
        } else if (capacityName === 'Glamping & Sleeping options') {
          dailyGlampingCount++;
        } else if (capacityName === 'Festival Tickets') {
          if (itemTypeTitle.includes('Thursday')) {
            dailyFestivalThursdayCount++;
          } else {
            dailyFestivalOtherCount++;
          }
        }
      }
    });

    page += 1;
    if (page > 500) {
      // safeguard to prevent infinite loops
      break;
    }
  }

  return {
    // All-time
    herbalWalkCount,
    parkingCount,
    saunaCount,
    transportationBusCount,
    merchCount,
    glampingCount,
    festivalThursdayCount,
    festivalOtherCount,
    // Last 24 hours
    dailyHerbalWalkCount,
    dailyParkingCount,
    dailySaunaCount,
    dailyTransportationBusCount,
    dailyMerchCount,
    dailyGlampingCount,
    dailyFestivalThursdayCount,
    dailyFestivalOtherCount,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Send a message to Slack (using Slack Blocks)
// ─────────────────────────────────────────────────────────────────────────────
async function sendReportToSlack(reportData) {
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  const {
    // All-time
    herbalWalkCount,
    parkingCount,
    saunaCount,
    transportationBusCount,
    merchCount,
    glampingCount,
    festivalThursdayCount,
    festivalOtherCount,
    // Last 24 hours
    dailyHerbalWalkCount,
    dailyParkingCount,
    dailySaunaCount,
    dailyTransportationBusCount,
    dailyMerchCount,
    dailyGlampingCount,
    dailyFestivalThursdayCount,
    dailyFestivalOtherCount,
  } = reportData;

  // Construct your Slack Blocks
  const blocksPayload = {
    blocks: [
      // Header or Title
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'Monument Festival 2025 - Ticket Summary',
          emoji: true,
        },
      },
      // Section for All-Time Totals
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            `*All-Time Totals*\n` +
            `• *Herbal walk & wild forest tea workshop:* ${herbalWalkCount}\n` +
            `• *Parking:* ${parkingCount}\n` +
            `• *Sauna:* ${saunaCount}\n` +
            `• *Transportation (Bus):* ${transportationBusCount}\n` +
            `• *Merch:* ${merchCount}\n` +
            `• *Glamping & Sleeping:* ${glampingCount}\n` +
            `• *Festival Tickets (Thursday):* ${festivalThursdayCount}\n` +
            `• *Festival Tickets (Fri-Sun, etc.):* ${festivalOtherCount}\n`,
        },
      },
      // Divider
      {
        type: 'divider',
      },
      // Section for Last 24 Hours
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            `*Last 24 Hours*\n` +
            `• *Herbal walk & wild forest tea workshop:* ${dailyHerbalWalkCount}\n` +
            `• *Parking:* ${dailyParkingCount}\n` +
            `• *Sauna:* ${dailySaunaCount}\n` +
            `• *Transportation (Bus):* ${dailyTransportationBusCount}\n` +
            `• *Merch:* ${dailyMerchCount}\n` +
            `• *Glamping & Sleeping:* ${dailyGlampingCount}\n` +
            `• *Festival Tickets (Thursday):* ${dailyFestivalThursdayCount}\n` +
            `• *Festival Tickets (Fri-Sun, etc.):* ${dailyFestivalOtherCount}\n`,
        },
      },
    ],
  };

  try {
    await axios.post(slackWebhookUrl, blocksPayload);
    console.log('Report successfully sent to Slack with blocks.');
  } catch (error) {
    console.error('Error sending report to Slack:', error.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Main function to orchestrate everything
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  // (Optional) Connect to MongoDB if you want to store your results
  await connectToMongoDB();

  // 1. Fetch from TicketCo
  const reportData = await fetchTicketCoData();

  // 2. (Optional) Save the all-time totals to MongoDB
  const logEntry = new TicketSaleLog({
    herbalWalkCount: reportData.herbalWalkCount,
    parkingCount: reportData.parkingCount,
    saunaCount: reportData.saunaCount,
    transportationBusCount: reportData.transportationBusCount,
    merchCount: reportData.merchCount,
    glampingCount: reportData.glampingCount,
    festivalThursdayCount: reportData.festivalThursdayCount,
    festivalOtherCount: reportData.festivalOtherCount,
  });
  await logEntry.save();
  console.log('All-time data saved to MongoDB.');

  // 3. Send Slack report (with 2 sections: total & last 24 hours)
  await sendReportToSlack(reportData);

  // 4. Close MongoDB connection if your script is exiting
  mongoose.connection.close();
}

// Run main if this file is called directly
if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

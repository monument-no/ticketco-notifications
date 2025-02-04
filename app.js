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
  festivalFridayToSunday: Number,
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
  let festivalFridayToSunday = 0;

  // We'll also track the same counts, but only for the LAST 24 HOURS
  let dailyHerbalWalkCount = 0;
  let dailyParkingCount = 0;
  let dailySaunaCount = 0;
  let dailyTransportationBusCount = 0;
  let dailyMerchCount = 0;
  let dailyGlampingCount = 0;
  let dailyFestivalThursdayCount = 0;
  let dailyFestivalFridayToSunday = 0;

  // Determine the cutoff time for "last 24 hours"
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  let page = 1;

  const thursdayItemTypeIds = [19545460, 19545506];
  const fridayToSundayItemTypeIds = [
    20610868, // Regular Festival Ticket (Friday-Sunday)
    19545505, // Regular Festival Ticket (Friday-Sunday) - Community price
    // 19545429, // Supporter Festival Ticket (Friday-Sunday)
    // 19545401, // Weekend Friendly Ticket (Fri-Sun)
  ];

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
      const itemTypeId = item.item_type_id;
      const transactionDate = new Date(item.transaction_datestamp);

      // ALL TIME counters
      if (capacityName === 'Herbal walk and wild forest tea workshop') {
        herbalWalkCount++;
        if (transactionDate >= oneDayAgo) {
          dailyHerbalWalkCount++;
        }
      } else if (capacityName === 'Parking') {
        parkingCount++;
        if (transactionDate >= oneDayAgo) {
          dailyParkingCount++;
        }
      } else if (capacityName === 'Sauna') {
        saunaCount++;
        if (transactionDate >= oneDayAgo) {
          dailySaunaCount++;
        }
      } else if (capacityName === 'Transportation: Bus') {
        transportationBusCount++;
        if (transactionDate >= oneDayAgo) {
          dailyTransportationBusCount++;
        }
      } else if (capacityName === 'Merch') {
        merchCount++;
        if (transactionDate >= oneDayAgo) {
          dailyMerchCount++;
        }
      } else if (capacityName === 'Glamping & Sleeping options') {
        glampingCount++;
        if (transactionDate >= oneDayAgo) {
          dailyGlampingCount++;
        }
      } else if (capacityName === 'Festival Tickets') {
        if (thursdayItemTypeIds.includes(itemTypeId)) {
          festivalThursdayCount++;
          if (transactionDate >= oneDayAgo) {
            dailyFestivalThursdayCount++;
          }
        } else if (fridayToSundayItemTypeIds.includes(itemTypeId)) {
          festivalFridayToSunday++;
          if (transactionDate >= oneDayAgo) {
            dailyFestivalFridayToSunday++;
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
    festivalFridayToSunday,
    // Last 24 hours
    dailyHerbalWalkCount,
    dailyParkingCount,
    dailySaunaCount,
    dailyTransportationBusCount,
    dailyMerchCount,
    dailyGlampingCount,
    dailyFestivalThursdayCount,
    dailyFestivalFridayToSunday,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Send a message to Slack (using Slack Blocks)
// ─────────────────────────────────────────────────────────────────────────────
async function sendReportToSlack(reportData) {
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  const slackWebhookUrlFamilyChat = process.env.SLACK_WEBHOOK_URL_FAMILY_CHAT;
  const isWednesday = new Date().getDay() === 3;

  // Extract values and sort based on total count
  const sortedItems = [
    {
      name: 'Herbal walk & wild forest tea workshop',
      total: reportData.herbalWalkCount,
      daily: reportData.dailyHerbalWalkCount,
    },
    {
      name: 'Parking',
      total: reportData.parkingCount,
      daily: reportData.dailyParkingCount,
    },
    {
      name: 'Sauna',
      total: reportData.saunaCount,
      daily: reportData.dailySaunaCount,
    },
    {
      name: 'Transportation (Bus)',
      total: reportData.transportationBusCount,
      daily: reportData.dailyTransportationBusCount,
    },
    {
      name: 'Merch',
      total: reportData.merchCount,
      daily: reportData.dailyMerchCount,
    },
    {
      name: 'Glamping & Sleeping',
      total: reportData.glampingCount,
      daily: reportData.dailyGlampingCount,
    },
    {
      name: 'Festival Tickets (Thursday)',
      total: reportData.festivalThursdayCount,
      daily: reportData.dailyFestivalThursdayCount,
      capacityName: 700,
    },
    {
      name: 'Festival Tickets (Fri-Sun, etc.)',
      total: reportData.festivalFridayToSunday,
      daily: reportData.dailyFestivalFridayToSunday,
      capacityName: 2500,
    },
  ].sort((a, b) => a.total - b.total); // Sort by total count, lowest to highest

  const addCapacity = (item) => {
    if (item.name === 'Festival Tickets (Thursday)') {
      return ` / 700`;
    }
    if (item.name === 'Festival Tickets (Fri-Sun, etc.)') {
      return ` / 2500`;
    }

    return '';
  };

  const allTimeText = sortedItems
    .map((item) => `• *${item.name}:* ${item.total}${addCapacity(item)}`)
    .join('\n');
  const dailyText = sortedItems
    .map((item) => `• *${item.name}:* ${item.daily}`)
    .join('\n');

  const blocksHeader = {
    type: 'header',
    text: {
      type: 'plain_text',
      text: 'Monument Festival 2025 - Ticket Summary',
      emoji: true,
    },
  };

  const blocksPayload = {
    blocks: [
      blocksHeader,
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*All-Time Totals*\n${allTimeText}` },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Last 24 Hours*\n${dailyText}` },
      },
    ],
  };

  const blocksPayloadFamilyChat = {
    blocks: [
      blocksHeader,
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            `*All-Time Totals*\n• *Festival Tickets (Thursday):* ${reportData.festivalThursdayCount} / 700 \n• *Festival Tickets (Fri-Sun, etc.):* ${reportData.festivalFridayToSunday} / 2500 \n` +
            (isWednesday
              ? 'Want to see more details? Check out the full report in the #ticketsale-notifications channel.'
              : ''),
        },
      },
    ],
  };

  try {
    await axios.post(slackWebhookUrl, blocksPayload);
    await axios.post(slackWebhookUrlFamilyChat, blocksPayloadFamilyChat);
    console.log('Report successfully sent to Slack with sorted blocks.');
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
    festivalFridayToSunday: reportData.festivalFridayToSunday,
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

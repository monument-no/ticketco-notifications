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
  wineTasting: Number,
  activityIntention: Number,
  forestDinner: Number,
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
  let wineTasting = 0;
  let activityIntention = 0;
  let forestDinner = 0;
  let saunaCount = 0;
  let transportationBusCount = 0;
  let merchCount = 0;
  let glampingCount = 0;
  //let festivalSupporterCount = 0;
  let festivalThursdayCount = 0;
  let festivalFridayToSunday = 0;

  // We'll also track the same counts, but only for the LAST 24 HOURS
  let dailyHerbalWalkCount = 0;
  let dailyParkingCount = 0;
  let dailyWineTasting = 0;
  let dailyActivityIntention = 0;
  let dailyForestDinner = 0;
  let dailySaunaCount = 0;
  let dailyTransportationBusCount = 0;
  let dailyMerchCount = 0;
  let dailyGlampingCount = 0;
  //let dailyFestivalSupporterCount = 0;
  let dailyFestivalThursdayCount = 0;
  let dailyFestivalFridayToSunday = 0;

  // Determine the cutoff time for "last 24 hours"
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  let page = 1;

  const supporterItemTypeId = [
    19545429, // Supporter Festival Ticket (Friday-Sunday)
  ];
  const thursdayItemTypeIds = [19545460, 19545506];
  const fridayToSundayItemTypeIds = [
    20610868, // Regular Festival Ticket (Friday-Sunday)
    19545505, // Regular Festival Ticket (Friday-Sunday) - Community price
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
      } else if (capacityName === 'Natural wine tasting') {
        wineTasting++;
        if (transactionDate >= oneDayAgo) {
          dailyWineTasting++;
        }
      } else if (
        capacityName === 'Activity: Start Your Day With Intention (Free)'
      ) {
        activityIntention++;
        if (transactionDate >= oneDayAgo) {
          dailyActivityIntention++;
        }
      } else if (capacityName === 'To Sense: 8-Course Forest Dinner') {
        forestDinner++;
        if (transactionDate >= oneDayAgo) {
          dailyForestDinner++;
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
        /* if (supporterItemTypeId.includes(itemTypeId)) {
          festivalSupporterCount++;
          if (transactionDate >= oneDayAgo) {
            //dailyFestivalSupporterCount++;
          }
        } */
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
    wineTasting,
    activityIntention,
    forestDinner,
    saunaCount,
    transportationBusCount,
    merchCount,
    glampingCount,
    //festivalSupporterCount,
    festivalThursdayCount,
    festivalFridayToSunday,
    // Last 24 hours
    dailyHerbalWalkCount,
    dailyParkingCount,
    dailyWineTasting,
    dailyActivityIntention,
    dailyForestDinner,
    dailySaunaCount,
    dailyTransportationBusCount,
    dailyMerchCount,
    dailyGlampingCount,
    //dailyFestivalSupporterCount,
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
  const isFriday = new Date().getDay() === 5;

  // Extract values and sort based on total count
  // Filter out items with total 0 before sorting and reporting
  const sortedItems = [
    {
      name: 'Herbal walk & wild forest tea workshop',
      total: reportData.herbalWalkCount,
      daily: reportData.dailyHerbalWalkCount,
      capacity: Math.max(61, reportData.herbalWalkCount),
    },
    {
      name: 'Parking',
      total: reportData.parkingCount,
      daily: reportData.dailyParkingCount,
      capacity: Math.max(500, reportData.parkingCount),
    },
    {
      name: 'Natural wine tasting',
      total: reportData.wineTasting,
      daily: reportData.dailyWineTasting,
      capacity: Math.max(60, reportData.wineTasting),
    },
    {
      name: 'Activity: Start Your Day With Intention (Free)',
      total: reportData.activityIntention,
      daily: reportData.dailyActivityIntention,
      capacity: Math.max(24, reportData.activityIntention),
    },
    {
      name: 'To Sense: 8-Course Forest Dinner',
      total: reportData.forestDinner,
      daily: reportData.dailyForestDinner,
      capacity: Math.max(80, reportData.forestDinner),
    },
    {
      name: 'Sauna',
      total: reportData.saunaCount,
      daily: reportData.dailySaunaCount,
      capacity: Math.max(450, reportData.saunaCount),
    },
    {
      name: 'Transportation (Bus)',
      total: reportData.transportationBusCount,
      daily: reportData.dailyTransportationBusCount,
      capacity: Math.max(2000, reportData.transportationBusCount),
    },
    {
      name: 'Merch',
      total: reportData.merchCount,
      daily: reportData.dailyMerchCount,
      capacity: Math.max(1000, reportData.merchCount),
    },
    {
      name: 'Glamping & Sleeping',
      total: reportData.glampingCount,
      daily: reportData.dailyGlampingCount,
      capacity: Math.max(80, reportData.glampingCount),
    },
    {
      name: 'Festival Tickets (Thursday)',
      total: reportData.festivalThursdayCount,
      daily: reportData.dailyFestivalThursdayCount,
      capacity: Math.max(700, reportData.festivalThursdayCount),
    },
    {
      name: 'Festival Tickets (Fri-Sun, etc.)',
      total: reportData.festivalFridayToSunday,
      daily: reportData.dailyFestivalFridayToSunday,
      capacity: Math.max(1500, reportData.festivalFridayToSunday),
    },
  ].sort((a, b) => a.total - b.total); // Sort by total count, lowest to highest

  // Add strikeout and checkmark if sold out
  const formatTotal = (item) => {
    if (item.capacity && item.total >= item.capacity) {
      return `:white_check_mark: ${item.total}`;
    }
    return `${item.total}`;
  };

  const allTimeText = sortedItems
    .map((item) => `• *${item.name}:*  ${formatTotal(item)} / ${item.capacity}`)
    .join('\n');

  const dailyText = sortedItems
    .filter((item) => item.daily > 0) // Only include items with daily count > 0
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
            `:love_letter: *This week's report*:\n` +
            sortedItems.find(
              (item) => item.name === 'Festival Tickets (Thursday)'
            ).total +
            ' tickets sold for Thursday\n' +
            sortedItems.find(
              (item) => item.name === 'Festival Tickets (Fri-Sun, etc.)'
            ).total +
            ' tickets sold for Friday to Sunday\n\n' +
            '\nWant to see more details? Check out the full report in the #ticketsale-notifications channel.',
        },
      },
    ],
  };

  try {
    await axios.post(slackWebhookUrl, blocksPayload);
    // Temp removed for now
    /* if (isFriday) {
      await axios.post(slackWebhookUrlFamilyChat, blocksPayloadFamilyChat);
    } */
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

  console.log('TicketCo data fetched:', reportData);

  // 2. (Optional) Save the all-time totals to MongoDB
  const logEntry = new TicketSaleLog({
    herbalWalkCount: reportData.herbalWalkCount,
    parkingCount: reportData.parkingCount,
    wineTasting: reportData.wineTasting,
    activityIntention: reportData.activityIntention,
    forestDinner: reportData.forestDinner,
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

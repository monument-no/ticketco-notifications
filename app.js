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
  parkingCount: Number,
  parkingCount2: Number,
  glampingCount: Number,
  transportationBusCount: Number,
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

  // This is your event ID for "Monument Festival 2026"
  const eventId = '904783';

  // We'll accumulate results for each capacity (ALL-TIME)
  let parkingCount = 0;
  let parkingCount2 = 0;
  let glampingCount = 0;
  let transportationBusCount = 0;
  let festivalSupporterCount = 0;
  let festivalThursdayCount = 0;
  let festivalFridayToSunday = 0;

  let womenAndNonBinaryCount = 0;
  let dailyWomenAndNonBinaryCount = 0;

  // We'll also track the same counts, but only for the LAST 24 HOURS
  let dailyParkingCount = 0;
  let dailyParkingCount2 = 0;
  let dailyGlampingCount = 0;
  let dailyTransportationBusCount = 0;
  let dailyFestivalSupporterCount = 0;
  let dailyFestivalThursdayCount = 0;
  let dailyFestivalFridayToSunday = 0;

  // Determine the cutoff time for "last 24 hours"
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  let page = 1;

  const supporterItemTypeId = [
    23338731, // Supporter Festival Ticket (Friday-Sunday)
  ];
  const thursdayItemTypeIds = [23338732];
  const fridayToSundayItemTypeIds = [
    23338609, // Regular Festival Ticket (Friday-Sunday)
    23338733, // Regular Festival Ticket (Friday-Sunday) - Community price
    
    // 23338580, // Weekend Friendly Ticket (Fri-Sun)

  ];

  const womenAndNonBinaryItemTypeIds = [
    23875945 // Women and non-binary
  ]

  const carParkingItemTypeIds = [23338718, 23338710];
  const busTransportationItemTypeIds = [
    23338619, 23338577, 23338583, 23338711, 23338734, 23338726, 23338714,
    23338615, 23338612, 23338614, 23338628, 23338593, 23338603, 23338632,
    23338717, 23338722, 23338723, 23338728, 23338629, 23338616, 23338617,
    23338620, 23338621, 23338596, 23338597, 23338598, 23338599, 23338601,
    23338602, 23338633, 23338719, 23338724, 23338727, 23338729, 23338730,
  ];

  const glampingItemTypeIds = [
    23338604,23338703,23338713,23338712,23338702
  ]
  
  
  

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
      if (carParkingItemTypeIds.includes(itemTypeId)) {
        parkingCount++;
        if (transactionDate >= oneDayAgo) {
          dailyParkingCount++;
        }
      } else if (glampingItemTypeIds.includes(itemTypeId)) {
        glampingCount++;
        if (transactionDate >= oneDayAgo) {
          dailyGlampingCount++;
        }
      } else if (busTransportationItemTypeIds.includes(itemTypeId)) {
        transportationBusCount++;
        if (transactionDate >= oneDayAgo) {
          dailyTransportationBusCount++;
        }
      } else if (thursdayItemTypeIds.includes(itemTypeId)) {
        festivalThursdayCount++;
        if (transactionDate >= oneDayAgo) {
          dailyFestivalThursdayCount++;
        }
      } else if (
        fridayToSundayItemTypeIds.includes(itemTypeId) 
      ) {
        festivalFridayToSunday++;
        if (transactionDate >= oneDayAgo) {
          dailyFestivalFridayToSunday++;
        }
      } else if (supporterItemTypeId.includes(itemTypeId)) {
        festivalSupporterCount++;
        if (transactionDate >= oneDayAgo) {
          dailyFestivalSupporterCount++;
        }
      
      } else if (womenAndNonBinaryItemTypeIds.includes(itemTypeId)) {
        womenAndNonBinaryCount++;
        if (transactionDate >= oneDayAgo) {
          dailyWomenAndNonBinaryCount++;
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
    parkingCount,
    glampingCount,
    transportationBusCount,
    womenAndNonBinaryCount,
    festivalSupporterCount,
    festivalThursdayCount,
    festivalFridayToSunday,
    // Last 24 hours
    dailyParkingCount,
    dailyGlampingCount,
    dailyTransportationBusCount,
    dailyWomenAndNonBinaryCount,
    dailyFestivalSupporterCount,
    dailyFestivalThursdayCount,
    dailyFestivalFridayToSunday,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Send a message to Slack (using Slack Blocks)
// ─────────────────────────────────────────────────────────────────────────────
async function sendReportToSlack(reportData) {
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  

  // Extract values and sort based on total count
  // Filter out items with total 0 before sorting and reporting
  const sortedItems = [
    {
      name: 'Car Parking',
      total: reportData.parkingCount,
      daily: reportData.dailyParkingCount,
      capacity: Math.max(360, reportData.parkingCount),
    },
    {
      name: 'Glamping',
      total: reportData.glampingCount,
      daily: reportData.dailyGlampingCount,
      capacity: Math.max(78, reportData.glampingCount),
    },
    {
      name: 'Transportation (Bus)',
      total: reportData.transportationBusCount,
      daily: reportData.dailyTransportationBusCount,
      capacity: Math.max(2000, reportData.transportationBusCount),
    },
    {
      name: 'Festival Tickets Women and Non-Binary (Fri-Sun.)',
      total: reportData.womenAndNonBinaryCount,
      daily: reportData.dailyWomenAndNonBinaryCount,
      capacity: Math.max(309, reportData.womenAndNonBinaryCount),
    },
    {
      name: 'Festival Tickets Supporter (Fri-Sun.)',
      total: reportData.festivalSupporterCount,
      daily: reportData.dailyFestivalSupporterCount,
      capacity: Math.max(370, reportData.festivalSupporterCount),
    },
    {
      name: 'Festival Tickets (Thu.)',
      total: reportData.festivalThursdayCount,
      daily: reportData.dailyFestivalThursdayCount,
      capacity: Math.max(750, reportData.festivalThursdayCount),
    },
    {
      name: 'Festival Tickets (Fri-Sun.)',
      total: reportData.festivalFridayToSunday,
      daily: reportData.dailyFestivalFridayToSunday,
      capacity: Math.max(1300, reportData.festivalFridayToSunday),
    },
  ].sort((a, b) => a.total - b.total); // Sort by total count, lowest to highest
  sortedItems.forEach((item) => {
    if (!item.total) {
      console.log(item);
    }
  });

  const availableItems = sortedItems.filter(
    (item) => item.total < item.capacity
  );
  const soldOutItems = sortedItems.filter(
    (item) => item.total >= item.capacity
  );

  const availableText = availableItems
    .map((item) => `• *${item.name}:*  ${item.total} / ${item.capacity}`)
    .join('\n');

  const soldOutText = soldOutItems
    .map((item) => `• *${item.name}:*  ${item.total} / ${item.capacity}`)
    .join('\n');

  const dailyText = sortedItems
    .filter((item) => item.daily > 0) // Only include items with daily count > 0
    .map((item) => `• *${item.name}:* ${item.daily}`)
    .join('\n');

  const blocksHeader = {
    type: 'header',
    text: {
      type: 'plain_text',
      text: 'Monument Festival 2026 - Ticket Summary',
      emoji: true,
    },
  };

  const soldOutBlocks =
    soldOutItems.length > 0
      ? [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*All-Time Totals (Sold Out)* :white_check_mark: \n${soldOutText}`,
            },
          },
        ]
      : [];

  const blocksPayload = {
    blocks: [
      blocksHeader,
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Last 24 Hours*\n${dailyText}` },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*All-Time Totals (Still Available)*\n${availableText}`,
        },
      },
      { type: 'divider' },
      ...soldOutBlocks,
    ],
  };

  try {
    await axios.post(slackWebhookUrl, blocksPayload);
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
    parkingCount: reportData.parkingCount,
    glampingCount: reportData.glampingCount,
    transportationBusCount: reportData.transportationBusCount,
    womenAndNonBinaryCount: reportData.womenAndNonBinaryCount,
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

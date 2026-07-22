require("dotenv").config();
const axios = require("axios");

// ─────────────────────────────────────────────────────────────────────────────
// 1. Fetch data from TicketCo
// ─────────────────────────────────────────────────────────────────────────────
async function fetchTicketCoData() {
	const token = process.env.TICKETCO_API_KEY;
	const endpoint = "https://ticketco.events/api/public/v1/item_grosses";

	// This is your event ID for "Monument Festival 2026"
	const eventId = "904783";

	// We'll accumulate results for each capacity (ALL-TIME)
	let parkingCount = 0;
	let glampingCount = 0;
	let transportationBusCount = 0;
	let festivalSupporterCount = 0;
	let festivalThursdayCount = 0;
	let festivalFridayToSunday = 0;
	let dinnerCount = 0;
	let natureWalkCount = 0;
	let saunaCount = 0;
	let womenAndNonBinaryCount = 0;
	let dailyWomenAndNonBinaryCount = 0;
	let merchCount = 0;

	// We'll also track the same counts, but only for the LAST 24 HOURS
	let dailyDinnerCount = 0;
	const dailyNatureWalkCount = 0;
	let dailySaunaCount = 0;
	let dailyParkingCount = 0;
	let dailyGlampingCount = 0;
	let dailyTransportationBusCount = 0;
	let dailyFestivalSupporterCount = 0;
	let dailyFestivalThursdayCount = 0;
	let dailyFestivalFridayToSunday = 0;
	let dailyMerchCount = 0;

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
		23875945, // Women and non-binary
	];

	const carParkingItemTypeIds = [23338718, 23338710];
	const busTransportationItemTypeIds = [
		24336045, 24336112, 24336110, 24336111, 24336074, 23338619, 23338728,
		24336113, 23338723, 24336107, 24336108, 23338597, 23338722, 23338621,
		23338734, 23338633, 23338724, 23338596, 23338727, 23338601, 23338717,
		23338598, 23338719, 23338599, 23338714, 23338730, 23338617, 24336109,
	];

	const glampingItemTypeIds = [
		23338701, 23338704, 23338709, 23338703, 23338611, 23338712, 23338604,
		25235028, 23338713, 23338702, 38713, 23338712, 23338702,
	];

	const dinnerItemTypeIds = [23338720, 23338725, 23338721, 23338587, 23338586];

	const natureWalkItemTypeIds = [23338579, 23338582, 23338634];

	const saunaItemTypeIds = [
		23338685, 23338671, 23338684, 23338689, 23338640, 23338654, 23338681,
		23338624, 23338589, 23338672, 23338673, 23338648, 23338656, 23338682,
		23338694, 23338651, 23338698, 23338645, 23338669, 23338687, 23338690,
		23338658, 23338657, 23338638, 23338642, 23338647, 23338646, 23338630,
		23338695, 23338686, 23338680, 23338665, 23338639, 23338675, 23338635,
		23338653, 23338699, 23338683, 23338668, 23338678, 23338625, 23338649,
		23338688, 23338666, 23338677, 23338655, 23338637, 23338679, 23338676,
		23338667, 23338697, 23338670, 23338664, 23338700, 23338650, 23338663,
		23338636, 23338643, 23338696,
	];

	const merchItemTypeIds = [23338585, 23338737, 23338578, 23338738];

	while (true) {
		const url = new URL(endpoint);
		url.searchParams.set("token", token);
		url.searchParams.set("event_id", eventId);
		url.searchParams.set("page", page.toString());
		// optional
		url.searchParams.set("pii", "false");

		const { data } = await axios.get(url.toString());
		const itemGrosses = data.item_grosses || [];

		// If no items on this page, we are done
		if (!itemGrosses.length) {
			break;
		}

		itemGrosses.forEach((item) => {
			const capacityName = item.capacity_name || "";
			const itemTypeTitle = item.item_type_title || "";
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
			} else if (fridayToSundayItemTypeIds.includes(itemTypeId)) {
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
			} else if (dinnerItemTypeIds.includes(itemTypeId)) {
				dinnerCount++;
				if (transactionDate >= oneDayAgo) {
					dailyDinnerCount++;
				}
			} else if (natureWalkItemTypeIds.includes(itemTypeId)) {
				natureWalkCount++;
			} else if (saunaItemTypeIds.includes(itemTypeId)) {
				saunaCount++;
				if (transactionDate >= oneDayAgo) {
					dailySaunaCount++;
				}
			} else if (merchItemTypeIds.includes(itemTypeId)) {
				merchCount++;
				if (transactionDate >= oneDayAgo) {
					dailyMerchCount++;
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
		dinnerCount,
		natureWalkCount,
		saunaCount,
		merchCount,
		// Last 24 hours
		dailyParkingCount,
		dailyGlampingCount,
		dailyTransportationBusCount,
		dailyWomenAndNonBinaryCount,
		dailyFestivalSupporterCount,
		dailyFestivalThursdayCount,
		dailyFestivalFridayToSunday,
		dailyDinnerCount,
		dailyNatureWalkCount,
		dailySaunaCount,
		dailyMerchCount,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Send a message to Slack (using Slack Blocks)
// ─────────────────────────────────────────────────────────────────────────────
async function sendReportToSlack(reportData) {
	const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

	// Extract values and sort based on total count
	// Filter out items with total 0 before sorting and reporting
	const sortedItems = [
		{
			name: "Car Parking",
			total: reportData.parkingCount,
			daily: reportData.dailyParkingCount,
			capacity: Math.max(331, reportData.parkingCount),
		},
		{
			name: "Glamping",
			total: reportData.glampingCount,
			daily: reportData.dailyGlampingCount,
			capacity: Math.max(111, reportData.glampingCount),
		},
		{
			name: "Transportation (Bus)",
			total: reportData.transportationBusCount,
			daily: reportData.dailyTransportationBusCount,
			capacity: Math.max(1562, reportData.transportationBusCount),
		},
		{
			name: "Festival Tickets Women and Non-Binary (Fri-Sun.)",
			total: reportData.womenAndNonBinaryCount,
			daily: reportData.dailyWomenAndNonBinaryCount,
			capacity: Math.max(309, reportData.womenAndNonBinaryCount),
		},
		{
			name: "Festival Tickets Supporter (Fri-Sun.)",
			total: reportData.festivalSupporterCount,
			daily: reportData.dailyFestivalSupporterCount,
			capacity: Math.max(388, reportData.festivalSupporterCount),
		},
		{
			name: "Festival Tickets (Thu.)",
			total: reportData.festivalThursdayCount,
			daily: reportData.dailyFestivalThursdayCount,
			capacity: Math.max(750, reportData.festivalThursdayCount),
		},
		{
			name: "Festival Tickets (Fri-Sun.)",
			total: reportData.festivalFridayToSunday,
			daily: reportData.dailyFestivalFridayToSunday,
			capacity: Math.max(1300, reportData.festivalFridayToSunday),
		},
		{
			name: "Dinner",
			total: reportData.dinnerCount,
			daily: reportData.dailyDinnerCount,
			capacity: Math.max(93, reportData.dinnerCount),
		},
		{
			name: "Nature Walk",
			total: reportData.natureWalkCount,
			daily: reportData.dailyNatureWalkCount,
			capacity: Math.max(76, reportData.natureWalkCount),
		},
		{
			name: "Sauna",
			total: reportData.saunaCount,
			daily: reportData.dailySaunaCount,
			capacity: Math.max(435, reportData.saunaCount),
		},
		{
			name: "Merch",
			total: reportData.merchCount,
			daily: reportData.dailyMerchCount,
			capacity: Math.max(1000, reportData.merchCount),
		},
	].sort((a, b) => a.total - b.total); // Sort by total count, lowest to highest
	sortedItems.forEach((item) => {
		if (!item.total) {
			console.log(`${item.name}: ${item.total} / ${item.capacity}`);
		}
	});

	const availableItems = sortedItems.filter(
		(item) => item.total < item.capacity,
	);
	const soldOutItems = sortedItems.filter(
		(item) => item.total >= item.capacity,
	);

	const availableText = availableItems
		.map((item) => `• *${item.name}:*  ${item.total} / ${item.capacity}`)
		.join("\n");

	const soldOutText = soldOutItems
		.map((item) => `• *${item.name}:*  ${item.total} / ${item.capacity}`)
		.join("\n");

	const dailyText = sortedItems
		.filter((item) => item.daily > 0) // Only include items with daily count > 0
		.map((item) => `• *${item.name}:* ${item.daily}`)
		.join("\n");

	const blocksHeader = {
		type: "header",
		text: {
			type: "plain_text",
			text: "Monument Festival 2026 - Ticket Summary",
			emoji: true,
		},
	};

	const soldOutBlocks =
		soldOutItems.length > 0
			? [
					{
						type: "section",
						text: {
							type: "mrkdwn",
							text: `*All-Time Totals (Sold Out)* :white_check_mark: \n${soldOutText}`,
						},
					},
				]
			: [];

	const blocksPayload = {
		blocks: [
			blocksHeader,
			{
				type: "section",
				text: { type: "mrkdwn", text: `*Last 24 Hours*\n${dailyText}` },
			},
			{
				type: "section",
				text: {
					type: "mrkdwn",
					text: `*All-Time Totals (Still Available)*\n${availableText}`,
				},
			},
			{ type: "divider" },
			...soldOutBlocks,
		],
	};

	try {
		await axios.post(slackWebhookUrl, blocksPayload);
		console.log("Report successfully sent to Slack with sorted blocks.");
	} catch (error) {
		console.error("Error sending report to Slack:", error.message);
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Main function to orchestrate everything
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
	const reportData = await fetchTicketCoData();
	await sendReportToSlack(reportData);
}

// Run main if this file is called directly
if (require.main === module) {
	main().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}

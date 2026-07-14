export const revenueData = [
  { day: "May 14", actual: 3200, projected: 3400 },
  { day: "May 15", actual: 4100, projected: 4300 },
  { day: "May 16", actual: 3800, projected: 4500 },
  { day: "May 17", actual: 5200, projected: 5400 },
  { day: "May 18", actual: 6100, projected: 6300 },
  { day: "May 19", actual: 6800, projected: 7100 },
  { day: "May 20", actual: 7685, projected: 8420 },
];

export const trafficData = [
  { day: "May 13", visitors: 800, bookings: 220, orders: 140 },
  { day: "May 20", visitors: 1100, bookings: 380, orders: 240 },
  { day: "May 27", visitors: 1300, bookings: 520, orders: 320 },
  { day: "Jun 3", visitors: 1450, bookings: 680, orders: 420 },
  { day: "Jun 10", visitors: 1800, bookings: 820, orders: 560 },
];

export const pointsActivity = [
  { day: "May 13", issued: 18000, redeemed: 6000 },
  { day: "May 20", issued: 22000, redeemed: 9000 },
  { day: "May 27", issued: 26000, redeemed: 12000 },
  { day: "Jun 3", issued: 31000, redeemed: 14000 },
  { day: "Jun 10", issued: 36000, redeemed: 17000 },
];

export const sparkData = (seed: number) =>
  Array.from({ length: 14 }, (_, i) => ({
    x: i,
    y: Math.round(20 + Math.sin(i / 2 + seed) * 8 + (i * (seed % 3 + 1)) / 3 + (seed % 5) * 2),
  }));

export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const customers = [
  { slug: "emma-johnson", name: "Emma Johnson", email: "emma.j@email.com", phone: "+1 (555) 123-4567", visits: 12, spent: "$1,286.50", tag: "VIP", joined: "Jan 15, 2024", points: 480, source: "Instagram", birthday: "Apr 12" },
  { slug: "michael-brown", name: "Michael Brown", email: "michael.b@email.com", phone: "+1 (555) 987-6543", visits: 8, spent: "$842.30", tag: "Frequent", joined: "Feb 2, 2024", points: 320, source: "Google", birthday: "Sep 3" },
  { slug: "sophia-davis", name: "Sophia Davis", email: "sophia.d@email.com", phone: "+1 (555) 234-5678", visits: 15, spent: "$1,920.40", tag: "VIP", joined: "Nov 8, 2023", points: 720, source: "Instagram", birthday: "Jun 21" },
  { slug: "james-wilson", name: "James Wilson", email: "james.w@email.com", phone: "+1 (555) 345-6789", visits: 4, spent: "$320.10", tag: "New", joined: "Apr 4, 2024", points: 95, source: "OpenTable", birthday: "Feb 14" },
  { slug: "olivia-martinez", name: "Olivia Martinez", email: "olivia.m@email.com", phone: "+1 (555) 456-7890", visits: 9, spent: "$945.20", tag: "Frequent", joined: "Jan 28, 2024", points: 340, source: "Facebook", birthday: "Aug 7" },
  { slug: "daniel-taylor", name: "Daniel Taylor", email: "daniel.t@email.com", phone: "+1 (555) 567-8901", visits: 2, spent: "$140.50", tag: "New", joined: "May 1, 2024", points: 40, source: "Walk-in", birthday: "Dec 19" },
  { slug: "isabella-anderson", name: "Isabella Anderson", email: "isabella.a@email.com", phone: "+1 (555) 678-9012", visits: 6, spent: "$612.80", tag: "Frequent", joined: "Mar 11, 2024", points: 210, source: "Website", birthday: "Oct 30" },
  { slug: "william-thomas", name: "William Thomas", email: "william.t@email.com", phone: "+1 (555) 789-0123", visits: 5, spent: "$498.20", tag: "Frequent", joined: "Feb 22, 2024", points: 175, source: "Google", birthday: "Jul 5" },
];

export const findCustomer = (slug: string) =>
  customers.find((c) => c.slug === slug) ?? customers[0];

export const bookings = [
  { id: "BK-2401", date: "2024-05-20", time: "7:30 PM", name: "Emma Johnson", phone: "+1 (555) 123-4567", source: "Website", people: 4, table: "Table 12", area: "Indoor", visits: "3 times", last: "Last: May 10", status: "Upcoming" },
  { id: "BK-2402", date: "2024-05-20", time: "8:00 PM", name: "Michael Brown", phone: "+1 (555) 987-6543", source: "Google", people: 2, table: "Table 8", area: "Indoor", visits: "1 time", last: "First visit", status: "Upcoming" },
  { id: "BK-2403", date: "2024-05-20", time: "8:30 PM", name: "Sophia Davis", phone: "+1 (555) 234-5678", source: "Instagram", people: 6, table: "Table 15", area: "Indoor", visits: "5 times", last: "Last: Apr 25", status: "Upcoming" },
  { id: "BK-2404", date: "2024-05-21", time: "9:00 PM", name: "James Wilson", phone: "+1 (555) 345-6789", source: "OpenTable", people: 2, table: "Bar - B3", area: "Bar Area", visits: "2 times", last: "Last: Apr 18", status: "Upcoming" },
  { id: "BK-2405", date: "2024-05-22", time: "9:30 PM", name: "Olivia Martinez", phone: "+1 (555) 456-7890", source: "Facebook", people: 4, table: "Table 21", area: "Outdoor", visits: "4 times", last: "Last: May 05", status: "Upcoming" },
  { id: "BK-2406", date: "2024-05-22", time: "10:00 PM", name: "Daniel Taylor", phone: "+1 (555) 567-8901", source: "Walk-in", people: 2, table: "Table 5", area: "Indoor", visits: "1 time", last: "First visit", status: "Seated" },
  { id: "BK-2407", date: "2024-05-23", time: "10:30 PM", name: "Isabella Anderson", phone: "+1 (555) 678-9012", source: "Website", people: 3, table: "Table 9", area: "Indoor", visits: "2 times", last: "Last: Apr 30", status: "Upcoming" },
  { id: "BK-2408", date: "2024-05-24", time: "11:00 PM", name: "William Thomas", phone: "+1 (555) 789-0123", source: "Google", people: 2, table: "Bar - B1", area: "Bar Area", visits: "3 times", last: "Last: Apr 27", status: "Upcoming" },
];

export const emailCampaigns = [
  { name: "Weekend Special", sub: "20% off on all pastas", tag: "Promotional", type: "promo", audience: "2,483 Customers", sent: "Jun 10, 2024  10:30 AM", open: "42.1%", click: "8.7%", od: "8.3%", cd: "2.1%", revenue: "$1,245.50" },
  { name: "We Miss You! 💔", sub: "Come back & enjoy 15% off", tag: "Promotional", type: "win", audience: "1,257 Relapsed", sent: "Jun 8, 2024  9:15 AM", open: "38.6%", click: "6.4%", od: "5.9%", cd: "1.2%", revenue: "$842.30" },
  { name: "New Menu Launch 🍝", sub: "Try our new summer menu", tag: "Newsletter", type: "news", audience: "3,145 Customers", sent: "Jun 3, 2024  6:45 PM", open: "35.7%", click: "6.1%", od: "4.3%", cd: "0.8%", revenue: "$1,102.20" },
  { name: "Happy Birthday! 🎂", sub: "Here's a special treat for you!", tag: "Automation", type: "auto", audience: "186 Birthdays", sent: "May 25, 2024  8:00 AM", open: "52.2%", click: "14.2%", od: "12.5%", cd: "3.7%", revenue: "$320.40" },
  { name: "Lunch Deal", sub: "Flat 15% off 11AM – 4PM", tag: "Promotional", type: "promo", audience: "2,910 Customers", sent: "May 20, 2024  11:00 AM", open: "39.1%", click: "7.2%", od: "7.1%", cd: "1.6%", revenue: "$770.60" },
  { name: "Creator Night Invite ⭐", sub: "Exclusive tasting with @foodie.bae", tag: "Event", type: "event", audience: "412 Influencers", sent: "May 18, 2024  7:00 PM", open: "46.3%", click: "18.5%", od: "9.6%", cd: "5.2%", revenue: "$0.00" },
  { name: "Loyalty Points Reminder ⭐", sub: "Earn more points on your next visit", tag: "Automation", type: "auto", audience: "1,034 Loyalty", sent: "May 15, 2024  10:10 AM", open: "31.4%", click: "5.0%", od: "3.2%", cd: "0.9%", revenue: "$0.00" },
];

export const promotions = [
  { name: "Weekend Special", sub: "20% off on all orders", type: "Discount", redemptions: "842", reach: "6.2K", conv: "13.6%", revenue: "$8,432", roi: "6.1x", status: "Active" },
  { name: "Free Dessert", sub: "On orders above $30", type: "Free Item", redemptions: "615", reach: "4.8K", conv: "12.8%", revenue: "$4,125", roi: "4.5x", status: "Active" },
  { name: "Flat 15% Off", sub: "On takeaway orders", type: "Discount", redemptions: "498", reach: "3.9K", conv: "11.2%", revenue: "$3,245", roi: "3.8x", status: "Completed" },
  { name: "BOGO 1+1", sub: "Buy 1 Get 1 Free", type: "BOGO", redemptions: "412", reach: "3.1K", conv: "10.6%", revenue: "$5,330", roi: "5.2x", status: "Active" },
  { name: "Happy Hour", sub: "Up to 30% off", type: "Discount", redemptions: "275", reach: "2.5K", conv: "9.4%", revenue: "$1,985", roi: "2.9x", status: "Scheduled" },
];

export const relapsedCampaigns = [
  { name: "We Miss You! Come Back", sub: "Special offer just for you", channel: "email", audience: "Relapsed (30+ days)", count: "3,284", sent: "Jun 8, 2024  10:00 AM", rate: "22.4%", returned: "186", revenue: "$3,245", status: "Completed" },
  { name: "Here's 15% Off!", sub: "Come back & enjoy", channel: "sms", audience: "Relapsed (15+ days)", count: "2,156", sent: "Jun 1, 2024  4:00 PM", rate: "19.8%", returned: "142", revenue: "$2,180", status: "Completed" },
  { name: "Dinner's On Us", sub: "Free dessert on your next visit", channel: "email", audience: "Relapsed (30+ days)", count: "2,845", sent: "May 25, 2024  10:00 AM", rate: "21.1%", returned: "168", revenue: "$2,945", status: "Completed" },
  { name: "We'd Love to Serve You Again", sub: "Let's make it special", channel: "sms", audience: "Relapsed (60+ days)", count: "1,124", sent: "May 18, 2024  2:00 PM", rate: "16.3%", returned: "92", revenue: "$1,420", status: "Completed" },
  { name: "Welcome Back Offer", sub: "Exclusive deal for you", channel: "email", audience: "Relapsed (90+ days)", count: "982", sent: "May 10, 2024  9:00 AM", rate: "17.7%", returned: "110", revenue: "$1,680", status: "Completed" },
];

export const tiers = [
  { name: "Bronze", color: "from-amber-700 to-amber-500", range: "0 – 999 pts", benefits: ["Earn 1 point for every $1 spent", "Birthday bonus: 100 pts"], members: "6,721", pct: "52.3%" },
  { name: "Silver", color: "from-slate-400 to-slate-300", range: "1,000 – 2,999 pts", benefits: ["Earn 1.25 points for every $1 spent", "Birthday bonus: 150 pts", "5% off on orders"], members: "3,942", pct: "30.6%" },
  { name: "Gold", color: "from-yellow-500 to-yellow-300", range: "3,000 – 6,999 pts", benefits: ["Earn 1.5 points for every $1 spent", "Birthday bonus: 200 pts", "10% off on orders", "Priority reservations"], members: "1,793", pct: "14.0%" },
  { name: "Platinum", color: "from-indigo-600 to-purple-400", range: "7,000+ pts", benefits: ["Earn 2 points for every $1 spent", "Birthday bonus: 300 pts", "15% off on orders", "Exclusive offers & invites"], members: "386", pct: "3.1%" },
];

export const orderHistory = [
  { id: "#ORD-1245", date: "May 18, 2024", time: "7:30 PM", type: "Dine In", location: "Downtown", table: "Table 12", server: "Michael Brown", items: "Truffle Pasta, Caesar Salad, Lemonade", more: 2, total: "$118.50" },
  { id: "#ORD-1198", date: "May 10, 2024", time: "8:00 PM", type: "Dine In", location: "Downtown", table: "Table 8", server: "Sarah Thompson", items: "Margherita Pizza, Coke", more: 1, total: "$72.30" },
  { id: "#ORD-1156", date: "Apr 28, 2024", time: "7:00 PM", type: "Dine In", location: "Uptown", table: "Table 15", server: "James Wilson", items: "Grilled Salmon, Asparagus, Water", more: 2, total: "$95.30" },
  { id: "#ORD-1102", date: "Apr 20, 2024", time: "6:30 PM", type: "Dine In", location: "Downtown", table: "Table 5", server: "Michael Brown", items: "Chicken Alfredo, Garlic Bread", more: 1, total: "$68.40" },
  { id: "#ORD-1044", date: "Apr 12, 2024", time: "7:15 PM", type: "Takeaway", location: "Downtown", table: "—", server: "Sarah Thompson", items: "Tiramisu, Espresso", more: 0, total: "$18.90" },
  { id: "#ORD-0987", date: "Apr 5, 2024", time: "7:45 PM", type: "Dine In", location: "Downtown", table: "Table 21", server: "Michael Brown", items: "Truffle Pasta, Lemonade", more: 1, total: "$64.10" },
  { id: "#ORD-0890", date: "Mar 30, 2024", time: "8:00 PM", type: "Dine In", location: "Uptown", table: "Table 9", server: "James Wilson", items: "Ribeye Steak, Mashed Potatoes", more: 2, total: "$132.60" },
  { id: "#ORD-0801", date: "Mar 22, 2024", time: "6:45 PM", type: "Dine In", location: "Downtown", table: "Table 14", server: "Michael Brown", items: "Caprese Salad, Margherita Pizza", more: 1, total: "$56.20" },
];

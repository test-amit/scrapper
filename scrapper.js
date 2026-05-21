import { chromium } from 'playwright';
import fs from 'fs';
import open from 'open';

const CITY = 'Bangalore';

function getDates() {
  const checkIn = new Date();
  checkIn.setMonth(checkIn.getMonth() + 2);

  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 5);

  const format = (date) => date.toISOString().split('T')[0];

  return {
    checkIn: format(checkIn),
    checkOut: format(checkOut)
  };
}

async function scrapeBookingCom() {

  // HEADLESS MODE ENABLED
  const browser = await chromium.launch({
    headless: true
  });

  const page = await browser.newPage({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
  });

  try {

    const { checkIn, checkOut } = getDates();

    const url =
      `https://www.booking.com/searchresults.html?ss=${CITY}` +
      `&checkin=${checkIn}` +
      `&checkout=${checkOut}` +
      `&group_adults=2` +
      `&no_rooms=1` +
      `&group_children=1` +
      `&age=1` +
      `&nflt=class%3D5`;

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.waitForTimeout(5000);

    const hotels = await page.$$('[data-testid="property-card"]');

    const hotelResults = [];

    let bestHotel = null;

    for (const hotel of hotels.slice(0, 10)) {

      try {

        const hotelName = await hotel
          .$eval('[data-testid="title"]',
            el => el.textContent?.trim() || '')
          .catch(() => '');

        const ratingText = await hotel
          .$eval('[data-testid="review-score"] div',
            el => el.textContent || '')
          .catch(() => '0');

        const priceText = await hotel
          .$eval(
            '[data-testid="price-and-discounted-price"]',
            el => el.textContent || ''
          )
          .catch(() => '0');

        const link = await hotel
          .$eval('a', el => el.href)
          .catch(() => '');

        const rating = parseFloat(
          ratingText.replace(/[^0-9.]/g, '')
        );

        const price = parseInt(
          priceText.replace(/[^0-9]/g, '')
        );

        const hotelData = {
          hotelName,
          rating,
          price,
          link
        };

        hotelResults.push(hotelData);

        if (
          !bestHotel ||
          rating > bestHotel.rating ||
          (rating === bestHotel.rating &&
            price < bestHotel.price)
        ) {
          bestHotel = hotelData;
        }

      } catch (error) {
        console.log('Hotel parsing failed');
      }
    }

    // Screenshot
    await page.screenshot({
      path: 'hotel-results.png',
      fullPage: true
    });

    // Generate Modern Dashboard
    generateHTMLReport(
      hotelResults,
      bestHotel,
      checkIn,
      checkOut
    );

    console.log('\nDashboard Generated Successfully');

    // AUTO OPEN REPORT
    await open('report.html');

  } catch (error) {
    console.error(error);
  } finally {
    await browser.close();
  }
}

function generateHTMLReport(
  hotels,
  bestHotel,
  checkIn,
  checkOut
) {

  const html = `
<!DOCTYPE html>
<html lang="en">

<head>

<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>Luxury Hotel Dashboard</title>

<style>

*{
  margin:0;
  padding:0;
  box-sizing:border-box;
}

body{
  font-family:Arial, sans-serif;
  background:
    linear-gradient(
      135deg,
      #0f172a,
      #1e293b
    );

  color:white;
  min-height:100vh;
  padding:40px;
}

.container{
  max-width:1400px;
  margin:auto;
}

.header{
  text-align:center;
  margin-bottom:40px;
}

.header h1{
  font-size:48px;
  margin-bottom:10px;
}

.header p{
  color:#cbd5e1;
  font-size:18px;
}

.hero-card{

  background:
    rgba(255,255,255,0.08);

  backdrop-filter:blur(10px);

  border:
    1px solid rgba(255,255,255,0.1);

  border-radius:24px;

  padding:30px;

  margin-bottom:40px;

  box-shadow:
    0 10px 30px rgba(0,0,0,0.3);
}

.hero-grid{
  display:grid;
  grid-template-columns:
    repeat(auto-fit,minmax(250px,1fr));

  gap:20px;
}

.stat-card{

  background:
    rgba(255,255,255,0.05);

  padding:20px;

  border-radius:20px;

  transition:0.3s;
}

.stat-card:hover{
  transform:translateY(-5px);
}

.label{
  color:#94a3b8;
  font-size:14px;
  margin-bottom:8px;
}

.value{
  font-size:24px;
  font-weight:bold;
}

.best-price{
  color:#22c55e;
}

.table-container{

  overflow-x:auto;

  background:
    rgba(255,255,255,0.08);

  backdrop-filter:blur(10px);

  border-radius:24px;

  padding:20px;

  border:
    1px solid rgba(255,255,255,0.1);

  box-shadow:
    0 10px 30px rgba(0,0,0,0.3);
}

table{
  width:100%;
  border-collapse:collapse;
}

th{

  background:
    rgba(255,255,255,0.1);

  padding:18px;
  text-align:left;

  color:#f8fafc;
}

td{
  padding:18px;
  border-bottom:
    1px solid rgba(255,255,255,0.08);
}

tr{
  transition:0.3s;
}

tr:hover{
  background:
    rgba(255,255,255,0.05);
}

.best-row{

  background:
    rgba(34,197,94,0.15);
}

.rating{
  color:#facc15;
  font-weight:bold;
}

.price{
  color:#22c55e;
  font-weight:bold;
  font-size:18px;
}

.button{

  display:inline-block;

  background:
    linear-gradient(
      135deg,
      #3b82f6,
      #2563eb
    );

  color:white;

  text-decoration:none;

  padding:10px 18px;

  border-radius:12px;

  transition:0.3s;
}

.button:hover{
  transform:scale(1.05);
}

.footer{
  text-align:center;
  margin-top:30px;
  color:#94a3b8;
}

.badge{

  display:inline-block;

  background:#22c55e;

  color:white;

  padding:6px 12px;

  border-radius:999px;

  font-size:12px;

  margin-left:10px;
}

</style>

</head>

<body>

<div class="container">

  <div class="header">
    <h1>🏨 Luxury Hotel Dashboard</h1>

    <p>
      AI Powered Hotel Price Comparison Report
    </p>
  </div>

  <div class="hero-card">

    <h2>
      Best Hotel Deal
      <span class="badge">
        TOP RATED
      </span>
    </h2>

    <br>

    <div class="hero-grid">

      <div class="stat-card">
        <div class="label">City</div>
        <div class="value">${CITY}</div>
      </div>

      <div class="stat-card">
        <div class="label">Hotel</div>
        <div class="value">
          ${bestHotel.hotelName}
        </div>
      </div>

      <div class="stat-card">
        <div class="label">Rating</div>
        <div class="value rating">
          ⭐ ${bestHotel.rating}
        </div>
      </div>

      <div class="stat-card">
        <div class="label">Lowest Price</div>
        <div class="value best-price">
          ₹ ${bestHotel.price}
        </div>
      </div>

      <div class="stat-card">
        <div class="label">Check-In</div>
        <div class="value">${checkIn}</div>
      </div>

      <div class="stat-card">
        <div class="label">Check-Out</div>
        <div class="value">${checkOut}</div>
      </div>

    </div>

  </div>

  <div class="table-container">

    <table>

      <thead>

        <tr>
          <th>#</th>
          <th>Hotel</th>
          <th>Rating</th>
          <th>Price</th>
          <th>Action</th>
        </tr>

      </thead>

      <tbody>

        ${hotels.map((hotel,index)=>`

          <tr class="${
            hotel.hotelName === bestHotel.hotelName
              ? 'best-row'
              : ''
          }">

            <td>${index+1}</td>

            <td>${hotel.hotelName}</td>

            <td class="rating">
              ⭐ ${hotel.rating}
            </td>

            <td class="price">
              ₹ ${hotel.price}
            </td>

            <td>

              <a
                class="button"
                href="${hotel.link}"
                target="_blank"
              >
                View Hotel
              </a>

            </td>

          </tr>

        `).join('')}

      </tbody>

    </table>

  </div>

  <div class="footer">

    Generated using Playwright Web Scraper

  </div>

</div>

</body>
</html>
`;

  fs.writeFileSync('report.html', html);
}

scrapeBookingCom();
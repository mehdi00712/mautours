<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>My Bookings | Mautour Holidays</title>
  <link rel="stylesheet" href="css/style.css" />
</head>
<body>

<header class="site-header">
  <div class="nav-container">
    <h1 class="logo">Mautour Holidays</h1>

    <nav class="nav" id="nav">
      <a href="index.html">Home</a>
      <a href="booking.html">Packages</a>
      <a href="vehicles.html">Vehicles</a>
      <a href="my-bookings.html" class="active">My Bookings</a>
      <button id="logoutBtn" class="admin-logout-btn">Logout</button>
    </nav>

    <div class="hamburger" id="hamburger">
      <span></span>
      <span></span>
      <span></span>
    </div>
  </div>
</header>

<main class="admin-main">
  <section class="dashboard-container">
    <span class="section-label center-label">Customer Area</span>
    <h2>My Bookings</h2>

    <div id="bookingsList" class="admin-trip-list">
      <div class="loading-card">
        <h3>Loading bookings...</h3>
      </div>
    </div>
  </section>
</main>

<script src="js/main.js"></script>
<script type="module" src="js/my-bookings.js"></script>
</body>
</html>

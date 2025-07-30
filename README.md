# LittleBankXA

A financial portfolio management application designed to demonstrate building a full-stack web application with a REST API backend and a user-friendly web front-end. This system allows users to manage a financial portfolio containing stocks and bonds, track performance with real-time data, and simulate trading activities.

## Table of Contents

* [About the Project](#about-the-project)
  * [Built With](#built-with)
* [Features](#features)
* [Getting Started](#getting-started)
  * [Prerequisites](#prerequisites)
  * [Installation](#installation)
* [Usage](#usage)
* [Roadmap](#roadmap)
* [Contributing](#contributing)
* [License](#license)
* [Contact](#contact)
* [Acknowledgements](#acknowledgements)

## About The Project

This project challenges the team to design and build an application to manage a financial portfolio. The primary goal is to create a Portfolio Management REST API that allows saving and retrieving records describing the contents of a financial portfolio.

A web front-end is built to interact with the API, allowing users to:
*   Browse a portfolio of assets.
*   View the performance of the portfolio with graphical charts.
*   Add new stocks and bonds to the portfolio.
*   Remove items from the portfolio.

### Built With

This project was built using modern web technologies for both the backend and frontend.
*   [Node.js](https://nodejs.org/)
*   [Express.js](https://expressjs.com/)
*   [MySQL2](https://github.com/sidorares/node-mysql2)
*   [Chart.js](https://www.chartjs.org/)
*   HTML5 & CSS3

## Features

*   **Comprehensive Dashboard:** Get a high-level overview of your entire portfolio, including total asset value, cash balance, and graphical charts illustrating asset allocation.
*   **Detailed Portfolio Management:** View a complete list of all owned stocks and bonds with details on quantity, purchase price, current market value, and real-time profit/loss calculations.
*   **Live Market Simulation:** Browse dedicated pages for stock and bond markets that display real-time price data. A "Update All" feature allows for instant refreshing of all prices in your watchlist.
*   **Transaction Simulation:** Easily simulate buying, selling, and deleting assets directly from the UI. The system includes modals for confirming sales and managing cash recharges.
*   **Historical Data Analysis:** View interactive, collapsible charts showing the historical price performance of individual stocks.
*   **Flexible Data Entry:** Add assets to your portfolio in two ways:
    1.  Purchase directly from the market pages, which auto-fills the current market price.
    2.  Manually add a historical purchase by specifying a past date, which automatically fetches the closing price for that day.

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

Ensure you have the following software installed on your system.
*   Node.js and npm
    ```sh
    npm install npm@latest -g
    ```
*   A running MySQL server instance.

### Installation

1.  Clone the repo
    ```sh
    git clone https://github.com/RichardQAQ/LittleBankXA.git
    ```
2.  Install NPM packages
    ```sh
    npm install
    ```
3.  Configure your database connection in `db.js` with your MySQL credentials.
    ```javascript
    // filepath: db.js
    const dbConfig = {
      host: 'localhost',
      user: 'your_username',
      password: 'your_password',
      database: 'investment_system',
      // ...
    };
    ```
4.  Initialize the database schema by running the script from the root directory:
    ```sh
    node init-db.js
    ```
5.  Start the server:
    ```sh
    npm start
    ```
6.  Access the application by navigating to `http://localhost:3015` in your web browser.

## Usage

The application provides a user-friendly interface for managing a financial portfolio.
*   **Dashboard:** View a high-level overview of your total assets, overall return, and asset distribution charts.
*   **Portfolio:** See a detailed list of all your assets, including stocks and bonds. From here, you can sell or delete assets.
*   **Stock/Bond Markets:** Browse lists of available stocks and bonds, view their real-time prices, and purchase them to add to your portfolio.
*   **Add Asset:** Manually add historical purchases of stocks or bonds.

## Roadmap

Future enhancements could include:
*   Support for more asset types (e.g., cryptocurrencies, ETFs).
*   User authentication and multi-user support.
*   More advanced portfolio analytics and reporting tools.
*   Integration with more financial data APIs.

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## License

Distributed under the ISC License.

## Contact

Project Link: [https://github.com/RichardQAQ/LittleBankXA](https://github.com/RichardQAQ/LittleBankXA)

## Acknowledgements

*   [Simple Price UI Example](https://bitbucket.org/fcallaly/simple-price-ui)
*   [Yahoo Finance API (Java)](https://github.com/sstrickx/yahoofinance-api)
*   [yfinance (Python)](https://pypi.org/project/yfinance/)
*   [Sample Financial Data REST API](https://c4rm9elh30.execute-api.us-east-1.amazonaws.com/default/cachedPriceData?ticker=TSLA)
*   [GitHub Emoji Cheat Sheet](https://www.webpagefx.com/tools/emoji-cheat-sheet)
*   [Img Shields](https://shields.io)
*   [Choose an Open Source License](https://choosealicense.com)
*   [GitHub Pages](https://pages.github.com)

# LittleBankXA API Documentation

This document provides detailed information about the REST API endpoints available in the LittleBankXA financial portfolio management application.

## Base URL

All API endpoints are relative to the base URL:

```
http://localhost:3015
```

## Authentication

Currently, the API does not require authentication as it's designed for a single user. Future versions may implement authentication.

## API Endpoints

### Portfolio Management

#### Get Portfolio

Retrieves the complete portfolio including user information and assets.

- **URL**: `/api/portfolio`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "user": {
      "id": 1,
      "username": "User",
      "total_assets": 50000.00,
      "stock_value": 10000.00,
      "bond_value": 5000.00,
      "cash_balance": 35000.00,
      "total_return_rate": 0.00
    },
    "assets": [
      {
        "id": 1,
        "type": "stock",
        "symbol": "AAPL",
        "name": "Apple Inc.",
        "quantity": 10,
        "purchase_price": 150.00,
        "current_price": 175.00,
        "purchase_date": "2023-01-15"
      },
      // More assets...
    ]
  }
  ```

#### Get Portfolio History

Retrieves historical portfolio value data.

- **URL**: `/api/portfolio/history`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "dates": ["2023-01-01", "2023-01-02", "..."],
    "values": [50000, 50100, "..."]
  }
  ```

#### Sell Asset

Sells a specified quantity of an asset.

- **URL**: `/api/portfolio/sell`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "assetId": 1,
    "quantity": 5
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Sold successfully",
    "amount": 875.00
  }
  ```

#### Delete Asset

Removes an asset from the portfolio.

- **URL**: `/api/portfolio/:id`
- **Method**: `DELETE`
- **Response**:
  ```json
  {
    "success": true,
    "message": "Asset deleted successfully"
  }
  ```

#### Deposit Cash

Adds cash to the user's balance.

- **URL**: `/api/portfolio/recharge`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "amount": 5000
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Deposit successful",
    "amount": 5000
  }
  ```

### Stock Management

#### Get All Stocks

Retrieves a list of all available stocks.

- **URL**: `/api/stocks`
- **Method**: `GET`
- **Response**:
  ```json
  [
    {
      "id": 1,
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "current_price": 175.00,
      "change_percent": 1.25,
      "volume": 50000000,
      "market_cap": 2900000000000,
      "updated_at": "2023-07-21T15:30:00Z"
    },
    // More stocks...
  ]
  ```

#### Get Single Stock

Retrieves detailed information about a specific stock.

- **URL**: `/api/stocks/single/:symbol`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "id": 1,
    "symbol": "AAPL",
    "name": "Apple Inc.",
    "current_price": 175.00,
    "change_percent": 1.25,
    "volume": 50000000,
    "market_cap": 2900000000000,
    "updated_at": "2023-07-21T15:30:00Z"
  }
  ```

#### Update Stock Price

Updates the price of a specific stock.

- **URL**: `/api/stocks/:symbol/update`
- **Method**: `POST`
- **Response**:
  ```json
  {
    "success": true,
    "message": "Stock price updated successfully",
    "oldPrice": 175.00,
    "newPrice": 176.50
  }
  ```

#### Update All Stock Prices

Updates prices for all stocks.

- **URL**: `/api/stocks/refresh`
- **Method**: `POST`
- **Response**:
  ```json
  {
    "success": true,
    "message": "All stock prices updated successfully",
    "updatedCount": 10
  }
  ```

#### Get Stock History

Retrieves historical price data for a specific stock.

- **URL**: `/api/stocks/:symbol/history`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "symbol": "AAPL",
    "labels": ["2023-01-01", "2023-01-02", "..."],
    "values": [150.00, 152.30, "..."]
  }
  ```

#### Search Stocks

Searches for stocks by symbol or name.

- **URL**: `/api/stocks/search`
- **Method**: `GET`
- **Query Parameters**: `query=AAPL`
- **Response**:
  ```json
  [
    {
      "symbol": "AAPL",
      "shortname": "Apple Inc."
    },
    // More results...
  ]
  ```

#### Buy Stock

Purchases a stock and adds it to the portfolio.

- **URL**: `/api/stocks/buy`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "symbol": "AAPL",
    "name": "Apple Inc.",
    "price": 175.00,
    "quantity": 10,
    "date": "2023-07-21"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Stock purchased successfully!",
    "asset": {
      "id": 5,
      "type": "stock",
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "quantity": 10,
      "purchase_price": 175.00
    }
  }
  ```

### Bond Management

#### Get All Bonds

Retrieves a list of all available bonds.

- **URL**: `/api/bonds`
- **Method**: `GET`
- **Response**:
  ```json
  [
    {
      "id": 1,
      "symbol": "US10Y",
      "name": "10-Year Treasury",
      "face_value": 1000.00,
      "coupon_rate": 3.85,
      "maturity_date": "2034-07-21",
      "current_price": 985.50,
      "change_percent": 0.15,
      "rating": "AAA",
      "issuer": "US Treasury",
      "updated_at": "2023-07-21T15:30:00Z"
    },
    // More bonds...
  ]
  ```

#### Get Single Bond

Retrieves detailed information about a specific bond.

- **URL**: `/api/bonds/:symbol`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "id": 1,
    "symbol": "US10Y",
    "name": "10-Year Treasury",
    "face_value": 1000.00,
    "coupon_rate": 3.85,
    "maturity_date": "2034-07-21",
    "current_price": 985.50,
    "change_percent": 0.15,
    "rating": "AAA",
    "issuer": "US Treasury",
    "updated_at": "2023-07-21T15:30:00Z"
  }
  ```

#### Update Bond Price

Updates the price of a specific bond.

- **URL**: `/api/bonds/:symbol/update`
- **Method**: `POST`
- **Response**:
  ```json
  {
    "success": true,
    "message": "Bond price updated successfully",
    "oldPrice": 985.50,
    "newPrice": 987.25
  }
  ```

#### Buy Bond

Purchases a bond and adds it to the portfolio.

- **URL**: `/api/bonds/buy`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "symbol": "US10Y",
    "name": "10-Year Treasury",
    "price": 985.50,
    "quantity": 5,
    "face_value": 1000.00,
    "coupon_rate": 3.85,
    "maturity_date": "2034-07-21",
    "date": "2023-07-21"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Bond purchased successfully!",
    "asset": {
      "id": 8,
      "type": "bond",
      "symbol": "US10Y",
      "name": "10-Year Treasury",
      "quantity": 5,
      "purchase_price": 985.50
    }
  }
  ```

## Error Handling

All API endpoints return appropriate HTTP status codes:

- `200 OK`: Request successful
- `400 Bad Request`: Invalid request parameters
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server-side error

Error responses include a JSON object with an error message:

```json
{
  "error": "Detailed error message"
}
```

## Data Models

### User

```json
{
  "id": 1,
  "username": "User",
  "total_assets": 50000.00,
  "stock_value": 10000.00,
  "bond_value": 5000.00,
  "cash_balance": 35000.00,
  "total_return_rate": 0.00,
  "created_at": "2023-01-01T00:00:00Z"
}
```

### Stock

```json
{
  "id": 1,
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "current_price": 175.00,
  "change_percent": 1.25,
  "volume": 50000000,
  "market_cap": 2900000000000,
  "updated_at": "2023-07-21T15:30:00Z"
}
```

### Bond

```json
{
  "id": 1,
  "symbol": "US10Y",
  "name": "10-Year Treasury",
  "face_value": 1000.00,
  "coupon_rate": 3.85,
  "maturity_date": "2034-07-21",
  "current_price": 985.50,
  "change_percent": 0.15,
  "rating": "AAA",
  "issuer": "US Treasury",
  "updated_at": "2023-07-21T15:30:00Z"
}
```

### Portfolio Asset

```json
{
  "id": 1,
  "user_id": 1,
  "asset_type": "stock",
  "asset_id": 1,
  "quantity": 10,
  "purchase_price": 150.00,
  "purchase_date": "2023-01-15",
  "status": 1
}
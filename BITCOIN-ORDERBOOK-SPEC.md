# Bitcoin Order Book Component Specification

## Overview

This specification outlines the requirements for implementing a simple yet elegant Order Book component for a Bitcoin trading application. The component will display real-time order book data similar to Coinbase Advanced, focusing on clarity and essential functionality.

## Core Features

### 1. Exchange Selection

- **Implementation:** Simple tabs positioned inline with the "Order Book" title
- **Options:** Bitfinex, Coinbase, and Binance
- **Default:** Bitfinex
- **Behavior:** Clean transition when switching exchanges

### 2. Amount Adjustment Controls

- **Default Value:** 0.05 BTC
- **Controls:** Minus (-) and Plus (+) buttons on either side of amount display
- **Increment Sequence:**
  - Decreasing: 0.05 → 0.01
  - Increasing: 0.05 → 0.1 → 0.5 → 1 → 2.5 → 5 → 10
- **Input Field:** Allow direct numerical input with basic validation

### 3. Order Book Display

- **Layout:** Clean two-column format showing Amount (BTC) and Price (USD)
- **Visual Elements:**
  - Red bars for sell orders (above spread) using `text-error` class
  - Green bars for buy orders (below spread) using `text-success` class
  - Bar width proportional to order size
  - Clear spread indicator between sections
  - Display 10 price levels on each side
- **Sorting:**
  - Sell orders: Lowest ask at bottom
  - Buy orders: Highest bid at top
- **Animation:** Subtle transitions for price/size changes

### 4. Hover Interaction

- **Behavior:** Simple tooltip on hover showing:
  - Cumulative size
  - Total value in USD
  - Percentage of visible book

## Technical Implementation

### 1. Data Source

- **Primary:** WebSocket connections to exchanges
  - **Bitfinex:** `wss://api-pub.bitfinex.com/ws/2` (book channel)
  - **Coinbase:** `wss://ws-feed.exchange.coinbase.com` (level2 channel)
  - **Binance:** `wss://stream.binance.com:9443/ws/btcusdt@depth`
- **Fallback:** Simple REST API polling if WebSockets fail

### 2. Performance Considerations

- **Keep It Simple:**
  - Limit updates to 5 fps (sufficient for readability)
  - Focus on clean, efficient code over complex optimizations
  - Only implement virtualization if actually needed
- **Efficient Updates:**
  - Update only changed values
  - Batch visual updates

### 3. Error Handling

- **User-Friendly Approach:**
  - Simple reconnection logic
  - Clear "Disconnected" indicator if connection drops
  - Graceful fallback to cached data

## UI Design

### 1. Layout

- **Theme:** Dark mode (matching existing application)
- **Colors:**
  - Sell: `text-error` class
  - Buy: `text-success` class
  - Background: Dark (#121212)
  - Text: Light gray/white
- **Simplicity:** Clean, uncluttered interface with ample spacing

### 2. Responsiveness

- **Desktop:** Full view (default)
- **Mobile:** Simplified view with fewer visible orders
- **Touch:** Larger touch targets on mobile

## Implementation Approach

- **Framework:** React with hooks
- **State:** Simple React state (avoid Redux complexity)
- **Testing:** Basic unit tests for core functionality
- **Priority:** Reliability and readability over complex features

## Development Focus

1. Get basic structure working first
2. Implement stable data connection
3. Add visual enhancements
4. Test thoroughly with real exchange data

This specification provides clear guidance for implementing a streamlined Order Book component similar to Coinbase Advanced, prioritizing elegant simplicity over unnecessary complexity.
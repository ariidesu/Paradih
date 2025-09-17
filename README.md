<h1 align="center">
  Paradih, the super real paradigm server
  <img src=".github/images/logo.jpg" alt="Logo" height="30">
</h1>

## Overview

Paradih is an implementation of Paradigm: Reboot's server, aiming to replicate as much of the game functionalities as possible.

## Features

It currently supports:
- **User**: registration, login
- **Gameplay**: play submission, rating calculation, shop purchase, etc.

## Work in Progress
- Ranking
- Cross Decode
- ...

## Setup

### Prerequisites
- Node.js (v16+ recommended)
- npm or yarn

### Installation
1. Clone the repository
   ```bash
   git clone https://github.com/ariidesu/Paradih.git
   cd Paradih
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Configure environment variables
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Start the server
   ```bash
   npm run build && npm run start
   ```

## Disclaimer

This project is not affiliated with TunerGames.

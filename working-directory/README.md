# BitTorrent Client from Scratch

A minimal, robust BitTorrent client implemented in Node.js without external protocol libraries.

## Overview

BitTorrent is a peer-to-peer file sharing protocol used to distribute data and electronic files over the Internet. Unlike traditional client-server models, BitTorrent allows users to join a "swarm" of hosts to upload/download from each other simultaneously.

This project implements the core BitTorrent V1 protocol (BEP 3), including:

- Parsing `.torrent` files (Bencode).
- Peer discovery via HTTP Trackers and DHT (Kademlia-based).
- TCP peer connections with handshake and state machine (Choke/Unchoke/Interested).
- Piece exchange strategy (Request -> Receive -> Hash Verify -> Write).

## Architecture

The system is modularized into the following components:

- **index.js**: Entry point. initializes the `Torrent`, `PieceManager`, and starts peer discovery (Tracker & DHT).
- **read-torrent.js**: Parses the metadata file, extracting info-hash and file structure.
- **tracker.js**: Handles communication with HTTP trackers to retrieve initial peer lists.
- **dht.js**: Implements a UDP-based Distributed Hash Table to find peers without a centralized tracker.
- **peer.js**: Manages individual TCP connections, handling the full message flow (Handshake, Bitfield, Request, Piece).
- **utils/pieceManager.js**: Central brain for state. Tracks which pieces are needed, requested, and received. verifiable sha1 hash check.

## How to Run

1. **Install Dependencies**:

   ```bash
   npm install
   ```

2. **Start the Download**:

   ```bash
   node index.js sample.torrent
   ```

   Replace `sample.torrent` with any valid torrent file.

## Technical Highlights

- **Zero-Dependency Protocol**: Bencode parsing and message binary formatting are built using Node `Buffer`.
- **Hybrid Discovery**: Uses both centralized HTTP trackers and decentralized DHT for maximum connectivity.
- **Robustness**: Handles peer disconnects, hash failures (re-queueing), and buffer management.

This implementation serves as an educational deep-dive into distributed systems and network programming.

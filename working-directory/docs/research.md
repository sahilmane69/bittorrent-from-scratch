# Building a BitTorrent Client from Scratch: A Deep Dive into Distributed Systems

**Author**: Sahil Mane  
**Date**: January 2026

## Abstract

This document details the engineering journey of implementing the BitTorrent V1 protocol (BEP 3) from first principles using Node.js. By bypassing existing libraries, this project exposes the raw mechanics of peer-to-peer (P2P) networking, binary data parsing, and distributed state management. The resulting client successfully performs peer discovery, reliable data exchange, and cryptographic verification.

## 1. Introduction

Modern software engineering often relies on abstractions that hide underlying network protocols. Implementing BitTorrent from scratch challenges these abstractions, requiring direct interaction with TCP sockets, UDP datagrams, and binary serializations. The goal was to build a functional client capable of downloading files from the public internet.

## 2. Core Components

### 2.1 Bencode Parsing

BitTorrent uses _Bencode_, a serialization format for data structures.
_Constraint_: No regex or simple string splitting.
_Solution_: A recursive descent parser that handles integers (`i123e`), strings (`4:spam`), lists (`l...e`), and dictionaries (`d...e`). This is critical for reading `.torrent` metainfo and parsing tracker responses.

### 2.2 Peer Discovery

Finding peers is the first hurdle in P2P.

- **HTTP Trackers**: Implemented GET requests with percent-encoded info-hashes to centralized servers.
- **DHT (Distributed Hash Table)**: Implemented the Kademlia-based "Mainline" DHT using UDP. This allows decentralized peer finding by querying nodes for the specific info-hash. This required implementing a routing table strategy and recursive node lookups.

### 2.3 The Peer Protocol (TCP)

Once an IP:Port is found, the client initiates a TCP handshake.

- **Handshake**: `19:BitTorrent protocol` + Reserved Bytes + Info Hash + Peer ID.
- **State Machine**: Peers start "choked" (blocked). The client must express "interest" and wait to be "unchoked" before requesting data.
- **Pipelining**: To saturate bandwidth, requests must be pipelined. This implementation queues block requests to ensure the TCP window remains full.

### 2.4 Piece Management & Verification

Files are split into "pieces" (e.g., 256KB), which are further split into "blocks" (16KB) for transmission.

- **Storage**: A random-access write strategy is used. As blocks arrive out-of-order, they are buffered in memory.
- **Integrity**: Once a piece is complete, its SHA-1 hash is compared against the torrent file's strict hash list. Corrupt pieces are discarded and re-queued.

## 3. Challenges & Solutions

### 3.1 Network Endianness

Binary protocols are strictly Big-Endian. Reading multi-byte integers requires careful `readUInt32BE` operations. A single offset error results in garbage data interpretation.

### 3.2 Asynchronous Complexity

Managing hundreds of concurrent peer connections, each with its own state (choked/unchoked) and message queue, leads to complex concurrency. The solution involved a centralized `PieceManager` acting as the source of truth, creating a reactor pattern where peers purely react to data availability.

## 4. Conclusion

Building BitTorrent from scratch provides invaluable insights into:

1.  **Binary Protocols**: How machines talk efficiently (compact peer lists, bitfields).
2.  **Distributed Consistency**: How thousands of strangers cooperate to host a file without a central server.
3.  **Resilience**: Handling disconnects and bad data gracefully.

This project goes beyond a simple download script; it is a functional distributed systems node.

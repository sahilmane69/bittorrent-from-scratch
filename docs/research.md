# Research Log – BitTorrent Client

## Day 1 – Understanding BitTorrent (31/12/2025)

### Why BitTorrent?
I want to understand how large files can be shared without a central server.
Traditional client-server models do not scale well.
BitTorrent distributes responsibility across peers.

### High-level idea
BitTorrent works in two major phases:
1. Discover peers using a tracker
2. Download file pieces from multiple peers in parallel

### Initial observations
- Torrent files do not contain actual data
- They contain metadata and hashes
- The network relies heavily on trust + verification

### Questions I want to answer
- How does a tracker actually respond?
- How do peers verify correctness?
- How is fairness handled between peers?

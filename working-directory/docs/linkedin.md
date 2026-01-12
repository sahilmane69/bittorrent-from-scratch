🚀 **Just built a BitTorrent Client from Scratch!**

I recently decided to peel back the layers of abstraction in modern software networking. Instead of `npm install torrent-client`, I implemented the BitTorrent Protocol (BEP 3) roughly from zero using Node.js.

This wasn't just about downloading a file—it was an intense crash course in distributed systems and binary protocols.

**Engineered from the ground up:**
✅ **Bencode Parser**: Wrote a custom recursive parser for torrent metadata.
✅ **Distributed Hash Table (DHT)**: Implemented Kademlia-based peer discovery over UDP.
✅ **TCP & Protocol Flow**: Managed raw socket handshakes, bitfields, choking algorithms, and pipelined block requests.
✅ **Cryptographic Integrity**: implemented real-time SHA-1 piece verification.

**Key Takeaway:**
The internet is built on protocols, not libraries. Understanding how bits travel on the wire—handling endianness, buffering, and asynchronous concurrency manually—gives you a superpower in debugging and designing resilient systems.

The code is raw, functional, and "no-magic".

Check out the repo here: [Link to GitHub]

#SoftwareEngineering #BitTorrent #NodeJS #DistributedSystems #Networking #OpenSource

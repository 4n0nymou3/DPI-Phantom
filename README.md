# DPI-Phantom

This repository contains an advanced, server-less V2Ray/Xray configuration designed to evade sophisticated Deep Packet Inspection (DPI) systems. It utilizes a chain of fragmentation rules and targets the `tlshello` packet to obfuscate traffic, providing a high degree of resilience and anonymity without the need for a dedicated server.

## Key Features

* **tlshello Fragmentation**: Specifically targets the initial TLS handshake for maximum evasion.
* **Multi-Stage Fragment Chaining**: Passes traffic through a series of different fragmentation rules for layered obfuscation.
* **Advanced Routing**: Automatically separates domestic (IR) traffic, blocks ads, and tunnels international traffic.
* **UDP Noise Generation**: Includes rules to obfuscate common UDP traffic patterns.
* **Server-Less**: Works entirely on the client-side without requiring a VPS.

## Usage

1.  Copy the content of the `phantom.json` file.
2.  Import the configuration from the clipboard into a compatible client (e.g., v2rayNG, Nekoray).
3.  Ensure your client's `geoip.dat` and `geosite.dat` files are up to date.
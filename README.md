# DPI-Phantom

This repository contains an advanced, server-less V2Ray/Xray configuration engineered to evade sophisticated Deep Packet Inspection (DPI) systems. It utilizes a deep, 10-stage chain of fragmentation rules combined with intelligent packet padding to thoroughly obfuscate traffic, providing a high degree of resilience and anonymity without the need for a dedicated server.

## Key Features

* **Deep 10-Stage Fragmentation**: Passes traffic through a sophisticated 10-layer chain of fragmentation rules, making it extremely difficult to reassemble and analyze.
* **Intelligent Packet Padding**: Complements fragmentation by applying smart padding to all packets, randomizing their size to mimic standard TLS traffic and further evade statistical analysis.
* **Protocol-Specific Routing**: Intelligently identifies and routes traffic for different applications—such as Gaming, Social Media, and Streaming—to specialized outbounds with tailored obfuscation profiles.
* **Comprehensive UDP Obfuscation**: Applies both fragmentation and padding to UDP traffic, ensuring protocols often used for gaming and streaming are also properly camouflaged.
* **Resilient Secure DNS**: Utilizes multiple trusted DNS-over-HTTPS (DoH) providers (Cloudflare, Google, Quad9, OpenDNS, AdGuard) for maximum reliability and privacy.
* **Dual Proxy Inbounds**: Offers both SOCKS5 (port `10808`) and HTTP (port `10809`) inbounds for flexible integration with different applications.
* **Server-Less Architecture**: Works entirely on the client-side, providing powerful obfuscation without the cost or complexity of a VPS.

## Usage

1.  Copy the content of the `phantom.json` file.
2.  Import the configuration from the clipboard into a compatible client (e.g., v2rayNG, MahsaNG).
3.  Ensure your client's `geoip.dat` and `geosite.dat` files are up to date for optimal routing.
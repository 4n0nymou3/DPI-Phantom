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

---

## Phantom Universal Chainer: The Companion Tool

To streamline the process of using this advanced configuration with your own proxy servers, this repository includes a powerful companion web tool: the **Phantom Universal Chainer**.

This tool has been significantly upgraded. Instead of a single Shadowsocks proxy, it now allows you to chain the entire Phantom configuration with a **full, multi-protocol JSON config** from clients like v2rayNG. The result is a single, robust configuration that directs your traffic through Phantom's advanced anti-DPI engine before exiting through your own load-balanced pool of servers (VLESS, VMess, Trojan, etc.). It also includes a **"Route All Traffic"** option for full tunneling.

### ⚠️ Requirements & Instructions

* **Crucial Requirement: Load Balancer:** The input JSON config you provide **must** contain a load balancer. The tool is specifically designed to locate a balancer tagged `proxy-round` and use it as the exit point. Configs without this balancer will not be processed correctly.

* 💡 **How to Create Your Input Config:** You can easily generate a compatible JSON file using a modern client like **v2rayNG (v1.10.11 or newer)**. Simply select multiple servers of any protocol (VLESS, Trojan, etc.) in the app, and use the batch export feature to generate a single, combined JSON file with load balancing enabled. This is the file you should paste into the chainer tool.

---

## Usage (Standalone Phantom Config)

If you wish to use the Phantom config by itself (without chaining to another proxy), follow these steps:

1.  Copy the content of the `phantom.json` file.
2.  Import the configuration from the clipboard into a compatible client (e.g., v2rayNG, Nekoray).
3.  Ensure your client's `geoip.dat` and `geosite.dat` files are up to date for optimal routing.

## Usage (With the Chainer Tool)

1.  Prepare your multi-server, load-balanced JSON config using a client like v2rayNG.
2.  Navigate to the **Phantom Universal Chainer** tool (linked in this repository's "About" section).
3.  Paste your entire JSON config into the primary input box.
4.  Adjust the **Forced Route IPs & Domains** list as needed. By default, it contains Telegram's IP ranges.
5.  Optionally, check the **`Route All Traffic`** box to force all your device's traffic through the chained configuration.
6.  Click **`Generate Combined Config`** and import the resulting JSON into your client.
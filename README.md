# Phantom Universal Chainer

This repository hosts the **Phantom Universal Chainer**, a powerful web tool designed to enhance your existing V2Ray/Xray proxy setup. It allows you to seamlessly chain your own multi-protocol, load-balanced configuration with **Patterniha's sophisticated anti-DPI engine**, creating a single, robust config for maximum resilience.

## What is the Patterniha Anti-DPI Engine?

The Patterniha config is an advanced, server-less V2Ray/Xray configuration that utilizes modern traffic obfuscation techniques to bypass Deep Packet Inspection (DPI) systems. The **Phantom Universal Chainer** always fetches the latest version of this engine to ensure optimal performance against censorship.

---

## How to Use the Phantom Universal Chainer

The chainer tool is designed for ease of use but has one important requirement to function correctly.

### ⚠️ Requirements & Instructions

* **Crucial Requirement: Load Balancer:** The input JSON config you provide **must** contain a load balancer. The tool is specifically designed to locate a balancer tagged `proxy-round` and use it as the exit point for the anti-DPI engine. Configs without this balancer will not be processed correctly.

* 💡 **How to Create Your Input Config:** You can easily generate a compatible JSON file using a modern client like **v2rayNG (v1.10.11 or newer)**. Simply select multiple servers of any protocol (VLESS, Trojan, etc.) in the app, and use the batch export feature to generate a single, combined JSON file with load balancing enabled. This is the file you should paste into the chainer tool.

### Step-by-Step Usage

1.  Prepare your multi-server, load-balanced JSON config using a client like v2rayNG.
2.  Navigate to the **Phantom Universal Chainer** tool (linked in this repository's "About" section).
3.  Paste your entire JSON config into the primary input box.
4.  Adjust the **Forced Route IPs & Domains** list as needed. By default, it contains Telegram's IP ranges.
5.  Optionally, check the **`Route All Traffic`** box to force all your device's traffic through the chained configuration.
6.  Click **`Generate Combined Config`** and import the resulting JSON into your client.
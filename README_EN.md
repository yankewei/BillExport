# Bill Export

This tool helps you export bank statements, currently only for China Merchants
Bank credit cards. It uses Playwright to simulate logging in, finds the data you
need on the webpage, and exports your statement. You’ll need to enter your card
number/ID and password, but don’t worry—this tool doesn’t save or upload any of
your information.

## Usage

```bash
deno run -A main.ts
```